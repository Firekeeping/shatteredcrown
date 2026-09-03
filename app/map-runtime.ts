import undermountainLevel1 from "./undermountain-level-1.json";
import villageDefenseMap from "./village-defense-map.json";
import ritualClearingMap from "./ritual-clearing-map.json";
import openingForestMap from "./opening-forest-map.json";
import { ROOM_BLUEPRINTS, type DungeonVisualTheme } from "./dungeon-content";
import { DUNGEON_LANDMARKS } from "./map-landmarks";
import { createDungeonSceneryProps, DUNGEON_POI_ART, indexSceneryProps, VILLAGE_SCENERY_PROPS } from "./visual-registry";
import { tileKey } from "./game-runtime";
import { ANIMAL_TRACKS_LABEL } from "./ranger-tracks";
import { barrierBlocksMovementLine } from "./barrier-geometry";
import { DUST2_COLS, DUST2_ROWS, dust2Barriers, dust2EnemyStarts, dust2HeightMap, dust2PartyStarts, dust2TerrainMap } from "./dust2-map-data";
import { dust2PositionElevation, dust2TraversalLink } from "./dust2-traversal";
import { dust2BarrierCandidates } from "./dust2-visibility-runtime";
export { DUST2_COLS, DUST2_ROWS, dust2Barriers, dust2EnemyStarts, dust2HeightMap, dust2PartyStarts, dust2TerrainMap } from "./dust2-map-data";
export { crossesDust2SightLine } from "./dust2-visibility-runtime";

const key = tileKey;
const tileIsExplicitlyBlocked = (tile: unknown) => !!(tile as { blocked?: boolean }).blocked;

export const COLS = 10,
  ROWS = 8;
export const LEVEL_TWO_COLS = 8,
  LEVEL_TWO_ROWS = 8;
export const DUNGEON_COLS = undermountainLevel1.width,
  DUNGEON_ROWS = undermountainLevel1.height;
export const VILLAGE_COLS = villageDefenseMap.width,
  VILLAGE_ROWS = villageDefenseMap.height;
export const RITUAL_COLS = ritualClearingMap.width,
  RITUAL_ROWS = ritualClearingMap.height;
export const FOREST_COLS = openingForestMap.width,
  FOREST_ROWS = openingForestMap.height;
export const openingForestTerrain = Array.from({ length: FOREST_ROWS }, (_, y) =>
  Array.from({ length: FOREST_COLS }, (_, x) => openingForestMap.tiles[y * FOREST_COLS + x].kind),
);
export const openingForestHeightMap = Array.from({ length: FOREST_ROWS }, (_, y) =>
  Array.from({ length: FOREST_COLS }, (_, x) => (openingForestMap.tiles[y * FOREST_COLS + x].elevation || 0) * 5),
);
export const openingForestSceneryBlocked = new Set(
  openingForestMap.tiles.flatMap((tile, i) =>
    // On the legacy painted maps, trees are canopy decoration rather than
    // tile-accurate obstacles. Only explicitly authored blockers and hard
    // terrain should own movement collision.
    ["rock", "water"].includes(tile.kind) || tileIsExplicitlyBlocked(tile)
      ? [key(i % FOREST_COLS, Math.floor(i / FOREST_COLS))]
      : [],
  ),
);
export const openingForestMarkers = openingForestMap.tiles.flatMap((tile, i) =>
  tile.marker ? [{ ...tile.marker, x: i % FOREST_COLS, y: Math.floor(i / FOREST_COLS) }] : [],
);
export const openingForestPartyStarts = openingForestMarkers.filter((marker) => marker.kind === "party-start");
export const openingForestEnemyStarts = openingForestMarkers.filter((marker) => marker.kind === "enemy-spawn");
export const openingForestTrackTiles = openingForestMarkers.filter((marker) => marker.kind === "discovery" && marker.label?.trim().toLowerCase() === ANIMAL_TRACKS_LABEL.toLowerCase());
export const heightMap = [
  [1, 1, 2, 2, 1, 1, 1, 2, 2, 2],
  [1, 2, 2, 2, 1, 0, 1, 2, 3, 3],
  [1, 2, 3, 2, 1, 0, 1, 2, 3, 2],
  [1, 2, 2, 2, 1, 1, 1, 2, 2, 1],
  [1, 1, 1, 2, 2, 2, 2, 2, 1, 1],
  [1, 1, 1, 2, 3, 3, 2, 1, 1, 1],
  [2, 2, 1, 2, 3, 3, 2, 1, 2, 2],
  [2, 2, 1, 1, 2, 2, 1, 1, 2, 2],
].map((row) => row.map((height) => height * 5));

const dust2TransitionKey = (from: { x: number; y: number }, to: { x: number; y: number }) =>
  `${from.x},${from.y}>${to.x},${to.y}`;
const dust2GroundPoint = (point: { x: number; y: number; surfaceId?: string; elevationFt?: number }) => ({
  x: point.x + .5, y: point.y + .5, zFt: dust2PositionElevation(point),
});
const dust2BlockedMovementTransitions = new Set<string>();
for (let y = 0; y < DUST2_ROWS; y += 1) for (let x = 0; x < DUST2_COLS; x += 1)
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    const to = { x: x + dx, y: y + dy };
    if ((!dx && !dy) || to.x < 0 || to.y < 0 || to.x >= DUST2_COLS || to.y >= DUST2_ROWS) continue;
    const from = { x, y }, rayFrom = dust2GroundPoint(from), rayTo = dust2GroundPoint(to);
    if (barrierBlocksMovementLine(dust2BarrierCandidates(rayFrom, rayTo), rayFrom, rayTo))
      dust2BlockedMovementTransitions.add(dust2TransitionKey(from, to));
  }
export const crossesDust2WallEdge = (from: { x: number; y: number; surfaceId?: string; elevationFt?: number }, to: { x: number; y: number; surfaceId?: string; elevationFt?: number }) => {
  if (dust2TraversalLink(from, to)?.ignoreBarriers) return false;
  if (Math.abs(from.x - to.x) <= 1 && Math.abs(from.y - to.y) <= 1)
    return !from.surfaceId && !to.surfaceId && dust2BlockedMovementTransitions.has(dust2TransitionKey(from, to));
  const rayFrom = dust2GroundPoint(from), rayTo = dust2GroundPoint(to);
  return barrierBlocksMovementLine(dust2BarrierCandidates(rayFrom, rayTo), rayFrom, rayTo);
};
export const TRAINING_MAPS = [
  { id: "woodland", name: "Woodland Ruins", detail: "Mixed forest, water, stone, elevation, and blocked ruins." },
  { id: "ritual", name: "Ritual Clearing", detail: "A raised circular clearing with steep approaches and central high ground." },
  { id: "village", name: "Village Inn", detail: "Open village ground surrounding the inn's impassable walls." },
  { id: "bridge", name: "Bridge Crossing", detail: "Two tiles wide across a ravine, with broad deployment banks at both ends." },
  { id: "dust2", name: "Dust 2 · Level 2 Test", detail: "33×33 objective map with imported invisible walls and authored elevation." },
  { id: "gallery", name: "VFX Gallery", detail: "A blank white test room with an all-abilities Tester and selectable sandbag." },
] as const;
export const terrainMap = [
  [
    "forest",
    "forest",
    "forest",
    "stone",
    "grass",
    "water",
    "grass",
    "stone",
    "ruin",
    "ruin",
  ],
  [
    "forest",
    "forest",
    "stone",
    "stone",
    "grass",
    "water",
    "grass",
    "stone",
    "ruin",
    "ruin",
  ],
  [
    "forest",
    "forest",
    "stone",
    "grass",
    "grass",
    "water",
    "bridge",
    "stone",
    "grass",
    "grass",
  ],
  [
    "grass",
    "grass",
    "stone",
    "grass",
    "grass",
    "water",
    "bridge",
    "stone",
    "grass",
    "grass",
  ],
  [
    "grass",
    "grass",
    "stone",
    "stone",
    "stone",
    "stone",
    "stone",
    "stone",
    "grass",
    "grass",
  ],
  [
    "grass",
    "grass",
    "grass",
    "stone",
    "stone",
    "stone",
    "stone",
    "grass",
    "grass",
    "grass",
  ],
  [
    "forest",
    "grass",
    "grass",
    "stone",
    "stone",
    "stone",
    "grass",
    "grass",
    "forest",
    "forest",
  ],
  [
    "forest",
    "forest",
    "grass",
    "grass",
    "stone",
    "grass",
    "grass",
    "forest",
    "forest",
    "forest",
  ],
];
export const villageTerrain = Array.from({ length: VILLAGE_ROWS }, (_, y) =>
  Array.from({ length: VILLAGE_COLS }, (_, x) => {
    const kind = villageDefenseMap.tiles[y * VILLAGE_COLS + x].kind;
    return kind === "dungeon" || kind === "barricade" ? "dungeon-floor" : kind;
  }),
);
export const villageHeightMap = Array.from({ length: VILLAGE_ROWS }, (_, y) =>
  Array.from({ length: VILLAGE_COLS }, (_, x) =>
    (villageDefenseMap.tiles[y * VILLAGE_COLS + x].elevation || 0) * 5,
  ),
);
export const villageSceneryBlocked = new Set(
  villageDefenseMap.tiles.flatMap((tile, i) =>
    ["rock", "water"].includes(tile.kind) || tileIsExplicitlyBlocked(tile)
      ? [key(i % VILLAGE_COLS, Math.floor(i / VILLAGE_COLS))]
      : [],
  ),
);
export const villageMarkers = villageDefenseMap.tiles.flatMap((tile, i) =>
  tile.marker
    ? [{ ...tile.marker, x: i % VILLAGE_COLS, y: Math.floor(i / VILLAGE_COLS) }]
    : [],
);
export const villageWolfCenters = villageMarkers.filter((marker) => marker.kind === "enemy-spawn");
export const villageVillagerStarts = villageMarkers.filter((marker) => marker.kind === "npc-spawn");
export const villagePartyCenter = villageMarkers.find((marker) => marker.kind === "party-start") || { x: 9, y: 14 };
export const villageBarricadeTiles = villageDefenseMap.tiles.flatMap((tile, i) =>
  tile.kind === "barricade"
    ? [{ x: i % VILLAGE_COLS, y: Math.floor(i / VILLAGE_COLS) }]
    : [],
);
export const villageWindowEdgeKeys = new Set([
  "9,7,n", "13,7,n", "9,12,n", "13,12,n", "8,10,w", "14,10,w",
]);
export const villageWallEdges = villageDefenseMap.edges.filter(
  (edge) => edge.kind === "wall" && !villageWindowEdgeKeys.has(`${edge.x},${edge.y},${edge.side}`),
);
export const villageWallEdgeKeys = new Set(
  villageWallEdges.map((edge) => `${edge.x},${edge.y},${edge.side}`),
);
export const villageDoorEdges = villageDefenseMap.edges.filter((edge) => edge.kind === "door");
export const villageDoorEdgeKeys = new Set(villageDoorEdges.map((edge) => `${edge.x},${edge.y},${edge.side}`));
export const villageWindowEdges = villageDefenseMap.edges.filter((edge) =>
  villageWindowEdgeKeys.has(`${edge.x},${edge.y},${edge.side}`),
);
export const villageEntranceEdgeKeys = new Set([...villageDoorEdgeKeys, ...villageWindowEdgeKeys]);
export const inVillageInterior = (point: { x: number; y: number }) => point.x >= 8 && point.x <= 13 && point.y >= 7 && point.y <= 11;
export const villageBreachInterior = (edgeKey: string) => {
  const [x, y, side] = edgeKey.split(",");
  const edge = { x: Number(x), y: Number(y) };
  const candidates = side === "n" ? [edge, { x: edge.x, y: edge.y - 1 }] : [edge, { x: edge.x - 1, y: edge.y }];
  return candidates.find(inVillageInterior) || candidates[0];
};
export const villageBarricadeStarts = villageDoorEdges.flatMap((edge) => {
  const candidates = edge.side === "n"
    ? [{ x: edge.x, y: edge.y }, { x: edge.x, y: edge.y - 1 }]
    : [{ x: edge.x, y: edge.y }, { x: edge.x - 1, y: edge.y }];
  const tile = candidates.find((candidate) =>
    villageBarricadeTiles.some((point) => point.x === candidate.x && point.y === candidate.y),
  );
  return tile ? [{ ...tile, edgeKey: `${edge.x},${edge.y},${edge.side}` }] : [];
});
export const villageWindowStarts = villageWindowEdges.map((edge) => ({
  x: edge.side === "w" ? (edge.x === 14 ? edge.x - 1 : edge.x) : edge.x,
  y: edge.side === "n" ? (edge.y === 12 ? edge.y - 1 : edge.y) : edge.y,
  edgeKey: `${edge.x},${edge.y},${edge.side}`,
}));
export const ritualTerrainMap = Array.from({ length: RITUAL_ROWS }, (_, y) =>
  Array.from({ length: RITUAL_COLS }, (_, x) => {
    const kind = ritualClearingMap.tiles[y * RITUAL_COLS + x].kind;
    // Poison paint marks the guard's body position; it is not permanent terrain.
    return kind === "poison" ? "grass" : kind;
  }),
);
export const ritualHeightMap = Array.from({ length: RITUAL_ROWS }, (_, y) =>
  Array.from({ length: RITUAL_COLS }, (_, x) =>
    (ritualClearingMap.tiles[y * RITUAL_COLS + x].elevation || 0) * 5,
  ),
);
export const ritualMarkers = ritualClearingMap.tiles.flatMap((tile, i) =>
  tile.marker
    ? [{ ...tile.marker, x: i % RITUAL_COLS, y: Math.floor(i / RITUAL_COLS) }]
    : [],
);
export const ritualPartyStarts = ritualMarkers.filter((marker) => marker.kind === "party-start");
export const ritualEnemyStarts = ritualMarkers.filter((marker) => marker.kind === "enemy-spawn");
export const ritualTile = ritualMarkers.find((marker) => marker.kind === "ritual") || { x: 11, y: 7 };
// The painted moonlit path is intentionally broader than a single logic tile.
// E1:G4 all lead to the same post-encounter choice; there is no exit token.
export const ritualExitTiles = Array.from({ length: 4 }, (_, y) =>
  [4, 5, 6].map((x) => ({ x, y })),
).flat();
export const ritualExitKeys = new Set(ritualExitTiles.map((point) => key(point.x, point.y)));
export const woundedGuardTile = { x: 15, y: 1 };
export const poisonBodyTile = ritualClearingMap.tiles
  .map((tile, i) => ({ tile, x: i % RITUAL_COLS, y: Math.floor(i / RITUAL_COLS) }))
  .find(({ tile }) => tile.kind === "poison") || { x: ritualTile.x, y: ritualTile.y };
export const ritualSceneryBlocked = new Set(
  ritualClearingMap.tiles.flatMap((tile, i) =>
    (tileIsExplicitlyBlocked(tile) || ["rock", "water"].includes(tile.kind)) &&
    !ritualExitKeys.has(key(i % RITUAL_COLS, Math.floor(i / RITUAL_COLS)))
      ? [key(i % RITUAL_COLS, Math.floor(i / RITUAL_COLS))]
      : [],
  ),
);
export const bridgeHeightMap = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => 0),
);
export const bridgeTerrainMap = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) =>
    y === 0 || y === ROWS - 1
      ? "stone"
      : x === 4 || x === 5
        ? "bridge"
        : "ravine",
  ),
);
export const dungeonTerrainKinds = new Set(["floor", "dungeon", "note", "grass", "dirt", "lava", "ice", "poison"]);
export const dungeonRemovedTiles = new Set([key(12, 50)]); // The club's sealed south wall
// A single 6 × 9 hidden club replaces the cramped 6c–6e side rooms. The
// invisible logic grid remains authoritative; this merely opens the unused
// void behind the disguised wall so the encounter has room to breathe.
export const undertakerClubArtZone = { left: 8, top: 41, width: 6, height: 9 };
export const UNDERTAKER_CLUB_HOSTS = ["Countess Velvet", "Lady Fangirl", "Mistress Maybe", "DJ Bitey"] as const;
export const undertakerClubTiles = Array.from(
  { length: undertakerClubArtZone.width * undertakerClubArtZone.height },
  (_, index) => key(
    undertakerClubArtZone.left + (index % undertakerClubArtZone.width),
    undertakerClubArtZone.top + Math.floor(index / undertakerClubArtZone.width),
  ),
);
// Keep the painted set piece across the original front of 24a, then extend the
// playable classroom south through D77:G79 so desks never choke the doorway.
export const schoolArtZone = { left: 3, top: 74, width: 4, height: 5 };
export const schoolFloorZone = { left: 3, top: 74, width: 4, height: 5 };
// 24a is a room west of the H-column corridor, not an extension of it. Keep a
// single doorway at G76/H76 and make the remainder of that shared edge a real
// wall for movement, sight, and rendering.
export const schoolDoorwayY = DUNGEON_LANDMARKS.classroomDoorway.point.y;
export const schoolEntryPoint = DUNGEON_LANDMARKS.classroomDoorway.point;
export const schoolEastWallCrossings = new Set(
  Array.from({ length: schoolFloorZone.height }, (_, index) => schoolFloorZone.top + index)
    .filter((y) => y !== schoolDoorwayY)
    .map((y) => [key(6, y), key(7, y)].sort().join("|")),
);
export const schoolExpandedTiles = Array.from(
  { length: 4 * 3 },
  (_, index) => key(3 + (index % 4), 76 + Math.floor(index / 4)),
);
// Room 41 uses the unused void east of its original closet-sized footprint to
// become a proper basement fight ring with space for the crowd and combatants.
export const fightClubArtZone = { left: 28, top: 95, width: 8, height: 7 };
export const fightClubTiles = Array.from(
  { length: fightClubArtZone.width * fightClubArtZone.height },
  (_, index) => key(
    fightClubArtZone.left + (index % fightClubArtZone.width),
    fightClubArtZone.top + Math.floor(index / fightClubArtZone.width),
  ),
);
export const inFightClubArtZone = (x: number, y: number) =>
  x >= fightClubArtZone.left && x < fightClubArtZone.left + fightClubArtZone.width &&
  y >= fightClubArtZone.top && y < fightClubArtZone.top + fightClubArtZone.height;
export const fightClubRingZone = { left: 30, top: 97, width: 4, height: 4 };
export const inFightClubRing = (point: { x: number; y: number }) =>
  point.x >= fightClubRingZone.left && point.x < fightClubRingZone.left + fightClubRingZone.width &&
  point.y >= fightClubRingZone.top && point.y < fightClubRingZone.top + fightClubRingZone.height;
export const manticoreStageZone = { left: 20, top: 20, width: 5, height: 5 }; // U21-Y25
export const manticoreStageFocus = { x: 22, y: 22 }; // W23 · visual center of the judges' stage
export const manticoreStageTiles = Array.from(
  { length: manticoreStageZone.width * manticoreStageZone.height },
  (_, index) => key(
    manticoreStageZone.left + (index % manticoreStageZone.width),
    manticoreStageZone.top + Math.floor(index / manticoreStageZone.width),
  ),
);
export const manticoreWalkInTiles = [25, 26, 27].map((y) => ({ x: 20, y })); // U26-U28
export const manticoreWalkInTileKeys = new Set(manticoreWalkInTiles.map((tile) => key(tile.x, tile.y)));
export const manticoreContestantSpots = [
  { x: 21, y: 23 }, { x: 21, y: 22 }, { x: 23, y: 22 }, { x: 23, y: 23 },
]; // V24, V23, X23, X24
export const manticoreContestantSpotKeys = new Set(manticoreContestantSpots.map((tile) => key(tile.x, tile.y)));
export const schoolStudentDesks = [
  { x: 3, y: 77 }, { x: 4, y: 77 }, { x: 5, y: 77 }, { x: 6, y: 77 },
]; // D78-G78, leaving G77 clear as the doorway
export const inSchoolArtZone = (x: number, y: number) =>
  x >= schoolArtZone.left && x < schoolArtZone.left + schoolArtZone.width &&
  y >= schoolArtZone.top && y < schoolArtZone.top + schoolArtZone.height;
export const inSchoolFloorZone = (x: number, y: number) =>
  x >= schoolFloorZone.left && x < schoolFloorZone.left + schoolFloorZone.width &&
  y >= schoolFloorZone.top && y < schoolFloorZone.top + schoolFloorZone.height;
export const inUndertakerClubArtZone = (x: number, y: number) =>
  x >= undertakerClubArtZone.left && x < undertakerClubArtZone.left + undertakerClubArtZone.width &&
  y >= undertakerClubArtZone.top && y < undertakerClubArtZone.top + undertakerClubArtZone.height;
// Secret-door edges are authored in Level Forge. Their anchor tile is the
// hidden side of the wall; `side` points out toward the public side.
export const undertakerSecretDoor = { x: 14, y: 46 };
export const westernSecretDoor = { x: 14, y: 61 };
export const westernSecretDoorEvent = "western-secret-panel-14-61-open";
export const pukeTunnelTiles = [61, 62, 63, 64, 65, 66, 67].map((y) => ({ x: 14, y }));
export const pukeTunnelReward = { x: 14, y: 68 };
// One footprint owns the sewer's art, reveal, hazards, and movement. Keeping
// those systems in sync prevents painted floor from behaving like a wall.
export const sewerSceneZone = { left: 14, top: 63, width: 3, height: 7 };
export const sewerSceneAreaTileKeys = new Set(Array.from(
  { length: sewerSceneZone.width * sewerSceneZone.height },
  (_, index) => key(
    sewerSceneZone.left + (index % sewerSceneZone.width),
    sewerSceneZone.top + Math.floor(index / sewerSceneZone.width),
  ),
));
export const sewerFloodSecretPassage = Object.freeze({
  sewer: { x: 16, y: 69 }, // Q70 · grate at the end of the Certain Death sewer
  flood: { x: 35, y: 63 }, // JJ64 · matching grate inside the flooded barracks
});
export const pukeTunnelAreaTileKeys = new Set([
  ...pukeTunnelTiles.map((tile) => key(tile.x, tile.y)),
  key(pukeTunnelReward.x, pukeTunnelReward.y),
  ...sewerSceneAreaTileKeys,
]);
export const shieldGuardianTrigger = { x: 12, y: 62 }; // M63
export const shieldGuardianPatrol = [
  { x: 12, y: 67 }, { x: 12, y: 66 },
  { x: 12, y: 65 }, { x: 12, y: 64 },
  { x: 12, y: 63 }, { x: 12, y: 62 },
  { x: 12, y: 61 }, { x: 12, y: 60 },
]; // M68 north through M61
export const shieldGuardianPassText = [
  {
    sighting: "A shield guardian marches in from M68, pantomiming the gestures of a very serious wizard.",
    speech: "Stand aside. My master requires me elsewhere.",
    inspect: "The shield guardian ignores every threat and continues its important errand.",
    departure: "The shield guardian disappears around the corner at M61. Its route may not be finished.",
  },
  {
    sighting: "The shield guardian returns to M68 and begins the exact same patrol. Halfway through its first gesture, it hesitates.",
    speech: "Stand aside. My master requires me elsewhere. I appear to have returned to the same elsewhere.",
    inspect: "It points north, then south, then resumes the route with considerably less confidence.",
    departure: "At M61, the guardian counts the turns on its fingers and disappears around the same corner again.",
  },
  {
    sighting: "The shield guardian returns to M68 for a third patrol. This time it is searching the corridor instead of watching the route.",
    speech: "Stand aside. My master requires me... Forgive me. Who is my master?",
    inspect: "The shield guardian lowers its hands. ‘Was there a master?’ It resumes walking before anyone can answer.",
    departure: "At M61, the guardian looks back and says, ‘I cannot remember who sent me.’ Then it walks off script into the dark.",
  },
] as const;
// The club's single loose power cable sits beside the equipment instead of
// interrupting the room's performance path.
export const undertakerAlarmTiles = [{ x: 14, y: 50 }];
export type DungeonEdgeSide = "n" | "e" | "s" | "w";
export type DungeonSecretDoorEdge = { x: number; y: number; side: DungeonEdgeSide; kind: "secret-door" };
export const dungeonSecretDoorEventByEdge = new Map([
  [`${undertakerSecretDoor.x},${undertakerSecretDoor.y},e`, "undertaker-secret-door-open"],
  [`${westernSecretDoor.x},${westernSecretDoor.y},n`, westernSecretDoorEvent],
]);
export const dungeonSecretDoorPoiByEdge = new Map([
  [`${undertakerSecretDoor.x},${undertakerSecretDoor.y},e`, "three-lords-statues"],
  [`${westernSecretDoor.x},${westernSecretDoor.y},n`, "western-secret-panel-14-61"],
]);
export const dungeonSecretDoorEdges = (undermountainLevel1.edges || [])
  .filter((edge) => edge.kind === "secret-door") as DungeonSecretDoorEdge[];
export const dungeonEdgeKey = (edge: Pick<DungeonSecretDoorEdge, "x" | "y" | "side">) =>
  `${edge.x},${edge.y},${edge.side}`;
export const dungeonEdgeNeighbor = (edge: Pick<DungeonSecretDoorEdge, "x" | "y" | "side">) =>
  edge.side === "n" ? { x: edge.x, y: edge.y - 1 }
    : edge.side === "s" ? { x: edge.x, y: edge.y + 1 }
      : edge.side === "w" ? { x: edge.x - 1, y: edge.y }
        : { x: edge.x + 1, y: edge.y };
export const dungeonCrossingKey = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  [key(a.x, a.y), key(b.x, b.y)].sort().join("|");
export const crossesDungeonWallEdge = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  blockedCrossings: ReadonlySet<string>,
) => {
  const blocked = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    blockedCrossings.has(dungeonCrossingKey(a, b));
  if (from.x === to.x || from.y === to.y) return blocked(from, to);
  return (
    blocked(from, { x: to.x, y: from.y }) ||
    blocked(from, { x: from.x, y: to.y }) ||
    blocked({ x: to.x, y: from.y }, to) ||
    blocked({ x: from.x, y: to.y }, to)
  );
};
export const dungeonSecretDoorCrossingKey = (edge: DungeonSecretDoorEdge) =>
  dungeonCrossingKey(edge, dungeonEdgeNeighbor(edge));
export const oppositeDungeonEdgeSide: Record<DungeonEdgeSide, DungeonEdgeSide> = {
  n: "s", e: "w", s: "n", w: "e",
};
export const westernGoldCache = { x: 17, y: 61 };
export const goldenSpearMimicPoint = { x: 26, y: 81 }; // AA82
export const proximityBombPoint = DUNGEON_LANDMARKS.proximityBomb.point;
export const PROXIMITY_BOMB_ARM_RADIUS = DUNGEON_LANDMARKS.proximityBomb.armRadius;
export const PROXIMITY_BOMB_RADIUS = DUNGEON_LANDMARKS.proximityBomb.blastRadius;
export const dungeonOpen = new Set(
  [...undermountainLevel1.tiles
    .map((tile, i) => ({ tile, x: i % DUNGEON_COLS, y: Math.floor(i / DUNGEON_COLS) }))
    .filter(({ tile, x, y }) => dungeonTerrainKinds.has(tile.kind) && !dungeonRemovedTiles.has(key(x, y)))
    .map(({ x, y }) => key(x, y)),
    ...undertakerClubTiles,
    ...schoolExpandedTiles,
    ...fightClubTiles,
    ...manticoreStageTiles,
    ...sewerSceneAreaTileKeys],
);
export const dungeonRoomLabels = new Map(
  undermountainLevel1.tiles
    .map((tile, i) => ({ tile, x: i % DUNGEON_COLS, y: Math.floor(i / DUNGEON_COLS) }))
    .filter(({ tile }) => tile.kind === "note")
    .map(({ tile, x, y }) => [key(x, y), "label" in tile ? tile.label : ""]),
);
export const dungeonRoomPoints = new Map<string, { x: number; y: number }>(
  undermountainLevel1.tiles
    .map((tile, i) => ({ tile, x: i % DUNGEON_COLS, y: Math.floor(i / DUNGEON_COLS) }))
    .filter(({ tile }) => tile.kind === "note")
    .map(({ tile, x, y }) => {
      const raw = "label" in tile ? tile.label || "" : "";
      return [raw === "1 starting point" ? "1" : raw, { x, y }];
    }),
);
export const bossEngagementDoorwayTiles = [
  { x: 19, y: 97 }, // T98 · western north doorway
  { x: 21, y: 97 }, // V98 · center north doorway
  { x: 22, y: 97 }, // W98 · eastern north doorway
];
export const bossEngagementDoorwayKeys = new Set(bossEngagementDoorwayTiles.map((tile) => key(tile.x, tile.y)));
export const bossThronePoint = { x: 21, y: 102 }; // V103 · centered on the arena's south wall
export const dungeonRoomEntryStopKeys = new Set(Object.values(ROOM_BLUEPRINTS)
  .flatMap((room) => room.entry.triggerTiles || [])
  .map((point) => key(point.x, point.y)));
export const dungeonAuthoredTriggerKeys = new Set([
  ...dungeonRoomEntryStopKeys,
  ...bossEngagementDoorwayKeys,
  key(shieldGuardianTrigger.x, shieldGuardianTrigger.y),
]);
export const floodRoomHazard = Object.values(ROOM_BLUEPRINTS)
  .map((room) => room.hazard)
  .find((hazard) => hazard?.kind === "flood-room")!;
export const floodRoomTileKeys = new Set(Array.from(
  { length: floodRoomHazard.tiles.width * floodRoomHazard.tiles.height },
  (_, index) => key(
    floodRoomHazard.tiles.left + (index % floodRoomHazard.tiles.width),
    floodRoomHazard.tiles.top + Math.floor(index / floodRoomHazard.tiles.width),
  ),
));
export const dwarvenSpigotPoint = (() => {
  const room = dungeonRoomPoints.get("32b") || { x: 0, y: 0 };
  return { x: room.x, y: room.y + 1 };
})();
export const spikedPit28d = (() => {
  const room = dungeonRoomPoints.get("28d") || { x: 0, y: 0 };
  return { x: room.x, y: room.y - 1 }; // W76, one step before the lure
})();
export const spikedPitLure28d = (() => {
  const room = dungeonRoomPoints.get("28d") || { x: 0, y: 0 };
  return { x: room.x, y: room.y }; // W77, the visible inspection lure
})();
export const eyeObeliskPoint = { x: 22, y: 68 };
export const eyeHologramPoint = { x: 22, y: 69 };
export const eyeHologramTrigger = { x: 22, y: 70 };
export const blueLightsaberPoint = { x: 23, y: 70 }; // X71, Room 28b alcove
export const dungeonThemePoints = Array.from(dungeonRoomPoints.entries()).map(([label, point]) => ({
  label,
  point,
  theme: ROOM_BLUEPRINTS[label]?.theme || "ancient" as DungeonVisualTheme,
}));
// These props are scenery only. They illustrate authored room descriptions but
// deliberately do not alter movement, targeting, line of sight, or combat.
export const dungeonSceneryProps = createDungeonSceneryProps(dungeonRoomPoints, eyeObeliskPoint);
export const dungeonPoiProp = DUNGEON_POI_ART;
// Encounter-specific layouts keep monsters inside their authored rooms instead
// of allowing the generic nearest-tile search to spill them into hallways.
export const dungeonEncounterSpawns = Object.fromEntries(Object.entries(ROOM_BLUEPRINTS).map(([id, room]) => [
  id,
  (room.actors || []).flatMap((actor) => actor.spawn ? [actor.spawn] : []),
]));
export const dungeonEncounterSpawnKeys = new Set(Object.values(ROOM_BLUEPRINTS)
  .flatMap((room) => room.actors?.flatMap((actor) => actor.spawn ? [key(actor.spawn.x, actor.spawn.y)] : []) || []));
export const dungeonSceneryPropsByTile = indexSceneryProps(dungeonSceneryProps, key);
export const villageSceneryPropsByTile = indexSceneryProps(VILLAGE_SCENERY_PROPS, key);
export const dungeonVisualTheme = (x: number, y: number): DungeonVisualTheme => {
  let nearest = dungeonThemePoints[0], best = Number.POSITIVE_INFINITY;
  for (const candidate of dungeonThemePoints) {
    const distance = Math.abs(candidate.point.x - x) + Math.abs(candidate.point.y - y);
    if (distance < best) { nearest = candidate; best = distance; }
  }
  return nearest?.theme || "ancient";
};
// Theme selection is static map data. Precompute it once instead of walking
// every room marker again for every visible tile on every click.
export const dungeonVisualThemeMap = Array.from({ length: DUNGEON_ROWS }, (_, y) =>
  Array.from({ length: DUNGEON_COLS }, (_, x) => dungeonVisualTheme(x, y)),
);
export const dungeonOpeningArtZone = { left: 5, top: 52, width: 19, height: 15 };
export const inDungeonOpeningArtZone = (x: number, y: number) =>
  x >= dungeonOpeningArtZone.left && x < dungeonOpeningArtZone.left + dungeonOpeningArtZone.width &&
  y >= dungeonOpeningArtZone.top && y < dungeonOpeningArtZone.top + dungeonOpeningArtZone.height;
export const BOSS_SPELL_RANGE = 6;
export const dungeonTerrainMap = Array.from({ length: DUNGEON_ROWS }, (_, y) =>
  Array.from({ length: DUNGEON_COLS }, (_, x) => {
    const tile = undermountainLevel1.tiles[y * DUNGEON_COLS + x];
    return ["grass", "dirt", "lava", "ice", "poison"].includes(tile.kind)
      ? tile.kind
      : dungeonOpen.has(key(x, y)) ? "dungeon-floor" : "void";
  }),
);
export const dungeonHeightMap = Array.from({ length: DUNGEON_ROWS }, () =>
  Array.from({ length: DUNGEON_COLS }, () => 0),
);
export const levelTwoTerrainMap = Array.from({ length: LEVEL_TWO_ROWS }, () =>
  Array.from({ length: LEVEL_TWO_COLS }, () => "black-room"),
);
export const levelTwoHeightMap = Array.from({ length: LEVEL_TWO_ROWS }, () =>
  Array.from({ length: LEVEL_TWO_COLS }, () => 0),
);
export const dungeonBlocked = new Set(
  Array.from({ length: DUNGEON_ROWS * DUNGEON_COLS }, (_, i) => ({
    x: i % DUNGEON_COLS,
    y: Math.floor(i / DUNGEON_COLS),
  }))
    .filter(({ x, y }) => !dungeonOpen.has(key(x, y)))
    .map(({ x, y }) => key(x, y)),
);
export const dungeonClosedBlocked = new Set(dungeonBlocked);
export const allDungeonSecretDoorCrossings = new Set(
  dungeonSecretDoorEdges.map(dungeonSecretDoorCrossingKey),
);
export const diagonalCornerBlocked = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  blockedTiles: Set<string>,
) => fromX !== toX && fromY !== toY && (
  blockedTiles.has(key(toX, fromY)) || blockedTiles.has(key(fromX, toY))
);
export const lineOfSightCornerBlocked = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  blockedTiles: Set<string>,
) => fromX !== toX && fromY !== toY &&
  blockedTiles.has(key(toX, fromY)) && blockedTiles.has(key(fromX, toY));
export const dungeonVisibleFrom = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  blockedTiles: ReadonlySet<string> = dungeonClosedBlocked,
  blockedCrossings: ReadonlySet<string> = allDungeonSecretDoorCrossings,
) => {
  let x = from.x, y = from.y;
  const dx = Math.abs(to.x - x), sx = x < to.x ? 1 : -1;
  const dy = -Math.abs(to.y - y), sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  while (x !== to.x || y !== to.y) {
    const previousX = x, previousY = y;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
    if (crossesDungeonWallEdge(
      { x: previousX, y: previousY },
      { x, y },
      blockedCrossings,
    )) return false;
    // A single wall corner leaves an open viewing angle. Only a diagonal
    // pinched by solid tiles on both sides blocks the continuing sightline.
    if (lineOfSightCornerBlocked(previousX, previousY, x, y, blockedTiles)) return false;
    if ((x !== to.x || y !== to.y) && blockedTiles.has(key(x, y))) return false;
  }
  return true;
};
export const bridgeBlocked = new Set(
  Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => ({ x, y })),
  )
    .flat()
    .filter(({ x, y }) => y > 0 && y < ROWS - 1 && x !== 4 && x !== 5)
    .map(({ x, y }) => key(x, y)),
);
export const blocked = new Set([
  "0,0",
  "1,0",
  "9,0",
  "0,1",
  "9,1",
  "0,7",
  "9,7",
  "5,0",
  "5,1",
]);
