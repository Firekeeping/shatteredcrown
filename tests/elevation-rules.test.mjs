import test from "node:test";
import assert from "node:assert/strict";
import { canAttemptElevation, canStepElevation, elevationClimbCheckDc, fallDiceForDrop, rollFallDamage } from "../app/elevation-rules.ts";

test("literal-foot elevation allows drops and applies D&D fall dice", () => {
  assert.equal(canStepElevation(0, 5), true);
  assert.equal(canStepElevation(0, 10), true, "a ten-foot climb is automatic when movement can pay for it");
  assert.equal(canStepElevation(0, 11), false, "a rise above ten feet requires a climb check");
  assert.equal(elevationClimbCheckDc(0, 15), 15);
  assert.equal(elevationClimbCheckDc(2, 15), 13, "literal-foot rises keep their exact DC");
  assert.equal(elevationClimbCheckDc(0, 10), null);
  assert.equal(canAttemptElevation(0, 30), true, "the pathfinder may stage a checked climb instead of treating the cliff as an invisible wall");
  assert.equal(canStepElevation(30, 0), true, "walking off a ledge remains a legal downward move");
  assert.equal(canStepElevation(0, 30, true), true, "test, climb, and flight overrides can ignore the step-up limit");
  assert.equal(fallDiceForDrop(9), 0);
  assert.equal(fallDiceForDrop(10), 1);
  assert.equal(fallDiceForDrop(25), 2);
  assert.equal(fallDiceForDrop(250), 20, "fall damage caps at the D&D twenty-die limit");
  assert.equal(rollFallDamage(35, () => 4), 12);
});
