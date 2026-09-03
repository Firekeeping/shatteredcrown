import type { Unit } from "./game-types";

export type GridPoint = { x: number; y: number; surfaceId?: string; elevationFt?: number };

export const swapTeleportGrenadePositions = (caster: Unit, target: Unit): [Unit, Unit] => {
  const casterPosition: GridPoint = { x: caster.x, y: caster.y, surfaceId: caster.surfaceId, elevationFt: caster.elevationFt };
  const targetPosition: GridPoint = { x: target.x, y: target.y, surfaceId: target.surfaceId, elevationFt: target.elevationFt };
  return [{ ...caster, ...targetPosition }, { ...target, ...casterPosition }];
};

export const banishWithGrenade = (target: Unit, currentRound: number): Unit => ({
  ...target,
  x: -100,
  y: -100,
  banished: {
    x: target.x,
    y: target.y,
    surfaceId: target.surfaceId,
    elevationFt: target.elevationFt,
    returnRound: currentRound + 1,
    wasIncapacitated: !!target.conditions?.incapacitated,
    wasInvisible: !!target.conditions?.invisible,
  },
  conditions: {
    ...(target.conditions || {}),
    incapacitated: { sourceId: "banishment-grenade" },
    invisible: { sourceId: "banishment-grenade" },
  },
});

export const returnBanishedUnits = (
  units: Unit[],
  currentRound: number,
  isOpen: (point: GridPoint, returningId: string, units: Unit[]) => boolean,
): Unit[] => units.map((unit) => {
  if (!unit.banished || unit.banished.returnRound > currentRound) return unit;
  const origin = unit.banished;
  const candidates: GridPoint[] = [origin];
  for (let radius = 1; radius <= 6; radius++) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === radius) candidates.push({ ...origin, x: origin.x + dx, y: origin.y + dy });
    }
  }
  const landing = candidates.find((point) => isOpen(point, unit.id, units)) || origin;
  const conditions = { ...(unit.conditions || {}) };
  if (!origin.wasIncapacitated) delete conditions.incapacitated;
  if (!origin.wasInvisible) delete conditions.invisible;
  const returned = { ...unit, ...landing, conditions };
  delete returned.banished;
  return returned;
});
