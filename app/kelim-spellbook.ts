import type { Skill } from "./game-types";

export const KELIM_SHORTCUT_SKILL: Skill = {
  name: "Kelim's Shortcut",
  range: 6,
  power: 0,
  accuracy: 100,
  charges: 1,
  dailyCharges: 1,
  kind: "heal",
  movement: "teleport",
  source: "kelim-spellbook",
  description: "Teleport up to 30 feet to a visible, unoccupied floor tile. This spell always remains limited to one use per day.",
};

export const isKelimSpellbookSkill = (skill: Pick<Skill, "name" | "source">) =>
  skill.source === "kelim-spellbook" || skill.name === KELIM_SHORTCUT_SKILL.name;
