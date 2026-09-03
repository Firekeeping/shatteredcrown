export type MapPoint = Readonly<{ x: number; y: number }>;

type LandmarkVisual<State extends string = "default"> = Readonly<{
  kind: "exit" | "trap" | "clue" | "doorway";
  states: Readonly<Record<State, string>>;
}>;

type Landmark<State extends string = "default"> = Readonly<{
  id: string;
  point: MapPoint;
  visual: LandmarkVisual<State>;
}>;

const landmark = <State extends string>(definition: Landmark<State>) => definition;
const HALLETH_PIT_POINT = { x: 20, y: 86 } as const; // U87

// Authored landmarks are the single coordinate contract shared by triggers,
// collision, interaction text, and rendering. Display coordinates are kept in
// comments so playtest reports can be mapped back to the zero-based grid.
export const BRIDGE_LANDMARKS = Object.freeze({
  exit: landmark({
    id: "bridge-north-exit",
    point: { x: 4, y: 0 }, // E1
    visual: { kind: "exit", states: { default: "North Bridge Exit" } },
  }),
  snare: landmark({
    id: "bridge-snare",
    point: { x: 4, y: 4 }, // E5
    visual: { kind: "trap", states: { default: "wire-snare" } },
  }),
  waystone: landmark({
    id: "bridge-waystone",
    point: { x: 6, y: 6 }, // G7
    visual: { kind: "clue", states: { default: "toll-projector" } },
  }),
  supplyCache: landmark({
    id: "bridge-supply-cache",
    point: { x: 6, y: 0 }, // G1
    visual: { kind: "clue", states: { default: "treasure-chest" } },
  }),
});

export const DUNGEON_LANDMARKS = Object.freeze({
  heartAcid: Object.freeze({
    ...landmark({
      id: "heart-acid",
      point: { x: 19, y: 23 }, // T24 · visible center
      visual: { kind: "trap", states: { default: "heart-acid" } },
    }),
    // T24 is authored void, so the walkable S24 cell owns the interaction
    // while the shared visual offset centers the complete trap in T24.
    mountPoint: { x: 18, y: 23 }, // S24
  }),
  pinupPoster: Object.freeze({
    ...landmark({
      id: "western-secret-panel-14-61",
      point: { x: 14, y: 61 }, // O62
      visual: { kind: "clue", states: { default: "/fantasy-prison-poster.png" } },
    }),
    wallEdge: { x: 14, y: 61, side: "n" } as const,
    publicSide: { x: 14, y: 60 }, // O61; the framed poster hangs south into O62
  }),
  proximityBomb: Object.freeze({
    ...landmark({
      id: "proximity-bomb",
      point: { x: 9, y: 63 }, // J64
      visual: {
        kind: "trap",
        states: {
          dormant: "/j64-relic-swap-atlas.webp",
          armed: "/j64-relic-swap-atlas.webp",
          exploding: "/fireball-bomb-vfx-atlas.webp",
          resetting: "/j64-relic-swap-atlas.webp",
          disabled: "/j64-relic-swap-atlas.webp",
        },
      },
    }),
    armRadius: 1,
    blastRadius: 2,
    room: Object.freeze({ left: 8, top: 62, right: 10, bottom: 64 }), // I63–K65
  }),
  classroomDoorway: Object.freeze({
    id: "classroom-doorway",
    point: { x: 6, y: 75 }, // G76, room side
    hallPoint: { x: 7, y: 75 }, // H76, hall side
    approachPoint: { x: 5, y: 75 }, // F76
    visual: { kind: "doorway", states: { default: "classroom-doorway" } },
  }),
  hallethPit: landmark({
    id: "halleth-pit",
    point: HALLETH_PIT_POINT,
    visual: { kind: "clue", states: {
      default: "/halleth-empty-barred-pit-v2.png",
      opened: "/halleth-open-pit-v2.png",
    } },
  }),
  pantryTeleportTrap: Object.freeze({
    ...landmark({
      id: "room-34-teleport-trap",
      point: { x: 33, y: 66 }, // HH67, the doorway trigger into room 34
      visual: { kind: "trap", states: { default: "arcane-teleport-rune" } },
    }),
    destination: HALLETH_PIT_POINT, // U87, the opened pit where Halleth was trapped
    feastPoint: { x: 34, y: 66 }, // II67, against the back wall
    activatesAfter: "halleth-rescued",
    resetMs: 900,
  }),
});

export const inProximityBombRoom = (point: { x: number; y: number }) => {
  const room = DUNGEON_LANDMARKS.proximityBomb.room;
  return point.x >= room.left && point.x <= room.right && point.y >= room.top && point.y <= room.bottom;
};

export type ProximityBombVisualState = keyof typeof DUNGEON_LANDMARKS.proximityBomb.visual.states;

export const landmarkPoint = (value: { point: MapPoint }) => value.point;
