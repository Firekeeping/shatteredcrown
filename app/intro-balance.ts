import type { Skill, Unit } from "./game-types";

export const INTRO_WOLF_DAMAGE_CAP = 3;

export const capMonsterSkillDamage = (skill: Skill, damageCap: number): Skill => ({
  ...skill,
  power: Math.min(skill.power, damageCap),
  attackCount: 1,
  additionalDamage: undefined,
  damageCap,
});

export const capIntroWolfDamage = (unit: Unit): Unit => ({
  ...unit,
  introDamageCap: INTRO_WOLF_DAMAGE_CAP,
  skills: unit.skills.map((skill) => capMonsterSkillDamage(skill, INTRO_WOLF_DAMAGE_CAP)),
});
