import { DUNGEON_LANDMARKS } from "./map-landmarks";

export type WallSide = "n" | "e" | "s" | "w";
export type WallMountFrame = "portrait" | "mirror" | "bare";
export type WallMountRotation = 0 | 90 | 180 | 270;

export type WallMount = Readonly<{
  id: string;
  poiId?: string;
  host: Readonly<{ x: number; y: number }>;
  side: WallSide;
  image?: string;
  frame?: WallMountFrame;
  panelOnly?: boolean;
  rotate?: WallMountRotation;
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  panelTiles?: number;
  panelDepthTiles?: number;
  suppressWallEdge?: boolean;
  secretDoorEdge?: Readonly<{ x: number; y: number; side: WallSide }>;
}>;

const edgeKey = (edge: Readonly<{ x: number; y: number; side: WallSide }>) =>
  `${edge.x},${edge.y},${edge.side}`;

/**
 * A mount can supply one continuous wall-face panel, but never an edge/cap,
 * ledge, base, or other wall geometry. The authored map owns collision and
 * secret-door state; the panel and its frame disappear when that door opens.
 */
export const DUNGEON_WALL_MOUNTS: readonly WallMount[] = [
  { id: "pinup-wall-left", host: { x: 13, y: 60 }, side: "s", panelTiles: 1, panelOnly: true, suppressWallEdge: true },
  { id: "pinup-wall-center", poiId: DUNGEON_LANDMARKS.pinupPoster.id, host: DUNGEON_LANDMARKS.pinupPoster.publicSide, side: "s", image: DUNGEON_LANDMARKS.pinupPoster.visual.states.default, frame: "bare", rotate: 180, panelTiles: 1, suppressWallEdge: true, secretDoorEdge: DUNGEON_LANDMARKS.pinupPoster.wallEdge },
  { id: "pinup-wall-right", host: { x: 15, y: 60 }, side: "s", panelTiles: 1, panelOnly: true, suppressWallEdge: true },
  { id: "hall-portrait-1", poiId: "hall-portrait-1", host: { x: 10, y: 25 }, side: "n", image: "/hall-orvin-mimic-inspector.webp", frame: "portrait", panelTiles: 5, suppressWallEdge: true },
  { id: "hall-portrait-2", poiId: "hall-portrait-2", host: { x: 11, y: 25 }, side: "n", image: "/hall-yara-ready.webp", frame: "portrait", suppressWallEdge: true },
  { id: "hall-portrait-3", poiId: "hall-portrait-3", host: { x: 12, y: 25 }, side: "n", image: "/hall-pell-precise.webp", frame: "portrait", suppressWallEdge: true },
  { id: "hall-portrait-4", poiId: "hall-portrait-4", host: { x: 13, y: 25 }, side: "n", image: "/hall-torvik-torch-snuffer.webp", frame: "portrait", suppressWallEdge: true },
  { id: "hall-portrait-mirror", poiId: "hall-portrait-mirror", host: { x: 14, y: 25 }, side: "n", frame: "mirror", suppressWallEdge: true },
];

export const wallMountsByHostTile = (keyOf: (x: number, y: number) => string) => {
  const mounts = new Map<string, WallMount[]>();
  DUNGEON_WALL_MOUNTS.forEach((mount) => {
    const hostKey = keyOf(mount.host.x, mount.host.y);
    mounts.set(hostKey, [...(mounts.get(hostKey) || []), mount]);
  });
  return mounts;
};

export const wallMountBySecretDoorEdge = new Map(
  DUNGEON_WALL_MOUNTS.flatMap((mount) =>
    mount.secretDoorEdge ? [[edgeKey(mount.secretDoorEdge), mount] as const] : [],
  ),
);
