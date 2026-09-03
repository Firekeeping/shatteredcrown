import type { TraversalPosition } from "./traversal-runtime";

export const gridSegmentBlocksSight = (
  source: TraversalPosition,
  target: TraversalPosition,
  blocksTile: (tile: TraversalPosition) => boolean,
  includeEndpoints = false,
) => {
  if (includeEndpoints && (blocksTile(source) || blocksTile(target))) return true;
  const dx = target.x - source.x, dy = target.y - source.y, nx = Math.abs(dx), ny = Math.abs(dy);
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  let x = source.x, y = source.y, ix = 0, iy = 0;
  const blocked = (tile: TraversalPosition) =>
    (tile.x !== target.x || tile.y !== target.y) && blocksTile(tile);
  while (ix < nx || iy < ny) {
    const horizontal = (1 + 2 * ix) * ny, vertical = (1 + 2 * iy) * nx;
    if (horizontal === vertical) {
      // A ray that only kisses one raised square's corner remains open. Both
      // side columns must close the pinch before the diagonal cell is tested.
      if (blocksTile({ x: x + stepX, y }) && blocksTile({ x, y: y + stepY })) return true;
      x += stepX; y += stepY; ix += 1; iy += 1;
      if (blocked({ x, y })) return true;
    } else if (horizontal < vertical) {
      x += stepX; ix += 1;
      if (blocked({ x, y })) return true;
    } else {
      y += stepY; iy += 1;
      if (blocked({ x, y })) return true;
    }
  }
  return false;
};

export type VisionObserver = TraversalPosition & { id: string };
export type PlayerVisionTileState = "visible-now" | "explored" | "unexplored";

export const buildPlayerVisionMask = ({
  width,
  height,
  observer,
  rangeSquares,
  blocksSight,
  positionAt,
}: {
  width: number;
  height: number;
  observer: VisionObserver;
  rangeSquares: number | null;
  blocksSight: (from: VisionObserver, to: TraversalPosition) => boolean;
  positionAt?: (observer: VisionObserver, x: number, y: number) => TraversalPosition;
}) => {
  const mask = new Uint8Array(width * height);
  const left = rangeSquares === null ? 0 : Math.max(0, observer.x - rangeSquares);
  const right = rangeSquares === null ? width - 1 : Math.min(width - 1, observer.x + rangeSquares);
  const top = rangeSquares === null ? 0 : Math.max(0, observer.y - rangeSquares);
  const bottom = rangeSquares === null ? height - 1 : Math.min(height - 1, observer.y + rangeSquares);
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
    if (rangeSquares !== null && Math.max(Math.abs(x - observer.x), Math.abs(y - observer.y)) > rangeSquares) continue;
    const target = positionAt?.(observer, x, y) || { x, y };
    if ((x === observer.x && y === observer.y) || !blocksSight(observer, target)) mask[y * width + x] = 1;
  }
  return mask;
};

export const combinePlayerVisionMasks = (size: number, masks: readonly Uint8Array[]) => {
  const combined = new Uint8Array(size);
  masks.forEach((mask) => mask.forEach((visible, index) => { if (visible) combined[index] = 1; }));
  return combined;
};

export const mergeExploredMask = (previous: Uint8Array, visibleNow: Uint8Array) => {
  let next: Uint8Array | null = null;
  visibleNow.forEach((visible, index) => {
    if (!visible || previous[index]) return;
    if (!next) next = previous.slice();
    next[index] = 1;
  });
  return next || previous;
};

export const playerVisionTileState = (
  index: number,
  visibleNow: Uint8Array,
  explored: Uint8Array,
): PlayerVisionTileState => visibleNow[index] ? "visible-now" : explored[index] ? "explored" : "unexplored";

const hasGradualDownhillProfile = (
  from: TraversalPosition,
  to: TraversalPosition,
  elevationAt: (point: TraversalPosition) => number,
  maxStepDownFt: number,
) => {
  const epsilon = .01;
  const fromElevation = elevationAt(from), toElevation = elevationAt(to);
  if (fromElevation <= toElevation + epsilon) return false;
  const dx = to.x - from.x, dy = to.y - from.y, nx = Math.abs(dx), ny = Math.abs(dy);
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  let x = from.x, y = from.y, ix = 0, iy = 0, previousElevation = fromElevation;
  const continuesGradually = (elevation: number) =>
    elevation <= previousElevation + epsilon && previousElevation - elevation <= maxStepDownFt + epsilon;
  while (ix < nx || iy < ny) {
    const horizontal = (1 + 2 * ix) * ny, vertical = (1 + 2 * iy) * nx;
    if (horizontal === vertical) {
      const sideXElevation = elevationAt({ x: x + stepX, y });
      const sideYElevation = elevationAt({ x, y: y + stepY });
      if (!continuesGradually(sideXElevation) || !continuesGradually(sideYElevation)) return false;
      x += stepX; y += stepY; ix += 1; iy += 1;
      const diagonalElevation = elevationAt({ x, y });
      const cornerElevation = Math.max(sideXElevation, sideYElevation);
      if (diagonalElevation > cornerElevation + epsilon || cornerElevation - diagonalElevation > maxStepDownFt + epsilon) return false;
      previousElevation = diagonalElevation;
    } else if (horizontal < vertical) {
      x += stepX; ix += 1;
      const elevation = elevationAt({ x, y });
      if (!continuesGradually(elevation)) return false;
      previousElevation = elevation;
    } else {
      y += stepY; iy += 1;
      const elevation = elevationAt({ x, y });
      if (!continuesGradually(elevation)) return false;
      previousElevation = elevation;
    }
  }
  return true;
};

export const terrainHorizonBlocksSight = ({
  from,
  to,
  elevationAt,
  terrainBlocksRayAt,
  eyeHeightFt = 5,
}: {
  from: TraversalPosition;
  to: TraversalPosition;
  elevationAt: (point: TraversalPosition) => number;
  terrainBlocksRayAt: (x: number, y: number, rayZFt: number) => boolean;
  eyeHeightFt?: number;
}) => {
  if (from.x === to.x && from.y === to.y) return elevationAt(from) !== elevationAt(to);
  const fromElevation = elevationAt(from), toElevation = elevationAt(to);
  // A descending stair or ramp is open terrain, not a stack of opaque columns.
  // Keep negative hiding pits occluded until the observer reaches their edge,
  // while allowing the ray to leave the observer's own raised surface. Once
  // it has left that source plateau, later roofs/buildings still occlude it.
  if (hasGradualDownhillProfile(from, to, elevationAt, eyeHeightFt)) return false;
  const dx = to.x - from.x, dy = to.y - from.y, lengthSquared = dx * dx + dy * dy;
  const fromZ = fromElevation + eyeHeightFt, toZ = toElevation + eyeHeightFt;
  const canLeavePositiveSourcePlateau = fromElevation > toElevation + .01 && toElevation >= 0;
  let leftSourcePlateau = false;
  return gridSegmentBlocksSight(from, to, (tile) => {
    if (canLeavePositiveSourcePlateau && !leftSourcePlateau) {
      const tileElevation = elevationAt(tile);
      if (Math.abs(tileElevation - fromElevation) <= .01) return false;
      leftSourcePlateau = true;
    }
    const projected = ((tile.x - from.x) * dx + (tile.y - from.y) * dy) / lengthSquared;
    const rayZ = fromZ + (toZ - fromZ) * Math.max(0, Math.min(1, projected));
    return terrainBlocksRayAt(tile.x, tile.y, rayZ);
  });
};
