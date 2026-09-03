import assert from "node:assert/strict";
import test from "node:test";
import { access } from "node:fs/promises";

import { COMBAT_TIMING, damageFloat, healFloat, missFloat, statusFloat } from "../app/combat-presentation.ts";
import { chargedCasterKey, isEightDirectionLine, kelimTeleportIssue, lineAreaTiles, monsterOpportunityAttackProfile, readyChargedSpellFor, shouldDetonatePortableBomb } from "../app/combat-engine.ts";
import { abilityModifier, damageAfterProtection, proficiencyBonus, resolveD20Attack, skillCheckBonus } from "../app/dnd-rules.ts";
import { ENCOUNTER_DIRECTIVES } from "../app/encounter-director.ts";
import { HERO_SPRITE_PREFIX_BY_ROLE, equipmentVariantSuffix, spriteSheetForEquipment } from "../app/equipment-visuals.ts";
import { KOKO_BOW_NAME, KOKO_MIN_DAMAGE, kokoRangerKit } from "../app/koko-ranger.ts";
import { INTRO_WOLF_DAMAGE_CAP, capIntroWolfDamage } from "../app/intro-balance.ts";
import { LEVEL_ONE_DEFERRED_WRITING, LEVEL_ONE_PRESENTATION_INVARIANTS, LEVEL_ONE_REGRESSION_CHECKPOINTS, checkpointAutomated } from "../app/level-one-regression.ts";
import { SPIKE_PIT_PRESENTATION } from "../app/trap-presentation.ts";
import { ANIMAL_TRACKS_LABEL, isAnimalTracks, rangerTrackCallout } from "../app/ranger-tracks.ts";
import { abilityStrikeProfile, consumeFlameArrowAttack, flameArrowShotsRemaining, FLAME_ARROWS_ATTACKS, FLAME_ARROWS_DAMAGE } from "../app/ability-runtime.ts";

test("Ranger track sense is keyed to the canonical Animal Tracks label", () => {
  assert.equal(isAnimalTracks({ name: ANIMAL_TRACKS_LABEL }), true);
  assert.equal(isAnimalTracks({ name: "Wolf Tracks" }), false);
  assert.match(rangerTrackCallout({ id: "black-dragon-tracks", name: ANIMAL_TRACKS_LABEL }), /Dragon tracks/);
});

test("Flame Arrows enhances and consumes exactly three standard ranged attacks", () => {
  const archer = { role: "Ranger", skills: [], combatEffects: [{ id: "flame-arrows:ranger:ranger", kind: "flame-arrows", value: FLAME_ARROWS_ATTACKS }] };
  const target = { role: "Wolf", combatEffects: [] };
  const bow = { damage: 20, range: 10, damageType: "piercing", attackBonus: 6, tags: ["ranged"] };
  assert.equal(abilityStrikeProfile(archer, target, null, bow).bonusDamage, FLAME_ARROWS_DAMAGE);
  assert.equal(abilityStrikeProfile(archer, target, { name: "Lightning Arrow" }, bow).bonusDamage, 0);
  const afterOne = consumeFlameArrowAttack(archer), afterTwo = consumeFlameArrowAttack(afterOne), afterThree = consumeFlameArrowAttack(afterTwo);
  assert.deepEqual([flameArrowShotsRemaining(archer), flameArrowShotsRemaining(afterOne), flameArrowShotsRemaining(afterTwo), flameArrowShotsRemaining(afterThree)], [3, 2, 1, 0]);
  assert.equal(abilityStrikeProfile(afterThree, target, null, bow).bonusDamage, 0);
});

test("the simplified D&D foundation uses standard modifiers and proficiency", () => {
  assert.equal(abilityModifier(8), -1);
  assert.equal(abilityModifier(10), 0);
  assert.equal(abilityModifier(16), 3);
  assert.deepEqual([1, 4, 5, 6].map(proficiencyBonus), [2, 2, 3, 3]);
  const rogue = {
    abilities: { strength: 8, dexterity: 16, constitution: 14, intelligence: 13, wisdom: 12, charisma: 10 },
    primaryAbility: "dexterity", level: 1, skillProficiencies: ["Investigation", "Stealth", "Thieves' Tools"],
  };
  assert.equal(skillCheckBonus(rogue, "Thieves' Tools"), 5);
});

test("d20 attacks use AC, advantage, critical rules, and specific protection", () => {
  const attacker = {
    abilities: { strength: 8, dexterity: 16, constitution: 14, intelligence: 13, wisdom: 12, charisma: 10 },
    primaryAbility: "dexterity", level: 1,
  };
  const target = { armorClass: 15 };
  assert.equal(resolveD20Attack({ attacker, target, roll: 1 }).hit, false);
  const critical = resolveD20Attack({ attacker, target, roll: 20 });
  assert.equal(critical.hit, true);
  assert.equal(critical.critical, true);
  assert.equal(resolveD20Attack({ attacker, target, roll: 10 }).hit, true);
  assert.equal(resolveD20Attack({ attacker, target, roll: 9 }).hit, false);
  assert.equal(resolveD20Attack({ attacker, target, roll: 3, advantageRoll: 14 }).roll, 14);
  assert.equal(damageAfterProtection({ rageRounds: 1 }, 15, "physical"), 7);
  assert.equal(damageAfterProtection({ rageRounds: 1 }, 15, "fire"), 15);
});

test("monster opportunity attacks use their live skill instead of the retired zero attack field", () => {
  const wolf = {
    combatProfile: { kind: "monster", actorId: "Dire Wolf" }, attack: 0, attackBonus: 5, damageType: "piercing",
    skills: [{ name: "Bite", kind: "damage", range: 1, power: 3, damageCap: 3, attackBonus: 5, damageType: "piercing", charges: 99, unlimited: true }],
  };
  const profile = monsterOpportunityAttackProfile(wolf);
  assert.equal(profile?.damage, 3);
  assert.equal(profile?.attackBonus, 5);
  assert.equal(resolveD20Attack({ attacker: wolf, target: { armorClass: 15 }, roll: 11, attackBonusOverride: profile?.attackBonus }).hit, true);
  assert.equal(Math.min(profile?.damageCap ?? Infinity, damageAfterProtection({}, profile?.damage || 0, profile?.damageType)), 3);
});

test("intro wolves have one attack capped at three damage, including critical and rider paths", () => {
  const wolf = capIntroWolfDamage({ skills: [{ name: "Claws", kind: "damage", range: 1, power: 15, attackCount: 2, additionalDamage: [{ damage: 4, damageType: "slashing" }], charges: 99 }] });
  assert.equal(wolf.introDamageCap, INTRO_WOLF_DAMAGE_CAP);
  assert.deepEqual(wolf.skills.map(({ power, attackCount, additionalDamage, damageCap }) => ({ power, attackCount, additionalDamage, damageCap })), [{ power: 3, attackCount: 1, additionalDamage: undefined, damageCap: 3 }]);
});

test("equipment variants resolve every slot combination for every hero role", () => {
  const combinations = [
    [{}, ""],
    [{ head: "Ball Cap of Bad Ideas" }, "ballcap"],
    [{ body: "Wife-Beater of Questionable Resilience" }, "wifebeater"],
    [{ weapon: "Blue Lightsaber" }, "lightsaber"],
    [{ weapon: "Dragon Glass AWP" }, "awp"],
    [{ weapon: "Dragonfire Deagle" }, "deagle"],
    [{ head: "Ball Cap of Bad Ideas", body: "Wife-Beater of Questionable Resilience" }, "ballcap-wifebeater"],
    [{ head: "Ball Cap of Bad Ideas", weapon: "Blue Lightsaber" }, "ballcap-lightsaber"],
    [{ body: "Wife-Beater of Questionable Resilience", weapon: "Blue Lightsaber" }, "wifebeater-lightsaber"],
    [{ head: "Ball Cap of Bad Ideas", body: "Wife-Beater of Questionable Resilience", weapon: "Blue Lightsaber" }, "ballcap-wifebeater-lightsaber"],
  ];
  for (const [equipment, expected] of combinations)
    assert.equal(equipmentVariantSuffix(equipment), expected);
  for (const [role, prefix] of Object.entries(HERO_SPRITE_PREFIX_BY_ROLE)) {
    assert.equal(
      spriteSheetForEquipment({ id: role, name: role, role }, { weapon: "Blue Lightsaber" }, {}),
      `/${prefix}-lightsaber-sprites.png`,
    );
  }
});

test("Koko is an all-abilities Ranger test hero with a protected custom sprite and damage floor", async () => {
  const skill = (name, power = 7) => ({ name, range: 10, power, accuracy: 0, charges: 1, kind: "damage", description: name });
  const base = { hp: 11, move: 5, attack: 7, defense: 4, accuracy: 84, evasion: 14, range: 10, initiative: 16, skills: [skill("Hunter's Mark", 0), skill("Hail of Thorns")] };
  const kit = kokoRangerKit(base, [skill("Hail of Thorns"), skill("Volley", 10)]);
  assert.equal(KOKO_BOW_NAME, "Moonshadow Bow");
  assert.equal(kit.attack, KOKO_MIN_DAMAGE);
  assert.deepEqual(kit.skills.map(({ name }) => name), ["Hunter's Mark", "Hail of Thorns", "Volley"]);
  assert.ok(kit.skills.every(({ charges, maxCharges, unlimited }) => charges === 99 && maxCharges === 99 && unlimited));
  assert.ok(kit.skills.filter(({ power }) => power > 0).every(({ power }) => power >= KOKO_MIN_DAMAGE));
  assert.equal(spriteSheetForEquipment({ id: "Ranger-4", name: "Koko", role: "Ranger" }, { weapon: "Blue Lightsaber" }, {}), "/koko-sprites.png");
  await access(new URL("../public/koko-sprites.png", import.meta.url));
});

test("every hero has a production sprite for every supported equipment combination", async () => {
  const suffixes = [
    "ballcap",
    "wifebeater",
    "ballcap-wifebeater",
    "lightsaber",
    "ballcap-lightsaber",
    "wifebeater-lightsaber",
    "ballcap-wifebeater-lightsaber",
    "awp", "ballcap-awp", "wifebeater-awp", "ballcap-wifebeater-awp",
    "deagle", "ballcap-deagle", "wifebeater-deagle", "ballcap-wifebeater-deagle",
  ];
  for (const prefix of Object.values(HERO_SPRITE_PREFIX_BY_ROLE))
    for (const suffix of suffixes)
      await access(new URL(`../public/${prefix}-${suffix}-sprites.png`, import.meta.url));
});

test("combat feedback is readable without restoring instant enemy turns", () => {
  assert.ok(COMBAT_TIMING.enemyDecisionMs >= 650);
  assert.ok(COMBAT_TIMING.enemyDecisionMs <= 1000);
  assert.ok(COMBAT_TIMING.ordinaryMoveStepMs >= 180);
  assert.deepEqual(damageFloat(12), { text: "-12", tone: "damage" });
  assert.deepEqual(damageFloat(24, true), { text: "-24", tone: "critical" });
  assert.deepEqual(healFloat(8), { text: "+8", tone: "heal" });
  assert.deepEqual(missFloat(), { text: "MISS", tone: "miss" });
  assert.deepEqual(statusFloat("STUNNED"), { text: "STUNNED", tone: "status" });
});

test("the spike pit is presentation-only foreshadowing until it triggers", () => {
  assert.equal(SPIKE_PIT_PRESENTATION.id, "spiked-pit-28d");
  assert.equal(SPIKE_PIT_PRESENTATION.damage, 21);
  assert.match(SPIKE_PIT_PRESENTATION.log("Walker"), /oversized stone spikes/);
  assert.ok(LEVEL_ONE_PRESENTATION_INVARIANTS.some((line) => line.includes("No LOOK UP")));
});

test("the Level 1 regression tour covers every critical branch with no deferred writing", () => {
  const ids = new Set(LEVEL_ONE_REGRESSION_CHECKPOINTS.map((checkpoint) => checkpoint.id));
  for (const id of [
    "bridge-peace", "bridge-failed-bluff", "bugbears", "grell", "secret-club", "harria", "manticore",
    "troll", "gromm-safe", "gromm-bad", "last-camp", "vale-pass", "vale-wrong", "vale-combat",
    "flyndol", "kelim-rescue", "kelim-death", "guardian", "flood", "secret-grate", "bomb-reset",
    "bomb-disable", "pit-rogue", "pit-fall", "halleth", "goblins-peace", "goblins-combat",
    "avada-shirt", "avada-party", "boss-defeat", "throne-recap",
  ]) assert.ok(ids.has(id), `missing regression checkpoint ${id}`);
  assert.deepEqual([...LEVEL_ONE_DEFERRED_WRITING], []);
  const serialized = JSON.stringify(LEVEL_ONE_REGRESSION_CHECKPOINTS.flatMap((checkpoint) => checkpoint.probes));
  for (const impossible of [
    "forest-guard-conversation-complete", "village-defense-complete", "village-abandoned", "bridge-toll-waived",
    "bridge-toll-hostile", "bridge-supply-cache-opened", "manticore-show-complete", "spiked-pit-triggered",
  ]) assert.doesNotMatch(serialized, new RegExp(`\"${impossible}\"`));
});

test("regression probes evaluate runtime state instead of checklist prose", () => {
  const checkpoint = LEVEL_ONE_REGRESSION_CHECKPOINTS.find((entry) => entry.id === "kelim-death");
  assert.ok(checkpoint);
  const base = {
    flags: new Set(["kelim-eaten", "kelim-corpse@31,75"]), resolvedPoi: new Set(), discoveredPoi: new Set(),
    itemNames: new Set(), droppedItemIds: new Set(["kelim-corpse-spellbook"]), learnedSkillNames: new Set(),
    achievementIds: new Set(), route: null, mapCompletions: {}, campaignScene: 7,
  };
  assert.equal(checkpointAutomated(checkpoint, base), true);
  assert.equal(checkpointAutomated(checkpoint, { ...base, achievementIds: new Set(["rescue-kelim:Barbarian-0"]) }), false);
});

test("charged spell readiness keeps Solar Beam and boss heads distinct", () => {
  const solar = { id: "cleric:Solar Beam", unitId: "Cleric-0", name: "Solar Beam", resolvesRound: 3 };
  const spellHead = { id: "king:spell", unitId: "king", bossHead: "spellcaster", resolvesRound: 3 };
  const bruiserHead = { id: "king:bruiser", unitId: "king", bossHead: "bruiser", resolvesRound: 3 };
  const charges = [solar, spellHead, bruiserHead];
  assert.equal(readyChargedSpellFor(charges, { id: "Cleric-0" }, 2), undefined);
  assert.equal(readyChargedSpellFor(charges, { id: "Cleric-0" }, 3), solar);
  assert.equal(readyChargedSpellFor(charges, { id: "king", bossHead: "spellcaster" }, 3), spellHead);
  assert.notEqual(chargedCasterKey(spellHead), chargedCasterKey(bruiserHead));
});

test("line spells use a supercover ray at any angle and stop at walls", () => {
  const source = { x: 1, y: 1 };
  assert.equal(isEightDirectionLine(source, { x: 5, y: 5 }), true);
  assert.equal(isEightDirectionLine(source, { x: 5, y: 4 }), true);
  const diagonal = lineAreaTiles(source, { x: 5, y: 5 }, 6, 10, 10, (_from, point) => point.x < 4);
  assert.ok(diagonal.some((point) => point.x === 2 && point.y === 1));
  assert.ok(diagonal.some((point) => point.x === 1 && point.y === 2));
  assert.ok(diagonal.some((point) => point.x === 3 && point.y === 3));
  assert.ok(diagonal.every((point) => point.x < 4));
  const angled = lineAreaTiles(source, { x: 5, y: 4 }, 6, 10, 10, () => true);
  assert.ok(angled.some((point) => point.x === 5 && point.y === 4));
  assert.ok(angled.some((point) => point.x === 3 && point.y === 2));
});

test("Kelim's Shortcut guards its 30-foot once-daily teleport landings", () => {
  const valid = { charges: 1, sameTile: false, distance: 6, range: 6, open: true, occupied: false, visible: true };
  assert.equal(kelimTeleportIssue(valid), null);
  assert.match(kelimTeleportIssue({ ...valid, distance: 7 }), /more than 30 feet/);
  assert.match(kelimTeleportIssue({ ...valid, charges: 0 }), /already been used today/);
  assert.match(kelimTeleportIssue({ ...valid, sameTile: true }), /different tile/);
  assert.match(kelimTeleportIssue({ ...valid, open: false }), /clear.*unoccupied/);
  assert.match(kelimTeleportIssue({ ...valid, occupied: true }), /clear.*unoccupied/);
  assert.match(kelimTeleportIssue({ ...valid, visible: false }), /visible destination/);
});

test("the stolen proximity bomb waits until its Rogue leaves the blast", () => {
  const blast = Array.from({ length: 9 }, (_, index) => ({ x: 4 + (index % 3), y: 4 + Math.floor(index / 3) }));
  assert.equal(shouldDetonatePortableBomb(blast, { x: 5, y: 5 }), false);
  assert.equal(shouldDetonatePortableBomb(blast, { x: 4, y: 4 }), false);
  assert.equal(shouldDetonatePortableBomb(blast, { x: 3, y: 5 }), true);
  assert.equal(shouldDetonatePortableBomb(blast, null), true);
});

test("the boss doorway waits for active dialogue and resumes when the scene is clear", () => {
  const directive = ENCOUNTER_DIRECTIVES.find((entry) => entry.id === "boss-engagement");
  assert.ok(directive);
  const snapshot = {
    dungeonMode: true, stage: "battle", encounterMode: "exploration", kingPresent: true, kingEngageable: true,
    flags: new Set(), sceneBusy: true,
  };
  assert.equal(directive.ready(snapshot), false);
  assert.equal(directive.ready({ ...snapshot, sceneBusy: false }), true);
});
