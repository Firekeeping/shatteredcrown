import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const effects = await readFile(new URL("../app/ability-vfx-registry.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const zones = await readFile(new URL("../app/ability-zone-visuals.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");

test("high-level Warlock and Ranger attacks use authored four-frame atlases", () => {
  for (const name of ["Fear", "Vampiric Touch", "Blight", "Lightning Arrow"]) {
    assert.match(effects, new RegExp(`ANIMATED_ABILITY_EFFECTS[\\s\\S]*${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`));
  }
  assert.match(css, /ability-vfx-atlas-2x2/);
  assert.match(css, /background-size:\s*200% 200%/);
});

test("Ranger summon, enchantment, volley, and persistent fields use authored art", async () => {
  for (const name of ["Animal Companion", "Flame Arrows", "Volley"]) {
    assert.match(effects, new RegExp(`ANIMATED_ABILITY_EFFECTS[\\s\\S]*${name}`));
  }
  for (const name of ["Healing Spirit", "Wind Wall", "Plant Growth"]) {
    assert.match(zones, new RegExp(`${name}[\\s\\S]*vfx-${name.toLowerCase().replaceAll(" ", "-")}\\.png`));
  }
  assert.match(page, /hasEffect\(u, "flame-arrows"\)/);
  assert.match(css, /flame-arrows-status-vfx/);
  for (const asset of ["animal-companion", "flame-arrows", "healing-spirit", "plant-growth", "volley", "wind-wall"]) {
    await access(new URL(`../public/vfx-${asset}.png`, import.meta.url));
  }
});

test("high-level celestial, radiant, thunder, and healing abilities use bespoke atlases", async () => {
  const animated = ["Starfall", "Disintegrate", "Searing Light", "Thunderclap", "Life Bloom", "Greater Mend"];
  for (const name of animated) {
    assert.match(effects, new RegExp(`ANIMATED_ABILITY_EFFECTS[\\s\\S]*${name}`));
    await access(new URL(`../public/vfx-${name.toLowerCase().replaceAll(" ", "-")}.png`, import.meta.url));
  }
  for (const name of ["Disintegrate", "Searing Light"]) {
    assert.match(effects, new RegExp(`LINE_ABILITY_EFFECTS[\\s\\S]*${name}`));
  }
});

test("class-specific renewal, cure, ward, and judgment effects stay visually distinct", async () => {
  for (const name of ["Arcane Renewal", "Crimson Renewal", "Renewal", "Massive Cure", "Ember Ward", "Judgment"]) {
    assert.match(effects, new RegExp(`ANIMATED_ABILITY_EFFECTS[\\s\\S]*${name}`));
    await access(new URL(`../public/vfx-${name.toLowerCase().replaceAll(" ", "-")}.png`, import.meta.url));
  }
});

test("offensive utility VFX follows each ability's real targeting geometry", async () => {
  const directional = ["Blood Roar", "Cutting Refrain", "Forked Flame", "Gale Burst", "Piercing Note"];
  for (const name of [...directional, "Sacred Hammer"]) {
    assert.match(effects, new RegExp(`ANIMATED_ABILITY_EFFECTS[\\s\\S]*${name}`));
    await access(new URL(`../public/vfx-${name.toLowerCase().replaceAll(" ", "-")}.png`, import.meta.url));
  }
  for (const name of directional) assert.match(effects, new RegExp(`LINE_ABILITY_EFFECTS[\\s\\S]*${name}`));
});

test("remaining direct actions and true passives use the correct visual contract", async () => {
  const direct = ["Heroic Verse", "Stone Fang", "Indomitable", "Lunging Thrust", "Hamstring", "Assassinate"];
  const directional = ["Lunging Thrust", "Hamstring", "Assassinate"];
  const passives = ["Twinned Spell", "Distant Spell", "Heightened Spell", "Favored Enemy"];
  for (const name of [...direct, ...passives]) {
    await access(new URL(`../public/vfx-${name.toLowerCase().replaceAll(" ", "-")}.png`, import.meta.url));
  }
  for (const name of direct) assert.match(effects, new RegExp(`ANIMATED_ABILITY_EFFECTS[\\s\\S]*${name}`));
  for (const name of directional) assert.match(effects, new RegExp(`LINE_ABILITY_EFFECTS[\\s\\S]*${name}`));
  for (const name of passives) assert.match(effects, new RegExp(`PASSIVE_BADGE_ASSETS[\\s\\S]*${name}`));
  assert.match(page, /PassiveAbilityBadges skills=\{u\.skills\}/);
  assert.match(css, /passive-ability-badge/);
});

test("every live class action has an authored asset or an explicit special renderer", () => {
  const active = [...characters.matchAll(/\bs\(\s*"([^"]+)"/g)].map((match) => match[1]);
  const assetBlock = effects.slice(effects.indexOf("ABILITY_VFX_ASSETS"), effects.indexOf("ANIMATED_ABILITY_EFFECTS"));
  const specialBlock = effects.slice(effects.indexOf("SPECIAL_RENDERED_EFFECTS"), effects.indexOf("PASSIVE_BADGE_ASSETS"));
  const missing = [...new Set(active)].filter((name) => !assetBlock.includes(`"${name}"`) && !assetBlock.includes(`${name}:`) && !specialBlock.includes(`"${name}"`));
  assert.deepEqual(missing, []);
});
