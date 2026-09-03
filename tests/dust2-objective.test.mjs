import test from "node:test";
import assert from "node:assert/strict";
import {
  DUST2_FLAG_START,
  DUST2_FLAG_SITES,
  advanceDust2FlagCountdown,
  createDust2ObjectiveState,
  dropDust2Flag,
  dust2LooseFlagPosition,
  dust2FlagCarrierBonus,
  dust2CountdownRounds,
  dust2FlagSiteAt,
  pickUpDust2Flag,
  plantDust2Flag,
} from "../app/dust2-objective.ts";
import { dust2PartyStarts } from "../app/dust2-map-data.ts";

test("The One True Flag starts at P32 directly behind a clear party deployment", () => {
  assert.deepEqual(DUST2_FLAG_START, { x: 15, y: 31 });
  assert.equal(dust2PartyStarts.some(([x, y]) => x === DUST2_FLAG_START.x && y === DUST2_FLAG_START.y), false);
});

test("a downed carrier drops the Flag at their actual square for recovery", () => {
  const carried = pickUpDust2Flag(createDust2ObjectiveState(), "koko");
  const dropped = dropDust2Flag(carried, "koko", { x:12, y:18 });
  assert.equal(dropped.flagCarrierId, null);
  assert.deepEqual(dust2LooseFlagPosition(dropped), { x:12, y:18 });
  const recovered = pickUpDust2Flag(dropped, "walker");
  assert.equal(recovered.flagCarrierId, "walker");
  assert.equal(recovered.looseFlagPosition, null);
});

test("Flag ownership cannot be stolen or dropped by a non-carrier", () => {
  const carried = pickUpDust2Flag(createDust2ObjectiveState(), "koko");
  assert.equal(pickUpDust2Flag(carried, "walker"), carried);
  assert.equal(dropDust2Flag(carried, "walker", { x:1, y:1 }), carried);
  assert.equal(carried.flagCarrierId, "koko");
});

test("a planted Flag cannot return to carried or loose state", () => {
  const carried = pickUpDust2Flag(createDust2ObjectiveState(), "koko");
  const planted = plantDust2Flag(carried, "koko", "A", 4);
  assert.equal(pickUpDust2Flag(planted, "walker"), planted);
  assert.equal(dropDust2Flag(planted, "koko", { x:12, y:18 }), planted);
  assert.equal(dust2LooseFlagPosition(planted), null);
});

test("the Flag bonus belongs only to the current carrier", () => {
  const carried = pickUpDust2Flag(createDust2ObjectiveState(), "koko");
  assert.equal(dust2FlagCarrierBonus(carried, "koko"), 1);
  assert.equal(dust2FlagCarrierBonus(carried, "walker"), 0);
  const dropped = dropDust2Flag(carried, "koko", { x:12, y:18 });
  assert.equal(dust2FlagCarrierBonus(dropped, "koko"), 0);
  const recovered = pickUpDust2Flag(dropped, "walker");
  assert.equal(dust2FlagCarrierBonus(recovered, "walker"), 1);
  assert.equal(dust2FlagCarrierBonus(plantDust2Flag(recovered, "walker", "B", 4), "walker"), 0);
});

test("Dust 2 exposes the exact G6 and AA7 planting sites", () => {
  assert.deepEqual(dust2FlagSiteAt(6, 5), DUST2_FLAG_SITES.A);
  assert.deepEqual(dust2FlagSiteAt(26, 6), DUST2_FLAG_SITES.B);
  assert.equal(dust2FlagSiteAt(6, 6), undefined);
});

test("The One True Flag starts its three-round clock with the next initiative turn", () => {
  const carried = pickUpDust2Flag(createDust2ObjectiveState(), "koko");
  const planted = plantDust2Flag(carried, "koko", "A", 4);
  assert.equal(planted.turnsRemaining, 12);
  assert.equal(planted.countdownArmed, false);
  const nextTurn = advanceDust2FlagCountdown(planted);
  assert.equal(nextTurn.countdownArmed, true, "the planting turn only arms the countdown");
  assert.equal(nextTurn.turnsRemaining, 12, "the next actor receives the first complete countdown turn");
  let state = nextTurn;
  for (let turn = 0; turn < 12; turn += 1) state = advanceDust2FlagCountdown(state);
  assert.equal(state.secured, true);
  assert.equal(dust2CountdownRounds(state, 4), 0);
});

test("the flag cannot be planted by a hero who is not carrying it", () => {
  const initial = createDust2ObjectiveState();
  assert.equal(plantDust2Flag(initial, "koko", "B", 8), initial);
});
