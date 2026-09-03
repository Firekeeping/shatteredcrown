export type BarrierPoint = { x: number; y: number };
export type FreeBarrier = {
  id: string;
  kind: "wall" | "terrain-wall" | "door" | "secret-door";
  open?: boolean;
  a: BarrierPoint;
  b: BarrierPoint;
  bottomFt?: number;
  topFt?: number;
  heightFt?: number;
};

const EPSILON = 1e-6;
// AboveVTT clusters terrain-wall hits within ten display pixels. Dust 2 uses
// sixty display pixels per square, so nearby outline strokes share one edge.
const TERRAIN_HIT_CLUSTER_GRID = 1 / 6;
const orientation = (a: BarrierPoint, b: BarrierPoint, c: BarrierPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (a: BarrierPoint, b: BarrierPoint, point: BarrierPoint) =>
  point.x >= Math.min(a.x, b.x) - EPSILON && point.x <= Math.max(a.x, b.x) + EPSILON &&
  point.y >= Math.min(a.y, b.y) - EPSILON && point.y <= Math.max(a.y, b.y) + EPSILON;

export const segmentsIntersect = (a: BarrierPoint, b: BarrierPoint, c: BarrierPoint, d: BarrierPoint) => {
  const abC = orientation(a, b, c), abD = orientation(a, b, d);
  const cdA = orientation(c, d, a), cdB = orientation(c, d, b);
  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
      ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;
  return (Math.abs(abC) <= EPSILON && onSegment(a, b, c)) ||
    (Math.abs(abD) <= EPSILON && onSegment(a, b, d)) ||
    (Math.abs(cdA) <= EPSILON && onSegment(c, d, a)) ||
    (Math.abs(cdB) <= EPSILON && onSegment(c, d, b));
};

export const segmentGridCellKeys = (from: BarrierPoint, to: BarrierPoint) => {
  const keys: string[] = [], seen = new Set<string>();
  const add = (x: number, y: number) => {
    const value = `${x},${y}`;
    if (!seen.has(value)) { seen.add(value); keys.push(value); }
  };
  let x = Math.floor(from.x), y = Math.floor(from.y);
  const endX = Math.floor(to.x), endY = Math.floor(to.y);
  const dx = to.x - from.x, dy = to.y - from.y;
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  const deltaX = stepX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dx);
  const deltaY = stepY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dy);
  let nextX = stepX === 0 ? Number.POSITIVE_INFINITY : ((stepX > 0 ? x + 1 : x) - from.x) / dx;
  let nextY = stepY === 0 ? Number.POSITIVE_INFINITY : ((stepY > 0 ? y + 1 : y) - from.y) / dy;
  add(x, y);
  while (x !== endX || y !== endY) {
    if (Math.abs(nextX - nextY) <= EPSILON) {
      const previousX = x, previousY = y;
      x += stepX; y += stepY;
      add(previousX + stepX, previousY);
      add(previousX, previousY + stepY);
      add(x, y);
      nextX += deltaX; nextY += deltaY;
    } else if (nextX < nextY) {
      x += stepX; nextX += deltaX; add(x, y);
    } else {
      y += stepY; nextY += deltaY; add(x, y);
    }
  }
  return keys;
};

const distinctTerrainHitCount = (hits: number[], from: BarrierPoint, to: BarrierPoint) => {
  const rayLength = Math.hypot(to.x - from.x, to.y - from.y), anchors: number[] = [];
  [...hits].sort((a, b) => a - b).forEach((amount) => {
    if (!anchors.length || (amount - anchors[anchors.length - 1]) * rayLength > TERRAIN_HIT_CLUSTER_GRID) anchors.push(amount);
  });
  return anchors.length;
};

export const barrierBlocksSegment = (
  barriers: readonly FreeBarrier[],
  from: BarrierPoint,
  to: BarrierPoint,
) => {
  for (const barrier of barriers) {
    if (barrier.open || barrier.kind === "terrain-wall") continue;
    if (segmentIntersectionInterval(from, to, barrier.a, barrier.b)) return true;
  }
  return false;
};

export const pointToBarrierDistance = (point: BarrierPoint, barrier: FreeBarrier) => {
  const dx = barrier.b.x - barrier.a.x, dy = barrier.b.y - barrier.a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - barrier.a.x, point.y - barrier.a.y);
  const amount = Math.max(0, Math.min(1,
    ((point.x - barrier.a.x) * dx + (point.y - barrier.a.y) * dy) / lengthSquared,
  ));
  return Math.hypot(point.x - (barrier.a.x + amount * dx), point.y - (barrier.a.y + amount * dy));
};

export const segmentIntersectionInterval = (a: BarrierPoint, b: BarrierPoint, c: BarrierPoint, d: BarrierPoint): [number, number] | null => {
  if (!segmentsIntersect(a, b, c, d)) return null;
  const rayX = b.x - a.x, rayY = b.y - a.y, wallX = d.x - c.x, wallY = d.y - c.y;
  const denominator = rayX * wallY - rayY * wallX;
  if (Math.abs(denominator) > EPSILON) {
    const amount = Math.max(0, Math.min(1, ((c.x - a.x) * wallY - (c.y - a.y) * wallX) / denominator));
    return [amount, amount];
  }
  const lengthSquared = rayX * rayX + rayY * rayY;
  if (!lengthSquared) return [0, 0];
  const projected = [c, d].map((point) => ((point.x - a.x) * rayX + (point.y - a.y) * rayY) / lengthSquared);
  return [Math.max(0, Math.min(...projected)), Math.min(1, Math.max(...projected))];
};
export const segmentIntersectionAmount = (a: BarrierPoint, b: BarrierPoint, c: BarrierPoint, d: BarrierPoint) =>
  segmentIntersectionInterval(a, b, c, d)?.[0] ?? null;

export const barrierBlocksSightLine = (
  barriers: readonly FreeBarrier[],
  from: BarrierPoint & { zFt: number },
  to: BarrierPoint & { zFt: number },
  defaultRange: (barrier: FreeBarrier) => { bottomFt: number; topFt: number },
) => {
  const terrainHits: number[] = [];
  for (const barrier of barriers) {
    if (barrier.open) continue;
    const interval = segmentIntersectionInterval(from, to, barrier.a, barrier.b);
    if (!interval) continue;
    const heights = interval.map((amount) => from.zFt + (to.zFt - from.zFt) * amount);
    const fallback = defaultRange(barrier), bottom = barrier.bottomFt ?? fallback.bottomFt, top = barrier.topFt ?? fallback.topFt;
    if (Math.max(...heights) < bottom || Math.min(...heights) >= top) continue;
    if (barrier.kind !== "terrain-wall") return true;
    terrainHits.push(interval[0]);
  }
  return distinctTerrainHitCount(terrainHits, from, to) >= 2;
};

export const barrierBlocksMovementLine = (
  barriers: readonly FreeBarrier[],
  from: BarrierPoint & { zFt: number },
  to: BarrierPoint & { zFt: number },
  creatureHeightFt = 5,
  defaultRange: (barrier: FreeBarrier) => { bottomFt: number; topFt: number } = () => ({ bottomFt: Number.NEGATIVE_INFINITY, topFt: Number.POSITIVE_INFINITY }),
) => {
  for (const barrier of barriers) {
    if (barrier.open || barrier.kind === "terrain-wall") continue;
    const interval = segmentIntersectionInterval(from, to, barrier.a, barrier.b);
    if (!interval) continue;
    const feet = interval.map((amount) => from.zFt + (to.zFt - from.zFt) * amount);
    const fallback = defaultRange(barrier), bottom = barrier.bottomFt ?? fallback.bottomFt, top = barrier.topFt ?? fallback.topFt;
    if (!(top > Math.min(...feet) + EPSILON && bottom < Math.max(...feet) + creatureHeightFt - EPSILON)) continue;
    return true;
  }
  return false;
};
