import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("warlock control spells pair finished cast VFX with their live mechanics", async () => {
  const effects = await readFile(new URL("../app/ability-vfx-registry.ts", import.meta.url), "utf8");
  const mechanics = await readFile(new URL("../app/ability-runtime.ts", import.meta.url), "utf8");
  for (const [ability, asset] of Object.entries({
    Darkness: "darkness",
    Invisibility: "invisibility",
    Counterspell: "counterspell",
    "Hunger of Hadar": "hunger-of-hadar",
  })) {
    assert.match(effects, new RegExp(`(?:"${ability}"|${ability}): "${asset}"`));
    assert.match(mechanics, new RegExp(`"?${ability}"?`));
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 80_000, `${ability} should use finished production art`);
  }
  assert.match(effects, /AREA_ABILITY_EFFECTS[^;]*"Darkness"[^;]*"Hunger of Hadar"/);
  assert.match(effects, /LINE_ABILITY_EFFECTS[^;]*"Counterspell"/);
});
