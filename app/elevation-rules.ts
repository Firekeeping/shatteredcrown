export const MAX_AUTOMATIC_CLIMB_FT = 10;

export const canStepElevation = (fromFt: number, toFt: number, ignoreElevation = false) =>
  ignoreElevation || toFt - fromFt <= MAX_AUTOMATIC_CLIMB_FT;

export const elevationClimbCheckDc = (fromFt: number, toFt: number, ignoreElevation = false) => {
  const riseFt = Math.max(0, toFt - fromFt);
  return !ignoreElevation && riseFt > MAX_AUTOMATIC_CLIMB_FT ? Math.ceil(riseFt) : null;
};

// A checked climb is still a route candidate. The actual Athletics roll is
// resolved when the mover reaches that edge, never during path preview.
export const canAttemptElevation = (_fromFt: number, _toFt: number, _ignoreElevation = false) => true;

type FallProtectedActor = {
  abilities?: Partial<Record<"strength" | "constitution", number>>;
  safeFallFt?: number;
};

export const athleticSafeFallFeet = (actor: FallProtectedActor | null | undefined) => {
  const physical = Math.max(actor?.abilities?.strength || 0, actor?.abilities?.constitution || 0);
  return Math.max(actor?.safeFallFt || 0, physical >= 20 ? 20 : physical >= 15 ? 10 : 0);
};

export const fallDiceForDrop = (dropFt: number, safeFallFt = 0) =>
  Math.min(20, Math.floor(Math.max(0, dropFt - safeFallFt) / 10));

export const rollFallDamage = (dropFt: number, rollD6: () => number, safeFallFt = 0) =>
  Array.from({ length: fallDiceForDrop(dropFt, safeFallFt) }, () => Math.max(1, Math.min(6, Math.floor(rollD6()))))
    .reduce((total, roll) => total + roll, 0);
