import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const output = await build({
  entryPoints: [new URL("../app/dust2-freeplay-runtime.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);

const match = { round: 1, startingAttackers: "dungeoneers", scores: { dungeoneers: 0, "counter-dungeoneers": 0 }, winner: null };
const objective = (changes = {}) => ({ flagCarrierId: null, looseFlagPosition: { x: 15, y: 31 }, plantedSite: null, countdownArmed: false, turnsRemaining: 0, secured: false, defused: false, defusingActorId: null, defuseActions: 0, ...changes });
const attacker = (changes = {}) => ({ id: "attacker", x: 15, y: 30, downed: false, encounterGroup: "dust2-freeplay-dungeoneers", ...changes });

test("attacker AI targets the live loose Flag position", () => {
  const plan = runtime.dust2ObjectiveAiPlan(match, objective({ looseFlagPosition: { x: 20, y: 20 } }), attacker(), []);
  assert.deepEqual(plan, { action: "recover", target: { x: 20, y: 20 } });
});

test("only the Flag carrier receives a planting plan", () => {
  const carrier = attacker({ id: "carrier", x: 7, y: 6 });
  const state = objective({ flagCarrierId: "carrier", looseFlagPosition: null });
  assert.notEqual(runtime.dust2ObjectiveAiPlan(match, state, attacker({ id: "escort" }), [carrier]).action, "plant");
  assert.equal(runtime.dust2ObjectiveAiPlan(match, state, carrier, [carrier]).action, "plant");
});

test("the Flag carrier chooses the nearest planting site", () => {
  const carrier = attacker({ id: "carrier", x: 25, y: 7 });
  const plan = runtime.dust2ObjectiveAiPlan(match, objective({ flagCarrierId: "carrier", looseFlagPosition: null }), carrier, [carrier]);
  assert.equal(plan.target.id, "B");
});

test("defenders and resolved objectives never receive attacker objective actions", () => {
  const defender = attacker({ encounterGroup: "dust2-counter-squad" });
  assert.doesNotMatch(runtime.dust2ObjectiveAiPlan(match, objective(), defender, [defender]).action, /recover|plant/);
  assert.equal(runtime.dust2ObjectiveAiPlan(match, objective({ secured: true }), attacker(), []), null);
});

test("the nearest living defender is assigned to the planted Flag", () => {
  const planted = objective({ flagCarrierId: null, looseFlagPosition: null, plantedSite: "A", turnsRemaining: 24 });
  const near = attacker({ id: "near", x: 7, y: 5, encounterGroup: "dust2-counter-squad" });
  const far = attacker({ id: "far", x: 20, y: 20, encounterGroup: "dust2-counter-squad" });
  assert.equal(runtime.dust2ObjectiveAiPlan(match, planted, near, [far, near]).action, "defuse");
  assert.equal(runtime.dust2ObjectiveAiPlan(match, planted, far, [far, near]), null);
});

test("a downed nearest defender hands the defuse assignment to a living teammate", () => {
  const planted = objective({ flagCarrierId: null, looseFlagPosition: null, plantedSite: "B", turnsRemaining: 24 });
  const downed = attacker({ id: "downed", x: 26, y: 6, downed: true, encounterGroup: "dust2-counter-squad" });
  const living = attacker({ id: "living", x: 20, y: 10, encounterGroup: "dust2-counter-squad" });
  assert.equal(runtime.dust2ObjectiveAiPlan(match, planted, living, [downed, living]).action, "defuse");
});
