import { abilityModifier, attackBonusOf, proficiencyBonus } from "./dnd-rules";
import type { Ability, Unit } from "./game-types";
import { getItemDefinition, type WeaponProfile } from "./item-registry";
import { isKokoRanger, KOKO_BOW_BASE_DAMAGE, KOKO_BOW_NAME, KOKO_MIN_DAMAGE } from "./koko-ranger";

type NamedWeapon = WeaponProfile & { name: string };

const DEFAULT_WEAPONS: Record<string, NamedWeapon> = {
  Barbarian: { name: "Greataxe", baseDamage: 6, damageType: "slashing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 2, tags: ["melee", "heavy"] },
  Bard: { name: "Rapier", baseDamage: 4, damageType: "piercing", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "martial", hands: 1, tags: ["melee", "finesse"] },
  Cleric: { name: "Mace", baseDamage: 3, damageType: "bludgeoning", range: 1, abilityChoices: ["strength"], proficiency: "simple", hands: 1, tags: ["melee"] },
  Druid: { name: "Scimitar", baseDamage: 3, damageType: "slashing", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "martial", hands: 1, tags: ["melee", "finesse", "light"] },
  Fighter: { name: "Longsword", baseDamage: 4, versatileBaseDamage: 5, damageType: "slashing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 1, tags: ["melee", "versatile"] },
  Wizard: { name: "Quarterstaff", baseDamage: 3, versatileBaseDamage: 4, damageType: "bludgeoning", range: 1, abilityChoices: ["strength"], proficiency: "simple", hands: 1, tags: ["melee", "versatile"] },
  Rogue: { name: "Dagger", baseDamage: 2, damageType: "piercing", range: 4, abilityChoices: ["strength", "dexterity"], proficiency: "simple", hands: 1, tags: ["melee", "finesse", "light", "thrown"] },
  Sorcerer: { name: "Dagger", baseDamage: 2, damageType: "piercing", range: 4, abilityChoices: ["strength", "dexterity"], proficiency: "simple", hands: 1, tags: ["melee", "finesse", "light", "thrown"] },
  Monk: { name: "Quarterstaff", baseDamage: 3, versatileBaseDamage: 4, damageType: "bludgeoning", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "simple", hands: 1, tags: ["melee", "versatile"] },
  Paladin: { name: "Longsword", baseDamage: 4, versatileBaseDamage: 5, damageType: "slashing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 1, tags: ["melee", "versatile"] },
  Ranger: { name: "Longbow", baseDamage: 4, damageType: "piercing", range: 12, abilityChoices: ["dexterity"], proficiency: "martial", hands: 2, tags: ["bow", "heavy"] },
  Warlock: { name: "Light Crossbow", baseDamage: 4, damageType: "piercing", range: 10, abilityChoices: ["dexterity"], proficiency: "simple", hands: 2, tags: [] },
};
const KOKO_BOW: NamedWeapon = { name: KOKO_BOW_NAME, baseDamage: KOKO_BOW_BASE_DAMAGE, damageType: "piercing", range: 12, abilityChoices: ["dexterity"], proficiency: "martial", hands: 2, tags: ["bow", "heavy"] };

const ALL_SIMPLE = new Set(["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Rogue", "Monk", "Paladin", "Ranger", "Warlock"]);
const ALL_MARTIAL = new Set(["Barbarian", "Fighter", "Paladin", "Ranger"]);
const SPECIAL_PROFICIENCIES: Record<string, Set<string>> = {
  Bard: new Set(["Hand Crossbow", "Longsword", "Rapier", "Shortsword"]),
  Druid: new Set(["Scimitar"]),
  Rogue: new Set(["Hand Crossbow", "Longsword", "Rapier", "Shortsword"]),
  Wizard: new Set(["Dagger", "Quarterstaff", "Light Crossbow"]),
  Sorcerer: new Set(["Dagger", "Quarterstaff", "Light Crossbow"]),
};

export const isWeaponProficient = (role: string, weapon: NamedWeapon) =>
  (weapon.proficiency === "simple" && ALL_SIMPLE.has(role)) ||
  (weapon.proficiency === "martial" && ALL_MARTIAL.has(role)) ||
  !!SPECIAL_PROFICIENCIES[role]?.has(weapon.name);

const bestWeaponAbility = (unit: Unit, choices: Ability[]) => choices.reduce((best, ability) =>
  abilityModifier(unit.abilities?.[ability]) > abilityModifier(unit.abilities?.[best]) ? ability : best, choices[0] || "strength");

export const weaponAttackProfile = (unit: Unit, equippedWeapon?: string, bothHands = false) => {
  const itemWeapon = equippedWeapon ? getItemDefinition(equippedWeapon).weapon : undefined;
  if (equippedWeapon && !itemWeapon) return null;
  const weapon: NamedWeapon | undefined = itemWeapon ? { ...itemWeapon, name: equippedWeapon! } : isKokoRanger(unit) ? KOKO_BOW : DEFAULT_WEAPONS[unit.role];
  if (!weapon || !unit.abilities) return { damage: unit.attack, range: unit.range, damageType: "physical" as const, name: "Basic Attack", attackBonus: attackBonusOf(unit), proficient: true, hands: 1 as const, tags: [] as string[] };
  const ability = bestWeaponAbility(unit, weapon.abilityChoices);
  const modifier = abilityModifier(unit.abilities[ability]);
  const proficient = isWeaponProficient(unit.role, weapon);
  const baseDamage = bothHands && weapon.versatileBaseDamage ? weapon.versatileBaseDamage : weapon.baseDamage;
  const weaponModifier = weapon.modifierBonus || 0;
  return { damage: Math.max(isKokoRanger(unit) ? KOKO_MIN_DAMAGE : 1, baseDamage + modifier + weaponModifier), range: weapon.range, damageType: weapon.damageType, name: weapon.name, attackBonus: modifier + (proficient ? proficiencyBonus(unit.level) : 0) + weaponModifier, proficient, hands: weapon.hands, tags: weapon.tags, ability, weaponModifier };
};

export const restoreRestCharges = (unit: Unit): Unit => ({
  ...unit,
  skills: unit.skills.map((skill) => skill.recharge === "rest"
    ? { ...skill, charges: skill.maxCharges ?? skill.charges }
    : skill),
});

export const completeRest = (unit: Unit): Unit => restoreRestCharges({
  ...unit,
  hp: unit.maxHp,
  downed: false,
  bleeding: false,
  poisoned: false,
  stunned: false,
  conditions: {},
  combatEffects: [],
  temporaryHp: 0,
});

export const equippedShieldBonus = (offhandItem?: string) => offhandItem
  ? getItemDefinition(offhandItem).shield?.acBonus || 0
  : 0;
