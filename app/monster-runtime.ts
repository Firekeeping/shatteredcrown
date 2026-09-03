import { getActorDefinition, type MonsterAttack, type MonsterStatBlock } from "./actor-registry";
import type { Skill, Unit } from "./game-types";
import { capMonsterSkillDamage } from "./intro-balance";

export type MonsterTraitHandler = {
  ignoresBreathingHazards?: boolean;
  startTurnHealing?: number;
  grantsAdvantageNearAlly?: boolean;
  squeezesThroughOccupiedTiles?: boolean;
  hiddenUntilActivated?: boolean;
  advantageOnPerception?: boolean;
  resistsControl?: boolean;
  lightningAbsorption?: boolean;
};

export const MONSTER_TRAIT_HANDLERS: Record<string, MonsterTraitHandler> = {
  amphibious: { ignoresBreathingHazards: true },
  regeneration: { startTurnHealing: 10 },
  "pack-tactics": { grantsAdvantageNearAlly: true },
  "keen-smell": { advantageOnPerception: true },
  amorphous: { squeezesThroughOccupiedTiles: true },
  "false-appearance": { hiddenUntilActivated: true },
  "air-form": { squeezesThroughOccupiedTiles: true },
  "two-heads": { advantageOnPerception: true, resistsControl: true },
  "lightning-absorption": { lightningAbsorption: true },
  "combat-focus": { resistsControl: true },
};

export const monsterTraitEffects = (unit: Unit) => (monsterStatBlockFor(unit)?.traits || [])
  .map((trait) => MONSTER_TRAIT_HANDLERS[trait.id])
  .filter(Boolean);

export const monsterStatBlockFor = (unit: Unit): MonsterStatBlock | null => unit.combatProfile?.kind === "monster"
  ? getActorDefinition(unit.combatProfile.actorId).statBlock
  : null;

export const monsterAttackSkill = (attack: MonsterAttack, description = ""): Skill => ({
  id: attack.id,
  name: attack.name,
  range: attack.reach,
  power: attack.damage,
  attackBonus: attack.attackBonus,
  saveAbility: attack.save?.ability,
  saveDc: attack.save?.dc,
  halfDamageOnSave: attack.save?.halfDamage,
  attackCount: attack.attacks || 1,
  additionalDamage: attack.additionalDamage,
  rechargeRoll: attack.recharge,
  inflictedConditions: attack.conditions,
  charges: attack.recharge ? 1 : 99,
  maxCharges: attack.recharge ? 1 : 99,
  recharge: attack.recharge ? "never" : "encounter",
  unlimited: !attack.recharge,
  source: "monster",
  kind: "damage",
  damageType: attack.damageType,
  description,
});

export const normalizeMonsterRuntime = (unit: Unit): Unit => {
  if (unit.team === "hero") return unit;
  let definition;
  try { definition = getActorDefinition(unit.combatProfile?.kind === "monster" ? unit.combatProfile.actorId : unit.actorId || unit.role); }
  catch { return unit; }
  const existing = new Map(unit.skills.map((skill) => [skill.id, skill]));
  const skills = definition.statBlock.attacks.map((attack) => {
    const rebuilt = monsterAttackSkill(attack, definition.abilities.find((ability) => ability.id === attack.id)?.description);
    const saved = existing.get(attack.id);
    const restored = saved ? { ...rebuilt, charges: saved.charges } : rebuilt;
    return unit.introDamageCap ? capMonsterSkillDamage(restored, unit.introDamageCap) : restored;
  });
  const maxHp = definition.statBlock.hitPoints, hp = unit.maxHp === maxHp ? unit.hp : Math.min(unit.hp, maxHp);
  return { ...unit, hp, maxHp, actorId: definition.id, combatProfile: { kind:"monster", actorId:definition.id }, skills, attack: 0, defense: 0, accuracy: 0, evasion: 0 };
};

export const rechargeMonsterSkills = (skills: Skill[], rollD6: () => number): Skill[] => skills.map((skill) => {
  if (!skill.rechargeRoll || skill.charges > 0) return skill;
  const roll = rollD6();
  return roll >= skill.rechargeRoll.min && roll <= skill.rechargeRoll.max ? { ...skill, charges: 1 } : skill;
});

export const monsterMovementModes = (unit: Unit) => monsterStatBlockFor(unit)?.speeds || { walk: unit.move };
export const availableMonsterMovementModes = (unit: Unit) => Object.entries(monsterMovementModes(unit)).filter(([, speed]) => Number(speed) > 0).map(([mode]) => mode);
export const monsterIgnoresTerrain = (unit: Unit, terrain: string) => {
  const speeds = monsterMovementModes(unit);
  return Boolean((unit.movementMode === "fly" && speeds.fly) || (unit.movementMode === "swim" && terrain === "water" && speeds.swim) || (unit.movementMode === "burrow" && terrain === "wall" && speeds.burrow));
};
export const monsterSenseRange = (unit: Unit, sense: "blindsight" | "darkvision") => {
  const entry = monsterStatBlockFor(unit)?.senses.find((value) => value.toLowerCase().startsWith(sense));
  return entry ? Number(entry.match(/\d+/)?.[0] || 0) : 0;
};
export const monsterCanPerceive = (unit: Unit, distance: number, hasLineOfSight: boolean) =>
  hasLineOfSight || distance <= monsterSenseRange(unit, "blindsight");
