import type { Ability, AbilityScores, DamageType, SkillProficiency, Unit } from "./game-types";

export const ABILITIES: readonly Ability[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
export const ABILITY_LABELS: Record<Ability, string> = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };
export const SKILL_ABILITIES: Record<SkillProficiency, Ability> = {
  Acrobatics: "dexterity", "Animal Handling": "wisdom", Arcana: "intelligence", Athletics: "strength", Deception: "charisma", History: "intelligence", Insight: "wisdom", Intimidation: "charisma", Investigation: "intelligence", Nature: "intelligence", Perception: "wisdom", Performance: "charisma", Persuasion: "charisma", Religion: "intelligence", Stealth: "dexterity", Survival: "wisdom", "Thieves' Tools": "dexterity",
};

export const abilityModifier = (score = 10) => Math.floor((score - 10) / 2);
export const signedModifier = (value: number) => `${value >= 0 ? "+" : ""}${value}`;
export const proficiencyBonus = (level = 1) => 2 + Math.floor((Math.max(1, level) - 1) / 4);
export const armorClassOf = (unit: Pick<Unit, "armorClass" | "evasion">) => unit.armorClass ?? 10;
export const initiativeModifierOf = (unit: Pick<Unit, "abilities" | "initiative">) => unit.abilities ? abilityModifier(unit.abilities.dexterity) : Math.round(((unit.initiative || 10) - 10) / 3);
export const attackBonusOf = (unit: Pick<Unit, "abilities" | "primaryAbility" | "level" | "accuracy" | "attackBonus" | "proficiencyBonusOverride">, skillAccuracy = 0) => unit.attackBonus !== undefined
  ? unit.attackBonus + Math.round(skillAccuracy / 5)
  : unit.abilities
  ? abilityModifier(unit.abilities[unit.primaryAbility || "strength"]) + (unit.proficiencyBonusOverride ?? proficiencyBonus(unit.level)) + Math.round(skillAccuracy / 5)
  : Math.round(skillAccuracy / 5);
export const skillCheckBonus = (unit: Pick<Unit, "abilities" | "skillProficiencies" | "level" | "investigation" | "stealthBonus">, skill: SkillProficiency) => unit.abilities
  ? abilityModifier(unit.abilities[SKILL_ABILITIES[skill]]) + (unit.skillProficiencies?.includes(skill) ? proficiencyBonus(unit.level) : 0) + (skill === "Stealth" ? unit.stealthBonus || 0 : 0)
  : skill === "Investigation" ? unit.investigation || 0 : 0;
export const classSaveProgression = (level = 1, good = false) => good ? 2 + Math.floor(Math.max(1, level) / 2) : Math.floor(Math.max(1, level) / 3);
export const savingThrowBonus = (unit: Pick<Unit, "abilities" | "saveProficiencies" | "level" | "proficiencyBonusOverride">, ability: Ability) => {
  const proficient = unit.saveProficiencies?.includes(ability) || false;
  const progression = unit.level !== undefined
    ? classSaveProgression(unit.level, proficient)
    : proficient ? (unit.proficiencyBonusOverride ?? proficiencyBonus(unit.level)) : 0;
  return abilityModifier(unit.abilities?.[ability]) + progression;
};
export const spellSaveDc = (unit: Pick<Unit, "abilities" | "primaryAbility" | "level" | "proficiencyBonusOverride">) => 8 + (unit.proficiencyBonusOverride ?? proficiencyBonus(unit.level)) + abilityModifier(unit.abilities?.[unit.primaryAbility || "intelligence"]);
export const resolveSavingThrow = (unit: Pick<Unit, "abilities" | "saveProficiencies" | "level" | "proficiencyBonusOverride">, ability: Ability, dc: number, roll: number) => {
  const bonus = savingThrowBonus(unit, ability);
  const total = roll + bonus;
  return { ability, roll, bonus, total, dc, success: total >= dc };
};
export const passiveScore = (unit: Pick<Unit, "abilities" | "skillProficiencies" | "level" | "investigation" | "stealthBonus">, skill: "Perception" | "Investigation") => 10 + skillCheckBonus(unit, skill);

export type D20AttackResult = { roll: number; total: number; attackBonus: number; armorClass: number; hit: boolean; critical: boolean; naturalOne: boolean; advantage: boolean };
export const resolveD20Attack = ({ attacker, target, skillAccuracy = 0, roll, advantageRoll, disadvantageRoll, highGround = false, attackBonusOverride }: { attacker: Unit; target: Unit; skillAccuracy?: number; roll: number; advantageRoll?: number; disadvantageRoll?: number; highGround?: boolean; attackBonusOverride?: number }): D20AttackResult => {
  const advantage = advantageRoll !== undefined && disadvantageRoll === undefined;
  const disadvantage = disadvantageRoll !== undefined && advantageRoll === undefined;
  const natural = advantage ? Math.max(roll, advantageRoll!) : disadvantage ? Math.min(roll, disadvantageRoll!) : roll;
  const attackBonus = (attackBonusOverride ?? attackBonusOf(attacker, skillAccuracy)) + (highGround ? 2 : 0), armorClass = armorClassOf(target), total = natural + attackBonus;
  return { roll: natural, total, attackBonus, armorClass, hit: natural === 20 || (natural !== 1 && total >= armorClass), critical: natural === 20, naturalOne: natural === 1, advantage };
};
export const d20HitChance = (attacker: Unit, target: Unit, skillAccuracy = 0, highGround = false, advantage = false, attackBonusOverride?: number) => {
  const hits = Array.from({ length: 20 }, (_, index) => index + 1).filter((roll) => resolveD20Attack({ attacker, target, skillAccuracy, roll, highGround, attackBonusOverride }).hit).length;
  const base = hits / 20; return Math.round((advantage ? 1 - (1 - base) ** 2 : base) * 100);
};
export const criticalDamage = (displayedDamage: number, critical: boolean) => critical ? displayedDamage * 2 : displayedDamage;
export const damageAfterProtection = (target: Pick<Unit, "rageRounds" | "resistances" | "immunities" | "vulnerabilities" | "conditions">, damage: number, damageType: DamageType = "physical") => {
  if (target.conditions?.petrified) return damageType === "poison" ? 0 : Math.floor(damage / 2);
  if (target.immunities?.includes(damageType)) return 0;
  const physicalMatch = damageType !== "physical" && ["bludgeoning", "piercing", "slashing"].includes(damageType) && target.resistances?.includes("physical");
  const resisted = target.resistances?.includes(damageType) || physicalMatch || (target.rageRounds && ["physical", "bludgeoning", "piercing", "slashing"].includes(damageType));
  const vulnerable = target.vulnerabilities?.includes(damageType);
  if (resisted && !vulnerable) return Math.floor(damage / 2);
  if (vulnerable && !resisted) return damage * 2;
  return damage;
};

export const dndProfile = (abilities: AbilityScores, armorClass: number, primaryAbility: Ability, saveProficiencies: Ability[], skillProficiencies: SkillProficiency[]) => ({ abilities, armorClass, primaryAbility, saveProficiencies, skillProficiencies });
