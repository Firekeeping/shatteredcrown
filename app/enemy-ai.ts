import { attackDistance, gridDistance, type CombatantShape } from "./combat-engine";
import type { Skill } from "./game-types";

export type EnemyTactic = "flanker" | "skirmisher" | "brute" | "controller" | "hunter";

export type AiCombatant = CombatantShape & {
  id: string;
  role: string;
  team: "hero" | "enemy" | "neutral";
  hp: number;
  maxHp: number;
  downed?: boolean;
  npc?: boolean;
};

export const ENEMY_TACTICS: Record<string, EnemyTactic> = {
  "Dire Wolf": "flanker",
  Werewolf: "hunter",
  "Bandit Archer": "skirmisher",
  Grell: "controller",
  "Air Elemental": "controller",
  Troll: "brute",
  "Flesh Golem": "brute",
  Manticore: "controller",
  Ettin: "brute",
  "John Wick": "controller",
  "Vesper Longshot": "skirmisher",
  "Brakka Breach": "brute",
  "Nix Fusefinger": "controller",
  "Thorne Bastion": "controller",
  "Sable Null": "hunter",
  "Mercy Hex": "controller",
  "Rook Ironjaw": "flanker",
};

export const DISGUISE_DETECTOR_ROLES = new Set(["Ettin", "Manticore"]);

export const canEnemySeeHero = (
  enemy: Pick<AiCombatant, "role">,
  hero: Pick<AiCombatant, "id">,
  disguises: Readonly<Record<string, string>>,
) => !disguises[hero.id] || DISGUISE_DETECTOR_ROLES.has(enemy.role);

export const rankEnemyTargets = <T extends AiCombatant>(
  enemy: T,
  candidates: T[],
  allUnits: T[],
) => {
  const tactic = ENEMY_TACTICS[enemy.role] || "hunter";
  const nearbyEnemyCount = (target: T) => allUnits.filter((unit) =>
    unit.team === "enemy" && unit.id !== enemy.id && !unit.downed && attackDistance(unit, target) <= 1,
  ).length;
  const nearbyHeroCount = (target: T) => allUnits.filter((unit) =>
    unit.team === "hero" && !unit.npc && !unit.downed && unit.id !== target.id && attackDistance(unit, target) <= 1,
  ).length;

  return [...candidates].sort((a, b) =>
    Number(a.npc) - Number(b.npc) ||
    (tactic === "flanker" ? nearbyEnemyCount(b) - nearbyEnemyCount(a) : 0) ||
    (tactic === "controller" ? nearbyHeroCount(b) - nearbyHeroCount(a) : 0) ||
    (tactic === "hunter" ? a.hp / a.maxHp - b.hp / b.maxHp : 0) ||
    gridDistance(enemy, a) - gridDistance(enemy, b),
  );
};

export const availableEnemyAbilities = (skills: readonly Skill[]) => skills.filter((skill) =>
  skill.kind === "damage" && (skill.unlimited || skill.charges > 0),
);

export const enemyThreatRange = (baseRange: number, skills: readonly Skill[]) =>
  Math.max(baseRange, ...availableEnemyAbilities(skills).map((skill) => skill.range));

export const chooseEnemyAbility = (skills: readonly Skill[], distance: number) =>
  availableEnemyAbilities(skills)
    .filter((skill) => distance <= skill.range)
    .sort((a, b) => b.power - a.power || Number(!!b.area) - Number(!!a.area) || a.charges - b.charges)[0];
