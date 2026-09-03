import type { VisualPropKind } from "./poi-registry";
import { ROOM_BLUEPRINTS } from "./dungeon-content";
import { DUNGEON_LANDMARKS } from "./map-landmarks";

export type SceneryAtlas = "dungeon-a" | "dungeon-b" | "dungeon-c" | "dungeon-d" | "dungeon-e" | "village";

export type SceneryProp = {
  id: string;
  x: number;
  y: number;
  atlas: SceneryAtlas;
  slot: number;
  scale?: number;
  rotate?: number;
  offsetX?: number;
  offsetY?: number;
  visualKind?: VisualPropKind;
  asset?: string;
  width?: number;
  height?: number;
  anchor?: "center" | "bottom";
  bottom?: number;
  opacity?: number;
  filter?: string;
};

export type ViewZone = Readonly<{ left: number; top: number; right: number; bottom: number }>;
export type DungeonPoiArt = Pick<SceneryProp, "atlas" | "slot" | "scale" | "rotate" | "offsetX" | "offsetY" | "asset" | "width" | "height" | "anchor" | "bottom" | "opacity" | "filter"> & {
  visibleFrom?: ViewZone;
};

type Point = { x: number; y: number };

// U59 in the authored grid: against the entry-room edge, not in the traffic lane.
export const ORIENTATION_PROJECTOR_POINT = { x: 20, y: 58 } as const;
// T59 sits directly beside the brass projector on U59, so the projection is
// visible inside the already-revealed entry landing rather than hidden above it.
export const ORIENTATION_HOLOGRAM_POINT = { x: 19, y: 58 } as const;
export const KELIM_CLOSET_POINT = { x: 31, y: 73 } as const; // FF74, facing east into GG74

export const createDungeonSceneryProps = (
  roomPoints: ReadonlyMap<string, Point>,
  eyeObeliskPoint: Point,
): SceneryProp[] => {
  const roomProp = (
    id: string,
    room: string,
    atlas: SceneryAtlas,
    slot: number,
    scale = 1,
    rotate = 0,
  ): SceneryProp => ({
    id,
    ...(roomPoints.get(room) || { x: 0, y: 0 }),
    atlas,
    slot,
    scale,
    rotate,
    visualKind: "room-plate",
  });

  const art: Record<string, { atlas: SceneryAtlas; slot: number; scale?: number; rotate?: number }> = {
    "discarded-bathrobe": { atlas: "dungeon-a", slot: 2, scale: 1 },
    "crypt-coffin": { atlas: "dungeon-a", slot: 3, scale: 0.82 },
    "bone-pillars": { atlas: "dungeon-c", slot: 1, scale: 0.94 },
    "ruined-armory": { atlas: "dungeon-c", slot: 5, scale: 0.82 },
    "black-idol": { atlas: "dungeon-d", slot: 2, scale: 0.9 },
    "fresh-meat-table": { atlas: "dungeon-d", slot: 3, scale: 0.94 },
    "dusty-feast-table": { atlas: "dungeon-d", slot: 4, scale: 0.88 },
    "failed-expedition-camp": { atlas: "dungeon-a", slot: 1, scale: 0.72 },
    "excavation-corpse": { atlas: "dungeon-e", slot: 2, scale: 0.76 },
  };
  const roomProps = Object.values(ROOM_BLUEPRINTS).flatMap((room) =>
    (room.scenery || []).flatMap((id) => {
      const definition = art[id];
      if (!definition) return [];
      // The robe remains as scenery after the separate dormant-hilt pickup is collected.
      if (id === "discarded-bathrobe" && room.id === "28b") return [{
        ...roomProp(id, room.id, definition.atlas, definition.slot, definition.scale, definition.rotate),
        x: 23,
        y: 70,
        asset: "/x71-bathrobe.png",
        width: 58,
        height: 39,
        anchor: "center" as const,
        opacity: 1,
        filter: "drop-shadow(0 4px 4px #000c)",
      }];
      const prop = roomProp(id, room.id, definition.atlas, definition.slot, definition.scale, definition.rotate);
      return [id === "failed-expedition-camp" ? { ...prop, opacity: 0.74, filter: "saturate(0.72) brightness(0.88) drop-shadow(0 3px 3px #000c)" } : prop];
    }),
  );
  const lastCamp = roomPoints.get("23c");
  const lastCampBodies: SceneryProp[] = lastCamp ? [
    { id: "last-camp-body-1", x: lastCamp.x, y: lastCamp.y - 1, atlas: "dungeon-e", slot: 2, scale: 0.68, rotate: 18, visualKind: "room-plate" },
    { id: "last-camp-body-2", x: lastCamp.x + 1, y: lastCamp.y, atlas: "dungeon-e", slot: 2, scale: 0.64, rotate: 168, visualKind: "room-plate" },
    { id: "last-camp-body-3", x: lastCamp.x, y: lastCamp.y + 1, atlas: "dungeon-e", slot: 2, scale: 0.7, rotate: 278, visualKind: "room-plate" },
  ] : [];
  return [
    ...roomProps,
    ...lastCampBodies,
    { id: "room-41-bare-bulb", x: 32, y: 96, atlas: "dungeon-b", slot: 0, scale: 1, visualKind: "room-plate", asset: "/fight-club-bare-bulb.png", width: 64, height: 96, anchor: "center", bottom: 12, filter: "drop-shadow(0 0 7px #e4a846aa) drop-shadow(0 6px 5px #000e)" },
    { id: "orientation-projector", ...ORIENTATION_PROJECTOR_POINT, atlas: "dungeon-b", slot: 4, scale: 0.78, visualKind: "interactive-object", asset: "/arcane-projector-original-clean-v2.png", width: 64, height: 86, anchor: "bottom", bottom: -8 },
    { id: "eye-obelisk-projector", ...eyeObeliskPoint, atlas: "dungeon-b", slot: 4, scale: 0.88, visualKind: "interactive-object", asset: "/arcane-projector-original-clean-v2.png", width: 64, height: 86, anchor: "bottom", bottom: -8 },
  ];
};

export const DUNGEON_POI_ART: Record<string, DungeonPoiArt> = {
  "black-pudding-statue": { atlas: "dungeon-d", slot: 2, scale: 0.9, rotate: 0, filter: "brightness(.82) contrast(1.18) saturate(.55) drop-shadow(0 0 7px #49355faa) drop-shadow(0 7px 5px #000b)" },
  "question-statue": { atlas: "dungeon-a", slot: 0, scale: 0.88 },
  // Room 14b is R22-S24. From there the complete east-facing trap is visible;
  // the void wall occludes it from the Manticore stage at U22-Y30.
  "heart-acid": { atlas: "dungeon-a", slot: 5, scale: 0.9, rotate: 90, offsetX: 52, visibleFrom: { left: 17, top: 21, right: 18, bottom: 23 } },
  "dwarven-spigot": { atlas: "dungeon-b", slot: 1, scale: 1, rotate: 180 },
  "golden-spear-mimic": { atlas: "dungeon-b", slot: 3, scale: 0.92 },
  "dead-mage": { atlas: "dungeon-e", slot: 0, scale: 0.72, opacity: 1, filter: "saturate(0.78) drop-shadow(0 4px 4px #000d)" },
  "kelim-closet": { atlas: "dungeon-e", slot: 0, asset: "/kelim-closet-door.png", width: 44, height: 66, anchor: "center", rotate: -90, filter: "drop-shadow(0 4px 4px #000d)" },
};

export const VILLAGE_SCENERY_PROPS: SceneryProp[] = [
  { id: "communal-table", x: 9, y: 10, atlas: "village", slot: 0, scale: 0.82, visualKind: "room-plate" },
  { id: "bunker-benches", x: 12, y: 8, atlas: "village", slot: 1, scale: 0.72, rotate: 90, visualKind: "room-plate" },
  { id: "supply-shelf", x: 13, y: 7, atlas: "village", slot: 2, scale: 0.66, visualKind: "room-plate" },
  { id: "bunker-supplies", x: 8, y: 11, atlas: "village", slot: 3, scale: 0.64, visualKind: "room-plate" },
  { id: "bread-table", x: 9, y: 7, atlas: "village", slot: 4, scale: 0.58, visualKind: "room-plate" },
  { id: "bunker-cot", x: 12, y: 11, atlas: "village", slot: 5, scale: 0.7, rotate: 90, visualKind: "room-plate" },
];

export const indexSceneryProps = (props: SceneryProp[], keyForPoint: (x: number, y: number) => string) => {
  const propsByTile = new Map<string, SceneryProp[]>();
  for (const prop of props) {
    const tileKey = keyForPoint(prop.x, prop.y);
    propsByTile.set(tileKey, [...(propsByTile.get(tileKey) || []), prop]);
  }
  return propsByTile;
};
