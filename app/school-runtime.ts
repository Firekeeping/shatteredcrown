import type { Unit } from "./game-types";

const SPELLCASTER_ROLES = new Set(["Wizard", "Sorcerer", "Cleric", "Druid", "Bard"]);
const TEST_SPELLS = new Set(["Fireball", "Sanctuary", "Avada Kedavra"]);

export const isSpellcasterHero = (hero: Unit) =>
  SPELLCASTER_ROLES.has(hero.role) || hero.name === "Tester" || hero.skills.some((skill) => TEST_SPELLS.has(skill.name));

export const schoolCombatGraduate = (
  units: readonly Unit[],
  flags: readonly string[],
  leaderId: string | null,
  teacherId: string,
) => {
  if (!flags.includes("schoolteacher-hostile") || flags.includes("school-diploma-earned")) return undefined;
  const grin = units.find((unit) => unit.id === teacherId);
  if (!grin?.downed) return undefined;
  return units.find((unit) => unit.id === grin.lastDamagerId && unit.team === "hero" && !unit.npc)
    || units.find((unit) => unit.id === leaderId && unit.team === "hero" && !unit.npc)
    || units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
};

export const restoreProfessorVale = (unit: Unit, teacherId: string): Unit => unit.id === teacherId
  ? { ...unit, name: "Professor Vale", role: "Arcane Instructor", team: "neutral", npc: true, downed: false, hp: 1, encounterGroup: undefined }
  : unit;
