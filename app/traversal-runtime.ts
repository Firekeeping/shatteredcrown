export type TraversalPosition = {
  x: number;
  y: number;
  surfaceId?: string;
  elevationFt?: number;
};

export type TraversalLinkKind = "underpass" | "climb" | "ramp" | "stairs" | "jump";

export type TraversalLink = {
  id: string;
  kind: TraversalLinkKind;
  a: TraversalPosition;
  b: TraversalPosition;
  bidirectional?: boolean;
  ignoreBarriers?: boolean;
  descentFall?: "normal" | "safe";
};

export const traversalSurfaceId = (point: TraversalPosition) => point.surfaceId || "terrain";

export const traversalPositionKey = (point: TraversalPosition) =>
  `${point.x},${point.y}@${traversalSurfaceId(point)}`;

export const sameTraversalPosition = (a: TraversalPosition, b: TraversalPosition) =>
  a.x === b.x && a.y === b.y && traversalSurfaceId(a) === traversalSurfaceId(b);

export const sameTraversalSurface = (a: TraversalPosition, b: TraversalPosition) =>
  traversalSurfaceId(a) === traversalSurfaceId(b);

export const traversalLinkBetween = (
  links: readonly TraversalLink[],
  from: TraversalPosition,
  to: TraversalPosition,
) => links.find((link) =>
  (sameTraversalPosition(link.a, from) && sameTraversalPosition(link.b, to)) ||
  (link.bidirectional !== false && sameTraversalPosition(link.b, from) && sameTraversalPosition(link.a, to)),
);

export const authoredTraversalStepFeet = (
  link: TraversalLink,
  fromElevationFt: number,
  toElevationFt: number,
  baseTerrainFeet = 5,
) => {
  if (link.kind === "ramp") return baseTerrainFeet;
  const riseFt = Math.max(0, toElevationFt - fromElevationFt);
  return baseTerrainFeet + riseFt;
};

export const authoredTraversalDropFeet = (
  link: TraversalLink | undefined,
  fromElevationFt: number,
  toElevationFt: number,
) => link?.descentFall === "safe" || link?.kind === "underpass" || link?.kind === "ramp" || link?.kind === "stairs"
  ? 0
  : Math.max(0, fromElevationFt - toElevationFt);
