import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const readApp = (file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8");

test("the main game screen stays below its technical-debt line budget", async () => {
  const page = await readApp("page.tsx");
  const lines = page.split("\n").length;
  assert.ok(lines <= 10000, `page.tsx grew to ${lines} lines; extend a runtime module instead`);
});

test("character rules and static map construction stay outside the screen component", async () => {
  const [page, characters, maps, types] = await Promise.all([
    readApp("page.tsx"),
    readApp("character-runtime.ts"),
    readApp("map-runtime.ts"),
    readApp("game-types.ts"),
  ]);

  assert.doesNotMatch(page, /^type Unit\b/m);
  assert.doesNotMatch(page, /^const kits\b/m);
  assert.doesNotMatch(page, /^const openingForestTerrain\b/m);
  assert.match(characters, /export const kits/);
  assert.match(characters, /export const makeUnit/);
  assert.match(maps, /export const dungeonVisibleFrom/);
  assert.match(maps, /export const dungeonRoomPoints/);
  assert.match(types, /export type Unit/);
});
