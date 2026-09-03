import { unitFootprintAt } from "./combat-engine";
import type { Skill, Unit } from "./game-types";
import { tileKey } from "./game-runtime";
import { dungeonOpen } from "./map-runtime";
import type { RegressionCheckpoint, RegressionSnapshot } from "./level-one-regression";

type SnapshotInput = {
  flags: readonly string[];
  resolvedPoi: readonly string[];
  discoveredPoi: readonly string[];
  dungeonItems: Readonly<Record<string, string[]>>;
  droppedItemIds: readonly string[];
  bonusSkills: Readonly<Record<string, Skill[]>>;
  achievementIds: readonly string[];
  route: string | null;
  mapCompletions: Readonly<Record<string, number>>;
  campaignScene: number;
};

export const buildLevelOneRegressionSnapshot = (input: SnapshotInput): RegressionSnapshot => ({
  flags: new Set(input.flags),
  resolvedPoi: new Set(input.resolvedPoi),
  discoveredPoi: new Set(input.discoveredPoi),
  itemNames: new Set(Object.values(input.dungeonItems).flat()),
  droppedItemIds: new Set(input.droppedItemIds),
  learnedSkillNames: new Set(Object.values(input.bonusSkills).flat().map((skill) => skill.name)),
  achievementIds: new Set(input.achievementIds),
  route: input.route,
  mapCompletions: input.mapCompletions,
  campaignScene: input.campaignScene,
});

type StageContext = {
  encounterMode: string;
  units: Unit[];
  selectedHeroId: string | null;
  blocked: ReadonlySet<string>;
  boardCols: number;
  boardRows: number;
  mapZoom: number;
  board: HTMLDivElement | null;
  setAmbientMessage: (message: string | null) => void;
  clearAmbientLater: (delay: number) => void;
  setTeleportMode: (enabled: boolean) => void;
  setSelectedHeroId: (id: string) => void;
  setUnits: (updater: (current: Unit[]) => Unit[]) => void;
  setRevealedTiles: (updater: (current: string[]) => string[]) => void;
  setViewport: (viewport: { left: number; right: number; top: number; bottom: number }) => void;
  updateViewport: (board: HTMLDivElement) => void;
  setLog: (updater: (current: string[]) => string[]) => void;
};

export const stageLevelOneRegressionCheckpoint = (checkpoint: RegressionCheckpoint, context: StageContext) => {
  if (!checkpoint.approach) return;
  if (context.encounterMode === "combat" && context.units.some((unit) => unit.team === "enemy" && !unit.downed)) {
    context.setAmbientMessage("PLAYTEST · FINISH THE CURRENT COMBAT BEFORE STAGING ANOTHER CHECKPOINT");
    context.clearAmbientLater(2600);
    return;
  }
  const hero = context.units.find((unit) => unit.id === context.selectedHeroId && unit.team === "hero" && !unit.npc && !unit.downed)
    || context.units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
  if (!hero) return;
  const occupied = new Set(context.units.filter((unit) => unit.id !== hero.id && !unit.downed)
    .flatMap((unit) => unitFootprintAt(unit).map((tile) => tileKey(tile.x, tile.y))));
  const candidates = [checkpoint.approach, { x: checkpoint.approach.x - 1, y: checkpoint.approach.y },
    { x: checkpoint.approach.x + 1, y: checkpoint.approach.y }, { x: checkpoint.approach.x, y: checkpoint.approach.y - 1 },
    { x: checkpoint.approach.x, y: checkpoint.approach.y + 1 }];
  const landing = candidates.find((point) => dungeonOpen.has(tileKey(point.x, point.y)) && !context.blocked.has(tileKey(point.x, point.y)) && !occupied.has(tileKey(point.x, point.y)));
  if (!landing) {
    context.setAmbientMessage("PLAYTEST · NO CLEAR STAGING SQUARE");
    context.clearAmbientLater(2200);
    return;
  }
  context.setTeleportMode(false);
  context.setSelectedHeroId(hero.id);
  context.setUnits((current) => current.map((unit) => unit.id === hero.id ? { ...unit, ...landing } : unit));
  context.setRevealedTiles((tiles) => [...new Set([...tiles, ...candidates.flatMap((point) => [
    tileKey(point.x, point.y), tileKey(point.x - 1, point.y), tileKey(point.x + 1, point.y),
    tileKey(point.x, point.y - 1), tileKey(point.x, point.y + 1),
  ])])]);
  context.setViewport({ left: Math.max(0, landing.x - 10), right: Math.min(context.boardCols - 1, landing.x + 10),
    top: Math.max(0, landing.y - 9), bottom: Math.min(context.boardRows - 1, landing.y + 9) });
  if (context.board) {
    context.board.scrollLeft = Math.max(0, landing.x * 52 * context.mapZoom - context.board.clientWidth / 2);
    context.board.scrollTop = Math.max(0, landing.y * 52 * context.mapZoom - context.board.clientHeight / 2);
    context.updateViewport(context.board);
  }
  context.setAmbientMessage(`PLAYTEST · ${checkpoint.area.toUpperCase()} STAGED · TAKE THE FINAL STEP NORMALLY`);
  context.clearAmbientLater(3400);
  context.setLog((lines) => [`Regression tour staged ${hero.name} near ${checkpoint.area}. Take the final step normally and complete the authored branch.`, ...lines].slice(0, 6));
};
