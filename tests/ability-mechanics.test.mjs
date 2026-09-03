import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const readApp = (name) => readFile(new URL(`../app/${name}`, import.meta.url), "utf8");

test("the approved class rebuild owns executable mechanics instead of placeholder buttons", async () => {
  const [abilities, characters, page] = await Promise.all([readApp("ability-runtime.ts"), readApp("character-runtime.ts"), readApp("page.tsx")]);
  for (const name of ["Reckless Blow", "Bardic Inspiration", "Dissonant Whispers", "Pinning Strike", "Counterstance", "Flurry of Blows", "Patient Defense", "Sweeping Kick", "Stunning Strike", "Divine Smite", "Branding Smite", "Shielding Smite", "Turn the Unholy", "Lesser Restoration", "Blinding Smite", "Hunter's Mark", "Ensnaring Strike", "Spike Growth", "Fog Cloud", "Longstrider", "Zephyr Strike", "Flame Arrows", "Healing Spirit", "Wind Wall", "Lightning Arrow", "Plant Growth", "Animal Companion", "Sneak Attack", "Assassinate", "Hex", "Armor of Agathys", "Hellish Rebuke", "Arms of Hadar", "Darkness", "Invisibility", "Counterspell", "Hunger of Hadar", "Fear", "Vampiric Touch", "Blight"])
    assert.ok(abilities.includes(`"${name}"`), `${name} needs an authored mechanic`);
  for (const passive of ["Rage", "Favored Enemy", "Twinned Spell", "Distant Spell", "Heightened Spell"])
    assert.ok(characters.includes(`"${passive}"`), `${passive} needs a class definition`);
  assert.doesNotMatch(characters, /s\("Finale"|s\("Shield Break"/);
  for (const hook of ["abilityStrikeProfile", "reactiveDefense", "abilitySavingThrow"]) assert.ok(page.includes(hook));
});

test("zones, conditions, saves, counters, and companions reach the combat runtime", async () => {
  const [abilities, conditions, page] = await Promise.all([readApp("ability-runtime.ts"), readApp("condition-runtime.ts"), readApp("page.tsx")]);
  for (const zone of ["Spike Growth", "Fog Cloud", "Healing Spirit", "Wind Wall", "Plant Growth", "Darkness", "Hunger of Hadar"])
    assert.match(abilities, new RegExp(`"${zone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^\n]*zone:`));
  for (const condition of ["blinded", "frightened", "invisible", "paralyzed", "prone", "restrained"])
    assert.ok(conditions.includes(condition));
  assert.match(page, /abilityZones[\s\S]*zoneContains[\s\S]*advanceZones/);
  assert.match(abilities, /"Spike Growth"[^\n]*initialDamage: 10[^\n]*movementDamage: 3/);
  assert.match(page, /const initialHits = \(zoneDefinition\.initialDamage \|\| areaMechanic\.targetCondition \|\| areaMechanic\.targetEffect\)[\s\S]*combatDamageOutcome\(unit, hit\.damage\)[\s\S]*areaMechanic\.targetCondition/);
  assert.match(page, /enemySkill\?\.damageCap[\s\S]*typedDamage \+ extraDamage/);
  assert.match(page, /reactiveDefense[\s\S]*armor-of-agathys[\s\S]*Hellish Rebuke/);
  assert.match(page, /spawnActor\("Dire Wolf"[\s\S]*animal-companion/);
  assert.match(abilities, /FLAME_ARROWS_ATTACKS = 3[\s\S]*FLAME_ARROWS_DAMAGE = 6/);
  assert.match(abilities, /consumeFlameArrowAttack[\s\S]*const flameArrows = !skill[\s\S]*FLAME_ARROWS_DAMAGE/);
  assert.match(page, /flameArrowUsed[\s\S]*consumeFlameArrowAttack[\s\S]*Flame Arrows adds/);
});

test("Dust 2 throwables reuse the live zone, save, and condition engine", async () => {
  const abilities = await readApp("ability-runtime.ts");
  assert.match(abilities, /"Throw Smoke Grenade"[^\n]*Smoke Grenade[^\n]*blocksVision:\s*true/);
  assert.match(abilities, /"Throw Molotov"[^\n]*Molotov Fire[^\n]*roundDamage:\s*6[^\n]*damageType:\s*"fire"/);
  assert.match(abilities, /"Throw Frag Grenade"[^\n]*dexterity[^\n]*halfDamage:\s*true/);
  assert.match(abilities, /"Throw Flashbang"[^\n]*targetCondition[^\n]*blinded[^\n]*durationRounds:\s*1/);
  assert.match(abilities, /isMagicalAbility[^\n]*skill\.source !== "item"/);
});
