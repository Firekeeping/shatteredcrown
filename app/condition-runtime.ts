import { damageAfterProtection, resolveSavingThrow } from "./dnd-rules";
import { effectMovementBonus } from "./ability-runtime";
import type { Ability, ConditionName, DamageType, Unit } from "./game-types";

export type ConditionRule = {
  saveAbility?: Ability;
  preventsAction?: boolean;
  preventsMovement?: boolean;
  preventsSpeech?: boolean;
  cannotSee?: boolean;
  cannotHear?: boolean;
  attackDisadvantage?: boolean;
  incomingAdvantage?: boolean;
  automaticCriticalWithinOneSquare?: boolean;
  damageResistance?: "all";
  damageImmunity?: "poison";
};

export const CONDITION_RULES: Record<ConditionName, ConditionRule> = {
  bleeding: { saveAbility: "constitution" },
  blinded: { cannotSee: true, attackDisadvantage: true, incomingAdvantage: true },
  charmed: {},
  deafened: { cannotHear: true },
  exhaustion: {},
  frightened: { attackDisadvantage: true },
  grappled: { preventsMovement: true },
  incapacitated: { preventsAction: true },
  invisible: { incomingAdvantage: false },
  paralyzed: { preventsAction: true, preventsMovement: true, preventsSpeech: true, incomingAdvantage: true, automaticCriticalWithinOneSquare: true },
  petrified: { preventsAction: true, preventsMovement: true, preventsSpeech: true, incomingAdvantage: true, damageResistance: "all", damageImmunity: "poison" },
  poisoned: { saveAbility: "constitution", attackDisadvantage: true },
  prone: { attackDisadvantage: true },
  restrained: { preventsMovement: true, attackDisadvantage: true, incomingAdvantage: true },
  silenced: { preventsSpeech: true },
  stunned: { preventsAction: true, preventsMovement: true, incomingAdvantage: true },
  unconscious: { preventsAction: true, preventsMovement: true, preventsSpeech: true, incomingAdvantage: true, automaticCriticalWithinOneSquare: true },
};

export const activeConditions = (unit: Unit): ConditionName[] => {
  const conditions = Object.keys(unit.conditions || {}) as ConditionName[];
  if (unit.bleeding) conditions.push("bleeding");
  if (unit.poisoned) conditions.push("poisoned");
  if (unit.stunned) conditions.push("stunned");
  if (unit.downed) conditions.push("unconscious");
  return [...new Set(conditions)].filter((condition) => !unit.conditionImmunities?.includes(condition));
};

export const applyCondition = (unit: Unit, condition: ConditionName, state = {}): Unit => unit.conditionImmunities?.includes(condition)
  ? unit
  : { ...unit, conditions: { ...(unit.conditions || {}), [condition]: state } };
export const removeCondition = (unit: Unit, condition: ConditionName): Unit => {
  const conditions = { ...(unit.conditions || {}) };
  delete conditions[condition];
  return { ...unit, conditions };
};
export const hasCondition = (unit: Unit, condition: ConditionName) => activeConditions(unit).includes(condition);

export type OngoingCondition = "poisoned" | "bleeding";
export type OngoingConditionResult = {
  condition: OngoingCondition;
  save: ReturnType<typeof resolveSavingThrow>;
  damage: number;
};

const ongoingDefinition: Record<OngoingCondition, { damage: number; damageType: DamageType; defaultDc: number }> = {
  poisoned: { damage: 10, damageType: "poison", defaultDc: 12 },
  bleeding: { damage: 3, damageType: "slashing", defaultDc: 12 },
};

export const resolveOngoingConditions = (unit: Unit, rollD20: () => number): OngoingConditionResult[] => {
  const active: Array<{ condition: OngoingCondition; dc: number }> = [];
  if (unit.poisoned && !unit.conditionImmunities?.includes("poisoned")) active.push({ condition: "poisoned", dc: unit.poisonSaveDc || 12 });
  if (unit.bleeding && !unit.conditionImmunities?.includes("bleeding")) active.push({ condition: "bleeding", dc: unit.bleedingSaveDc || 12 });
  return active.map(({ condition, dc }) => {
    const definition = ongoingDefinition[condition];
    const save = resolveSavingThrow(unit, CONDITION_RULES[condition].saveAbility!, dc || definition.defaultDc, rollD20());
    return { condition, save, damage: save.success ? 0 : damageAfterProtection(unit, definition.damage, definition.damageType) };
  });
};

export const conditionPreventsAction = (conditions: ConditionName[]) => conditions.some((condition) => CONDITION_RULES[condition].preventsAction);
export const conditionPreventsMovement = (conditions: ConditionName[]) => conditions.some((condition) => CONDITION_RULES[condition].preventsMovement);
export const unitCannotAct = (unit: Unit) => conditionPreventsAction(activeConditions(unit));
export const unitCannotMove = (unit: Unit) => conditionPreventsMovement(activeConditions(unit));
export const effectiveMovement = (unit: Unit) => unitCannotMove(unit) ? 0 : Math.max(0, unit.move + effectMovementBonus(unit) - Math.max(0, (unit.conditions?.exhaustion?.stacks || 0) - 1) - (hasCondition(unit, "prone") ? 2 : 0));
export const conditionAttackDisadvantage = (unit: Unit) => activeConditions(unit).some((condition) => CONDITION_RULES[condition].attackDisadvantage);
export const conditionAttackAdvantage = (unit: Unit) => hasCondition(unit, "invisible");
export const conditionGrantsIncomingAdvantage = (unit: Unit, attackRange = 1) => activeConditions(unit).some((condition) =>
  CONDITION_RULES[condition].incomingAdvantage || (condition === "prone" && attackRange <= 1),
);
export const conditionGrantsIncomingDisadvantage = (unit: Unit, attackRange = 1) => hasCondition(unit, "invisible") || (hasCondition(unit, "prone") && attackRange > 1);
export const conditionForcesAdjacentCritical = (unit: Unit, attackRange = 1) => attackRange <= 1 && activeConditions(unit).some((condition) => CONDITION_RULES[condition].automaticCriticalWithinOneSquare);
export const conditionLimitsVision = (unit: Unit) => activeConditions(unit).some((condition) => CONDITION_RULES[condition].cannotSee);
export const conditionPreventsSpeech = (unit: Unit) => activeConditions(unit).some((condition) => CONDITION_RULES[condition].preventsSpeech);

export const advanceConditionDurations = (unit: Unit, rollD20: () => number = () => 10): Unit => {
  const conditions = Object.fromEntries(Object.entries(unit.conditions || {}).flatMap(([condition, state]) => {
    if (state?.saveTiming === "end-of-turn" && state.saveAbility && state.saveDc && resolveSavingThrow(unit, state.saveAbility, state.saveDc, rollD20()).success) return [];
    if (!state?.durationRounds) return [[condition, state]];
    return state.durationRounds <= 1 ? [] : [[condition, { ...state, durationRounds: state.durationRounds - 1 }]];
  })) as Unit["conditions"];
  return { ...unit, conditions };
};

export const conditionDurationLabel = (unit: Unit, condition: ConditionName) => {
  const duration = unit.conditions?.[condition]?.durationRounds;
  return duration ? `${duration} round${duration === 1 ? "" : "s"}` : "save ends";
};
