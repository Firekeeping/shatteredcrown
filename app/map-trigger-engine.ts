import type { DungeonRoomBlueprint } from "./dungeon-content";
import { DELVER_ORIENTATION_MESSAGE } from "./scene-content";

export type TriggerPoint = { x: number; y: number };

export type TriggerCondition =
  | { kind: "flag-present"; flag: string }
  | { kind: "flag-absent"; flag: string }
  | { kind: "hero-distance-from-room"; roomId: string; operator: "at-least" | "at-most"; distance: number }
  | { kind: "exploration-at-least"; percent: number }
  | { kind: "no-active-enemies" };

export type MapTriggerEffect =
  | { kind: "set-flag"; flag: string }
  | { kind: "log"; text: string }
  | { kind: "ambient"; text: string; duration?: number }
  | { kind: "halaster"; text: string; delay?: number }
  | { kind: "spawn-item"; id: string; item: string; x: number; y: number };

export type MapTriggerDefinition = {
  id: string;
  scope: "dungeon" | "bridge" | "village" | "forest";
  once?: boolean;
  conditions: TriggerCondition[];
  effects: MapTriggerEffect[];
};

export type MapTriggerSnapshot = {
  scope: MapTriggerDefinition["scope"];
  flags: ReadonlySet<string>;
  heroes: TriggerPoint[];
  roomPoints: ReadonlyMap<string, TriggerPoint>;
  explorationPercent: number;
  activeEnemyCount: number;
};

const distance = (a: TriggerPoint, b: TriggerPoint) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const conditionMet = (condition: TriggerCondition, snapshot: MapTriggerSnapshot) => {
  if (condition.kind === "flag-present") return snapshot.flags.has(condition.flag);
  if (condition.kind === "flag-absent") return !snapshot.flags.has(condition.flag);
  if (condition.kind === "exploration-at-least") return snapshot.explorationPercent >= condition.percent;
  if (condition.kind === "no-active-enemies") return snapshot.activeEnemyCount === 0;
  const point = snapshot.roomPoints.get(condition.roomId);
  if (!point || !snapshot.heroes.length) return false;
  const heroDistances = snapshot.heroes.map((hero) => distance(hero, point));
  // Proximity events belong to the hero who reaches them; the rest of the
  // party does not need to crowd the same marker. Departure events likewise
  // fire when any hero has crossed the authored distance.
  return condition.operator === "at-least"
    ? Math.max(...heroDistances) >= condition.distance
    : Math.min(...heroDistances) <= condition.distance;
};

export const readyMapTriggers = (
  definitions: readonly MapTriggerDefinition[],
  snapshot: MapTriggerSnapshot,
) => definitions.filter((trigger) =>
  trigger.scope === snapshot.scope &&
  (!trigger.once || !snapshot.flags.has(trigger.id)) &&
  trigger.conditions.every((condition) => conditionMet(condition, snapshot)),
);

export const roomEntryEnabled = (room: DungeonRoomBlueprint, flags: ReadonlySet<string>) =>
  (room.entry.requiresFlags || []).every((flag) => flags.has(flag)) &&
  (room.entry.excludesFlags || []).every((flag) => !flags.has(flag));

export const DUNGEON_MAP_TRIGGERS: readonly MapTriggerDefinition[] = [
  {
    id: "halaster-entry-warning",
    scope: "dungeon",
    once: true,
    conditions: [
      { kind: "flag-absent", flag: "halaster-entry-warning" },
      { kind: "hero-distance-from-room", roomId: "1", operator: "at-most", distance: 1 },
    ],
    effects: [
      { kind: "set-flag", flag: "halaster-entry-warning" },
      { kind: "ambient", text: "THE ORIENTATION PROJECTOR WARMS UP · PLEASE STAND BY", duration: 1250 },
      { kind: "halaster", text: DELVER_ORIENTATION_MESSAGE, delay: 1350 },
      { kind: "log", text: "A brass projector coughs to life. Halaster welcomes the company to Delver Orientation." },
    ],
  },
  {
    id: "puke-tunnel-reward-spawned",
    scope: "dungeon",
    once: true,
    conditions: [
      { kind: "flag-present", flag: "western-secret-panel-14-61-open" },
      { kind: "flag-absent", flag: "puke-tunnel-reward-claimed" },
    ],
    effects: [
      { kind: "set-flag", flag: "puke-tunnel-reward-spawned" },
      { kind: "spawn-item", id: "puke-immunity-ring", item: "Ring of Puke Immunity", x: 14, y: 68 },
    ],
  },
];
