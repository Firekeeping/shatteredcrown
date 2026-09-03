import type { Skill, Unit } from "./game-types";
import { getItemDefinition } from "./item-registry";

export const DUST2_HERO_LEVEL = 5;

export const DUST2_ITEM_LOADOUT = [
  "Emerald Frag Grenade",
  "Crystal Flashbang",
  "Alchemical Molotov",
  "Runic Smoke Grenade",
  "Frost Grenade",
  "Teleport Grenade",
  "Entangle Grenade",
  "Banishment Grenade",
  "Dragon Glass AWP",
  "Dragonfire Deagle",
] as const;

const DUST2_THROWABLE_BY_SKILL = new Map(
  DUST2_ITEM_LOADOUT.flatMap((item) => {
    const name = getItemDefinition(item).skill?.name;
    return name ? [[name, item] as const] : [];
  }),
);

export const dust2ItemForSkill = (skillName: string) => DUST2_THROWABLE_BY_SKILL.get(skillName) || null;

export const mergeDust2ItemLoadout = (items: readonly string[] = []) =>
  [...new Set([...items, ...DUST2_ITEM_LOADOUT])];

export const grantDust2ItemLoadout = (unit: Unit): Unit => {
  const itemSkills = DUST2_ITEM_LOADOUT.flatMap((item) => {
    const granted = getItemDefinition(item).skill;
    return granted ? [{ ...granted } as Skill] : [];
  });
  return { ...unit, skills:[...unit.skills, ...itemSkills.filter((skill) => !unit.skills.some((known) => known.name === skill.name))] };
};
