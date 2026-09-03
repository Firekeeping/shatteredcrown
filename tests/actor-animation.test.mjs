import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const loadTsModule = (relativePath) => {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const js = ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
  const loaded = { exports: {} };
  new Function("module", "exports", "require", js)(loaded, loaded.exports, () => ({}));
  return loaded.exports;
};
const { actorActionAnimation, actorUsesSignatureFrame, monsterActionEffect, MONSTER_ACTION_PRESENTATIONS, spritePoseDuration } = loadTsModule("../app/actor-animation.ts");
const { ACTOR_REGISTRY } = loadTsModule("../app/actor-registry.ts");

test("the opening wolf family uses the reduced health totals", () => {
  assert.equal(ACTOR_REGISTRY["Dire Wolf"].statBlock.hitPoints, 19);
  assert.equal(ACTOR_REGISTRY.Werewolf.statBlock.hitPoints, 41);
});

test("dragon breath uses its authored signature frame", () => {
  assert.deepEqual(actorActionAnimation("Black Dragon", "Acid Breath"), { pose: "cast", duration: 1200 });
  assert.equal(actorUsesSignatureFrame("Black Dragon", "Acid Breath"), true);
});

test("body-driven attacks stay on the actor-specific physical frame", () => {
  assert.deepEqual(actorActionAnimation("Dire Wolf", "Pounce"), { pose: "attack", duration: 900 });
  assert.deepEqual(actorActionAnimation("Werewolf", "Rending Claws"), { pose: "attack", duration: 900 });
  assert.equal(monsterActionEffect("Dire Wolf", "Pounce"), undefined);
  assert.equal(monsterActionEffect("Grell", "Tentacles"), undefined);
  assert.equal(monsterActionEffect("Large Mimic", "Adhesive Pseudopod"), undefined);
});

test("current signature monster actions use the sixth sprite cell", () => {
  for (const [role, action] of [
    ["Gelatinous Cube", "Engulf"],
    ["Air Elemental", "Whirlwind Slam"],
    ["Flesh Golem", "Lightning Absorption"],
    ["Manticore", "Tailstorm"],
  ]) assert.equal(actorActionAnimation(role, action).pose, "cast");
});

test("every registered monster attack declares its actor-first visual contract", () => {
  for (const actor of Object.values(ACTOR_REGISTRY).filter((definition) => definition.visualKind === "monster")) {
    const catalog = MONSTER_ACTION_PRESENTATIONS[actor.role];
    assert.ok(catalog, `${actor.role} is missing its monster action catalog`);
    for (const attack of actor.statBlock.attacks)
      assert.ok(catalog[attack.name], `${actor.role} ${attack.name} is missing an actor action presentation`);
  }
});

test("every registered monster owns a complete transparent six-cell sprite sheet", async () => {
  for (const actor of Object.values(ACTOR_REGISTRY).filter((definition) => definition.visualKind === "monster")) {
    const metadata = await sharp(fileURLToPath(new URL(`../public${actor.sprite}`, import.meta.url))).metadata();
    assert.equal(metadata.width, 1086, `${actor.role} sprite sheet must contain six 181px cells`);
    assert.equal(metadata.height, 362, `${actor.role} sprite sheet must use the standard cell height`);
    assert.equal(metadata.hasAlpha, true, `${actor.role} sprite sheet must have real transparency`);
  }
});

test("only detached and square-covering monster actions request overlays", () => {
  assert.equal(monsterActionEffect("Black Dragon", "Rend"), undefined);
  assert.equal(monsterActionEffect("Black Dragon", "Acid Breath"), "Acid Breath");
  assert.equal(monsterActionEffect("Manticore", "Tail Spike"), "Tail Spike");
  assert.equal(monsterActionEffect("Air Elemental", "Whirlwind Slam"), "Whirlwind Slam");
});

test("obsolete monster-body overlays cannot return beside actor-owned attacks", () => {
  for (const asset of ["beak-and-tentacles", "flesh-golem-slam", "nightmare-clown-strike", "pillar-bugbear-strike", "predators-leap", "rending-claws", "silvered-blade"])
    assert.equal(existsSync(fileURLToPath(new URL(`../public/vfx-${asset}.webp`, import.meta.url))), false, `${asset} must stay on its monster sheet`);
  assert.equal(existsSync(fileURLToPath(new URL("../public/vfx-predators-leap.png", import.meta.url))), false);
});

test("pose timers cannot cut off anticipation, impact, or recovery", () => {
  assert.equal(spritePoseDuration("walk", 220), 560);
  assert.equal(spritePoseDuration("attack", 520), 720);
  assert.equal(spritePoseDuration("damage", 460), 620);
  assert.equal(spritePoseDuration("cast", 1200), 1200);
});
