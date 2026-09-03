import { getActorDefinition } from "./actor-registry";

export type EncounterBalance = {
  totalXp: number;
  adjustedXp: number;
  expectedRoundDamage: number;
  difficulty: "trivial" | "easy" | "fair" | "hard" | "deadly";
  warnings: string[];
};

const multiplierForCount = (count: number) => count <= 1 ? 1 : count <= 2 ? 1.5 : count <= 6 ? 2 : count <= 10 ? 2.5 : 3;

export const auditEncounterBalance = (actorIds: string[], partyLevels: number[]): EncounterBalance => {
  const actors = actorIds.map(getActorDefinition);
  const totalXp = actors.reduce((sum, actor) => sum + actor.statBlock.xp, 0);
  const adjustedXp = Math.round(totalXp * multiplierForCount(actors.length));
  const partyPower = Math.max(1, partyLevels.reduce((sum, level) => sum + level * 100, 0));
  const ratio = adjustedXp / partyPower;
  const expectedRoundDamage = actors.reduce((sum, actor) => sum + Math.max(...actor.statBlock.attacks.map((attack) => (attack.damage + (attack.additionalDamage || []).reduce((extra, part) => extra + part.damage, 0)) * (attack.attacks || 1))), 0);
  const difficulty = ratio < .35 ? "trivial" : ratio < .7 ? "easy" : ratio < 1.2 ? "fair" : ratio < 1.8 ? "hard" : "deadly";
  const warnings = [
    ...(difficulty === "deadly" ? ["Encounter XP is unusually lethal for the selected party."] : []),
    ...(expectedRoundDamage > partyLevels.length * 20 ? ["Expected enemy damage can down multiple heroes in one round."] : []),
  ];
  return { totalXp, adjustedXp, expectedRoundDamage, difficulty, warnings };
};

export const equivalentPeacefulXp = (actorIds: string[]) => actorIds.reduce((sum, id) => sum + getActorDefinition(id).statBlock.xp, 0);
