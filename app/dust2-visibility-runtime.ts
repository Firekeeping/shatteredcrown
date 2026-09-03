import { barrierBlocksSightLine, segmentGridCellKeys, type FreeBarrier } from "./barrier-geometry.ts";
import { DUST2_COLS, DUST2_ROWS, dust2Barriers, dust2HeightMap } from "./dust2-map-data.ts";
import { terrainHorizonBlocksSight } from "./player-vision-runtime.ts";
import { visibilityPolygon, type VisionSegment } from "./visibility-polygon.ts";

export const DUST2_UNDERPASS_SURFACE = "bridge-underpass";

export type Dust2SightPosition = { x: number; y: number; surfaceId?: string; elevationFt?: number };
export type Dust2VisionOptions = { blockedTiles?: ReadonlySet<string> };

export const dust2SightElevation = (point: Dust2SightPosition) =>
  point.surfaceId === DUST2_UNDERPASS_SURFACE ? 0 : point.elevationFt ?? (dust2HeightMap[point.y]?.[point.x] || 0);

// The bridge crossover is two stacked surfaces: ground at 0 ft and a thin
// 9–10 ft deck. Ordinary height cells are solid terrain up to their surface.
export const dust2TerrainBlocksRayAt = (x: number, y: number, rayZFt: number) => {
  if (x === 20 && (y === 7 || y === 8)) return rayZFt <= .01 || (rayZFt >= 8.99 && rayZFt <= 10.01);
  return rayZFt <= (dust2HeightMap[y]?.[x] || 0) + .01;
};

export const dust2RuntimeBarriers = dust2Barriers.filter((barrier) =>
  !barrier.open &&
  Math.hypot(barrier.b.x - barrier.a.x, barrier.b.y - barrier.a.y) >= .03 &&
  Math.max(barrier.a.x, barrier.b.x) >= 0 && Math.min(barrier.a.x, barrier.b.x) <= DUST2_COLS &&
  Math.max(barrier.a.y, barrier.b.y) >= 0 && Math.min(barrier.a.y, barrier.b.y) <= DUST2_ROWS,
);
const barrierBuckets = new Map<string, FreeBarrier[]>();
dust2RuntimeBarriers.forEach((barrier) => {
  for (let y = Math.floor(Math.min(barrier.a.y, barrier.b.y)); y <= Math.floor(Math.max(barrier.a.y, barrier.b.y)); y += 1)
    for (let x = Math.floor(Math.min(barrier.a.x, barrier.b.x)); x <= Math.floor(Math.max(barrier.a.x, barrier.b.x)); x += 1) {
      const bucketKey = `${x},${y}`;
      barrierBuckets.set(bucketKey, [...(barrierBuckets.get(bucketKey) || []), barrier]);
    }
});

export const dust2BarrierCandidates = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const candidates = new Map<string, FreeBarrier>();
  segmentGridCellKeys(from, to).forEach((bucketKey) =>
    (barrierBuckets.get(bucketKey) || []).forEach((barrier) => candidates.set(barrier.id, barrier)),
  );
  return [...candidates.values()];
};

export const crossesDust2TerrainSightLine = (from: Dust2SightPosition, to: Dust2SightPosition) => {
  const crossesBridgeSlab = (from.surfaceId === DUST2_UNDERPASS_SURFACE) !== (to.surfaceId === DUST2_UNDERPASS_SURFACE) && from.x === 20 && to.x === 20;
  if (crossesBridgeSlab) return true;
  return terrainHorizonBlocksSight({ from, to, elevationAt: dust2SightElevation, terrainBlocksRayAt: dust2TerrainBlocksRayAt });
};

export const crossesDust2SightLine = (from: Dust2SightPosition, to: Dust2SightPosition) => {
  if (crossesDust2TerrainSightLine(from, to)) return true;
  const rayFrom = { x: from.x + .5, y: from.y + .5, zFt: dust2SightElevation(from) + 5 };
  const rayTo = { x: to.x + .5, y: to.y + .5, zFt: dust2SightElevation(to) + 5 };
  return barrierBlocksSightLine(dust2BarrierCandidates(rayFrom, rayTo), rayFrom, rayTo, () => ({ bottomFt: Number.NEGATIVE_INFINITY, topFt: Number.POSITIVE_INFINITY }));
};

export const tileBlockerBoundarySegments = (blockedTiles: ReadonlySet<string>): VisionSegment[] => {
  const has = (x: number, y: number) => blockedTiles.has(`${x},${y}`);
  const segments: VisionSegment[] = [];
  blockedTiles.forEach((value) => {
    const [x, y] = value.split(",").map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= DUST2_COLS || y >= DUST2_ROWS) return;
    if (!has(x, y - 1)) segments.push({ a:{ x, y }, b:{ x:x + 1, y } });
    if (!has(x + 1, y)) segments.push({ a:{ x:x + 1, y }, b:{ x:x + 1, y:y + 1 } });
    if (!has(x, y + 1)) segments.push({ a:{ x:x + 1, y:y + 1 }, b:{ x, y:y + 1 } });
    if (!has(x - 1, y)) segments.push({ a:{ x, y:y + 1 }, b:{ x, y } });
  });
  return segments;
};

export const dust2VisionPolygon = (observer: Dust2SightPosition, rangeSquares: number | null, options: Dust2VisionOptions = {}) => {
  const bounds = {
    left:rangeSquares === null ? 0 : Math.max(0, observer.x - rangeSquares),
    top:rangeSquares === null ? 0 : Math.max(0, observer.y - rangeSquares),
    right:rangeSquares === null ? DUST2_COLS : Math.min(DUST2_COLS, observer.x + rangeSquares + 1),
    bottom:rangeSquares === null ? DUST2_ROWS : Math.min(DUST2_ROWS, observer.y + rangeSquares + 1),
  };
  // A single 2D shadow polygon is exact only for vertically unbounded walls.
  // Finite-height barriers remain governed by the paired elevation-aware tile
  // mask, preventing a low parapet from hiding legal high-ground sight.
  const segments: VisionSegment[] = dust2RuntimeBarriers.filter((barrier) =>
    barrier.bottomFt === undefined && barrier.topFt === undefined &&
    Math.max(barrier.a.x, barrier.b.x) >= bounds.left && Math.min(barrier.a.x, barrier.b.x) <= bounds.right &&
    Math.max(barrier.a.y, barrier.b.y) >= bounds.top && Math.min(barrier.a.y, barrier.b.y) <= bounds.bottom
  ).map((barrier) => ({ a:barrier.a, b:barrier.b, kind:barrier.kind === "terrain-wall" ? "terrain-wall" as const : "wall" as const }));
  segments.push(...tileBlockerBoundarySegments(options.blockedTiles || new Set()));
  return visibilityPolygon({ origin:{ x:observer.x + .5, y:observer.y + .5 }, segments, bounds });
};
