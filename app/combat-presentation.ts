export const COMBAT_TIMING = Object.freeze({
  enemyDecisionMs: 760,
  enemyAttackReadMs: 520,
  ordinaryMoveStepMs: 220,
  heavyMoveStepMs: 285,
  attackPoseMs: 560,
  damagePoseMs: 460,
  projectileMs: 520,
  feedbackMs: 1050,
});

export type CombatFloatTone = "damage" | "heal" | "miss" | "status" | "critical";

export type CombatFloat = {
  id: number;
  unitId: string;
  text: string;
  tone: CombatFloatTone;
};

export const damageFloat = (damage: number, critical = false) => ({
  text: `-${damage}`,
  tone: critical ? "critical" as const : "damage" as const,
});

export const healFloat = (healing: number) => ({ text: `+${healing}`, tone: "heal" as const });
export const missFloat = () => ({ text: "MISS", tone: "miss" as const });
export const statusFloat = (text: string) => ({ text, tone: "status" as const });
