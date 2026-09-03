import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const setup = await readFile(new URL("../app/dust2-freeplay-setup.tsx", import.meta.url), "utf8");
const runtime = await readFile(new URL("../app/dust2-freeplay-runtime.ts", import.meta.url), "utf8");
const playerView = await readFile(new URL("../app/use-battlefield-player-view.ts", import.meta.url), "utf8");
const objectiveTracker = await readFile(new URL("../app/objective-tracker.tsx", import.meta.url), "utf8");
const result = await readFile(new URL("../app/dust2-freeplay-result.tsx", import.meta.url), "utf8");

test("the main menu exposes Freeplay separately from Map Lab and dungeon Level 2", () => {
  assert.match(page, /Dust 2 Map Lab/);
  assert.match(page, /Dust 2 Freeplay/);
  assert.match(page, /stage === "dust2-freeplay-setup"/);
  assert.match(page, /setDust2FreeplayTeam\(null\)[\s\S]*setDust2FreeplayMatch\(null\)/);
});

test("Freeplay setup chooses either side, up to eight characters, with no John Wick", () => {
  assert.match(setup, /Dungeoneers/);
  assert.match(setup, /Counter-Dungeoneers/);
  assert.match(setup, /DUST2_MAX_TEAM_SIZE/);
  assert.match(setup, /There is no round timer/);
  assert.match(page, /filter\(\(name\) => name !== "John Wick"\)/);
  assert.match(runtime, /filter\(\(unit\) => unit\.name !== "John Wick"\)/);
});

test("Freeplay deploys the selected faction and a complete opposing squad", () => {
  assert.match(page, /startDust2Freeplay = \(team: Dust2TeamId, characterIds: string\[\]\)/);
  assert.match(page, /setEncounterMode\("combat"\)/);
  assert.match(page, /createDust2FreeplayMatch\("dungeoneers"\)/);
  assert.match(page, /sides switch after every round/i);
  assert.match(runtime, /characterIds\.slice\(0, DUST2_MAX_TEAM_SIZE\)/);
});

test("defenders can perform and interrupt a live two-action defuse", () => {
  assert.match(page, /dust2ActiveCanDefuse/);
  assert.match(page, /advanceDust2Defuse\(dust2Objective, active\.id\)/);
  assert.match(page, /cancelDust2Defuse\(state, active\.id\)/);
  assert.match(setup, /2<\/b> actions to defuse/);
});

test("every living defender receives the same two-action Defuse ability without a kit", () => {
  assert.match(page, /dust2ActiveCanDefuse/);
  assert.match(page, /!active\.downed && !unitCannotAct\(active\) && dust2ActiveFaction/);
  assert.match(page, /advanceDust2Defuse\(state, active\.id\)/);
  assert.doesNotMatch(page, /Defusal Kit/);
  assert.doesNotMatch(runtime, /Defusal Kit/);
});

test("Freeplay scores rounds, swaps sides, resets combatants, and stops at three wins", () => {
  assert.match(page, /completeDust2FreeplayRound\(dust2FreeplayMatch, dust2RoundWinner\)/);
  assert.match(runtime, /dust2TeamSide\(match, faction\) === "attack"/);
  assert.match(runtime, /hp:unit\.maxHp, downed:false/);
  assert.match(page, /ROUND \$\{nextMatch\.round\} · SIDES SWITCHED/);
  assert.match(page, /DUNGEONEERS \$\{dust2FreeplayMatch\.scores\.dungeoneers\}/);
});

test("attacker AI recovers the Flag, chooses a site, and plants it", () => {
  const manualDeployment = page.slice(page.indexOf("const place ="), page.indexOf("const positionOccupied"));
  const enemyTurn = page.slice(page.indexOf("const normalizedActive ="), page.indexOf("const readyCharge =", page.indexOf("const normalizedActive =")));
  assert.match(runtime, /dust2ObjectiveAiPlan/);
  assert.match(runtime, /action:"recover"/);
  assert.match(runtime, /action:"plant"/);
  assert.doesNotMatch(manualDeployment, /dust2ObjectiveAiPlan/, "objective behavior cannot live in the manual placement handler");
  assert.match(enemyTurn, /dust2ObjectiveAiPlan/);
  assert.match(enemyTurn, /objectivePlan\.action === "recover" \? pickUpDust2Flag/);
  assert.match(enemyTurn, /plantDust2Flag\(state, active\.id/);
  assert.match(enemyTurn, /routeTo\(active, objectivePlan\.target\.x, objectivePlan\.target\.y, true\)/, "objective squads must be able to route through allies");
  assert.match(enemyTurn, /const advanced = arrived \|\| movement\.mover\.x !== active\.x \|\| movement\.mover\.y !== active\.y/);
  assert.match(enemyTurn, /if \(advanced\)/, "a blocked objective route must fall through to ordinary combat AI");
  assert.match(enemyTurn, /finishTurnRef\.current\(\)/, "an objective action must release the live enemy turn");
});

test("unengaged attackers escort their Flag carrier instead of stalling", () => {
  assert.match(runtime, /const escorts = units\.filter/);
  assert.match(runtime, /action:"escort"/);
  assert.match(runtime, /x:carrier\.x \+ dx, y:carrier\.y \+ dy/);
  assert.match(page, /escorts the Flag carrier/);
});

test("defender AI routes to a planted Flag and completes its defuse", () => {
  assert.match(runtime, /action:"defuse"/);
  assert.match(runtime, /const primaryDefuser = units\.filter/);
  assert.match(runtime, /primaryDefuser\?\.id === active\.id/);
  assert.match(page, /objectivePlan\.action === "defuse" \? advanceDust2Defuse/);
  assert.match(page, /begins defusing the Flag/);
  assert.match(page, /finishes defusing the Flag/);
});

test("allies may be crossed but cannot share a destination", () => {
  const movementField = page.slice(page.indexOf("const movementCostByState ="), page.indexOf("const maxReach ="));
  assert.match(movementField, /unit\.team !== active\.team/, "allies must not block movement-cost routing");
  assert.match(movementField, /!occupied\(x, y\)/, "an occupied destination must remain unavailable");
});

test("unengaged defenders split between A and B until they see an attacker", () => {
  assert.match(runtime, /if \(enemyVisible\) return null/);
  assert.match(runtime, /index % 2 \? DUST2_FLAG_SITES\.B : DUST2_FLAG_SITES\.A/);
  assert.match(runtime, /action:"guard"/);
  assert.match(page, /monsterCanPerceive\(active[\s\S]*clearLine\(active, unit\)/);
  assert.match(page, /guards Site/);
});

test("Freeplay forces active-character vision with separate exploration memory", () => {
  assert.match(page, /scopeOverride:dust2FreeplayActive \? "selected"/);
  assert.match(page, /memoryNamespace:dust2FreeplayActive \? active\?\.id/);
  assert.match(playerView, /effectiveScope === "selected" \? selected\?\.id : memoryNamespace/, "enemy turns must retain the actual player's vision-memory namespace");
});

test("downed carriers drop the Flag and attacker AI reroutes to it", () => {
  assert.match(page, /dropDust2Flag\(state, carrier\.id, carrier\)/);
  assert.match(page, /dust2LooseFlagPosition\(dust2Objective\)/);
  assert.match(runtime, /target:dust2LooseFlagPosition\(objective\)!/);
});

test("defuse progress cancels on another action, incapacitation, or displacement", () => {
  assert.match(page, /if \(!defuser \|\| defuser\.downed \|\| unitCannotAct\(defuser\)/, "removed and incapacitated defenders must lose progress");
  assert.match(page, /defuser\.downed/);
  assert.match(page, /attackDist\(defuser, dust2PlantedSitePoint\) > 1/);
  assert.match(page, /!!chosen \|\| phase === "facing"/);
  assert.match(page, /cancelDust2Defuse\(state, defuserId\)/);
});

test("the Freeplay HUD shows the active side and live defuse progress", () => {
  assert.match(page, /sideLabel=.*dust2TeamSide/);
  assert.match(page, /defuserName=.*defusingActorId/);
  assert.match(objectiveTracker, /is defusing ·.*defuseActions.*\/2 actions/);
});

test("The One True Flag visibly grants its carrier +1 attack and +1 AC", () => {
  assert.match(page, /dust2FlagCarrierBonus\(dust2Objective, target\.id\)/);
  assert.match(page, /dust2FlagCarrierBonus\(dust2Objective, a\.id\)/);
  assert.match(page, /flag-relic-bearer/);
});

test("a first-to-three Freeplay match ends with rematch, team, and menu choices", () => {
  assert.match(page, /dust2FreeplayMatch\?\.winner[\s\S]*<Dust2FreeplayResult/);
  assert.match(result, /Rematch · Same Team/);
  assert.match(result, /Change Team/);
  assert.match(result, /Main Menu/);
});
