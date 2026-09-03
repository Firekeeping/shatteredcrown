import { getPoiDefinition, shouldRenderPoi } from "./poi-registry";
import { dungeonPoiProp, dungeonSceneryProps } from "./map-runtime";
import type { PointOfInterest, Unit } from "./game-types";
import type { DungeonPoiArt, SceneryProp } from "./visual-registry";

export type DungeonViewport = { left: number; right: number; top: number; bottom: number };
export type PoiOverlay = { prop: { id: string; x: number; y: number } & DungeonPoiArt; extraClass: string };

export const characterFocus = (hero: Pick<Unit, "x" | "y">, columns: number, rows: number, zoom: number, clientWidth: number, clientHeight: number, tilePixels = 52) => ({
  viewport: { left: Math.max(0, hero.x - 10), right: Math.min(columns - 1, hero.x + 10), top: Math.max(0, hero.y - 9), bottom: Math.min(rows - 1, hero.y + 9) },
  scroll: { left: Math.max(0, (hero.x + 0.5) * tilePixels * zoom - clientWidth / 2), top: Math.max(0, (hero.y + 0.5) * tilePixels * zoom - clientHeight / 2) },
});

export const gridColumnLabel = (x: number) => String.fromCharCode(65 + (x % 26)).repeat(Math.floor(x / 26) + 1);

// Every dungeon prop renders in the board overlay plane. Keeping even decorative
// room plates out of cells prevents a tall asset from raising its host tile over
// fog or void.
const overlaySceneryProps = dungeonSceneryProps;

export const renderedCellIndices = (dungeonMode: boolean, viewport: DungeonViewport, columns: number, rows: number) => {
  const indices: number[] = [];
  if (dungeonMode) {
    for (let y = viewport.top; y <= viewport.bottom; y++)
      for (let x = viewport.left; x <= viewport.right; x++) indices.push(y * columns + x);
  } else for (let index = 0; index < columns * rows; index++) indices.push(index);
  return indices;
};

export const selectDungeonObjectOverlays = ({
  dungeonMode, viewport, playtest, revealed, points, discovered, resolved, units,
}: {
  dungeonMode: boolean;
  viewport: DungeonViewport;
  playtest: boolean;
  revealed: ReadonlySet<string>;
  points: PointOfInterest[];
  discovered: ReadonlySet<string>;
  resolved: ReadonlySet<string>;
  units: Unit[];
}) => {
  const tileVisible = ({ x, y }: { x: number; y: number }) => dungeonMode && x >= viewport.left && x <= viewport.right && y >= viewport.top && y <= viewport.bottom && (playtest || revealed.has(`${x},${y}`));
  const sceneryOverlays: SceneryProp[] = dungeonMode ? overlaySceneryProps.filter(tileVisible) : [];
  const poiOverlays: PoiOverlay[] = dungeonMode ? points.flatMap(({ id, x, y }) => {
    const art = dungeonPoiProp[id];
    if (!art || !tileVisible({ x, y }) || !shouldRenderPoi(id, discovered, resolved) || getPoiDefinition(id).mapRepresentation === "structural") return [];
    const visibleFromParty = !art.visibleFrom || units.some((unit) => unit.team === "hero" && !unit.downed && unit.x >= art.visibleFrom!.left && unit.x <= art.visibleFrom!.right && unit.y >= art.visibleFrom!.top && unit.y <= art.visibleFrom!.bottom);
    return visibleFromParty ? [{ prop: { id, x, y, ...art }, extraClass: id === "question-statue" && !resolved.has(id) ? "wearing-good-question-glasses" : "" }] : [];
  }) : [];
  return { sceneryOverlays, poiOverlays };
};
