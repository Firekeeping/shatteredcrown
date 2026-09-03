"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setGuestReplicaActive } from "./multiplayer-runtime";

export type MultiplayerCommand =
  | { seq: number; type: "state"; heroId: string; snapshot: unknown; baseRevision: number }
  | { seq: number; type: "move" | "attack"; heroId: string; x: number; y: number };
type HeroChoice = { id: string; name: string; role: string };
type Role = "solo" | "host" | "guest";
export type DialogueClaim = { sceneKey: string; choiceId: string; choiceLabel: string; claimantHeroId: string; speakerHeroId: string; claimantRole: "host" | "guest"; baseRevision: number };

const api = async (body: Record<string, unknown>) => {
  const response = await fetch("/api/multiplayer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error || "Multiplayer request failed."));
  return payload;
};

export function useMultiplayerSession({ saveKey, heroes, activeHeroId, onGuestSnapshot }: {
  saveKey: string;
  heroes: HeroChoice[];
  activeHeroId: string | null;
  onGuestSnapshot: (snapshot: unknown) => void;
}) {
  const [role, setRole] = useState<Role>("solo"), [sessionId, setSessionId] = useState(""), [secret, setSecret] = useState(""),
    [assignedHeroId, setAssignedHeroId] = useState<string | null>(null),
    [shareUrl, setShareUrl] = useState(""), [status, setStatus] = useState("OFFLINE"), [error, setError] = useState<string | null>(null),
    [pendingCommand, setPendingCommand] = useState<MultiplayerCommand | null>(null), [requestPending, setRequestPending] = useState(false), [dialogueClaimPending, setDialogueClaimPending] = useState(false), [dialogueClaim, setDialogueClaim] = useState<DialogueClaim | null>(null), [guestConnected, setGuestConnected] = useState(false), [guestReady, setGuestReady] = useState(false);
  const snapshotHandler = useRef(onGuestSnapshot), revision = useRef(0), seenCommand = useRef(0), pendingGuestCommand = useRef(0), lastPublishedSnapshot = useRef(""), lastReceivedSnapshot = useRef(""), queuedGuestSnapshot = useRef(""), guestSubmitting = useRef(false), acceptingHostSnapshot = useRef(false), assignedHero = useRef(assignedHeroId), replicaReady = useRef(guestReady);
  const persistedSessionKey = `${saveKey}:multiplayer-session`;
  assignedHero.current = assignedHeroId; replicaReady.current = guestReady;
  useEffect(() => {
    const params = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
    const queryGuestToken = params.get("guest") || "";
    const joinId = params.get("join") || "", guestToken = hash.get("guest") || queryGuestToken;
    if (!joinId || !guestToken) {
      try { const saved = JSON.parse(localStorage.getItem(persistedSessionKey) || "null") as { role?: Role; id?: string; secret?: string; shareUrl?: string } | null; if (saved?.role && saved.role !== "solo" && saved.id && saved.secret) { setRole(saved.role); setSessionId(saved.id); setSecret(saved.secret); setShareUrl(saved.shareUrl || ""); setStatus("RECONNECTING"); } } catch { localStorage.removeItem(persistedSessionKey); }
      return;
    }
    // Older guest links put the credential in the query string. Move it into
    // the fragment immediately so it is not sent in request URLs or referrers.
    if (queryGuestToken) history.replaceState({}, "", `${location.pathname}?join=${encodeURIComponent(joinId)}#guest=${encodeURIComponent(guestToken)}`);
    localStorage.setItem(persistedSessionKey, JSON.stringify({ role: "guest", id: joinId, secret: guestToken })); setSessionId(joinId); setSecret(guestToken); setRole("guest"); setStatus("CONNECTING");
  }, [persistedSessionKey]);
  useEffect(() => { snapshotHandler.current = onGuestSnapshot; }, [onGuestSnapshot]);
  useEffect(() => {
    setGuestReplicaActive(role === "guest");
    document.body.classList.toggle("multiplayer-guest", role === "guest");
    document.body.classList.toggle("multiplayer-locked", role === "guest" && (!guestReady || requestPending || !assignedHeroId || assignedHeroId !== activeHeroId));
    return () => {
      if (role === "guest") setGuestReplicaActive(false);
      document.body.classList.remove("multiplayer-guest");
      document.body.classList.remove("multiplayer-locked");
    };
  }, [role, guestReady, requestPending, assignedHeroId, activeHeroId]);

  const publish = useCallback(async () => {
    if (role !== "host" || !sessionId || !secret) return;
    const raw = localStorage.getItem(saveKey);
    if (!raw || raw === lastPublishedSnapshot.current) return;
    try {
      const payload = await api({ op: "publish", id: sessionId, token: secret, snapshot: JSON.parse(raw), heroIds: heroes.map((hero) => hero.id) }); revision.current = Number(payload.revision || revision.current);
      lastPublishedSnapshot.current = raw;
      setStatus("LIVE"); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the guest."); setStatus("RECONNECTING"); }
  }, [role, sessionId, secret, saveKey, heroes]);

  useEffect(() => {
    if (role !== "host") return;
    const onSave = () => void publish();
    window.addEventListener("shattered-crown-save", onSave);
    const timer = setInterval(() => void publish(), 2500);
    return () => { window.removeEventListener("shattered-crown-save", onSave); clearInterval(timer); };
  }, [role, publish]);

  useEffect(() => {
    if (role === "solo" || !sessionId || !secret) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const payload = await api({ op: "poll", id: sessionId, token: secret }) as { snapshot?: unknown; revision?: number; assignedHeroId?: string | null; command?: MultiplayerCommand | null; handledSeq?: number; guestOnline?: boolean; dialogueClaim?: DialogueClaim | null };
        if (cancelled) return;
        setAssignedHeroId(payload.assignedHeroId || null); setDialogueClaim(payload.dialogueClaim || null); setStatus("LIVE"); setError(null); if (role === "host") revision.current = Number(payload.revision || revision.current);
        if (role === "host") setGuestConnected(!!payload.guestOnline);
        if (role === "guest" && payload.snapshot && Number(payload.revision) > revision.current) {
          revision.current = Number(payload.revision); lastReceivedSnapshot.current = JSON.stringify(payload.snapshot); acceptingHostSnapshot.current = true; snapshotHandler.current(payload.snapshot); setGuestReady(true);
        }
        if (role === "host" && payload.command && payload.command.seq > seenCommand.current) {
          seenCommand.current = payload.command.seq; setPendingCommand(payload.command);
        }
        if (role === "guest" && pendingGuestCommand.current > 0 && Number(payload.handledSeq) >= pendingGuestCommand.current) {
          pendingGuestCommand.current = 0; guestSubmitting.current = false; setRequestPending(false);
        }
      } catch (cause) {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : "Connection interrupted.";
          setStatus("RECONNECTING"); setError(message === "Failed to fetch" ? "Connection interrupted. Retrying…" : message);
        }
      } finally {
        if (!cancelled) timer = setTimeout(() => void poll(), role === "host" ? 650 : 400);
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [role, sessionId, secret]);

  useEffect(() => {
    if (role !== "guest" || !sessionId || !secret) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const submitGuestState = () => {
      const raw = localStorage.getItem(saveKey), heroId = assignedHero.current;
      if (!raw) return;
      if (acceptingHostSnapshot.current) { acceptingHostSnapshot.current = false; lastReceivedSnapshot.current = raw; return; }
      if (!replicaReady.current || !heroId) return;
      if (raw === lastReceivedSnapshot.current) return;
      if (guestSubmitting.current) { if (!pendingGuestCommand.current) queuedGuestSnapshot.current = raw; return; }
      queuedGuestSnapshot.current = raw; guestSubmitting.current = true; setRequestPending(true);
      timer = setTimeout(async () => {
        const queued = queuedGuestSnapshot.current;
        try {
          const payload = await api({ op: "command", id: sessionId, token: secret, command: { type: "state", heroId, baseRevision: revision.current, snapshot: JSON.parse(queued) } });
          pendingGuestCommand.current = Number(payload.seq || 0); setError(null);
        } catch (cause) {
          pendingGuestCommand.current = 0; guestSubmitting.current = false; setRequestPending(false); setStatus("RECONNECTING");
          setError(cause instanceof Error ? cause.message : "The shared game did not receive that action.");
          try { if (lastReceivedSnapshot.current) snapshotHandler.current(JSON.parse(lastReceivedSnapshot.current)); } catch { /* The next poll repairs the replica. */ }
        }
      }, 80);
    };
    window.addEventListener("shattered-crown-save", submitGuestState);
    return () => { window.removeEventListener("shattered-crown-save", submitGuestState); if (timer) clearTimeout(timer); };
  }, [role, sessionId, secret, saveKey]);

  const startHosting = async () => {
    const raw = localStorage.getItem(saveKey);
    if (!raw || !heroes.length) { setError("Start or continue a campaign before opening multiplayer."); return; }
    try {
      setStatus("OPENING");
      const payload = await api({ op: "create", snapshot: JSON.parse(raw), heroIds: heroes.map((hero) => hero.id), assignedHeroId: heroes[1]?.id || heroes[0].id });
      const id = String(payload.id), hostToken = String(payload.hostToken), nextGuestSecret = String(payload.guestToken);
      lastPublishedSnapshot.current = raw;
      revision.current = Number(payload.revision || 1);
      setRole("host"); setSessionId(id); setSecret(hostToken); setAssignedHeroId(String(payload.assignedHeroId || heroes[0].id)); setGuestConnected(false);
      const nextShareUrl = `${location.origin}${location.pathname}?join=${encodeURIComponent(id)}#guest=${encodeURIComponent(nextGuestSecret)}`;
      localStorage.setItem(persistedSessionKey, JSON.stringify({ role: "host", id, secret: hostToken, shareUrl: nextShareUrl })); setShareUrl(nextShareUrl); setStatus("LIVE"); setError(null);
    } catch (cause) { setStatus("OFFLINE"); setError(cause instanceof Error ? cause.message : "Could not open multiplayer."); }
  };
  const assignHero = async (heroId: string) => {
    setAssignedHeroId(heroId);
    try { await api({ op: "assign", id: sessionId, token: secret, heroId }); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not assign that hero."); }
  };
  const acknowledge = async (seq: number, resolvedSnapshot?: unknown) => {
    if (resolvedSnapshot === undefined) await new Promise<void>((resolve) => {
      const finish = () => { clearTimeout(timer); window.removeEventListener("shattered-crown-save", finish); resolve(); };
      const timer = setTimeout(finish, 1200);
      window.addEventListener("shattered-crown-save", finish, { once: true });
    });
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) throw new Error("The shared campaign could not be updated.");
      const snapshot = resolvedSnapshot === undefined ? JSON.parse(raw) : resolvedSnapshot;
      await api({ op: "resolve", id: sessionId, token: secret, seq, snapshot, heroIds: heroes.map((hero) => hero.id) });
      lastPublishedSnapshot.current = JSON.stringify(snapshot); setPendingCommand(null); setStatus("LIVE"); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the shared action."); }
  };
  const claimDialogueChoice = async (claim: Omit<DialogueClaim, "claimantRole" | "baseRevision">) => {
    if (role === "solo") return { accepted: true, dialogueClaim: { ...claim, claimantRole: "host" as const, baseRevision: revision.current } };
    setDialogueClaimPending(true);
    try { const payload = await api({ op: "claim_dialogue", id: sessionId, token: secret, baseRevision: revision.current, claim }) as { accepted: boolean; dialogueClaim: DialogueClaim | null }; setDialogueClaim(payload.dialogueClaim); setError(null); return payload; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit that answer."); return { accepted: false, dialogueClaim: null }; }
    finally { setDialogueClaimPending(false); }
  };
  const stop = () => {
    localStorage.removeItem(persistedSessionKey); history.replaceState({}, "", location.pathname); setGuestReplicaActive(false); setRole("solo"); setSessionId(""); setSecret(""); setShareUrl(""); setStatus("OFFLINE"); setPendingCommand(null); setRequestPending(false); setDialogueClaimPending(false); setDialogueClaim(null); setError(null); setGuestConnected(false); setGuestReady(false); revision.current = 0; seenCommand.current = 0; pendingGuestCommand.current = 0; lastPublishedSnapshot.current = ""; lastReceivedSnapshot.current = ""; queuedGuestSnapshot.current = ""; guestSubmitting.current = false; acceptingHostSnapshot.current = false;
  };
  return { role, status, error, sessionId, shareUrl, assignedHeroId, requestPending, dialogueClaimPending, dialogueClaim, pendingCommand, guestConnected, guestReady, startHosting, assignHero, acknowledge, claimDialogueChoice, stop };
}

export function MultiplayerDock({ multiplayer, heroes, activeHeroId }: {
  multiplayer: ReturnType<typeof useMultiplayerSession>;
  heroes: HeroChoice[];
  activeHeroId: string | null;
}) {
  const [open, setOpen] = useState(false), [copied, setCopied] = useState(false);
  const assigned = heroes.find((hero) => hero.id === multiplayer.assignedHeroId);
  if (multiplayer.role === "guest" && !multiplayer.guestReady) return <div className="multiplayer-joining" role="status"><b>JOINING SHARED GAME…</b><span>{multiplayer.error || "Loading the live campaign. Do not start a separate campaign."}</span></div>;
  const compactStatus = multiplayer.role === "host" ? multiplayer.guestConnected ? "PLAYER 2 ONLINE" : "WAITING FOR PLAYER 2" : multiplayer.role === "guest" ? multiplayer.requestPending ? "UPDATING BOTH SCREENS" : "CONNECTED" : "SET UP A SESSION";
  if (!open) return <button className={`multiplayer-tab ${multiplayer.role !== "solo" ? "session-active" : ""}`} onClick={() => setOpen(true)} aria-expanded="false"><span>2 PLAYER</span><b>{compactStatus}</b><i>MANAGE</i></button>;
  return (
    <section className="multiplayer-dock" aria-label="Two player session">
      <button className="multiplayer-dock-close" aria-label="Collapse two player panel" onClick={() => setOpen(false)}>×</button>
      <p>ONLINE PARTY · {multiplayer.status}</p>
      {multiplayer.role === "solo" ? <>
        <b>Host a two-player session</b><span>Your friend gets the complete turn for one assigned hero. Both screens sync after every committed action.</span>
        <button onClick={multiplayer.startHosting}>Create Guest Link</button>
      </> : multiplayer.role === "host" ? <>
        <b>HOST · ROOM {multiplayer.sessionId}</b>
        <span className={multiplayer.guestConnected ? "guest-connected" : "guest-offline"}>{multiplayer.guestConnected ? "● PLAYER 2 ONLINE" : "○ PLAYER 2 OFFLINE · Waiting for guest link"}</span>
        <label>Guest controls<select value={multiplayer.assignedHeroId || ""} onChange={(event) => multiplayer.assignHero(event.target.value)}>{heroes.map((hero) => <option value={hero.id} key={hero.id}>{hero.name} · {hero.role}</option>)}</select></label>
        <button onClick={async () => { await navigator.clipboard.writeText(multiplayer.shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy Guest Link"}</button>
      </> : <>
        <b>{assigned ? `YOU CONTROL ${assigned.name.toUpperCase()}` : "WAITING FOR HERO ASSIGNMENT"}</b>
        <span>{assignedHeroIdStatus(assigned?.id, activeHeroId, multiplayer.requestPending)}</span>
      </>}
      {multiplayer.error && <small>{multiplayer.error}</small>}
      {multiplayer.role !== "solo" && <button className="multiplayer-end" onClick={() => { multiplayer.stop(); setOpen(false); }}>End 2 Player Session</button>}
    </section>
  );
}

const assignedHeroIdStatus = (assigned: string | undefined, active: string | null, pending: boolean) => pending ? "Action sent. Updating both screens…" : !assigned ? "Your hero has not been assigned yet." : assigned === active ? "Your turn. Use movement, abilities, items, facing, or end the turn." : "Waiting for your hero's turn.";
