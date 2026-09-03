import { barrierBlocksSightLine, type FreeBarrier } from "./barrier-geometry.ts";
import { visibilityPolygon, type VisionPoint, type VisionSegment } from "./visibility-polygon.ts";

export type VisionKernelPosition = {
  x:number;
  y:number;
  surfaceId?:string;
  elevationFt?:number;
};

export type VisionKernelObserver = VisionKernelPosition & { id:string };

export type VisionKernelLayer = {
  observerId:string;
  polygon:VisionPoint[];
  visible:Uint8Array;
  samples:Uint8Array;
  sampleResolution:number;
};

export type VisionKernelConfig = {
  width:number;
  height:number;
  barriers:readonly FreeBarrier[];
  opaqueTiles:ReadonlySet<string>;
  visionOpaqueTiles:ReadonlySet<string>;
  positionAt:(observer:VisionKernelObserver, x:number, y:number) => VisionKernelPosition;
  elevationAt:(position:VisionKernelPosition) => number;
  terrainIntervalsAt?:(x:number, y:number) => readonly (readonly [number, number])[];
  openDownhillMinimumFt?:number;
  barrierCandidates?:(from:VisionPoint, to:VisionPoint) => readonly FreeBarrier[];
  sampleResolution?:number;
};

type RayCell = { x:number; y:number; enter:number; exit:number };
type CornerPinch = { a:{x:number;y:number}; b:{x:number;y:number} };

const EPSILON = 1e-7;
const key = (x:number, y:number) => `${x},${y}`;
const sameCell = (a:{x:number;y:number}, b:{x:number;y:number}) => a.x === b.x && a.y === b.y;

export const pointInVisionPolygon = (point:VisionPoint, polygon:readonly VisionPoint[]) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

export const opaqueTileBoundarySegments = (
  tiles:ReadonlySet<string>,
  width:number,
  height:number,
  kind:"wall" | "terrain-wall" = "wall",
) => {
  const has = (x:number, y:number) => tiles.has(key(x, y));
  const segments:VisionSegment[] = [];
  tiles.forEach((value) => {
    const [x, y] = value.split(",").map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height) return;
    if (!has(x, y - 1)) segments.push({ a:{ x, y }, b:{ x:x + 1, y }, kind });
    if (!has(x + 1, y)) segments.push({ a:{ x:x + 1, y }, b:{ x:x + 1, y:y + 1 }, kind });
    if (!has(x, y + 1)) segments.push({ a:{ x:x + 1, y:y + 1 }, b:{ x, y:y + 1 }, kind });
    if (!has(x - 1, y)) segments.push({ a:{ x, y:y + 1 }, b:{ x, y }, kind });
  });
  return segments;
};

const traceRayCells = (from:VisionPoint, to:VisionPoint) => {
  const cells:RayCell[] = [], corners:CornerPinch[] = [];
  const dx = to.x - from.x, dy = to.y - from.y;
  let x = Math.floor(from.x), y = Math.floor(from.y), amount = 0;
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  const deltaX = stepX ? 1 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const deltaY = stepY ? 1 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  let nextX = stepX > 0 ? (x + 1 - from.x) / dx : stepX < 0 ? (x - from.x) / dx : Number.POSITIVE_INFINITY;
  let nextY = stepY > 0 ? (y + 1 - from.y) / dy : stepY < 0 ? (y - from.y) / dy : Number.POSITIVE_INFINITY;
  let guard = 0;
  while (amount < 1 - EPSILON && guard++ < 4096) {
    const exit = Math.min(1, nextX, nextY);
    cells.push({ x, y, enter:amount, exit });
    if (exit >= 1 - EPSILON) break;
    if (Math.abs(nextX - nextY) <= EPSILON) {
      corners.push({ a:{ x:x + stepX, y }, b:{ x, y:y + stepY } });
      x += stepX; y += stepY; amount = exit; nextX += deltaX; nextY += deltaY;
    } else if (nextX < nextY) {
      x += stepX; amount = exit; nextX += deltaX;
    } else {
      y += stepY; amount = exit; nextY += deltaY;
    }
  }
  return { cells, corners };
};

const rayHeightRange = (fromZ:number, toZ:number, enter:number, exit:number) => {
  const inset = Math.min((exit - enter) / 4, 1e-6);
  const a = fromZ + (toZ - fromZ) * Math.min(1, enter + inset);
  const b = fromZ + (toZ - fromZ) * Math.max(0, exit - inset);
  return a <= b ? [a, b] as const : [b, a] as const;
};

const verticalRangesOverlap = (
  ray:readonly [number, number],
  solid:readonly [number, number],
) => ray[0] <= solid[1] + EPSILON && ray[1] >= solid[0] - EPSILON;

const boundsFor = (observer:VisionKernelObserver, rangeSquares:number | null, width:number, height:number) => ({
  left:rangeSquares === null ? 0 : Math.max(0, observer.x - rangeSquares),
  top:rangeSquares === null ? 0 : Math.max(0, observer.y - rangeSquares),
  right:rangeSquares === null ? width : Math.min(width, observer.x + rangeSquares + 1),
  bottom:rangeSquares === null ? height : Math.min(height, observer.y + rangeSquares + 1),
});

const inRange = (observer:VisionKernelObserver, x:number, y:number, rangeSquares:number | null) =>
  rangeSquares === null || Math.max(Math.abs(x - observer.x), Math.abs(y - observer.y)) <= rangeSquares;

const sealNearVisionEndpoints = (segments:readonly VisionSegment[], tolerance = .08):VisionSegment[] => {
  const anchors:{ point:VisionPoint; bucketX:number; bucketY:number }[] = [], buckets = new Map<string, number[]>();
  const sealedPoint = (point:VisionPoint) => {
    const bucketX = Math.floor(point.x / tolerance), bucketY = Math.floor(point.y / tolerance);
    for (let y = bucketY - 1; y <= bucketY + 1; y += 1) for (let x = bucketX - 1; x <= bucketX + 1; x += 1)
      for (const index of buckets.get(`${x},${y}`) || []) {
        const anchor = anchors[index].point;
        if (Math.hypot(anchor.x - point.x, anchor.y - point.y) <= tolerance) return anchor;
      }
    const sealed = { ...point }, index = anchors.length;
    anchors.push({ point:sealed, bucketX, bucketY });
    const bucketKey = `${bucketX},${bucketY}`;
    buckets.set(bucketKey, [...(buckets.get(bucketKey) || []), index]);
    return sealed;
  };
  return segments.map((segment) => ({ ...segment, a:sealedPoint(segment.a), b:sealedPoint(segment.b) }));
};

export const createVisionKernel = (config:VisionKernelConfig) => {
  const sampleResolution = Math.max(2, Math.min(8, Math.round(config.sampleResolution || 4)));
  const barrierDefaultRange = (barrier:FreeBarrier) => {
    if (barrier.bottomFt !== undefined || barrier.topFt !== undefined)
      return { bottomFt:barrier.bottomFt ?? Number.NEGATIVE_INFINITY, topFt:barrier.topFt ?? Number.POSITIVE_INFINITY };
    if (barrier.heightFt !== undefined) {
      const x = Math.max(0, Math.min(config.width - 1, Math.floor((barrier.a.x + barrier.b.x) / 2)));
      const y = Math.max(0, Math.min(config.height - 1, Math.floor((barrier.a.y + barrier.b.y) / 2)));
      const bottomFt = config.elevationAt({ x, y });
      return { bottomFt, topFt:bottomFt + barrier.heightFt };
    }
    return { bottomFt:Number.NEGATIVE_INFINITY, topFt:Number.POSITIVE_INFINITY };
  };
  const activeBarriers = config.barriers.filter((barrier) => !barrier.open &&
    Math.hypot(barrier.b.x - barrier.a.x, barrier.b.y - barrier.a.y) > .0001);
  const hasFiniteBarrier = activeBarriers.some((barrier) => {
    const range = barrierDefaultRange(barrier);
    return Number.isFinite(range.bottomFt) || Number.isFinite(range.topFt);
  });
  const firstElevation = config.elevationAt({ x:0, y:0 });
  let hasElevationVariation = false;
  for (let y = 0; y < config.height && !hasElevationVariation; y += 1)
    for (let x = 0; x < config.width; x += 1)
      if (Math.abs(config.elevationAt({ x, y }) - firstElevation) > EPSILON) {
        hasElevationVariation = true;
        break;
      }
  // Flat maps with floor-to-ceiling geometry are solved exactly by the
  // angular polygon. Only 3D terrain or finite-height barriers need a ray per
  // subcell; this keeps the 40x120 dungeon responsive without lowering detail.
  const needsVolumetricSamples = hasFiniteBarrier || hasElevationVariation;
  const unboundedSegments:VisionSegment[] = activeBarriers.flatMap((barrier) => {
    const range = barrierDefaultRange(barrier);
    if (Number.isFinite(range.bottomFt) || Number.isFinite(range.topFt)) return [];
    return [{ a:barrier.a, b:barrier.b, kind:barrier.kind === "terrain-wall" ? "terrain-wall" as const : "wall" as const }];
  });
  unboundedSegments.push(...opaqueTileBoundarySegments(config.opaqueTiles, config.width, config.height));
  unboundedSegments.push(...opaqueTileBoundarySegments(config.visionOpaqueTiles, config.width, config.height));

  const blocksRay = (
    from:VisionKernelPosition,
    to:VisionKernelPosition,
    toWorld:VisionPoint,
    allowOpaqueTarget:boolean,
    testBarriers = true,
  ) => {
    if (sameCell(from, to) && (from.surfaceId || "terrain") !== (to.surfaceId || "terrain")) return true;
    if (sameCell(from, to) && Math.abs(config.elevationAt(from) - config.elevationAt(to)) > EPSILON) return true;
    const sourceWorld = { x:from.x + .5, y:from.y + .5 };
    const sourceKey = key(from.x, from.y), targetKey = key(to.x, to.y);
    if (!sameCell(from, to) && (config.visionOpaqueTiles.has(sourceKey) || config.visionOpaqueTiles.has(targetKey))) return true;
    if (!allowOpaqueTarget && config.opaqueTiles.has(targetKey)) return true;
    const sourceZ = config.elevationAt(from) + 5, targetZ = config.elevationAt(to) + 5;
    const traced = traceRayCells(sourceWorld, toWorld);
    if (traced.corners.some(({ a, b }) => {
      const structuralPinch = config.opaqueTiles.has(key(a.x, a.y)) && config.opaqueTiles.has(key(b.x, b.y));
      const zonePinch = config.visionOpaqueTiles.has(key(a.x, a.y)) && config.visionOpaqueTiles.has(key(b.x, b.y));
      return structuralPinch || zonePinch;
    })) return true;
    const toElevation = config.elevationAt(to);
    // Elevation describes a walkable surface, not an infinitely tall opaque
    // column. Ordinary raised and lowered floors stay optically open; authored
    // barriers provide real roofs, walls, and parapets. Maps may reserve deeper
    // terrain below this threshold for concealment pits.
    const openOrdinaryTerrain = toElevation >= (config.openDownhillMinimumFt ?? 0) - EPSILON;
    for (const cell of traced.cells) {
      if ((cell.x === from.x && cell.y === from.y) || (cell.x === to.x && cell.y === to.y)) continue;
      const cellKey = key(cell.x, cell.y);
      if (config.opaqueTiles.has(cellKey) || config.visionOpaqueTiles.has(cellKey)) return true;
      if (!config.terrainIntervalsAt) continue;
      if (openOrdinaryTerrain) continue;
      const rayRange = rayHeightRange(sourceZ, targetZ, cell.enter, cell.exit);
      if (config.terrainIntervalsAt(cell.x, cell.y).some((solid) => verticalRangesOverlap(rayRange, solid))) return true;
    }
    if (!testBarriers) return false;
    const barrierCandidates = config.barrierCandidates?.(sourceWorld, toWorld) || activeBarriers;
    return barrierBlocksSightLine(barrierCandidates, { ...sourceWorld, zFt:sourceZ }, { ...toWorld, zFt:targetZ }, barrierDefaultRange);
  };

  const blocksSight = (
    from:VisionKernelPosition,
    to:VisionKernelPosition,
    options:{ allowOpaqueTarget?:boolean } = {},
  ) => blocksRay(from, to, { x:to.x + .5, y:to.y + .5 }, !!options.allowOpaqueTarget);

  const layerFor = (observer:VisionKernelObserver, rangeSquares:number | null):VisionKernelLayer => {
    const size = config.width * config.height;
    const visible = new Uint8Array(size);
    const sampleWidth = config.width * sampleResolution;
    const samples = new Uint8Array(sampleWidth * config.height * sampleResolution);
    // The polygon owns the exact horizontal wall silhouette. Samples are only
    // a subtractive mask for elevation and finite-height occlusion.
    samples.fill(1);
    const bounds = boundsFor(observer, rangeSquares, config.width, config.height);
    const eyeZ = config.elevationAt(observer) + 5;
    const eyePlaneSegments = activeBarriers.flatMap((barrier) => {
      const range = barrierDefaultRange(barrier);
      if (!Number.isFinite(range.bottomFt) && !Number.isFinite(range.topFt)) return [];
      if (eyeZ < range.bottomFt - EPSILON || eyeZ >= range.topFt - EPSILON) return [];
      return [{ a:barrier.a, b:barrier.b, kind:barrier.kind === "terrain-wall" ? "terrain-wall" as const : "wall" as const }];
    });
    const polygonSegments = sealNearVisionEndpoints([...unboundedSegments, ...eyePlaneSegments]);
    const polygon = visibilityPolygon({ origin:{ x:observer.x + .5, y:observer.y + .5 }, segments:polygonSegments, bounds });
    const sampleBounds = polygon.reduce((area, point) => ({
      left:Math.min(area.left, point.x),
      top:Math.min(area.top, point.y),
      right:Math.max(area.right, point.x),
      bottom:Math.max(area.bottom, point.y),
    }), { left:bounds.right, top:bounds.bottom, right:bounds.left, bottom:bounds.top });
    for (let y = Math.floor(bounds.top); y < Math.ceil(bounds.bottom); y += 1) for (let x = Math.floor(bounds.left); x < Math.ceil(bounds.right); x += 1) {
      if (x < 0 || y < 0 || x >= config.width || y >= config.height || !inRange(observer, x, y, rangeSquares)) continue;
      const target = config.positionAt(observer, x, y);
      if (sameCell(observer, target) || !blocksSight(observer, target, { allowOpaqueTarget:true })) visible[y * config.width + x] = 1;
      if (!needsVolumetricSamples) continue;
      const targetNeedsVolume = config.elevationAt(target) < (config.openDownhillMinimumFt ?? 0) - EPSILON ||
        (target.surfaceId || "terrain") !== (observer.surfaceId || "terrain");
      if (!targetNeedsVolume) continue;
      if (x + 1 < sampleBounds.left || x > sampleBounds.right || y + 1 < sampleBounds.top || y > sampleBounds.bottom) continue;
      for (let sampleY = 0; sampleY < sampleResolution; sampleY += 1) for (let sampleX = 0; sampleX < sampleResolution; sampleX += 1) {
        const world = { x:x + (sampleX + .5) / sampleResolution, y:y + (sampleY + .5) / sampleResolution };
        if (!pointInVisionPolygon(world, polygon)) continue;
        if (!sameCell(observer, target) && blocksRay(observer, target, world, true, false))
          samples[(y * sampleResolution + sampleY) * sampleWidth + x * sampleResolution + sampleX] = 0;
      }
    }
    return { observerId:observer.id, polygon, visible, samples, sampleResolution };
  };

  return {
    blocksSight,
    canSee:(from:VisionKernelPosition, to:VisionKernelPosition, options:{allowOpaqueTarget?:boolean} = {}) => !blocksSight(from, to, options),
    layerFor,
    layersFor:(observers:readonly VisionKernelObserver[], rangeSquares:number | null) => observers.map((observer) => layerFor(observer, rangeSquares)),
  };
};
