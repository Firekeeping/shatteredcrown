import { encounterCompletionFlags } from "./encounter-completion";
import type { Team, Unit } from "./game-types";

const FIGHT_CLUB_ROOM = "41";
export const isFightClubFighter = (unit: Unit) =>
  unit.encounterGroup === FIGHT_CLUB_ROOM && (unit.name === "Tyler Durden" || unit.role === "Tyler Durden");
export const isFightClubBystander = (unit: Unit) =>
  unit.encounterGroup === FIGHT_CLUB_ROOM && !isFightClubFighter(unit) && unit.team !== "hero";
export const canTakeCombatDamage = (unit: Unit) => !isFightClubBystander(unit);

export const combatDamageOutcome = (unit: Unit, damage: number) => {
  if (isFightClubBystander(unit)) return { hp: unit.hp, downed: false };
  const absorbed = Math.min(unit.temporaryHp || 0, Math.max(0, damage));
  const temporaryHp = Math.max(0, (unit.temporaryHp || 0) - absorbed);
  const hp = Math.max(isFightClubFighter(unit) ? 1 : 0, unit.hp - Math.max(0, damage - absorbed));
  const conditions = { ...(unit.conditions || {}) };
  if (damage > 0) delete conditions.invisible;
  return { hp, temporaryHp, conditions, downed: isFightClubFighter(unit) ? false : hp <= 0 };
};

export const resolveFightClubBout = (units: Unit[], flags: string[]) => {
  if (flags.includes("fight-club-won")) return null;
  const concedingFighter = units.find((unit) => isFightClubFighter(unit) && unit.team === "enemy" && unit.hp <= 1);
  if (!concedingFighter) return null;
  const recipient = units.find((unit) => unit.id === concedingFighter.lastDamagerId && unit.team === "hero" && !unit.npc)
    || units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
  if (!recipient) return null;
  return {
    concedingFighter,
    recipient,
    narrator: units.find((unit) => unit.encounterGroup === FIGHT_CLUB_ROOM && unit.name === "The Narrator"),
    otherBattleContinues: units.some((unit) => unit.team === "enemy" && !unit.downed && unit.encounterGroup !== FIGHT_CLUB_ROOM),
    units: units.map((unit) => unit.encounterGroup === FIGHT_CLUB_ROOM
      ? { ...unit, encounterGroup: undefined, team: "neutral" as Team, npc: true, downed: false, hp: Math.max(1, unit.hp) }
      : unit),
    flags: [...new Set([...flags, "fight-club-won", ...encounterCompletionFlags({ roomLabel: FIGHT_CLUB_ROOM, title: "The First Rule", outcome: "combat" })])],
  };
};

export const repairLegacyFightClub = (units: Unit[], flags: string[]) => {
  const waitingTyler = units.find((unit) => isFightClubFighter(unit));
  if (
    flags.includes("room-41") &&
    !flags.includes("fight-club-bout-started") &&
    !flags.includes("fight-club-won") &&
    waitingTyler &&
    (waitingTyler.x !== 33 || waitingTyler.y !== 98 || waitingTyler.facing !== "w")
  ) return {
    units: units.map((unit) => unit.id === waitingTyler.id ? { ...unit, x: 33, y: 98, facing: "w" as const } : unit),
    flags,
    otherBattleContinues: units.some((unit) => unit.team === "enemy" && !unit.downed && unit.encounterGroup !== FIGHT_CLUB_ROOM),
  };
  if (!flags.includes("room-41") || flags.includes("fight-club-won") || units.some((unit) =>
    unit.encounterGroup === FIGHT_CLUB_ROOM && (unit.name === "Tyler Durden" || unit.name === "The Narrator"),
  )) return null;
  return {
    units: units.filter((unit) => unit.encounterGroup !== FIGHT_CLUB_ROOM),
    flags: flags.filter((flag) => flag !== "room-41" && flag !== "room-encounter-spawned-41" && flag !== "encounter-complete:41" && !flag.startsWith("room-state:41:") && !flag.startsWith("encounter-outcome:41:")),
    otherBattleContinues: units.some((unit) => unit.team === "enemy" && !unit.downed && unit.encounterGroup !== FIGHT_CLUB_ROOM),
  };
};
