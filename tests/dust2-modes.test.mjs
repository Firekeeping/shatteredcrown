import test from "node:test";
import assert from "node:assert/strict";
import {
  DUST2_MAX_MATCH_ROUNDS,
  DUST2_MAX_TEAM_SIZE,
  DUST2_MODE_RULES,
  canJoinDust2Team,
  completeDust2FreeplayRound,
  createDust2FreeplayMatch,
  dust2TeamSide,
  dust2FreeplayRoundWinner,
} from "../app/dust2-modes.ts";
import {
  advanceDust2Defuse,
  cancelDust2Defuse,
  createDust2ObjectiveState,
  plantDust2Flag,
  pickUpDust2Flag,
} from "../app/dust2-objective.ts";

test("Dust 2 keeps Map Lab, dungeon Level 2, and freeplay as separate modes", () => {
  assert.deepEqual(Object.keys(DUST2_MODE_RULES), ["map-lab", "dungeon-level-two", "freeplay"]);
  assert.equal(DUST2_MODE_RULES["dungeon-level-two"].johnWick, "after-objective");
  assert.equal(DUST2_MODE_RULES.freeplay.johnWick, "never");
  assert.equal(DUST2_MODE_RULES.freeplay.hasRoundTimer, false);
  assert.equal(DUST2_MODE_RULES.freeplay.sharedTeamVision, false);
});

test("rounds end by activation, defuse, or team elimination", () => {
  const match = createDust2FreeplayMatch("dungeoneers");
  const alive = { dungeoneers: true, "counter-dungeoneers": true };
  assert.equal(dust2FreeplayRoundWinner(match, { plantedSite:"A", secured:true, defused:false }, alive), "dungeoneers");
  assert.equal(dust2FreeplayRoundWinner(match, { plantedSite:"A", secured:false, defused:true }, alive), "counter-dungeoneers");
  assert.equal(dust2FreeplayRoundWinner(match, { plantedSite:null, secured:false, defused:false }, { ...alive, dungeoneers:false }), "counter-dungeoneers");
  assert.equal(dust2FreeplayRoundWinner(match, { plantedSite:"A", secured:false, defused:false }, { ...alive, dungeoneers:false }), null, "a planted objective must still be defused");
  assert.equal(dust2FreeplayRoundWinner(match, { plantedSite:null, secured:false, defused:false }, { ...alive, "counter-dungeoneers":false }), "dungeoneers");
  assert.equal(dust2FreeplayRoundWinner(match, { plantedSite:"B", secured:false, defused:false }, { ...alive, "counter-dungeoneers":false }), "dungeoneers");
});

test("freeplay alternates attack and defense every round", () => {
  let match = createDust2FreeplayMatch("dungeoneers");
  assert.equal(dust2TeamSide(match, "dungeoneers"), "attack");
  match = completeDust2FreeplayRound(match, "dungeoneers");
  assert.equal(dust2TeamSide(match, "dungeoneers"), "defend");
  match = completeDust2FreeplayRound(match, "counter-dungeoneers");
  assert.equal(dust2TeamSide(match, "dungeoneers"), "attack");
});

test("freeplay is first to three and can last at most five rounds", () => {
  let match = createDust2FreeplayMatch();
  for (const winner of ["dungeoneers", "counter-dungeoneers", "dungeoneers", "counter-dungeoneers", "dungeoneers"])
    match = completeDust2FreeplayRound(match, winner);
  assert.equal(match.winner, "dungeoneers");
  assert.equal(match.round, DUST2_MAX_MATCH_ROUNDS);
  assert.deepEqual(match.scores, { dungeoneers: 3, "counter-dungeoneers": 2 });
});

test("a complete match swaps sides, permits defuse wins, and ends exactly at three", () => {
  let match = createDust2FreeplayMatch("dungeoneers");
  const winners = ["dungeoneers", "counter-dungeoneers", "counter-dungeoneers", "dungeoneers", "dungeoneers"];
  const expectedSides = ["attack", "defend", "attack", "defend", "attack"];
  winners.forEach((winner, index) => {
    assert.equal(dust2TeamSide(match, "dungeoneers"), expectedSides[index]);
    const attacker = dust2TeamSide(match, "dungeoneers") === "attack" ? "dungeoneers" : "counter-dungeoneers";
    const defender = attacker === "dungeoneers" ? "counter-dungeoneers" : "dungeoneers";
    const objectiveWinner = dust2FreeplayRoundWinner(match,
      winner === attacker
        ? { plantedSite:"A", secured:true, defused:false }
        : { plantedSite:"B", secured:false, defused:true },
      { dungeoneers:true, "counter-dungeoneers":true });
    assert.equal(objectiveWinner, winner === attacker ? attacker : defender);
    match = completeDust2FreeplayRound(match, winner);
  });
  assert.equal(match.winner, "dungeoneers");
  assert.deepEqual(match.scores, { dungeoneers:3, "counter-dungeoneers":2 });
});

test("each Dust 2 side accepts no more than eight characters", () => {
  assert.equal(DUST2_MAX_TEAM_SIZE, 8);
  assert.equal(canJoinDust2Team(7), true);
  assert.equal(canJoinDust2Team(8), false);
});

test("a planted flag takes two consecutive defender actions to defuse", () => {
  let objective = pickUpDust2Flag(createDust2ObjectiveState(), "attacker");
  objective = plantDust2Flag(objective, "attacker", "A", 8);
  objective = advanceDust2Defuse(objective, "defender");
  assert.equal(objective.defused, false);
  assert.equal(objective.defuseActions, 1);
  objective = advanceDust2Defuse(objective, "defender");
  assert.equal(objective.defused, true);
});

test("moving or taking another action cancels progress and every defender needs two actions", () => {
  let objective = pickUpDust2Flag(createDust2ObjectiveState(), "attacker");
  objective = plantDust2Flag(objective, "attacker", "B", 8);
  objective = advanceDust2Defuse(objective, "defender");
  objective = cancelDust2Defuse(objective, "defender");
  assert.equal(objective.defuseActions, 0);
  objective = advanceDust2Defuse(objective, "other-defender");
  assert.equal(objective.defused, false);
  assert.equal(objective.defuseActions, 1);
});

test("only the active defuser can have their progress cancelled", () => {
  let objective = pickUpDust2Flag(createDust2ObjectiveState(), "attacker");
  objective = plantDust2Flag(objective, "attacker", "A", 8);
  objective = advanceDust2Defuse(objective, "defender");
  assert.equal(cancelDust2Defuse(objective, "other-defender"), objective);
  const cancelled = cancelDust2Defuse(objective, "defender");
  assert.equal(cancelled.defusingActorId, null);
  assert.equal(cancelled.defuseActions, 0);
});
