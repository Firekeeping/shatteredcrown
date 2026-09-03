import { getActorDefinition } from "./actor-registry";
import { createUnitSeed } from "./game-runtime";
import type { Facing, Growth, Kit, Skill, SkillProficiency, Team, Unit } from "./game-types";
import { dndProfile, skillCheckBonus } from "./dnd-rules";
import { isKokoRanger, kokoRangerKit } from "./koko-ranger";
import { monsterAttackSkill } from "./monster-runtime";
import { capIntroWolfDamage } from "./intro-balance";

const XP_BY_CR: Record<string, number> = {
  "0": 10, "0.125": 25, "0.25": 50, "0.5": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
  "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
};
export const XP_LEVELS = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];
export const xpForCr = (cr = 0) => XP_BY_CR[String(cr)] || Math.max(10, Math.round(cr * 200));
export const xpForNextLevel = (level: number) => XP_LEVELS[level + 1] ?? XP_LEVELS[XP_LEVELS.length - 1] + (level - XP_LEVELS.length + 2) * 20000;
const CURRENT_ABILITY_NAME: Record<string, string> = {
  Backstab: "Sneak Attack", "Ember Volley": "Fire Bolt", "Hurling Axe": "Crushing Blow",
  "Weapon Throw": "Pinning Strike", "Pommel Strike": "Counterstance", "Cheap Shot": "Fan of Knives",
  Finale: "Bardic Inspiration", "Shield Break": "Driving Strike",
};
const RETIRED_ABILITIES = new Set(["Step of the Wind"]);
export const normalizeAbilityAliases = (skills: Skill[]) => skills
  .filter((skill) => !RETIRED_ABILITIES.has(skill.name))
  .map((skill) => CURRENT_ABILITY_NAME[skill.name] ? { ...skill, id: CURRENT_ABILITY_NAME[skill.name].toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: CURRENT_ABILITY_NAME[skill.name] } : skill);
export const playtestKillingCurse: Skill = {
  name: "Avada Kedavra",
  range: 999,
  power: 999999,
  accuracy: 100,
  charges: 1,
  kind: "damage",
  unlimited: true,
  instakill: true,
  description: "Playtest only. Instantly defeats every enemy anywhere on the map.",
};
export const playtestMapWideRevive: Skill = {
  name: "Run it Back, Turbo",
  range: 999,
  power: 999999,
  accuracy: 100,
  charges: 99,
  maxCharges: 99,
  kind: "heal",
  unlimited: true,
  mapWide: true,
  description: "Playtest only. Fully heals and revives one party member anywhere on the map, ignoring walls and distance.",
};
export const ensureTesterRevive = (skills: Skill[]) => skills.some((skill) => skill.name === playtestMapWideRevive.name) ? skills : [...skills, { ...playtestMapWideRevive }];
export const CLASS_DND_PROFILES = {
  Barbarian: dndProfile({ strength: 16, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 10, charisma: 12 }, 13, "strength", ["strength", "constitution"], ["Athletics", "Intimidation"]),
  Bard: dndProfile({ strength: 8, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 13, charisma: 16 }, 14, "charisma", ["dexterity", "charisma"], ["Performance", "Persuasion"]),
  Cleric: dndProfile({ strength: 13, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 16, charisma: 12 }, 16, "wisdom", ["wisdom", "charisma"], ["Insight", "Religion"]),
  Druid: dndProfile({ strength: 10, dexterity: 13, constitution: 14, intelligence: 12, wisdom: 16, charisma: 8 }, 13, "wisdom", ["intelligence", "wisdom"], ["Animal Handling", "Nature"]),
  Fighter: dndProfile({ strength: 16, dexterity: 13, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }, 16, "strength", ["strength", "constitution"], ["Athletics", "Perception"]),
  Wizard: dndProfile({ strength: 8, dexterity: 14, constitution: 13, intelligence: 16, wisdom: 12, charisma: 10 }, 12, "intelligence", ["intelligence", "wisdom"], ["Arcana", "History"]),
  Rogue: dndProfile({ strength: 8, dexterity: 16, constitution: 14, intelligence: 13, wisdom: 12, charisma: 10 }, 14, "dexterity", ["dexterity", "intelligence"], ["Investigation", "Stealth", "Thieves' Tools"]),
  Sorcerer: dndProfile({ strength: 8, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 16 }, 12, "charisma", ["constitution", "charisma"], ["Arcana", "Intimidation"]),
  Monk: dndProfile({ strength: 10, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 16, charisma: 8 }, 16, "dexterity", ["strength", "dexterity"], ["Acrobatics", "Insight"]),
  Paladin: dndProfile({ strength: 16, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 12, charisma: 16 }, 18, "strength", ["wisdom", "charisma"], ["Athletics", "Religion"]),
  Ranger: dndProfile({ strength: 10, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 16, charisma: 8 }, 15, "dexterity", ["strength", "dexterity"], ["Nature", "Perception", "Survival"]),
  Warlock: dndProfile({ strength: 8, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 10, charisma: 16 }, 14, "charisma", ["wisdom", "charisma"], ["Arcana", "Deception"]),
} satisfies Record<string, ReturnType<typeof dndProfile>>;
export const createSkill = (
  name: string,
  range: number,
  power: number,
  accuracy: number,
  charges: number,
  kind: "damage" | "heal",
  description: string,
  area?: "square" | "line",
  effects?: Partial<Skill>,
) => ({
  id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
  name,
  range,
  power,
  accuracy,
  charges,
  maxCharges: charges,
  recharge: charges >= 99 ? "encounter" as const : "rest" as const,
  source: "class",
  kind,
  description,
  area,
  ...effects,
});
const s = createSkill;
export const kits: Record<string, Kit> = {
  Barbarian: {
    ...CLASS_DND_PROFILES.Barbarian,
    hp: 14,
    move: 5,
    attack: 15,
    defense: 3,
    accuracy: 74,
    evasion: 8,
    range: 1,
    initiative: 14,
    skills: [
      { ...s("Rage", 0, 0, 100, 99, "heal", "Passive: deal +2 damage with every combat attack."), automatic: true },
      s(
        "Reckless Blow",
        1,
        21,
        -15,
        2,
        "damage",
        "Devastating but inaccurate.",
      ),
      s(
        "Battle Rush",
        1,
        17,
        0,
        2,
        "damage",
        "A forceful close strike that pushes the target.",
        undefined,
        { knockback: 1 },
      ),
    ],
  },
  Bard: {
    ...CLASS_DND_PROFILES.Bard,
    hp: 9,
    move: 4,
    attack: 8,
    defense: 2,
    accuracy: 82,
    evasion: 13,
    range: 3,
    initiative: 17,
    skills: [
      s("Discordant Note", 4, 12, 5, 3, "damage", "A precise ranged note."),
      s("Healing Verse", 3, 13, 100, 3, "heal", "Restore an ally's HP."),
      s("Bardic Inspiration", 4, 0, 100, 3, "heal", "Grant an ally 1d6 on their next d20 roll."),
    ],
  },
  Cleric: {
    ...CLASS_DND_PROFILES.Cleric,
    hp: 10,
    move: 4,
    attack: 10,
    defense: 5,
    accuracy: 80,
    evasion: 7,
    range: 1,
    initiative: 12,
    skills: [
      s("Mending Light", 4, 17, 100, 3, "heal", "Restore an ally's HP."),
      s("Radiant Bolt", 4, 14, 4, 3, "damage", "Reliable holy damage."),
      s(
        "Solar Beam",
        7,
        30,
        0,
        2,
        "damage",
        "Choose a straight or diagonal line. The marked squares erupt in radiant light on your next turn.",
        "line",
        { chargeRounds: 1, damageType: "radiant" },
      ),
      s("Sanctuary", 2, 24, 100, 1, "heal", "A major recovery."),
    ],
  },
  Druid: {
    ...CLASS_DND_PROFILES.Druid,
    hp: 10,
    move: 4,
    attack: 9,
    defense: 3,
    accuracy: 80,
    evasion: 10,
    range: 3,
    initiative: 13,
    skills: [
      s("Thorn Lash", 4, 14, 0, 3, "damage", "Nature lashes at range."),
      s("Moon Mend", 3, 14, 100, 2, "heal", "Restore an ally with moonlight."),
      s("Wildfire", 3, 19, -10, 2, "damage", "Heavy elemental damage."),
    ],
  },
  Fighter: {
    ...CLASS_DND_PROFILES.Fighter,
    hp: 12,
    move: 4,
    attack: 13,
    defense: 6,
    accuracy: 80,
    evasion: 8,
    range: 1,
    initiative: 15,
    skills: [
      s("Second Wind", 0, 14, 100, 1, "heal", "Recover your own HP."),
    ],
  },
  Wizard: {
    ...CLASS_DND_PROFILES.Wizard,
    hp: 7,
    move: 3,
    attack: 7,
    defense: 1,
    accuracy: 84,
    evasion: 8,
    range: 3,
    initiative: 11,
    skills: [
      s(
        "Fireball",
        4,
        18,
        0,
        2,
        "damage",
        "Explodes across a 3×3 square.",
        "square",
      ),
      s(
        "Lightning Bolt",
        5,
        22,
        -2,
        2,
        "damage",
        "Strikes every enemy in a straight or diagonal line with a 35% chance to stun.",
        "line",
        { stunChance: 35 },
      ),
      s("Arcane Bolt", 5, 13, 5, 4, "damage", "Long and accurate magic."),
      s("Drain", 3, 15, 0, 2, "damage", "Focused necrotic energy."),
      s("Ward", 0, 10, 100, 1, "heal", "Restore yourself with a ward."),
      { ...s("Shield", 0, 0, 100, 1, "heal", "Automatically spends one charge to gain +5 AC when it can turn a hit into a miss."), automatic: true, wardAcBonus: 5 },
    ],
  },
  Rogue: {
    ...CLASS_DND_PROFILES.Rogue,
    hp: 10,
    move: 6,
    attack: 12,
    defense: 2,
    accuracy: 86,
    evasion: 18,
    range: 1,
    initiative: 20,
    skills: [
      s(
        "Sneak Attack",
        1,
        20,
        -5,
        2,
        "damage",
        "Deals extra damage when attacking from behind.",
      ),
      s("Throwing Knife", 4, 12, 4, 3, "damage", "A quick ranged attack."),
    ],
  },
  Sorcerer: {
    ...CLASS_DND_PROFILES.Sorcerer,
    hp: 7,
    move: 4,
    attack: 8,
    defense: 2,
    accuracy: 82,
    evasion: 11,
    range: 3,
    initiative: 16,
    skills: [
      s("Chaos Lance", 4, 18, -8, 3, "damage", "Unstable magical force."),
      s("Fire Bolt", 3, 14, 2, 3, "damage", "One concentrated ranged fire bolt."),
      s("Frost Lance", 5, 15, 2, 3, "damage", "A focused lance of cold that pierces a distant target.", undefined, { damageType: "cold" }),
    ],
  },
  Monk: {
    ...CLASS_DND_PROFILES.Monk, hp: 10, move: 5, attack: 7, defense: 3, accuracy: 84, evasion: 16, range: 1, initiative: 16,
    skills: [
      s("Flurry of Blows", 1, 8, 0, 2, "damage", "Make two rapid unarmed attacks; each attack rolls separately."),
      s("Open Palm", 1, 7, 2, 3, "damage", "An unarmed strike that pushes the target one square.", undefined, { knockback: 1 }),
      s("Patient Defense", 0, 0, 100, 2, "heal", "Adopt a defensive stance and gain +2 AC until the next turn."),
      s("Sweeping Kick", 1, 7, 0, 2, "damage", "Attack every adjacent enemy with a separate unarmed attack."),
    ],
  },
  Paladin: {
    ...CLASS_DND_PROFILES.Paladin, hp: 12, move: 4, attack: 8, defense: 6, accuracy: 80, evasion: 6, range: 1, initiative: 10,
    skills: [
      s("Divine Smite", 1, 10, 0, 3, "damage", "A weapon strike empowered with additional radiant damage.", undefined, { damageType: "radiant" }),
      s("Lay on Hands", 2, 10, 100, 3, "heal", "Restore an ally and return a downed hero to the fight."),
      s("Shielding Smite", 1, 8, 0, 2, "damage", "Strike an enemy and gain +2 AC until the next turn."),
      s("Thunderous Smite", 1, 8, 0, 2, "damage", "A weapon strike that pushes the target one square.", undefined, { knockback: 1, damageType: "thunder" }),
    ],
  },
  Ranger: {
    ...CLASS_DND_PROFILES.Ranger, hp: 11, move: 5, attack: 7, defense: 4, accuracy: 84, evasion: 14, range: 10, initiative: 16,
    skills: [
      s("Hunter's Mark", 6, 0, 100, 3, "damage", "Mark one enemy; the Ranger deals +2 damage to it for the battle."),
      s("Ensnaring Strike", 10, 7, 0, 2, "damage", "A weapon attack that forces a STR save or Restrains the target.", undefined, { inflictedConditions: [{ condition: "restrained", saveAbility: "strength", durationRounds: 2, repeatSave: true }] }),
      s("Hail of Thorns", 10, 7, 0, 2, "damage", "A ranged attack that damages enemies around the target.", "square"),
      s("Field Remedy", 2, 8, 100, 2, "heal", "Use wilderness medicine to restore an ally."),
    ],
  },
  Warlock: {
    ...CLASS_DND_PROFILES.Warlock, hp: 10, move: 4, attack: 6, defense: 2, accuracy: 82, evasion: 11, range: 6, initiative: 14,
    skills: [
      s("Eldritch Blast", 6, 8, 3, 4, "damage", "A reliable ranged bolt of pact force."),
      s("Hex", 6, 5, 0, 3, "damage", "Curse an enemy, damaging it and weakening its next d20 roll.", undefined, { damageType: "necrotic" }),
      s("Armor of Agathys", 0, 8, 100, 2, "heal", "Gain temporary HP; nearby attackers suffer cold damage."),
      s("Hellish Rebuke", 6, 9, 0, 2, "damage", "Automatically burns the next enemy that damages the Warlock.", undefined, { damageType: "fire", automatic: true }),
      s("Arms of Hadar", 1, 8, 0, 2, "damage", "Damage every nearby enemy and deny their opportunity attacks.", "square"),
    ],
  },
};
export const progressionSkills: Record<string, Skill[]> = {
  Barbarian: [
    s(
      "Ground Breaker",
      1,
      19,
      2,
      2,
      "damage",
      "A crushing blow that shakes the earth.",
    ),
    s("Blood Roar", 2, 16, 8, 2, "damage", "A savage roar turned into force."),
    s("Reckless Cleave", 1, 24, -10, 2, "damage", "A brutal, inaccurate swing that cleaves through nearby enemies.", "square"),
    s("Crushing Blow", 1, 12, -2, 2, "damage", "A crushing melee hit that forces a CON save or Stuns.", undefined, { stunChance: 100 }),
    s("Unbroken", 0, 26, 100, 1, "heal", "Battle fury restores the Barbarian's strength."),
  ],
  Bard: [
    s("Dissonant Whispers", 4, 10, 100, 3, "damage", "A target makes a WIS save or takes psychic damage and becomes Frightened.", undefined, { saveAbility: "wisdom", damageType: "psychic" }),
    s(
      "Cutting Refrain",
      4,
      14,
      8,
      3,
      "damage",
      "A taunting verse that strikes from afar.",
    ),
    s(
      "Restoring Chorus",
      4,
      16,
      100,
      2,
      "heal",
      "A chorus that restores an ally.",
    ),
    s("Piercing Note", 6, 17, 5, 3, "damage", "A clear note strikes a distant enemy."),
    s("Heroic Verse", 4, 22, 100, 2, "heal", "A battle verse rallies a wounded ally."),
  ],
  Cleric: [
    s("Toll the Dead", 6, 5, 100, 4, "damage", "A target makes a WIS save or takes necrotic damage. A wounded target takes 7 damage.", undefined, { saveAbility: "wisdom", damageType: "necrotic" }),
    s(
      "Judgment",
      3,
      18,
      4,
      2,
      "damage",
      "Holy force falls upon a distant foe.",
    ),
    s(
      "Greater Mend",
      4,
      23,
      100,
      2,
      "heal",
      "A powerful prayer of restoration.",
    ),
    s("Searing Light", 5, 20, 5, 3, "damage", "Radiant light burns a distant foe."),
    s("Solar Beam", 7, 30, 0, 2, "damage", "Choose a straight or diagonal line. The marked squares erupt in radiant light on your next turn.", "line", { chargeRounds: 1, damageType: "radiant" }),
    s("Massive Cure", 4, 30, 100, 1, "heal", "A potent blessing restores a gravely wounded ally."),
    s("Sacred Hammer", 2, 26, 0, 2, "damage", "Divine force crashes down near the Cleric."),
  ],
  Druid: [
    s(
      "Thorn Lash",
      3,
      16,
      5,
      3,
      "damage",
      "Living thorns tear at a distant enemy.",
    ),
    s("Renewal", 3, 19, 100, 2, "heal", "Natural energy restores an ally."),
    s("Stone Fang", 4, 21, 0, 3, "damage", "Jagged stone erupts beneath a foe."),
    s("Life Bloom", 5, 25, 100, 2, "heal", "A bloom of wild power closes an ally's wounds."),
    s("Gale Burst", 3, 22, 5, 2, "damage", "A focused gale drives an enemy backward.", undefined, { knockback: 1 }),
  ],
  Fighter: [
    s(
      "Driving Strike",
      1,
      20,
      3,
      2,
      "damage",
      "A disciplined blow that pushes the target.",
      undefined,
      { knockback: 1 },
    ),
    s("Pinning Strike", 1, 10, 0, 3, "damage", "Damage the target, remove its movement, and deny its opportunity attacks for one round.", undefined, { inflictedConditions: [{ condition: "restrained", durationRounds: 1 }] }),
    s("Counterstance", 0, 0, 100, 2, "heal", "Counter every enemy that attacks the Fighter; the faster combatant strikes first."),
    s("Lunging Thrust", 2, 24, 2, 2, "damage", "A disciplined attack that reaches beyond adjacent foes."),
    s("Indomitable", 0, 24, 100, 1, "heal", "Training and resolve restore the Fighter's stamina."),
  ],
  Wizard: [
    s("Toll the Dead", 6, 5, 100, 4, "damage", "A target makes a WIS save or takes necrotic damage. A wounded target takes 7 damage.", undefined, { saveAbility: "wisdom", damageType: "necrotic" }),
    s(
      "Fireball",
      4,
      18,
      0,
      2,
      "damage",
      "Explodes across a 3×3 square and leaves it burning for one round.",
      "square",
    ),
    s(
      "Lightning Bolt",
      5,
      22,
      -2,
      2,
      "damage",
      "Strikes a straight or diagonal line with a 35% chance to stun.",
      "line",
      { stunChance: 35 },
    ),
    s("Arcane Renewal", 3, 15, 100, 2, "heal", "Magic binds an ally's wounds."),
    s("Ice Spear", 6, 20, 4, 3, "damage", "A shard of ice pierces a distant enemy."),
    s("Thunderclap", 3, 18, 5, 2, "damage", "Concussive thunder may stun its target.", undefined, { stunChance: 40 }),
    s("Disintegrate", 5, 30, -12, 1, "damage", "A difficult spell of devastating focused power."),
  ],
  Rogue: [
    s("Fan of Knives", 4, 9, 0, 2, "damage", "Throw a fan of knives through every enemy in the selected area.", "square"),
    s(
      "Throwing Knife",
      4,
      14,
      8,
      3,
      "damage",
      "A quick and accurate ranged attack.",
    ),
    s("Hamstring", 1, 21, 5, 3, "damage", "A precise cut made at close range."),
    s("Assassinate", 1, 30, -12, 1, "damage", "A risky killing strike best delivered from behind."),
  ],
  Sorcerer: [
    { ...s("Twinned Spell", 0, 0, 100, 99, "heal", "Passive: single-target spells affect a second valid target."), automatic: true },
    { ...s("Distant Spell", 0, 0, 100, 99, "heal", "Passive: doubles the range of Sorcerer spells."), automatic: true },
    { ...s("Heightened Spell", 0, 0, 100, 99, "heal", "Passive: the first target of a saving-throw spell rolls with disadvantage."), automatic: true },
    s(
      "Chaos Lance",
      4,
      21,
      -4,
      2,
      "damage",
      "Unstable power erupts toward a foe.",
    ),
    s(
      "Ember Ward",
      3,
      14,
      100,
      2,
      "heal",
      "Warm magic seals an ally's injuries.",
    ),
    s("Forked Flame", 5, 20, 2, 3, "damage", "Wild flame lashes a distant target."),
    s("Crimson Renewal", 4, 24, 100, 2, "heal", "Sorcery restores an ally through sheer force of will."),
    s("Starfall", 6, 29, -10, 1, "damage", "Unstable celestial power crashes into a distant foe."),
  ],
  Monk: [
    s("Leap of the Clouds", 4, 0, 100, 3, "heal", "Leap across units, difficult terrain, pits, water, and floor hazards to a valid open square.", undefined, { movement: "teleport" }),
    s("Stunning Strike", 1, 11, 0, 2, "damage", "An unarmed hit that forces a CON save or Stuns."),
    s("Wholeness of Body", 0, 12, 100, 2, "heal", "Restore HP and remove poison and bleeding."),
  ],
  Paladin: [
    s("Branding Smite", 1, 11, 0, 3, "damage", "A weapon strike empowered with additional radiant damage.", undefined, { damageType: "radiant" }),
    s("Turn the Unholy", 3, 0, 100, 2, "damage", "Nearby undead and fiends make a WIS save or flee.", "square"),
    s("Lesser Restoration", 3, 12, 100, 2, "heal", "Heal an ally and remove poison, bleeding, or fear."),
    s("Blinding Smite", 1, 14, -2, 2, "damage", "Radiant strike that forces a CON save or Blinds.", undefined, { damageType: "radiant", inflictedConditions: [{ condition: "blinded", saveAbility: "constitution", durationRounds: 1 }] }),
  ],
  Ranger: [
    { ...s("Favored Enemy", 0, 0, 100, 99, "heal", "Passive: every five kills of a creature type grants +2 attack and damage against it."), automatic: true },
    s("Animal Companion", 0, 0, 100, 1, "heal", "Summon a loyal animal companion into an adjacent open square."),
    s("Spike Growth", 5, 9, 100, 2, "damage", "Create a damaging difficult-terrain area.", "square"),
    s("Fog Cloud", 5, 0, 100, 2, "damage", "Create an area that blocks vision.", "square"),
    s("Goodberry", 2, 8, 100, 3, "heal", "Create restorative berries for allies."),
    s("Longstrider", 3, 0, 100, 3, "heal", "Give one ally +2 movement for the encounter."),
    s("Zephyr Strike", 10, 8, 0, 3, "damage", "Attack, then move two squares without provoking opportunity attacks."),
    s("Flame Arrows", 0, 0, 100, 2, "heal", "Arm your next 3 standard ranged attacks; each hit deals 6 extra fire damage.", undefined, { damageType: "fire" }),
    s("Healing Spirit", 4, 10, 100, 2, "heal", "Create a temporary spirit that restores nearby allies.", "square"),
    s("Wind Wall", 6, 0, 100, 2, "damage", "Choose Point A and Point B to create up to 30 feet of wind that deflects ordinary projectiles.", "line"),
    s("Lightning Arrow", 10, 13, 0, 2, "damage", "A ranged hit bursts into lightning around its target.", undefined, { damageType: "lightning" }),
    s("Volley", 10, 10, 0, 2, "damage", "Attack every enemy in a selected area.", "square"),
    s("Plant Growth", 5, 0, 100, 2, "damage", "Create severe difficult terrain that does not impede the Ranger.", "square"),
  ],
  Warlock: [
    s("Toll the Dead", 6, 5, 100, 4, "damage", "A target makes a WIS save or takes necrotic damage. A wounded target takes 7 damage.", undefined, { saveAbility: "wisdom", damageType: "necrotic" }),
    s("Misty Step", 6, 0, 100, 3, "heal", "Teleport to a visible open square.", undefined, { movement: "teleport" }),
    s("Hold Person", 6, 0, 100, 2, "damage", "A humanoid makes a WIS save or becomes Restrained.", undefined, { saveAbility: "wisdom", inflictedConditions: [{ condition: "restrained", saveAbility: "wisdom", durationRounds: 2, repeatSave: true }] }),
    s("Shatter", 5, 11, 100, 2, "damage", "Thunder damages every enemy in a selected area.", "square"),
    s("Darkness", 5, 0, 100, 2, "damage", "Create an area that blocks normal vision.", "square"),
    s("Invisibility", 4, 0, 100, 2, "heal", "Hide one hero until they attack, deal damage, or take damage."),
    s("Counterspell", 6, 0, 100, 2, "damage", "Cancel one selected enemy's next magical ability."),
    s("Hunger of Hadar", 5, 14, 100, 2, "damage", "Create damaging darkness that slows enemies inside it.", "square"),
    s("Fear", 3, 0, 100, 2, "damage", "Enemies in a nearby area make a WIS save or become Frightened.", "square"),
    s("Vampiric Touch", 1, 11, 0, 2, "damage", "Deal necrotic damage and restore part of the damage inflicted.", undefined, { damageType: "necrotic" }),
    s("Blight", 5, 16, 100, 2, "damage", "One creature makes a CON save for half necrotic damage.", undefined, { damageType: "necrotic" }),
  ],
};
const classGrowth: Record<string, Growth> = {
  Barbarian: {
    hp: 9,
    attack: 2,
  },
  Bard: {
    hp: 6,
    attack: 1,
  },
  Cleric: {
    hp: 7,
    attack: 1,
  },
  Druid: {
    hp: 7,
    attack: 1,
  },
  Fighter: {
    hp: 8,
    attack: 1.5,
  },
  Wizard: {
    hp: 5,
    attack: 1.5,
  },
  Rogue: {
    hp: 7,
    attack: 1.25,
  },
  Sorcerer: {
    hp: 5,
    attack: 1.75,
  },
  Monk: { hp: 7, attack: 1.25 },
  Paladin: { hp: 8, attack: 1.5 },
  Ranger: { hp: 7, attack: 1.25 },
  Warlock: { hp: 6, attack: 1.5 },
};
export type ClassLevelProgression = {
  level: number;
  hp: number;
  attack: number;
  primaryAbilityIncrease: number;
  chargeIncrease: number;
};
export const CLASS_LEVEL_PROGRESSION: Record<string, ClassLevelProgression[]> = Object.fromEntries(
  Object.entries(classGrowth).map(([role, growth]) => [role, Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    return {
      level,
      hp: Math.floor(kits[role].hp + growth.hp * index),
      attack: Math.floor(kits[role].attack + growth.attack * index),
      primaryAbilityIncrease: Math.floor(level / 4) * 2,
      chargeIncrease: index,
    };
  })]),
);
export const kitAtLevel = (role: string, level: number): Kit => {
  const base = kits[role],
    growth = classGrowth[role],
    steps = Math.max(0, level - 1);
  if (!growth) return base;
  const progression = level <= 10 ? CLASS_LEVEL_PROGRESSION[role]?.[Math.max(1, level) - 1] : undefined;
  const abilityIncrease = progression?.primaryAbilityIncrease ?? Math.floor(level / 4) * 2;
  const abilities = base.abilities ? {
    ...base.abilities,
    [base.primaryAbility || "strength"]: base.abilities[base.primaryAbility || "strength"] + abilityIncrease,
  } : base.abilities;
  const chargeIncrease = progression?.chargeIncrease ?? steps;
  return {
    ...base,
    hp: progression?.hp ?? Math.floor(base.hp + growth.hp * steps),
    attack: progression?.attack ?? Math.floor(base.attack + growth.attack * steps),
    abilities,
    skills: base.skills.map((skill) => skill.unlimited ? skill : {
      ...skill,
      charges: (skill.maxCharges ?? skill.charges) + chargeIncrease,
      maxCharges: (skill.maxCharges ?? skill.charges) + chargeIncrease,
    }),
  };
};
export const migrateHeroToDnd = (unit: Unit, bonuses: { defense?: number; investigation?: number; evasion?: number; proficiencies?: SkillProficiency[] } = {}): Unit => {
  const profile = kits[unit.role];
  if (unit.team !== "hero" || !profile?.abilities) return unit;
  const skillProficiencies = [...new Set([...(unit.skillProficiencies || profile.skillProficiencies || []), ...(bonuses.proficiencies || []), ...(bonuses.evasion ? ["Acrobatics" as const] : [])])];
  const normalizedSkills = normalizeAbilityAliases(unit.skills), skills = unit.id === "custom-hero" && unit.name === "Tester" ? ensureTesterRevive(normalizedSkills) : normalizedSkills;
  const migrated = { ...unit, skills, abilities: { ...(unit.abilities || profile.abilities) }, armorClass: unit.armorClass ?? (profile.armorClass || 10) + (bonuses.defense || 0), primaryAbility: unit.primaryAbility || profile.primaryAbility, saveProficiencies: [...(unit.saveProficiencies || profile.saveProficiencies || [])], skillProficiencies };
  return { ...migrated, investigation: skillCheckBonus(migrated, "Investigation") + (bonuses.investigation || 0) };
};
export const heroNames: Record<string, string[]> = {
  Barbarian: ["Walker", "Brynja", "Korr", "Sable"],
  Bard: ["Lark", "Orin", "Viola", "Tamsin"],
  Cleric: ["Gromm", "Elara", "Brom", "Seraphine"],
  Druid: ["Rowan", "Moss", "Thalia", "Fen"],
  Fighter: ["Alric", "Kael", "Mirae", "Doran"],
  Wizard: ["Veyra", "Aldous", "Nyx", "Merlin"],
  Rogue: ["Shade", "Kestrel", "Vex", "Rook"],
  Sorcerer: ["Cinder", "Mara", "Zeph", "Ilyra"],
  Monk: ["Tenzin", "Mira", "Kato", "Suri"],
  Paladin: ["Garran", "Helena", "Lucan", "Aurelia"],
  Ranger: ["Ash", "Briar", "Torren", "Wren", "Koko"],
  Warlock: ["Vesper", "Mordren", "Nyra", "Calder"],
};
export const makeUnit = (
  id: string,
  name: string,
  role: string,
  team: Team,
  kit: Kit,
  cr?: number,
): Unit => {
  const resolvedKit = team === "hero" && isKokoRanger({ name, role }) ? kokoRangerKit(kit, progressionSkills.Ranger) : kit;
  const unit = createUnitSeed({ id, name, role, team, kit: resolvedKit, cr }) as Unit;
  unit.combatProfile = team === "hero" ? { kind: "hero", classRole: role } : undefined;
  unit.investigation = team === "hero" ? skillCheckBonus(unit, "Investigation") : 0;
  return unit;
};
export const spawnActor = (actorId: string, instanceId: string, team: Team, name?: string): Unit => {
  const definition = getActorDefinition(actorId);
  const stat = definition.statBlock, basic = stat.attacks[0];
  const runtimeKit: Kit = {
    hp: stat.hitPoints, move: stat.speeds.walk, attack: 0, defense: 0, accuracy: 0, evasion: 0,
    range: basic?.reach || 1, initiative: 10 + stat.initiativeModifier, skills: stat.attacks.map((attack) => monsterAttackSkill(attack, definition.abilities.find((ability) => ability.id === attack.id)?.description)),
    abilities: stat.abilities, armorClass: stat.armorClass, primaryAbility: definition.primaryAbility,
    saveProficiencies: stat.saveProficiencies, skillProficiencies: Object.keys(stat.skills) as SkillProficiency[],
  };
  const unit = makeUnit(instanceId, name || definition.name, definition.role, team, runtimeKit, definition.cr);
  unit.actorId = definition.id; unit.combatProfile = { kind: "monster", actorId: definition.id }; unit.xpReward = stat.xp; unit.attackBonus = basic?.attackBonus; unit.proficiencyBonusOverride = stat.proficiencyBonus;
  // Level 1 records future movement modes, but all current encounters remain grounded.
  unit.movementMode = "walk";
  unit.damageType = basic?.damageType; unit.resistances = [...stat.resistances]; unit.immunities = [...stat.immunities]; unit.vulnerabilities = [...stat.vulnerabilities]; unit.conditionImmunities = [...stat.conditionImmunities];
  return unit;
};
export const spawnIntroWolf = (actorId: "Dire Wolf" | "Werewolf", instanceId: string, name?: string) =>
  capIntroWolfDamage(spawnActor(actorId, instanceId, "enemy", name));
export const difficulty = (cr: number, n: number, partyLevel = 1) => {
  const strength = Math.max(1, n * (0.75 + partyLevel * 0.25));
  return cr <= strength * 0.5
    ? "Favorable"
    : cr <= strength
      ? "Fair"
      : cr <= strength * 1.75
        ? "Hard"
        : "Deadly";
};
export const faceIcon: Record<Facing, string> = { n: "↑", e: "→", s: "↓", w: "←" };
