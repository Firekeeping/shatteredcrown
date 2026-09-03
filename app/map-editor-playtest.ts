import { barrierBlocksMovementLine, segmentGridCellKeys, type FreeBarrier } from "./barrier-geometry.ts";
import { canStepElevation } from "./elevation-rules.ts";
import { createVisionKernel } from "./vision-kernel.ts";

export type EditorTestTile = { blocked: boolean; blocksSight?: boolean; elevationFt: number };
export type EditorTestEdge = { x: number; y: number; side: "n" | "e" | "s" | "w" | "nw-se" | "ne-sw" };
export type EditorTestPoint = { x: number; y: number };
type Point = EditorTestPoint;

const edgeBarrier = (edge: EditorTestEdge): FreeBarrier => {
  const segment = edge.side === "n" ? [{ x: edge.x, y: edge.y }, { x: edge.x + 1, y: edge.y }]
    : edge.side === "s" ? [{ x: edge.x, y: edge.y + 1 }, { x: edge.x + 1, y: edge.y + 1 }]
    : edge.side === "w" ? [{ x: edge.x, y: edge.y }, { x: edge.x, y: edge.y + 1 }]
    : edge.side === "e" ? [{ x: edge.x + 1, y: edge.y }, { x: edge.x + 1, y: edge.y + 1 }]
    : edge.side === "nw-se" ? [{ x: edge.x, y: edge.y }, { x: edge.x + 1, y: edge.y + 1 }]
    : [{ x: edge.x + 1, y: edge.y }, { x: edge.x, y: edge.y + 1 }];
  return { id: `edge-${edge.x}-${edge.y}-${edge.side}`, kind: "wall", a: segment[0], b: segment[1] };
};
export const editorEdgesAsBarriers = (edges: readonly EditorTestEdge[]) => edges.map(edgeBarrier);

const buildEditorBarrierCandidates = (barriers:readonly FreeBarrier[], width:number, height:number) => {
  const buckets = new Map<string, FreeBarrier[]>();
  barriers.forEach((barrier) => {
    const left = Math.max(0, Math.floor(Math.min(barrier.a.x, barrier.b.x) - 1e-6));
    const right = Math.min(width, Math.floor(Math.max(barrier.a.x, barrier.b.x) + 1e-6));
    const top = Math.max(0, Math.floor(Math.min(barrier.a.y, barrier.b.y) - 1e-6));
    const bottom = Math.min(height, Math.floor(Math.max(barrier.a.y, barrier.b.y) + 1e-6));
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
      const bucketKey = `${x},${y}`;
      buckets.set(bucketKey, [...(buckets.get(bucketKey) || []), barrier]);
    }
  });
  return (from:{x:number;y:number}, to:{x:number;y:number}) => {
    const candidates = new Map<string, FreeBarrier>();
    segmentGridCellKeys(from, to).forEach((bucketKey) =>
      (buckets.get(bucketKey) || []).forEach((barrier) => candidates.set(barrier.id, barrier)),
    );
    return [...candidates.values()];
  };
};

const editorBarrierRange = ({ width, height, tiles, barrier }:{
  width:number;
  height:number;
  tiles:readonly EditorTestTile[];
  barrier:FreeBarrier;
}) => {
  if (!barrier.heightFt) return { bottomFt:Number.NEGATIVE_INFINITY, topFt:Number.POSITIVE_INFINITY };
  const x = Math.max(0, Math.min(width - 1, Math.floor((barrier.a.x + barrier.b.x) / 2)));
  const y = Math.max(0, Math.min(height - 1, Math.floor((barrier.a.y + barrier.b.y) / 2)));
  const bottomFt = tiles[y * width + x]?.elevationFt || 0;
  return { bottomFt, topFt:bottomFt + barrier.heightFt };
};

export const createEditorPlaytestVisionKernel = ({ width, height, tiles, edges, barriers }:{
  width:number;
  height:number;
  tiles:readonly EditorTestTile[];
  edges:readonly EditorTestEdge[];
  barriers:readonly FreeBarrier[];
}) => {
  const allBarriers = [...barriers, ...editorEdgesAsBarriers(edges)];
  const opaqueTiles = new Set<string>();
  tiles.forEach((tile, index) => { if (tile.blocksSight) opaqueTiles.add(`${index % width},${Math.floor(index / width)}`); });
  const elevationAt = (point:{ x:number; y:number; elevationFt?:number }) =>
    point.elevationFt ?? (tiles[point.y * width + point.x]?.elevationFt || 0);
  return createVisionKernel({
    width,
    height,
    elevationAt,
    terrainIntervalsAt:(x, y) => [[Number.NEGATIVE_INFINITY, tiles[y * width + x]?.elevationFt || 0]],
    positionAt:(_observer, x, y) => ({ x, y, elevationFt:tiles[y * width + x]?.elevationFt || 0 }),
    barriers:allBarriers,
    barrierCandidates:buildEditorBarrierCandidates(allBarriers, width, height),
    opaqueTiles,
    visionOpaqueTiles:new Set(),
    sampleResolution:6,
  });
};

export const editorPlaytestObserver = ({ point, width, tiles }:{
  point:EditorTestPoint;
  width:number;
  tiles:readonly EditorTestTile[];
}) => ({
  id:"level-forge-playtest",
  x:point.x,
  y:point.y,
  elevationFt:tiles[point.y * width + point.x]?.elevationFt || 0,
});

export const editorPlaytestTarget = ({ point, width, tiles }:{
  point:EditorTestPoint;
  width:number;
  tiles:readonly EditorTestTile[];
}) => ({
  x:point.x,
  y:point.y,
  elevationFt:tiles[point.y * width + point.x]?.elevationFt || 0,
});

export const findEditorPlaytestRoute = ({ width, height, start, goal, tiles, edges, barriers, freeClimb }:{
  width:number; height:number; start:Point; goal:Point; tiles:EditorTestTile[]; edges:EditorTestEdge[]; barriers:FreeBarrier[]; freeClimb:boolean;
}) => {
  const allBarriers = [...barriers, ...editorEdgesAsBarriers(edges)];
  const defaultBarrierRange = (barrier:FreeBarrier) => editorBarrierRange({ width, height, tiles, barrier });
  const pointKey = (point:Point) => `${point.x},${point.y}`;
  const open = [start], parents = new Map<string, Point | null>([[pointKey(start), null]]);
  const directions = [-1, 0, 1].flatMap(dy => [-1, 0, 1].map(dx => ({ dx, dy }))).filter(step => step.dx || step.dy);
  while (open.length) {
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      const route:Point[] = []; let cursor:Point|null = current;
      while (cursor) { route.unshift(cursor); cursor = parents.get(pointKey(cursor)) || null; }
      return route;
    }
    for (const { dx, dy } of directions) {
      const next = { x: current.x + dx, y: current.y + dy }, nextKey = pointKey(next);
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height || parents.has(nextKey)) continue;
      const fromTile = tiles[current.y * width + current.x], toTile = tiles[next.y * width + next.x];
      if (!toTile || toTile.blocked || !canStepElevation(fromTile.elevationFt, toTile.elevationFt, freeClimb)) continue;
      if (dx && dy && (tiles[current.y * width + next.x]?.blocked || tiles[next.y * width + current.x]?.blocked)) continue;
      if (barrierBlocksMovementLine(allBarriers, { x: current.x + .5, y: current.y + .5, zFt: fromTile.elevationFt }, { x: next.x + .5, y: next.y + .5, zFt: toTile.elevationFt }, 5, defaultBarrierRange)) continue;
      parents.set(nextKey, current); open.push(next);
    }
  }
  return null;
};
