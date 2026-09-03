import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = async (entry) => {
  const output = await build({ entryPoints:[new URL(entry, import.meta.url).pathname], bundle:true, format:"esm", platform:"node", write:false });
  return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
};

const unit = (id, x, y) => ({ id, name:id, role:"Fighter", team:"hero", x, y, skills:[], conditions:{} });

test("Teleport Grenade swaps the complete positions of two creatures", async () => {
  const { swapTeleportGrenadePositions } = await bundle("../app/spell-grenade-runtime.ts");
  const caster = { ...unit("caster", 2, 3), surfaceId:"high", elevationFt:20 };
  const target = { ...unit("target", 8, 9), team:"enemy", surfaceId:"low", elevationFt:-10 };
  const [movedCaster, movedTarget] = swapTeleportGrenadePositions(caster, target);
  assert.deepEqual([movedCaster.x, movedCaster.y, movedCaster.surfaceId, movedCaster.elevationFt], [8, 9, "low", -10]);
  assert.deepEqual([movedTarget.x, movedTarget.y, movedTarget.surfaceId, movedTarget.elevationFt], [2, 3, "high", 20]);
});

test("Banishment Grenade removes a creature for one round and returns it safely", async () => {
  const { banishWithGrenade, returnBanishedUnits } = await bundle("../app/spell-grenade-runtime.ts");
  const target = { ...unit("target", 4, 5), team:"enemy" };
  const banished = banishWithGrenade(target, 2);
  assert.deepEqual([banished.x, banished.y, banished.banished.returnRound], [-100, -100, 3]);
  assert.ok(banished.conditions.incapacitated && banished.conditions.invisible);
  assert.equal(returnBanishedUnits([banished], 2, () => true)[0].x, -100);
  const returned = returnBanishedUnits([banished], 3, (point) => point.x !== 4 || point.y !== 5)[0];
  assert.equal(returned.banished, undefined);
  assert.equal(Math.max(Math.abs(returned.x - 4), Math.abs(returned.y - 5)), 1);
  assert.equal(returned.conditions.incapacitated, undefined);
  assert.equal(returned.conditions.invisible, undefined);
});

test("Frost and Entangle grenades own their saves and persistent zones", async () => {
  const { ABILITY_MECHANICS } = await bundle("../app/ability-runtime.ts");
  assert.deepEqual(ABILITY_MECHANICS["Throw Frost Grenade"].save, { ability:"constitution", halfDamage:true });
  assert.equal(ABILITY_MECHANICS["Throw Frost Grenade"].zone.difficult, true);
  assert.equal(ABILITY_MECHANICS["Throw Frost Grenade"].targetEffect.value, -2);
  assert.deepEqual(ABILITY_MECHANICS["Throw Entangle Grenade"].save, { ability:"strength", negates:true });
  assert.equal(ABILITY_MECHANICS["Throw Entangle Grenade"].targetCondition.condition, "restrained");
  assert.deepEqual(ABILITY_MECHANICS["Throw Banishment Grenade"].save, { ability:"charisma", negates:true });
});
