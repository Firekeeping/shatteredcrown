import { segmentsIntersect } from "./barrier-geometry";
import type { AbilityZone } from "./ability-runtime";
import type { DamageType } from "./game-types";

export type SegmentPoint = { x: number; y: number };
export type SegmentEndpoints = { a: SegmentPoint; b: SegmentPoint };

export const GRID_SQUARE_FEET = 5;
export const WIND_WALL_MAX_SQUARES = 6;
export const WIND_WALL_MAX_FEET = WIND_WALL_MAX_SQUARES * GRID_SQUARE_FEET;

export const segmentDistanceSquares = (a: SegmentPoint, b: SegmentPoint) =>
  Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));

export const segmentDistanceFeet = (a: SegmentPoint, b: SegmentPoint) =>
  segmentDistanceSquares(a, b) * GRID_SQUARE_FEET;

// A center-line raster is deliberately used here instead of supercover beam
// geometry. The exact vector lives on the zone; these tiles are only for board
// highlighting and backward-compatible zone inspection.
export const segmentLineTiles = (a: SegmentPoint, b: SegmentPoint) => {
  const tiles: SegmentPoint[] = [];
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1, sy = a.y < b.y ? 1 : -1;
  let error = dx - dy;
  while (true) {
    tiles.push({ x, y });
    if (x === b.x && y === b.y) break;
    const doubled = error * 2;
    if (doubled > -dy) { error -= dy; x += sx; }
    if (doubled < dx) { error += dx; y += sy; }
  }
  return tiles;
};

export const segmentPlacement = (a: SegmentPoint, b: SegmentPoint, maxLengthSquares = WIND_WALL_MAX_SQUARES) => {
  const distanceSquares = segmentDistanceSquares(a, b);
  return {
    segment: { a, b } satisfies SegmentEndpoints,
    distanceSquares,
    distanceFeet: distanceSquares * GRID_SQUARE_FEET,
    valid: distanceSquares > 0 && distanceSquares <= maxLengthSquares,
    tiles: segmentLineTiles(a, b),
  };
};

export const zoneSegment = (zone: Pick<AbilityZone, "segment" | "tiles">): SegmentEndpoints | null => {
  if (zone.segment) return zone.segment;
  if (zone.tiles.length < 2) return null;
  return { a: zone.tiles[0], b: zone.tiles[zone.tiles.length - 1] };
};

const tileCenter = (point: SegmentPoint) => ({ x: point.x + 0.5, y: point.y + 0.5 });

export const ordinaryProjectileBlocked = (
  zones: readonly AbilityZone[],
  from: SegmentPoint,
  to: SegmentPoint,
) => zones.some((zone) => {
  if (!zone.blocksRanged) return false;
  const segment = zoneSegment(zone);
  return !!segment && segmentsIntersect(tileCenter(from), tileCenter(to), tileCenter(segment.a), tileCenter(segment.b));
});

const ORDINARY_PROJECTILE_DAMAGE = new Set<DamageType>(["physical", "piercing", "slashing", "bludgeoning"]);

export const isOrdinaryProjectileAttack = (
  range: number,
  damageType: DamageType | undefined,
  magical = false,
) => range > 1 && !magical && ORDINARY_PROJECTILE_DAMAGE.has(damageType || "physical");
