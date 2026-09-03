import test from "node:test";
import assert from "node:assert/strict";
import {
  DUST2_UNDERPASS_SURFACE,
  canTraverseDust2Elevation,
  dust2DropFeet,
  dust2ForcedMoveDestination,
  dust2HasHighGround,
  dust2MeleeSpaceCompatible,
  dust2MoverStepCostSquares,
  dust2PositionElevation,
  dust2PositionState,
  dust2PreferredPositionAt,
  dust2RouteSummary,
  dust2SamePosition,
  dust2SharesSurface,
  dust2StepCostSquares,
  dust2TraversalNeighbors,
} from "../app/dust2-traversal.ts";
import { athleticSafeFallFeet, fallDiceForDrop } from "../app/elevation-rules.ts";
import { normalizeMovementCost } from "../app/combat-engine.ts";

test("Dust 2 keeps the bridge deck and zero-foot underpass as separate traversable surfaces", () => {
  const west = { x: 19, y: 7, elevationFt: 0 };
  const under7 = { x: 20, y: 7, surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 };
  const under8 = { x: 20, y: 8, surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 };
  const east = { x: 21, y: 8, elevationFt: 0 };
  assert.equal(canTraverseDust2Elevation(west, under7), true);
  assert.equal(dust2StepCostSquares(west, under7), 1);
  assert.equal(dust2DropFeet(west, under7), 0);
  assert.equal(dust2StepCostSquares(under7, under8), 1);
  assert.equal(dust2DropFeet(under8, east), 0);
  assert.equal(dust2TraversalNeighbors(under8).some((point) => point.x === 20 && point.y === 9), false, "the blocked middle wall is not an invented underpass exit");
  assert.deepEqual(dust2ForcedMoveDestination(west, 20, 7), under7, "forced movement enters the underpass instead of jumping onto its deck");
  assert.equal(dust2PositionElevation({ ...under7, elevationFt: 10 }), 0, "underpass identity overrides stale serialized deck elevation");
  assert.deepEqual(dust2PositionState({ ...under7, elevationFt: 10 }), { surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 });
  assert.deepEqual(dust2PreferredPositionAt(under7, 20, 8), under8, "teleport and targeting preserve the active stacked surface");
  assert.equal(dust2SharesSurface({ x: 19, y: 7 }, { x: 21, y: 7 }), true);
  assert.equal(dust2SamePosition({ x: 19, y: 7 }, { x: 21, y: 7 }), false);
});

test("every uphill foot costs movement while descents retain their normal horizontal cost", () => {
  const pit = { x: 28, y: 20, elevationFt: -10 };
  const lip = { x: 28, y: 19, elevationFt: 1 };
  assert.equal(dust2StepCostSquares(pit, lip), 3.2, "five horizontal feet plus an eleven-foot climb costs sixteen feet");
  assert.equal(dust2MoverStepCostSquares(pit, lip, 1, { flying: true }), 1);
  assert.equal(dust2MoverStepCostSquares(pit, lip, 1, { climbSpeed: true }), 1);
  assert.equal(dust2ForcedMoveDestination(pit, lip.x, lip.y), undefined, "forced movement cannot launch a creature up an eleven-foot climb");
  assert.equal(dust2StepCostSquares(lip, pit), 1);
  assert.deepEqual(dust2ForcedMoveDestination(lip, pit.x, pit.y), pit, "forced downhill movement may produce a real fall");
  assert.equal(dust2DropFeet(lip, pit), 11);
  const lowSlope = { x: 17, y: 13, elevationFt: 1 };
  const highSlope = { x: 16, y: 13, elevationFt: 5 };
  assert.equal(dust2StepCostSquares(lowSlope, highSlope), 1.8, "literal four-foot rises are not rounded to a five-foot tier");
  assert.equal(dust2StepCostSquares(highSlope, lowSlope), 1);
  assert.deepEqual(dust2RouteSummary(lowSlope, [highSlope, lowSlope]), { climbFt: 4, dropFt: 4, fallDice: 0 });
  assert.equal([1, 1, 1.2, 1.6, 1.2].reduce((total, cost) => normalizeMovementCost(total + cost), 0), 6, "exact-foot routes cannot lose a square to binary float drift");
});

test("U13 and V13 use safe bidirectional stairs to the zero-foot lane", () => {
  for (const x of [20, 21]) {
    const upper = { x, y: 12, elevationFt: 10 };
    const lower = { x, y: 13, elevationFt: 0 };
    assert.equal(canTraverseDust2Elevation(lower, upper), true);
    assert.equal(canTraverseDust2Elevation(upper, lower), true);
    assert.equal(dust2StepCostSquares(lower, upper), 3, "climbing spends 5 horizontal feet plus the 10-foot rise");
    assert.equal(dust2StepCostSquares(upper, lower), 1, "descending only spends the horizontal movement");
    assert.equal(dust2DropFeet(upper, lower), 0, "authored stairs never deal fall damage");
  }
});

test("the painted P12 through P21 doorway slope is ordinary movement without fall damage", () => {
  const route = Array.from({ length: 10 }, (_, index) => ({ x: 15, y: 11 + index }));
  const drops = route.slice(1).map((step, index) => dust2DropFeet(route[index], step));
  assert.deepEqual(drops, Array(9).fill(0), "walking either stair boundary is never treated as stepping off a cliff");
  assert.equal(dust2StepCostSquares(route[4], route[5]), 1, "the painted slope moves like an ordinary five-foot square");
  assert.equal(dust2StepCostSquares(route[8], route[9]), 1, "the ten-foot descent only spends horizontal movement");
  assert.deepEqual(dust2RouteSummary(route[0], route.slice(1)), { climbFt: 15, dropFt: 0, fallDice: 0 });
});

test("authored climbs, high ground, melee surfaces, and athletic safe falls share exact elevations", () => {
  const blueLow = { x: 3, y: 2, elevationFt: 0 };
  const blueHigh = { x: 2, y: 2, elevationFt: 10 };
  assert.equal(dust2StepCostSquares(blueLow, blueHigh), 3);
  assert.equal(dust2ForcedMoveDestination(blueLow, blueHigh.x, blueHigh.y), undefined, "pushback cannot climb the blue ten-foot link");
  assert.equal(dust2DropFeet(blueHigh, blueLow), 10);
  assert.equal(dust2HasHighGround(blueHigh, blueLow), true);
  assert.equal(dust2MeleeSpaceCompatible(blueHigh, blueLow), false, "ten vertical feet remains outside ordinary melee reach");
  assert.equal(dust2MeleeSpaceCompatible({ x: 10, y: 10, elevationFt: 0 }, { x: 11, y: 10, elevationFt: 0 }), true, "ordinary terrain shares melee space");
  const under = { x: 20, y: 7, surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 };
  assert.equal(dust2MeleeSpaceCompatible(under, { x: 19, y: 7, elevationFt: 0 }), true, "the authored portal joins melee space");
  assert.equal(dust2MeleeSpaceCompatible(under, { x: 20, y: 8, elevationFt: 10 }), false, "deck actors cannot threaten through the bridge floor");
  assert.equal(athleticSafeFallFeet({ abilities: { strength: 15, constitution: 10 } }), 10);
  assert.equal(athleticSafeFallFeet({ abilities: { strength: 10, constitution: 20 } }), 20);
  assert.equal(fallDiceForDrop(19, 10), 0);
  assert.equal(fallDiceForDrop(20, 10), 1);
  assert.equal(fallDiceForDrop(30, 20), 1);
});
