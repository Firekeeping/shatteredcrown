import rawBarriers from "./dust2-barriers.json" with { type: "json" };
import rawHeightMap from "./dust2-height-map.json" with { type: "json" };
import type { FreeBarrier } from "./barrier-geometry";

export const DUST2_COLS = 33;
export const DUST2_ROWS = 33;
export const DUST2_IMAGE = "/dust2-map.png";
export const dust2Barriers = rawBarriers as FreeBarrier[];
export const dust2HeightMap = rawHeightMap as number[][];
export const dust2TerrainMap = Array.from({ length: DUST2_ROWS }, () =>
  Array.from({ length: DUST2_COLS }, () => "stone"),
);
export const dust2PartyStarts = [[15, 30], [16, 30], [14, 30], [17, 30]] as const;
export const dust2EnemyStarts = [[29, 4], [6, 5], [28, 5], [15, 11], [8, 6], [20, 14], [26, 8], [30, 6]] as const;
