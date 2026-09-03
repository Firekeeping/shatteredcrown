import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { VISUAL_FIXTURE_NAMES, renderVisualFixture } from "../scripts/visual-fixtures.mjs";

const expectedFixtures = ["walls", "fog", "projectors", "statues", "secretDoors", "posters"];

test("visual regression suite covers every fragile dungeon presentation system", () => {
  assert.deepEqual(VISUAL_FIXTURE_NAMES, expectedFixtures);
});

for (const name of expectedFixtures) {
  test(`${name} matches its production-asset image snapshot`, async () => {
    const expected = await readFile(new URL(`./visual-baselines/${name}.png`, import.meta.url));
    const actual = await renderVisualFixture(name);
    assert.equal(actual.equals(expected), true, `${name}.png changed; inspect the render before updating its baseline`);
  });
}

