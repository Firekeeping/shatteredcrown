import type { BattlefieldDefinition } from "./battlefield-engine.ts";
import type { FreeBarrier } from "./barrier-geometry.ts";
import type { Barrier } from "./game-types.ts";
import type { VisionObserver } from "./player-vision-runtime.ts";
import { dust2PreferredPositionAt } from "./dust2-traversal.ts";
import { dust2BarrierCandidates, dust2RuntimeBarriers } from "./dust2-visibility-runtime.ts";
import type { TraversalPosition } from "./traversal-runtime.ts";
import { createVisionKernel, type VisionKernelObserver } from "./vision-kernel.ts";

const EMPTY_CROSSINGS = new Set<string>();
const key = (x: number, y: number) => `${x},${y}`;
const crossingKey = (a: { x:number; y:number }, b: { x:number; y:number }) =>
  [key(a.x, a.y), key(b.x, b.y)].sort().join("|");

const edgeTiles = (edgeKey: string) => {
  const [xText, yText, side] = edgeKey.split(",");
  const x = Number(xText), y = Number(yText), here = { x, y };
  const there = side === "n" ? { x, y:y - 1 }
    : side === "s" ? { x, y:y + 1 }
      : side === "w" ? { x:x - 1, y }
        : { x:x + 1, y };
  return { here, there };
};

export const mapEdgeCrossingKey = (edgeKey: string) => {
  const { here, there } = edgeTiles(edgeKey);
  return crossingKey(here, there);
};

export const buildVillageSightCrossings = ({ wallEdgeKeys, entranceEdgeKeys, barriers }:{
  wallEdgeKeys:ReadonlySet<string>;
  entranceEdgeKeys:ReadonlySet<string>;
  barriers:readonly Barrier[];
}) => {
  const crossings = new Set([...wallEdgeKeys].map(mapEdgeCrossingKey));
  entranceEdgeKeys.forEach((edgeKey) => {
    const { here, there } = edgeTiles(edgeKey);
    const closed = barriers.some((barrier) => barrier.hp > 0 && (
      barrier.edgeKey === edgeKey ||
      (!barrier.edgeKey && (
        (barrier.x === here.x && barrier.y === here.y) ||
        (barrier.x === there.x && barrier.y === there.y)
      ))
    ));
    if (closed) crossings.add(crossingKey(here, there));
  });
  return crossings;
};

export const battlefieldPositionAt = (
  battlefield: BattlefieldDefinition,
  observer: VisionObserver,
  x: number,
  y: number,
): TraversalPosition => battlefield.id === "dust2"
  ? dust2PreferredPositionAt(observer, x, y)
  : { x, y, elevationFt:battlefield.elevationFt[y]?.[x] || 0 };

export const battlefieldElevationAt = (battlefield: BattlefieldDefinition, point: TraversalPosition) =>
  point.elevationFt ?? (battlefield.elevationFt[point.y]?.[point.x] || 0);

const crossingBarrier = (value:string, index:number):FreeBarrier | null => {
  const [left, right] = value.split("|");
  if (!left || !right) return null;
  const [ax, ay] = left.split(",").map(Number), [bx, by] = right.split(",").map(Number);
  if (![ax, ay, bx, by].every(Number.isFinite) || Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return null;
  const a = ax !== bx
    ? { x:Math.max(ax, bx), y:Math.min(ay, by) }
    : { x:Math.min(ax, bx), y:Math.max(ay, by) };
  const b = ax !== bx ? { x:a.x, y:a.y + 1 } : { x:a.x + 1, y:a.y };
  return { id:`crossing-${index}-${value}`, kind:"wall", a, b };
};

export const battlefieldVisionBarriers = (
  battlefield:BattlefieldDefinition,
  blockedCrossings:ReadonlySet<string>,
) => [
  ...(battlefield.id === "dust2" ? dust2RuntimeBarriers : []),
  ...[...blockedCrossings].map(crossingBarrier).filter((barrier):barrier is FreeBarrier => !!barrier),
];

export const battlefieldOpaqueTiles = (
  battlefield:BattlefieldDefinition,
  blocked:ReadonlySet<string>,
) => new Set([...blocked].filter((value) => {
  const [x, y] = value.split(",").map(Number);
  return !["ravine", "water"].includes(battlefield.terrain[y]?.[x]);
}));

export const createBattlefieldVisionKernel = ({
  battlefield,
  blocked = battlefield.blocked,
  blockedCrossings = EMPTY_CROSSINGS,
  zoneBlocked = EMPTY_CROSSINGS,
}: {
  battlefield:BattlefieldDefinition;
  blocked?:ReadonlySet<string>;
  blockedCrossings?:ReadonlySet<string>;
  zoneBlocked?:ReadonlySet<string>;
}) => createVisionKernel({
  width:battlefield.cols,
  height:battlefield.rows,
  barriers:battlefieldVisionBarriers(battlefield, blockedCrossings),
  opaqueTiles:battlefieldOpaqueTiles(battlefield, blocked),
  visionOpaqueTiles:zoneBlocked,
  positionAt:(observer, x, y) => battlefieldPositionAt(battlefield, observer as VisionObserver, x, y),
  elevationAt:(point) => battlefieldElevationAt(battlefield, point),
  terrainIntervalsAt:(x, y) => battlefield.id === "dust2" && x === 20 && (y === 7 || y === 8)
    ? [[Number.NEGATIVE_INFINITY, .01], [8.99, 10.01]]
    : [[Number.NEGATIVE_INFINITY, (battlefield.elevationFt[y]?.[x] || 0) + .01]],
  openDownhillMinimumFt:battlefield.id === "dust2" ? -5 : 0,
  barrierCandidates:battlefield.id === "dust2" ? dust2BarrierCandidates : undefined,
  sampleResolution:6,
});

export type BattlefieldVisionKernel = ReturnType<typeof createBattlefieldVisionKernel>;

export const battlefieldSightBlocked = ({
  battlefield,
  blocked = battlefield.blocked,
  blockedCrossings = EMPTY_CROSSINGS,
  zoneBlocked = EMPTY_CROSSINGS,
  from,
  to,
}: {
  battlefield: BattlefieldDefinition;
  blocked?: ReadonlySet<string>;
  blockedCrossings?: ReadonlySet<string>;
  zoneBlocked?: ReadonlySet<string>;
  from: VisionObserver;
  to: TraversalPosition;
}) => {
  return createBattlefieldVisionKernel({ battlefield, blocked, blockedCrossings, zoneBlocked })
    .blocksSight(from as VisionKernelObserver, to, { allowOpaqueTarget:true });
};
