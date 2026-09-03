import type { Kit, Skill } from "./game-types";

export const KOKO_RANGER_NAME = "Koko";
export const KOKO_RANGER_ROLE = "Ranger";
export const KOKO_MIN_DAMAGE = 20;
export const KOKO_BOW_NAME = "Moonshadow Bow";
export const KOKO_BOW_BASE_DAMAGE = 17;

export const isKokoRanger = (unit: { name: string; role: string }) =>
  unit.name === KOKO_RANGER_NAME && unit.role === KOKO_RANGER_ROLE;

export const kokoRangerKit = (base: Kit, unlockedRangerSkills: Skill[]): Kit => {
  const completeSkillSet = new Map<string, Skill>();
  for (const skill of [...base.skills, ...unlockedRangerSkills]) {
    completeSkillSet.set(skill.name, {
      ...skill,
      power: skill.kind === "damage" && skill.power > 0 ? Math.max(KOKO_MIN_DAMAGE, skill.power) : skill.power,
      charges: 99,
      maxCharges: 99,
      unlimited: true,
    });
  }
  return {
    ...base,
    attack: Math.max(KOKO_MIN_DAMAGE, base.attack),
    skills: [...completeSkillSet.values()],
  };
};
