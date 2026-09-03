import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const compile = (source, require = () => ({})) => {
  const js = ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
  const compiledModule = { exports: {} };
  new Function("module", "exports", "require", js)(compiledModule, compiledModule.exports, require);
  return compiledModule.exports;
};

const barrierGeometry = compile(await readFile(new URL("../app/barrier-geometry.ts", import.meta.url), "utf8"));
const runtime = compile(await readFile(new URL("../app/segment-spell-runtime.ts", import.meta.url), "utf8"), (specifier) => {
  if (specifier === "./barrier-geometry") return barrierGeometry;
  return {};
});

test("segment placement accepts any-angle walls up to 30 feet", () => {
  const horizontal = runtime.segmentPlacement({ x: 2, y: 3 }, { x: 8, y: 3 });
  assert.equal(horizontal.valid, true);
  assert.equal(horizontal.distanceFeet, 30);
  assert.equal(horizontal.tiles.length, 7);

  const diagonal = runtime.segmentPlacement({ x: 2, y: 3 }, { x: 8, y: 9 });
  assert.equal(diagonal.valid, true);
  assert.equal(diagonal.distanceFeet, 30);
  assert.equal(diagonal.tiles.length, 7, "a diagonal wall is one center line, not a 19-tile supercover beam");
  assert.deepEqual(diagonal.tiles[0], { x: 2, y: 3 });
  assert.deepEqual(diagonal.tiles.at(-1), { x: 8, y: 9 });
});

test("same-point and longer-than-30-foot placements remain invalid", () => {
  assert.equal(runtime.segmentPlacement({ x: 4, y: 4 }, { x: 4, y: 4 }).valid, false);
  assert.equal(runtime.segmentPlacement({ x: 4, y: 4 }, { x: 11, y: 4 }).valid, false);
});

test("exact Wind Wall segments deflect crossing ordinary projectiles from either direction", () => {
  const wall = [{ id: "wind", name: "Wind Wall", sourceId: "ranger", sourceTeam: "hero", tiles: [], remainingRounds: 3, blocksRanged: true, segment: { a: { x: 4, y: 1 }, b: { x: 4, y: 7 } } }];
  assert.equal(runtime.ordinaryProjectileBlocked(wall, { x: 1, y: 4 }, { x: 8, y: 4 }), true);
  assert.equal(runtime.ordinaryProjectileBlocked(wall, { x: 8, y: 4 }, { x: 1, y: 4 }), true);
  assert.equal(runtime.ordinaryProjectileBlocked(wall, { x: 1, y: 0 }, { x: 8, y: 0 }), false);
  assert.equal(runtime.ordinaryProjectileBlocked(wall, { x: 1, y: 2 }, { x: 3, y: 2 }), false);
});

test("ordinary-projectile classification excludes melee and magical attacks", () => {
  assert.equal(runtime.isOrdinaryProjectileAttack(12, "piercing"), true);
  assert.equal(runtime.isOrdinaryProjectileAttack(4, "physical"), true);
  assert.equal(runtime.isOrdinaryProjectileAttack(1, "piercing"), false);
  assert.equal(runtime.isOrdinaryProjectileAttack(12, "piercing", true), false);
  assert.equal(runtime.isOrdinaryProjectileAttack(8, "fire"), false);
});

test("Wind Wall integration uses synced endpoints, a live A/B overlay, and sight-safe blocking", async () => {
  const [page, playerView, characters, effects, overlay, styles] = await Promise.all([
    "page.tsx", "use-battlefield-player-view.ts", "character-runtime.ts", "ability-vfx-registry.ts", "segment-spell-overlay.tsx", "globals.css",
  ].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")));
  assert.match(characters, /Wind Wall", 6[\s\S]*Point A and Point B[\s\S]*30 feet/);
  assert.match(page, /segmentPlacement\(wallStart, end/);
  assert.match(page, /segment: visualFrom \? \{ a: visualFrom, b: \{ x, y \} \}/);
  assert.match(page, /zones:abilityZones/);
  assert.match(playerView, /zones\.filter\(\(zone\) => zone\.blocksVision\)/);
  assert.match(playerView, /createBattlefieldVisionKernel\(\{ battlefield, blocked, blockedCrossings, zoneBlocked \}\)/);
  assert.doesNotMatch(page, /zone\.blocksRanged && zoneContains/);
  assert.match(page, /WIND WALL · PROJECTILE DEFLECTED/);
  assert.match(effects, /LINE_ABILITY_EFFECTS[^;]*Wind Wall/);
  assert.doesNotMatch(effects, /AREA_ABILITY_EFFECTS[^;]*Wind Wall/);
  assert.match(overlay, /POINT A SET · CHOOSE POINT B/);
  assert.match(styles, /wind-wall-segment[\s\S]*vfx-wind-wall\.png/);
});
