import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("every previously generic level-one action has its own production effect", async () => {
  const effects = await readFile(new URL("../app/ability-vfx-registry.ts", import.meta.url), "utf8");
  const assets = {
    "Arcane Bolt": "arcane-bolt",
    Drain: "drain",
    Ward: "ward",
    "Discordant Note": "discordant-note",
    "Healing Verse": "healing-verse",
    "Bardic Inspiration": "bardic-inspiration",
  };
  for (const [ability, asset] of Object.entries(assets)) {
    assert.match(effects, new RegExp(`(?:"${ability}"|${ability}): "${asset}"`), `${ability} should own a named VFX asset`);
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 40_000, `${ability} should use finished production art`);
  }
  assert.doesNotMatch(effects, /LINE_ABILITY_EFFECTS[^;]*"Bardic Inspiration"/, "the stored d6 buff should appear on its recipient, not stretch between units");
  assert.match(effects, /"Run it Back, Turbo": "lay-on-hands"/, "the Tester revive should reuse a finished healing effect");
});

test("rejected poison and blood abilities stay out of the live class pools", async () => {
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  assert.doesNotMatch(characters, /s\("Blood Spark"|s\("Poisoned Dart"/);
  assert.match(characters, /Sorcerer:[\s\S]*s\("Frost Lance"[\s\S]*damageType: "cold"/);
});
