import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("two-player sessions commit complete guest turns while the host runs autonomous state", async () => {
  const [page, hook, route, schema, hosting, deferredEffect, multiplayerRuntime] = await Promise.all([
    read("app/page.tsx"),
    read("app/use-multiplayer-session.tsx"),
    read("app/api/multiplayer/route.ts"),
    read("db/schema.ts"),
    read(".openai/hosting.json"),
    read("app/use-deferred-effect.ts"),
    read("app/multiplayer-runtime.ts"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(schema, /multiplayerSessions[\s\S]*hostToken[\s\S]*guestToken[\s\S]*commandSeq[\s\S]*handledSeq/);
  assert.match(route, /command\.type === "state"/);
  assert.match(route, /command\.baseRevision[\s\S]*session\.revision/);
  assert.match(route, /submittedHeroIds[\s\S]*expectedHeroIds/);
  assert.match(route, /command\.heroId !== session\.assigned_hero_id/);
  assert.match(route, /supplied === session\.guest_token[\s\S]*guest_connected_at[\s\S]*guestOnline/);
  assert.match(schema, /dialogueClaimJson[\s\S]*dialogueClaimRevision/);
  assert.match(route, /body\.op === "claim_dialogue"[\s\S]*dialogue_claim_revision IS NULL OR dialogue_claim_revision != \?/);
  assert.match(route, /role === "guest" && claim\.claimantHeroId !== session\.assigned_hero_id/);
  assert.match(hook, /claimDialogueChoice[\s\S]*op: "claim_dialogue"[\s\S]*baseRevision: revision\.current/);
  assert.match(page, /chooseSharedEncounterResponse[\s\S]*claimDialogueChoice[\s\S]*if \(result\.accepted\)[\s\S]{0,160}resolveScriptedEncounterChoice/);
  assert.match(hook, /multiplayer-session[\s\S]*localStorage\.getItem\(persistedSessionKey\)[\s\S]*setStatus\("RECONNECTING"\)/);
  assert.match(hook, /role: "host", id, secret: hostToken, shareUrl: nextShareUrl/);
  assert.match(page, /onlineDialogueHero[\s\S]*Your character must be present to answer for the party/);
  assert.match(page, /mirroredDialogueClaimRef[\s\S]*claim\.sceneKey[\s\S]*resolveScriptedEncounterChoice\(choice, claim\.speakerHeroId\)/);
  assert.match(hook, /payload\.guestOnline[\s\S]*setGuestConnected/);
  assert.match(hook, /PLAYER 2 ONLINE[\s\S]*PLAYER 2 OFFLINE/);
  assert.match(hook, /useEffect\(\(\) => \{[\s\S]*params\.get\("join"\)[\s\S]*hash\.get\("guest"\)[\s\S]*setRole\("guest"\)/);
  assert.match(hook, /hash\.get\("guest"\) \|\| queryGuestToken/);
  assert.match(hook, /\?join=\$\{encodeURIComponent\(id\)\}#guest=\$\{encodeURIComponent\(nextGuestSecret\)\}/);
  assert.match(hook, /api\(\{ op: "poll", id: sessionId, token: secret \}\)/);
  assert.doesNotMatch(hook, /setInterval\(\(\) => void poll/);
  assert.match(route, /body\.op === "poll"[\s\S]*sessionResponse/);
  assert.match(route, /body\.op === "resolve"[\s\S]*handled_seq = \?/);
  assert.match(route, /body\.op === "publish"[\s\S]*session\.command_seq > session\.handled_seq[\s\S]*guest turn is still updating/, "host snapshots must not race a pending guest turn");
  assert.match(route, /body\.op === "resolve"[\s\S]*pendingCommand\.baseRevision !== session\.revision/, "guest snapshots must commit against their accepted revision");
  assert.match(route, /WHERE id = \? AND revision = \? AND command_seq = \? AND handled_seq < \?/, "guest resolution must atomically claim the exact pending command");
  assert.match(route, /command_json = NULL/, "committed guest commands must not remain replayable");
  assert.match(hook, /pendingGuestCommand\.current > 0[\s\S]*setRequestPending\(false\)/);
  assert.match(hook, /addEventListener\("shattered-crown-save", submitGuestState\)/);
  assert.match(hook, /type: "state"[\s\S]*baseRevision: revision\.current[\s\S]*snapshot: JSON\.parse\(queued\)/);
  assert.match(hook, /multiplayer-locked[\s\S]*assignedHeroId !== activeHeroId/);
  assert.match(hook, /Action sent\. Updating both screens/);
  assert.doesNotMatch(hook, /host is resolving your action/i);
  assert.match(hook, /Collapse two player panel[\s\S]*onClick=\{\(\) => setOpen\(false\)\}/);
  assert.doesNotMatch(hook, /multiplayer\.role !== "solo"\) setOpen\(true\)/);
  assert.match(hook, /<span>2 PLAYER<\/span><b>\{compactStatus\}<\/b><i>MANAGE<\/i>/);
  assert.match(hook, /End 2 Player Session/);
  assert.doesNotMatch(hook, /multiplayer\.role === "solo" \? setOpen\(false\) : multiplayer\.stop\(\)/);
  assert.match(hook, /guestReady[\s\S]*JOINING SHARED GAME/);
  assert.doesNotMatch(page, /multiplayer\.role === "guest"[\s\S]{0,200}sendIntent/);
  assert.match(page, /multiplayer\.role !== "host"[\s\S]*command\.type === "state"[\s\S]*active\?\.id !== command\.heroId/);
  assert.doesNotMatch(hook, /activeHeroId !== assignedHeroId/);
  assert.match(page, /command\.type === "state"[\s\S]*continueCampaign\(command\.snapshot\)[\s\S]*acknowledge\(command\.seq, command\.snapshot\)/);
  assert.match(hook, /acknowledge = async \(seq: number, resolvedSnapshot\?: unknown\)/);
  assert.match(hook, /snapshot = resolvedSnapshot === undefined \? JSON\.parse\(raw\) : resolvedSnapshot[\s\S]*op: "resolve"/);
  assert.match(page, /movementSpent,[\s\S]*dashActive,[\s\S]*localStorage\.setItem\(CAMPAIGN_SAVE_KEY/);
  assert.match(page, /setMovementSpent\(normalizeMovementCost\(s\.movementSpent \|\| 0\)\); setDashActive\(!!s\.dashActive\)/);
  assert.match(page, /onGuestSnapshot: \(snapshot\) => continueCampaign\(snapshot\)/);
  assert.doesNotMatch(page, /onGuestSnapshot:[\s\S]{0,200}localStorage\.setItem\(CAMPAIGN_SAVE_KEY/);
  assert.match(hook, /snapshotHandler\.current\(payload\.snapshot\)/);
  assert.match(hook, /complete turn for one assigned hero/);
  assert.match(hook, /movement, abilities, items, facing, or end the turn/);
  assert.match(multiplayerRuntime, /guestReplicaActive/);
  assert.match(deferredEffect, /!isGuestReplicaActive\(\)/);
  assert.match(page, /hostWaitingForPlayerTwo[\s\S]*multiplayer\.guestConnected/);
  assert.match(page, /!hostWaitingForPlayerTwo && <aside className="panel command">/);
});

test("multiplayer has a dedicated status-menu slot and inspector controls stay out of the way", async () => {
  const [styles, inspector, page, objectiveTracker] = await Promise.all([
    read("app/globals.css"),
    read("app/unit-inspector-overlay.tsx"),
    read("app/page.tsx"),
    read("app/objective-tracker.tsx"),
  ]);
  assert.match(styles, /\.game-status-row \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) 340px/);
  const dockRule = styles.match(/\.multiplayer-tab,\s*\.multiplayer-dock \{([^}]*)\}/)?.[1] || "";
  assert.match(dockRule, /position: relative/);
  assert.doesNotMatch(dockRule, /position: fixed/);
  assert.match(page, /game-status-row[\s\S]*<ObjectiveTracker[\s\S]*<MultiplayerDock/);
  assert.match(objectiveTracker, /className=\{`objective-tracker/);
  assert.doesNotMatch(styles, /\.multiplayer-guest \.panel\.command button \{ display: none/);
  assert.match(styles, /\.multiplayer-guest\.multiplayer-locked \.game-shell \{ pointer-events: none/);
  assert.match(styles, /\.multiplayer-guest \.queued-notice,[\s\S]*\.multiplayer-guest \.game-feedback \{ pointer-events: auto/);
  assert.match(page, /notice\?\.kind === "narration" && notice\.onDismiss[\s\S]*scheduleCutscene\(notice\.onDismiss, 0\)/);
  assert.match(styles, /\.multiplayer-guest\.multiplayer-locked \.panel\.command \{ display: none/);
  assert.match(inspector, /event\.key !== "Enter"[\s\S]*onClose\(\)/);
});
