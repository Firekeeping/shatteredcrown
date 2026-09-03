export type VisionPoint = { x: number; y: number };
export type VisionSegment = {
  a: VisionPoint;
  b: VisionPoint;
  kind?: "wall" | "terrain-wall";
};

type VisionBounds = { left: number; top: number; right: number; bottom: number };
type RayHit = { distance: number; point: VisionPoint; kind: "wall" | "terrain-wall" };

const EPSILON = 1e-9;
const EPSILON_ANGLE = 0.00001;
const ENDPOINT_KEY_SCALE = 1e9;
const ANGLE_KEY_SCALE = 1e10;
const TERRAIN_HIT_CLUSTER_GRID = 1 / 6;
const TWO_PI = Math.PI * 2;

const cross = (a: VisionPoint, b: VisionPoint) => a.x * b.y - a.y * b.x;
const normalizeAngle = (angle: number) => (angle % TWO_PI + TWO_PI) % TWO_PI;
const pointKey = (point: VisionPoint) =>
  `${Math.round(point.x * ENDPOINT_KEY_SCALE)},${Math.round(point.y * ENDPOINT_KEY_SCALE)}`;
const angleKey = (angle: number) => Math.round(angle * ANGLE_KEY_SCALE);

// Liang-Barsky clips authored strokes to the current map/range rectangle. This
// keeps endpoints outside a finite vision range from distorting its edge rays.
const clipSegmentToBounds = (segment: VisionSegment, bounds: VisionBounds): VisionSegment | null => {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [
    segment.a.x - bounds.left,
    bounds.right - segment.a.x,
    segment.a.y - bounds.top,
    bounds.bottom - segment.a.y,
  ];
  let start = 0;
  let end = 1;

  for (let index = 0; index < p.length; index += 1) {
    if (Math.abs(p[index]) <= EPSILON) {
      if (q[index] < 0) return null;
      continue;
    }
    const amount = q[index] / p[index];
    if (p[index] < 0) start = Math.max(start, amount);
    else end = Math.min(end, amount);
    if (start > end + EPSILON) return null;
  }

  const a = { x: segment.a.x + dx * start, y: segment.a.y + dy * start };
  const b = { x: segment.a.x + dx * end, y: segment.a.y + dy * end };
  if (Math.hypot(b.x - a.x, b.y - a.y) <= EPSILON) return null;
  return { a, b, kind: segment.kind };
};

const raySegmentHit = (
  origin: VisionPoint,
  direction: VisionPoint,
  segment: VisionSegment,
): RayHit | null => {
  const edge = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y };
  const offset = { x: segment.a.x - origin.x, y: segment.a.y - origin.y };
  const denominator = cross(direction, edge);

  if (Math.abs(denominator) <= EPSILON) {
    if (Math.abs(cross(offset, direction)) > EPSILON) return null;
    const start = offset.x * direction.x + offset.y * direction.y;
    const endOffset = { x: segment.b.x - origin.x, y: segment.b.y - origin.y };
    const end = endOffset.x * direction.x + endOffset.y * direction.y;
    const distance = Math.min(...[start, end].filter((amount) => amount >= -EPSILON));
    if (!Number.isFinite(distance)) return null;
    const clampedDistance = Math.max(0, distance);
    return {
      distance: clampedDistance,
      point: {
        x: origin.x + direction.x * clampedDistance,
        y: origin.y + direction.y * clampedDistance,
      },
      kind: segment.kind === "terrain-wall" ? "terrain-wall" : "wall",
    };
  }

  const distance = cross(offset, edge) / denominator;
  const amount = cross(offset, direction) / denominator;
  if (distance < -EPSILON || amount < -EPSILON || amount > 1 + EPSILON) return null;
  const clampedDistance = Math.max(0, distance);
  return {
    distance: clampedDistance,
    point: {
      x: origin.x + direction.x * clampedDistance,
      y: origin.y + direction.y * clampedDistance,
    },
    kind: segment.kind === "terrain-wall" ? "terrain-wall" : "wall",
  };
};

const blockingHitForRay = (
  origin: VisionPoint,
  direction: VisionPoint,
  segments: readonly VisionSegment[],
) => {
  const hits: RayHit[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const hit = raySegmentHit(origin, direction, segments[index]);
    if (hit) hits.push(hit);
  }
  hits.sort((a, b) => a.distance - b.distance || (a.kind === "wall" ? -1 : 1));

  let terrainAnchor: number | null = null;
  for (let index = 0; index < hits.length; index += 1) {
    const hit = hits[index];
    if (hit.kind === "wall") return hit;
    if (terrainAnchor === null) terrainAnchor = hit.distance;
    else if (hit.distance - terrainAnchor > TERRAIN_HIT_CLUSTER_GRID + EPSILON) return hit;
  }
  return null;
};

export const visibilityPolygon = ({ origin, segments, bounds }: {
  origin: VisionPoint;
  segments: readonly VisionSegment[];
  bounds: VisionBounds;
}) => {
  const boundary: VisionSegment[] = [
    { a: { x: bounds.left, y: bounds.top }, b: { x: bounds.right, y: bounds.top }, kind: "wall" },
    { a: { x: bounds.right, y: bounds.top }, b: { x: bounds.right, y: bounds.bottom }, kind: "wall" },
    { a: { x: bounds.right, y: bounds.bottom }, b: { x: bounds.left, y: bounds.bottom }, kind: "wall" },
    { a: { x: bounds.left, y: bounds.bottom }, b: { x: bounds.left, y: bounds.top }, kind: "wall" },
  ];
  const clippedSegments: VisionSegment[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const clipped = clipSegmentToBounds(segments[index], bounds);
    if (clipped) clippedSegments.push(clipped);
  }
  const allSegments = [...clippedSegments, ...boundary];

  const uniqueEndpoints = new Map<string, VisionPoint>();
  for (let index = 0; index < allSegments.length; index += 1) {
    uniqueEndpoints.set(pointKey(allSegments[index].a), allSegments[index].a);
    uniqueEndpoints.set(pointKey(allSegments[index].b), allSegments[index].b);
  }

  const uniqueAngles = new Map<number, number>();
  for (const endpoint of uniqueEndpoints.values()) {
    const baseAngle = Math.atan2(endpoint.y - origin.y, endpoint.x - origin.x);
    for (const offset of [-EPSILON_ANGLE, 0, EPSILON_ANGLE]) {
      const angle = normalizeAngle(baseAngle + offset);
      uniqueAngles.set(angleKey(angle), angle);
    }
  }

  const rays = [...uniqueAngles.values()].sort((a, b) => a - b);
  const polygon: { angle: number; point: VisionPoint }[] = [];
  for (let index = 0; index < rays.length; index += 1) {
    const angle = rays[index];
    // Trigonometry is deliberately calculated once per ray; every segment uses
    // the same unit direction while finding that ray's first blocking hit.
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const hit = blockingHitForRay(origin, direction, allSegments);
    if (hit) polygon.push({ angle, point: hit.point });
  }
  return polygon.map((hit) => hit.point);
};
