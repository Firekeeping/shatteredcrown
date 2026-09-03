import {
  COLS, ROWS, DUNGEON_COLS, DUNGEON_ROWS, FOREST_COLS, FOREST_ROWS, RITUAL_COLS, RITUAL_ROWS, VILLAGE_COLS, VILLAGE_ROWS,
  DUST2_COLS, DUST2_ROWS, terrainMap, heightMap, openingForestTerrain, openingForestHeightMap, ritualTerrainMap, ritualHeightMap,
  villageTerrain, villageHeightMap, bridgeTerrainMap, bridgeHeightMap, dungeonTerrainMap, dungeonHeightMap, dust2TerrainMap, dust2HeightMap,
  blocked, openingForestSceneryBlocked, ritualSceneryBlocked, villageSceneryBlocked, bridgeBlocked,
} from "./map-runtime";

export type BattlefieldId = "skirmish" | "woodland" | "ritual" | "village" | "bridge" | "dungeon" | "dust2";
export type TrainingMapId = "woodland" | "ritual" | "village" | "bridge" | "dust2" | "gallery";
export type BattlefieldDefinition = {
  id: BattlefieldId;
  cols: number;
  rows: number;
  terrain: string[][];
  elevationFt: number[][];
  facade: string | null;
  exactFootElevation: boolean;
  blocked: ReadonlySet<string>;
};

const dimensions = (terrain: string[][]) => ({ cols:terrain[0]?.length || 0, rows:terrain.length });
const noTileBlockers = new Set<string>();
export const BATTLEFIELD_DEFINITIONS: Readonly<Record<BattlefieldId, BattlefieldDefinition>> = {
  skirmish: { id:"skirmish", cols:COLS, rows:ROWS, terrain:terrainMap, elevationFt:heightMap, facade:null, exactFootElevation:true, blocked },
  woodland: { id:"woodland", cols:FOREST_COLS, rows:FOREST_ROWS, terrain:openingForestTerrain, elevationFt:openingForestHeightMap, facade:"/opening-forest-facade.webp", exactFootElevation:true, blocked:openingForestSceneryBlocked },
  ritual: { id:"ritual", cols:RITUAL_COLS, rows:RITUAL_ROWS, terrain:ritualTerrainMap, elevationFt:ritualHeightMap, facade:"/ritual-clearing-facade-v2.webp", exactFootElevation:true, blocked:ritualSceneryBlocked },
  village: { id:"village", cols:VILLAGE_COLS, rows:VILLAGE_ROWS, terrain:villageTerrain, elevationFt:villageHeightMap, facade:"/village-defense-facade.webp", exactFootElevation:true, blocked:villageSceneryBlocked },
  bridge: { id:"bridge", ...dimensions(bridgeTerrainMap), terrain:bridgeTerrainMap, elevationFt:bridgeHeightMap, facade:"/bridge-crossing-facade.webp", exactFootElevation:true, blocked:bridgeBlocked },
  dungeon: { id:"dungeon", cols:DUNGEON_COLS, rows:DUNGEON_ROWS, terrain:dungeonTerrainMap, elevationFt:dungeonHeightMap, facade:null, exactFootElevation:true, blocked:noTileBlockers },
  dust2: { id:"dust2", cols:DUST2_COLS, rows:DUST2_ROWS, terrain:dust2TerrainMap, elevationFt:dust2HeightMap, facade:"/dust2-map.png", exactFootElevation:true, blocked:noTileBlockers },
};

export const battlefieldIdForState = ({ campaign, campaignScene, mapVariant, trainingMap }:{ campaign:boolean; campaignScene:number; mapVariant:string; trainingMap:TrainingMapId }): BattlefieldId => {
  if (!campaign) return trainingMap === "gallery" ? "skirmish" : trainingMap;
  if (campaignScene === 9) return "dust2";
  if (campaignScene === 7) return "dungeon";
  if (campaignScene === 6) return "bridge";
  if (campaignScene === 2) return "woodland";
  if (mapVariant === "village") return "village";
  if (campaignScene === 3 || campaignScene === 8) return "ritual";
  return "skirmish";
};

export const battlefieldForState = (state: Parameters<typeof battlefieldIdForState>[0]) =>
  BATTLEFIELD_DEFINITIONS[battlefieldIdForState(state)];
