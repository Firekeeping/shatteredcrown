import { GRID_NEIGHBOR_OFFSETS, type GridPoint } from "./combat-engine.ts";
import { canAttemptElevation, elevationClimbCheckDc, fallDiceForDrop } from "./elevation-rules.ts";
import { dust2HeightMap } from "./dust2-map-data.ts";
import {
  authoredTraversalDropFeet,
  authoredTraversalStepFeet,
  sameTraversalSurface,
  sameTraversalPosition,
  traversalLinkBetween,
  traversalPositionKey,
  type TraversalLink,
  type TraversalPosition,
} from "./traversal-runtime.ts";
import { DUST2_UNDERPASS_SURFACE, dust2TerrainBlocksRayAt } from "./dust2-visibility-runtime.ts";

export const DUST2_TERRAIN_SURFACE = "terrain";
export { DUST2_UNDERPASS_SURFACE, dust2TerrainBlocksRayAt };

const terrainPoint = (x: number, y: number): TraversalPosition => ({ x, y });
const underpassPoint = (x: number, y: number): TraversalPosition => ({ x, y, surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 });

export const dust2TraversalLinks: readonly TraversalLink[] = [
  { id: "underpass-west-7", kind: "underpass", a: terrainPoint(19, 7), b: underpassPoint(20, 7), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "underpass-east-7", kind: "underpass", a: underpassPoint(20, 7), b: terrainPoint(21, 7), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "underpass-west-8", kind: "underpass", a: terrainPoint(19, 8), b: underpassPoint(20, 8), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "underpass-east-8", kind: "underpass", a: underpassPoint(20, 8), b: terrainPoint(21, 8), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "underpass-lanes", kind: "underpass", a: underpassPoint(20, 7), b: underpassPoint(20, 8), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "pit-climb-west", kind: "climb", a: terrainPoint(28, 20), b: terrainPoint(28, 19), bidirectional: true, ignoreBarriers: true, descentFall: "normal" },
  { id: "pit-climb-east", kind: "climb", a: terrainPoint(29, 20), b: terrainPoint(29, 19), bidirectional: true, ignoreBarriers: true, descentFall: "normal" },
  { id: "blue-square-climb", kind: "climb", a: terrainPoint(2, 2), b: terrainPoint(3, 2), bidirectional: true, ignoreBarriers: true, descentFall: "normal" },
  { id: "u13-stair-exit", kind: "stairs", a: terrainPoint(20, 12), b: terrainPoint(20, 13), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "v13-stair-exit", kind: "stairs", a: terrainPoint(21, 12), b: terrainPoint(21, 13), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "p16-p17-slope", kind: "ramp", a: terrainPoint(15, 15), b: terrainPoint(15, 16), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
  { id: "p20-p21-slope", kind: "ramp", a: terrainPoint(15, 19), b: terrainPoint(15, 20), bidirectional: true, ignoreBarriers: true, descentFall: "safe" },
] as const;

const alternateSurfaces = new Map([
  ["20,7", [underpassPoint(20, 7)]],
  ["20,8", [underpassPoint(20, 8)]],
]);

export const dust2PositionElevation = (point: TraversalPosition) =>
  point.surfaceId === DUST2_UNDERPASS_SURFACE ? 0 : point.elevationFt ?? (dust2HeightMap[point.y]?.[point.x] || 0);

export const dust2PositionState = (point: TraversalPosition) => ({
  surfaceId: point.surfaceId === DUST2_UNDERPASS_SURFACE ? DUST2_UNDERPASS_SURFACE : undefined,
  elevationFt: dust2PositionElevation(point),
});

export const dust2PositionKey = traversalPositionKey;

export const dust2PositionFromKey = (value: string): TraversalPosition => {
  const [coordinate, surfaceId] = value.split("@");
  const [x, y] = coordinate.split(",").map(Number);
  const point = { x, y, ...(surfaceId && surfaceId !== DUST2_TERRAIN_SURFACE ? { surfaceId } : {}) };
  return { ...point, elevationFt: dust2PositionElevation(point) };
};

export const dust2PositionsAt = (x: number, y: number) => [
  { x, y, elevationFt: dust2HeightMap[y]?.[x] || 0 },
  ...(alternateSurfaces.get(`${x},${y}`) || []),
];

export const dust2PreferredPositionAt = (source: TraversalPosition, x: number, y: number) =>
  dust2PositionsAt(x, y).find((position) => sameTraversalSurface(source, position)) || dust2PositionsAt(x, y)[0];

export const dust2TraversalLink = (from: TraversalPosition, to: TraversalPosition) =>
  traversalLinkBetween(dust2TraversalLinks, from, to);

export const dust2TraversalNeighbors = (point: GridPoint) => {
  const current = point as TraversalPosition;
  const candidates: TraversalPosition[] = [];
  if (!current.surfaceId || current.surfaceId === DUST2_TERRAIN_SURFACE)
    GRID_NEIGHBOR_OFFSETS.forEach(([dx, dy]) => candidates.push({ x: current.x + dx, y: current.y + dy }));
  dust2TraversalLinks.forEach((link) => {
    if (sameTraversalPosition(link.a, current)) candidates.push(link.b);
    else if (link.bidirectional !== false && sameTraversalPosition(link.b, current)) candidates.push(link.a);
  });
  return [...new Map(candidates.map((candidate) => {
    const positioned = { ...candidate, elevationFt: dust2PositionElevation(candidate) };
    return [dust2PositionKey(positioned), positioned];
  })).values()];
};

export const canTraverseDust2Elevation = (from: TraversalPosition, to: TraversalPosition, ignoreElevation = false) =>
  !!dust2TraversalLink(from, to) || canAttemptElevation(dust2PositionElevation(from), dust2PositionElevation(to), ignoreElevation);

export const dust2ElevationClimbCheckDc = (from: TraversalPosition, to: TraversalPosition, ignoreElevation = false) =>
  dust2TraversalLink(from, to) ? null : elevationClimbCheckDc(dust2PositionElevation(from), dust2PositionElevation(to), ignoreElevation);

export const dust2StepCostSquares = (from: TraversalPosition, to: TraversalPosition, baseTerrainSquares = 1) => {
  const link = dust2TraversalLink(from, to) || { id: "terrain-rise", kind: "climb", a: from, b: to } as TraversalLink;
  return authoredTraversalStepFeet(link, dust2PositionElevation(from), dust2PositionElevation(to), baseTerrainSquares * 5) / 5;
};

export const dust2MoverStepCostSquares = (from: TraversalPosition, to: TraversalPosition, baseTerrainSquares = 1, mode: { flying?: boolean; climbSpeed?: boolean } = {}) =>
  mode.flying ? 1 : mode.climbSpeed ? baseTerrainSquares : dust2StepCostSquares(from, to, baseTerrainSquares);

export const dust2DropFeet = (from: TraversalPosition, to: TraversalPosition) =>
  authoredTraversalDropFeet(dust2TraversalLink(from, to), dust2PositionElevation(from), dust2PositionElevation(to));

export const dust2SamePosition = (a: TraversalPosition, b: TraversalPosition) =>
  sameTraversalPosition(a, b);

export const dust2SharesSurface = (a: TraversalPosition, b: TraversalPosition) =>
  sameTraversalSurface(a, b);

export const dust2ElevationDifferenceFt = (from: TraversalPosition, to: TraversalPosition) =>
  dust2PositionElevation(from) - dust2PositionElevation(to);

export const dust2HasHighGround = (attacker: TraversalPosition, target: TraversalPosition, minimumFt = 5) =>
  dust2ElevationDifferenceFt(attacker, target) >= minimumFt;

export const dust2MeleeSpaceCompatible = (attacker: TraversalPosition, target: TraversalPosition) =>
  (sameTraversalSurface(attacker, target) || !!dust2TraversalLink(attacker, target)) &&
  Math.abs(dust2ElevationDifferenceFt(attacker, target)) <= 5;

export const dust2ForcedMoveDestination = (from: TraversalPosition, x: number, y: number) =>
  dust2TraversalNeighbors(from)
    .filter((candidate) => {
      if (candidate.x !== x || candidate.y !== y) return false;
      const link = dust2TraversalLink(from, candidate), authoredPassage = link && ["underpass", "ramp", "stairs"].includes(link.kind);
      return !!authoredPassage || dust2PositionElevation(candidate) - dust2PositionElevation(from) <= 5;
    })
    .sort((a, b) =>
      Number(!dust2TraversalLink(from, a)) - Number(!dust2TraversalLink(from, b)) ||
      Math.abs(dust2ElevationDifferenceFt(from, a)) - Math.abs(dust2ElevationDifferenceFt(from, b)),
    )[0];

export const collapseDust2MovementCosts = (costs: ReadonlyMap<string, number>) => {
  const collapsed = new Map<string, number>();
  costs.forEach((cost, stateKey) => {
    const point = dust2PositionFromKey(stateKey), tileKey = `${point.x},${point.y}`;
    collapsed.set(tileKey, Math.min(cost, collapsed.get(tileKey) ?? Number.POSITIVE_INFINITY));
  });
  return collapsed;
};

export const dust2RouteSummary = (start: TraversalPosition, path: readonly TraversalPosition[], safeFallFt = 0) => {
  let previous = start, climbFt = 0, largestDropFt = 0;
  path.forEach((step) => {
    climbFt += Math.max(0, dust2PositionElevation(step) - dust2PositionElevation(previous));
    largestDropFt = Math.max(largestDropFt, dust2DropFeet(previous, step));
    previous = step;
  });
  return { climbFt, dropFt: largestDropFt, fallDice: fallDiceForDrop(largestDropFt, safeFallFt) };
};
