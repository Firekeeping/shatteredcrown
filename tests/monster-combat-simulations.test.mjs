import test from "node:test";
import assert from "node:assert/strict";
import { awardXpOnce, simulateAttackSeries, simulateRecharge, simulateSaveEnds, simulateTypedDamage } from "../app/monster-combat-simulations.ts";

test("multiattack resolves each hit independently and doubles critical damage", () => {
  assert.deepEqual(simulateAttackSeries([4, 20], 4, 13, 5).map(({ hit, damage }) => ({ hit, damage })), [{ hit: false, damage: 0 }, { hit: true, damage: 10 }]);
});

test("mixed damage applies defenses to each type separately", () => {
  assert.equal(simulateTypedDamage([{ amount: 5, type: "slashing" }, { amount: 2, type: "acid" }], { resistances: ["slashing"], immunities: ["acid"] }), 2);
});

test("recharge, save-ending conditions, and XP deduplication are deterministic", () => {
  assert.equal(simulateRecharge(5, 5), true);
  assert.equal(simulateRecharge(4, 5), false);
  assert.equal(simulateSaveEnds(12, 2, 14), true);
  assert.equal(simulateSaveEnds(1, 99, 14), false);
  const awarded = new Set();
  assert.equal(awardXpOnce(awarded, "wolf-1", 200), 200);
  assert.equal(awardXpOnce(awarded, "wolf-1", 200), 0);
});
