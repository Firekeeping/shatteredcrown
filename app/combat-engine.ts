import type { DamageType, Unit } from "./game-types";

export type GridPoint = { x: number; y: number; surfaceId?: string; elevationFt?: number };

export const monsterOpportunityAttackProfile = (unit: Unit) => {
  if (unit.combatProfile?.kind !== "monster") return null;
  const skill = unit.skills.find((candidate) => candidate.kind === "damage" && candidate.range <= 1 && (candidate.unlimited || candidate.charges > 0));
  return skill ? { damage: skill.power, damageCap: skill.damageCap, range: 1, damageType: (skill.damageType || unit.damageType || "physical") as DamageType, name: skill.name, attackBonus: skill.attackBonus ?? unit.attackBonus ?? 0, proficient: true, hands: 1 as const, tags: ["melee"] } : null;
};

export const chargedCasterKey = (unit: { id?: string; unitId?: string; bossHead?: string }) =>
  `${unit.unitId || unit.id}:${unit.bossHead || "unit"}`;

export const readyChargedSpellFor = <T extends { id: string; unitId: string; bossHead?: string; resolvesRound: number }>(
  charges: readonly T[],
  caster: { id?: string; unitId?: string; bossHead?: string },
  round: number,
) => charges.find((charge) =>
  chargedCasterKey(charge) === chargedCasterKey(caster) && charge.resolvesRound <= round,
);

export const isLineAim = (source: GridPoint, target: GridPoint) =>
  source.x !== target.x || source.y !== target.y;

// Kept as a compatibility export for saved test/playtest tooling. Line spells are
// no longer restricted to eight compass directions.
export const isEightDirectionLine = isLineAim;

export const supercoverSegment = (source: GridPoint, target: GridPoint) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const points: GridPoint[] = [];
  const seen = new Set<string>();
  let x = source.x;
  let y = source.y;
  let ix = 0;
  let iy = 0;
  const add = (point: GridPoint) => {
    const id = `${point.x},${point.y}`;
    if ((point.x !== source.x || point.y !== source.y) && !seen.has(id)) {
      seen.add(id);
      points.push(point);
    }
  };

  while (ix < nx || iy < ny) {
    const horizontalCrossing = (1 + 2 * ix) * ny;
    const verticalCrossing = (1 + 2 * iy) * nx;
    if (horizontalCrossing === verticalCrossing) {
      // The ray passes exactly through a grid corner. Both neighboring tiles
      // are touched, so both are part of the beam before the diagonal tile.
      add({ x: x + stepX, y });
      add({ x, y: y + stepY });
      x += stepX;
      y += stepY;
      ix += 1;
      iy += 1;
      add({ x, y });
    } else if (horizontalCrossing < verticalCrossing) {
      x += stepX;
      ix += 1;
      add({ x, y });
    } else {
      y += stepY;
      iy += 1;
      add({ x, y });
    }
  }
  return points;
};

export const lineAreaTiles = (
  source: GridPoint,
  target: GridPoint,
  range: number,
  columns: number,
  rows: number,
  clearLine: (source: GridPoint, target: GridPoint) => boolean,
) => {
  if (!isLineAim(source, target)) return [];
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const scale = range / Math.max(Math.abs(dx), Math.abs(dy));
  const endpoint = {
    x: source.x + Math.round(dx * scale),
    y: source.y + Math.round(dy * scale),
  };
  const tiles: GridPoint[] = [];
  for (const point of supercoverSegment(source, endpoint)) {
    if (point.x < 0 || point.x >= columns || point.y < 0 || point.y >= rows || !clearLine(source, point)) break;
    tiles.push(point);
  }
  return tiles;
};

export const skillAreaTiles = (
  area: "square" | "line" | undefined,
  range: number,
  source: GridPoint,
  target: GridPoint,
  columns: number,
  rows: number,
  clearLine: (source: GridPoint, target: GridPoint) => boolean,
) => area === "square"
  ? Array.from({ length: 9 }, (_, index) => ({ x: target.x + (index % 3) - 1, y: target.y + Math.floor(index / 3) - 1 }))
    .filter((point) => point.x >= 0 && point.x < columns && point.y >= 0 && point.y < rows)
  : area === "line" ? lineAreaTiles(source, target, range, columns, rows, clearLine) : [target];

export type CombatantShape = GridPoint & {
  role?: string;
  encounterGroup?: string;
};

export type FacingCombatant = CombatantShape & {
  facing: "n" | "e" | "s" | "w";
};

export const unitFootprintAt = (
  unit: CombatantShape,
  x = unit.x,
  y = unit.y,
): GridPoint[] => unit.role === "Ettin" && unit.encounterGroup === "39a"
  ? [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }]
  : [{ x, y }];

export const unitOccupiesTile = (unit: CombatantShape, x: number, y: number) =>
  unitFootprintAt(unit).some((tile) => tile.x === x && tile.y === y);

export const gridDistance = (a: GridPoint, b: GridPoint) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const attackDistance = (a: CombatantShape, b: CombatantShape) =>
  Math.min(...unitFootprintAt(a).flatMap((aTile) =>
    unitFootprintAt(b).map((bTile) => Math.max(
      Math.abs(aTile.x - bTile.x),
      Math.abs(aTile.y - bTile.y),
    )),
  ));

export const isRearAttack = (attacker: GridPoint, target: FacingCombatant) =>
  (target.facing === "n" && attacker.y > target.y) ||
  (target.facing === "s" && attacker.y < target.y) ||
  (target.facing === "e" && attacker.x < target.x) ||
  (target.facing === "w" && attacker.x > target.x);

export const rearPositionScore = (x: number, y: number, target: FacingCombatant) => {
  if (!isRearAttack({ x, y }, target)) return 0;
  const directlyBehind =
    (target.facing === "n" && x === target.x && y === target.y + 1) ||
    (target.facing === "s" && x === target.x && y === target.y - 1) ||
    (target.facing === "e" && x === target.x - 1 && y === target.y) ||
    (target.facing === "w" && x === target.x + 1 && y === target.y);
  return directlyBehind ? 2 : 1;
};

export const kelimTeleportIssue = ({ charges, sameTile, distance, range, open, occupied, visible }: {
  charges: number; sameTile: boolean; distance: number; range: number; open: boolean; occupied: boolean; visible: boolean;
}) => charges < 1
  ? "Kelim's Shortcut has already been used today."
  : sameTile ? "Choose a different tile."
    : distance > range ? "That tile is more than 30 feet away."
      : !open || occupied ? "The destination must be visible, clear, and unoccupied."
        : !visible ? "Kelim's Shortcut needs a visible destination."
          : null;

export const shouldDetonatePortableBomb = (
  blastTiles: readonly GridPoint[],
  owner: GridPoint | null | undefined,
) => !owner || !blastTiles.some((tile) => tile.x === owner.x && tile.y === owner.y);

export const GRID_NEIGHBOR_OFFSETS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

export const normalizeMovementCost = (cost: number) => Math.round(cost * 5) / 5;

type GridSearchOptions = {
  start: GridPoint;
  canEnter: (from: GridPoint, to: GridPoint) => boolean;
  stepCost: (from: GridPoint, to: GridPoint) => number;
  keyOf: (point: GridPoint) => string;
  pointFromKey: (key: string) => GridPoint;
  neighbors?: (point: GridPoint) => readonly GridPoint[];
};

const searchNeighbors = (options: GridSearchOptions, current: GridPoint) => options.neighbors
  ? options.neighbors(current)
  : GRID_NEIGHBOR_OFFSETS.map(([dx, dy]) => ({ x: current.x + dx, y: current.y + dy }));

export const buildMovementCostField = (
  options: GridSearchOptions & { budget: number },
) => {
  const startKey = options.keyOf(options.start);
  const queue = [startKey];
  const costs = new Map([[startKey, 0]]);
  while (queue.length) {
    queue.sort((a, b) => (costs.get(a) || 0) - (costs.get(b) || 0));
    const currentKey = queue.shift()!;
    const current = options.pointFromKey(currentKey);
    const currentCost = costs.get(currentKey)!;
    if (currentCost >= options.budget) continue;
    for (const next of searchNeighbors(options, current)) {
      if (!options.canEnter(current, next)) continue;
      const nextCost = normalizeMovementCost(currentCost + options.stepCost(current, next));
      const nextKey = options.keyOf(next);
      if (nextCost <= options.budget && nextCost < (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        costs.set(nextKey, nextCost);
        queue.push(nextKey);
      }
    }
  }
  return costs;
};

export const findWeightedRoute = (
  options: GridSearchOptions & { goal: GridPoint },
) => {
  const startKey = options.keyOf(options.start);
  const goalKey = options.keyOf(options.goal);
  const queue = [startKey];
  const costs = new Map([[startKey, 0]]);
  const previous = new Map<string, string>();
  while (queue.length) {
    queue.sort((a, b) => (costs.get(a) || 0) - (costs.get(b) || 0));
    const currentKey = queue.shift()!;
    if (currentKey === goalKey) break;
    const current = options.pointFromKey(currentKey);
    for (const next of searchNeighbors(options, current)) {
      if (!options.canEnter(current, next)) continue;
      const nextCost = normalizeMovementCost((costs.get(currentKey) || 0) + options.stepCost(current, next));
      const nextKey = options.keyOf(next);
      if (nextCost < (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        costs.set(nextKey, nextCost);
        previous.set(nextKey, currentKey);
        queue.push(nextKey);
      }
    }
  }
  if (!costs.has(goalKey)) return { cost: 99, path: [] as GridPoint[] };
  const path: GridPoint[] = [];
  let cursor = goalKey;
  while (cursor !== startKey) {
    path.unshift(options.pointFromKey(cursor));
    cursor = previous.get(cursor)!;
  }
  return { cost: costs.get(goalKey)!, path };
};
