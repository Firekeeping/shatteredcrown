export type GridPoint = { x: number; y: number };

export const tileKey = (x: number, y: number) => `${x},${y}`;
export const chebyshevDistance = (a: GridPoint, b: GridPoint) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const createRuntime = (options: { now?: () => number; random?: () => number } = {}) => ({
  now: options.now || (() => Date.now()),
  random: options.random || (() => Math.random()),
  rollD20: () => Math.floor((options.random || Math.random)() * 20) + 1,
});

export const GAME_RUNTIME = createRuntime();

export const normalizeSkill = <T extends { name?: string; id?: string; charges?: number; maxCharges?: number; recharge?: string; unlimited?: boolean; source?: string }>(skill: T) => ({
  ...skill,
  id: skill.id || (skill.name || "ability").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  maxCharges: skill.maxCharges ?? skill.charges ?? 0,
  recharge: skill.recharge || (skill.unlimited ? "encounter" : "rest"),
  source: skill.source || "class",
});

export type RuntimeTeam = "hero" | "enemy" | "neutral";
export type RuntimeKit = {
  hp: number;
  move: number;
  attack: number;
  defense: number;
  accuracy: number;
  evasion: number;
  range: number;
  initiative: number;
  skills: readonly object[];
  abilities?: import("./game-types").AbilityScores;
  armorClass?: number;
  primaryAbility?: import("./game-types").Ability;
  saveProficiencies?: import("./game-types").Ability[];
  skillProficiencies?: import("./game-types").SkillProficiency[];
  xpReward?: number;
  attackBonus?: number;
  proficiencyBonusOverride?: number;
  damageType?: import("./game-types").DamageType;
  resistances?: import("./game-types").DamageType[];
  immunities?: import("./game-types").DamageType[];
  vulnerabilities?: import("./game-types").DamageType[];
  conditionImmunities?: import("./game-types").ConditionName[];
};

export const createUnitSeed = (
  input: { id: string; name: string; role: string; team: RuntimeTeam; kit: RuntimeKit; cr?: number; investigation?: number },
  runtime = GAME_RUNTIME,
) => ({
  id: input.id,
  name: input.name,
  role: input.role,
  team: input.team,
  x: 0,
  y: 0,
  hp: input.kit.hp,
  maxHp: input.kit.hp,
  move: input.kit.move,
  attack: input.kit.attack,
  defense: input.kit.defense,
  accuracy: input.kit.accuracy,
  evasion: input.kit.evasion,
  range: input.kit.range,
  initiative: input.kit.initiative,
  initiativeRoll: runtime.rollD20(),
  facing: input.team === "hero" ? "n" as const : "s" as const,
  cr: input.cr,
  skills: input.kit.skills.map((skill) => normalizeSkill({ ...skill })),
  investigation: input.team === "hero" ? input.investigation || 0 : 0,
  level: input.team === "hero" ? 1 : undefined,
  xp: input.team === "hero" ? 0 : undefined,
  xpReward: input.team === "enemy" ? input.kit.xpReward : undefined,
  attackBonus: input.kit.attackBonus,
  proficiencyBonusOverride: input.kit.proficiencyBonusOverride,
  damageType: input.kit.damageType,
  resistances: [...(input.kit.resistances || [])],
  immunities: [...(input.kit.immunities || [])],
  vulnerabilities: [...(input.kit.vulnerabilities || [])],
  conditionImmunities: [...(input.kit.conditionImmunities || [])],
  ...(input.kit.abilities ? { abilities: { ...input.kit.abilities }, armorClass: input.kit.armorClass, primaryAbility: input.kit.primaryAbility, saveProficiencies: [...(input.kit.saveProficiencies || [])], skillProficiencies: [...(input.kit.skillProficiencies || [])] } : {}),
});
