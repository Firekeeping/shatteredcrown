type SessionRow = {
  id: string;
  host_token: string;
  guest_token: string;
  snapshot: string;
  hero_ids: string;
  assigned_hero_id: string | null;
  revision: number;
  command_seq: number;
  handled_seq: number;
  command_json: string | null;
  dialogue_claim_json: string | null;
  dialogue_claim_revision: number | null;
  guest_connected_at: number | null;
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const token = (bytes = 18) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (value) => value.toString(16).padStart(2, "0")).join("");
const sessionId = () => token(5).toUpperCase();
const parseJson = <T,>(value: string | null, fallback: T): T => {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};
const getDatabase = async () => (await import("cloudflare:workers")).env.DB;
const getSession = async (id: string) => (await getDatabase()).prepare("SELECT * FROM multiplayer_sessions WHERE id = ?").bind(id).first<SessionRow>();
const authorized = (session: SessionRow, supplied: string, role: "host" | "guest") => supplied === (role === "host" ? session.host_token : session.guest_token);
const sessionResponse = async (session: SessionRow | null, supplied: string) => {
  if (!session || (supplied !== session.host_token && supplied !== session.guest_token)) return json({ error: "Session not found." }, 404);
  if (supplied === session.guest_token) {
    session.guest_connected_at = Date.now();
    await (await getDatabase()).prepare("UPDATE multiplayer_sessions SET guest_connected_at = ?, updated_at = ? WHERE id = ?").bind(session.guest_connected_at, session.guest_connected_at, session.id).run();
  }
  return json({
    id: session.id,
    snapshot: parseJson(session.snapshot, null),
    heroIds: parseJson<string[]>(session.hero_ids, []),
    assignedHeroId: session.assigned_hero_id,
    revision: session.revision,
    commandSeq: session.command_seq,
    handledSeq: session.handled_seq,
    guestOnline: !!session.guest_connected_at && Date.now() - session.guest_connected_at < 5_000,
    command: session.command_seq > session.handled_seq ? parseJson(session.command_json, null) : null,
    dialogueClaim: session.dialogue_claim_revision === session.revision ? parseJson(session.dialogue_claim_json, null) : null,
  });
};

export async function GET(request: Request) {
  const url = new URL(request.url), id = url.searchParams.get("id") || "", supplied = url.searchParams.get("token") || "";
  return sessionResponse(await getSession(id), supplied);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.op !== "string") return json({ error: "Invalid request." }, 400);
  if (body.op === "poll") {
    const id = typeof body.id === "string" ? body.id : "", supplied = typeof body.token === "string" ? body.token : "";
    return sessionResponse(await getSession(id), supplied);
  }
  const now = Date.now(), db = await getDatabase();
  if (body.op === "create") {
    if (!body.snapshot || !Array.isArray(body.heroIds)) return json({ error: "Start a campaign before sharing it." }, 400);
    await db.prepare("DELETE FROM multiplayer_sessions WHERE updated_at < ?").bind(now - 86_400_000).run();
    let id = sessionId();
    while (await getSession(id)) id = sessionId();
    const hostToken = token(), guestToken = token(), assignedHeroId = typeof body.assignedHeroId === "string" ? body.assignedHeroId : body.heroIds[0] || null;
    await db.prepare("INSERT INTO multiplayer_sessions (id, host_token, guest_token, snapshot, hero_ids, assigned_hero_id, revision, command_seq, handled_seq, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)")
      .bind(id, hostToken, guestToken, JSON.stringify(body.snapshot), JSON.stringify(body.heroIds), assignedHeroId, now, now).run();
    return json({ id, hostToken, guestToken, assignedHeroId, revision: 1 });
  }
  const id = typeof body.id === "string" ? body.id : "", supplied = typeof body.token === "string" ? body.token : "", session = await getSession(id);
  if (!session) return json({ error: "Session expired or does not exist." }, 404);
  if (body.op === "publish") {
    if (!authorized(session, supplied, "host") || !body.snapshot) return json({ error: "Host authorization failed." }, 403);
    await db.prepare("UPDATE multiplayer_sessions SET snapshot = ?, hero_ids = ?, revision = revision + 1, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(body.snapshot), JSON.stringify(Array.isArray(body.heroIds) ? body.heroIds : []), now, id).run();
    return json({ ok: true, revision: session.revision + 1 });
  }
  if (body.op === "claim_dialogue") {
    const role = supplied === session.host_token ? "host" : supplied === session.guest_token ? "guest" : null;
    const claim = body.claim as Record<string, unknown> | undefined;
    if (!role) return json({ error: "Player authorization failed." }, 403);
    if (!claim || !Number.isInteger(body.baseRevision) || Number(body.baseRevision) !== session.revision || typeof claim.sceneKey !== "string" || typeof claim.choiceId !== "string" || typeof claim.choiceLabel !== "string" || typeof claim.claimantHeroId !== "string" || typeof claim.speakerHeroId !== "string" || claim.sceneKey.length > 500 || claim.choiceId.length > 100 || claim.choiceLabel.length > 500)
      return json({ error: "The dialogue changed before that answer arrived. Your screen is resyncing." }, 409);
    if (role === "guest" && claim.claimantHeroId !== session.assigned_hero_id) return json({ error: "That character cannot answer for this player." }, 403);
    const dialogueClaim = { ...claim, claimantRole: role, baseRevision: session.revision };
    const result = await db.prepare("UPDATE multiplayer_sessions SET dialogue_claim_json = ?, dialogue_claim_revision = ?, updated_at = ? WHERE id = ? AND revision = ? AND (dialogue_claim_revision IS NULL OR dialogue_claim_revision != ?)")
      .bind(JSON.stringify(dialogueClaim), session.revision, now, id, session.revision, session.revision).run();
    if (result.meta.changes) return json({ accepted: true, dialogueClaim });
    const winner = await getSession(id);
    return json({ accepted: false, dialogueClaim: winner?.dialogue_claim_revision === winner?.revision ? parseJson(winner.dialogue_claim_json, null) : null });
  }
  if (body.op === "resolve") {
    if (!authorized(session, supplied, "host") || !body.snapshot || !Number.isInteger(body.seq)) return json({ error: "Host authorization failed." }, 403);
    await db.prepare("UPDATE multiplayer_sessions SET snapshot = ?, hero_ids = ?, revision = revision + 1, handled_seq = MAX(handled_seq, ?), updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(body.snapshot), JSON.stringify(Array.isArray(body.heroIds) ? body.heroIds : []), body.seq, now, id).run();
    return json({ ok: true, revision: session.revision + 1, handledSeq: Math.max(session.handled_seq, Number(body.seq)) });
  }
  if (body.op === "assign") {
    if (!authorized(session, supplied, "host") || typeof body.heroId !== "string") return json({ error: "Host authorization failed." }, 403);
    const heroIds = parseJson<string[]>(session.hero_ids, []);
    if (!heroIds.includes(body.heroId)) return json({ error: "Unknown hero." }, 400);
    await db.prepare("UPDATE multiplayer_sessions SET assigned_hero_id = ?, revision = revision + 1, updated_at = ? WHERE id = ?").bind(body.heroId, now, id).run();
    return json({ ok: true });
  }
  if (body.op === "command") {
    if (!authorized(session, supplied, "guest")) return json({ error: "Guest authorization failed." }, 403);
    if (session.command_seq > session.handled_seq) return json({ error: "Your previous action is still updating." }, 409);
    const command = body.command as Record<string, unknown> | undefined;
    if (!command || command.heroId !== session.assigned_hero_id) return json({ error: "That action is not allowed." }, 400);
    if (command.type === "state") {
      if (!Number.isInteger(command.baseRevision) || Number(command.baseRevision) !== session.revision)
        return json({ error: "The game changed before that action arrived. Your screen is resyncing." }, 409);
      const snapshot = command.snapshot as Record<string, unknown> | undefined;
      const expectedHeroIds = parseJson<string[]>(session.hero_ids, []).sort(), submittedHeroIds = Array.isArray(snapshot?.heroIds) ? [...snapshot.heroIds].filter((id): id is string => typeof id === "string").sort() : [];
      const units = Array.isArray(snapshot?.units) ? snapshot.units as Record<string, unknown>[] : [];
      const serialized = snapshot ? JSON.stringify(snapshot) : "";
      if (!snapshot || snapshot.campaign !== true || !units.some((unit) => unit.id === session.assigned_hero_id) || JSON.stringify(submittedHeroIds) !== JSON.stringify(expectedHeroIds) || serialized.length > 2_000_000)
        return json({ error: "That shared turn state is invalid." }, 400);
    } else {
      if (!["move", "attack"].includes(String(command.type)) || !Number.isInteger(command.x) || !Number.isInteger(command.y)) return json({ error: "That action is not allowed." }, 400);
      if (Number(command.x) < 0 || Number(command.y) < 0 || Number(command.x) > 200 || Number(command.y) > 200) return json({ error: "That square is outside the map." }, 400);
    }
    const nextSeq = session.command_seq + 1;
    await db.prepare("UPDATE multiplayer_sessions SET command_seq = ?, command_json = ?, updated_at = ? WHERE id = ?").bind(nextSeq, JSON.stringify({ ...command, seq: nextSeq }), now, id).run();
    return json({ ok: true, seq: nextSeq });
  }
  if (body.op === "ack") {
    if (!authorized(session, supplied, "host") || !Number.isInteger(body.seq)) return json({ error: "Host authorization failed." }, 403);
    await db.prepare("UPDATE multiplayer_sessions SET handled_seq = MAX(handled_seq, ?), updated_at = ? WHERE id = ?").bind(body.seq, now, id).run();
    return json({ ok: true });
  }
  return json({ error: "Unknown operation." }, 400);
}
