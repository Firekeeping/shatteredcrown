export type ObjectiveDefinition = {
  id: string;
  title: string;
  map: "forest" | "ritual" | "village" | "bridge" | "dungeon" | "level-2";
  recapLabel: string;
  required?: boolean;
};

/** Shared source for objective tracking and end-of-map recap rows. */
export const OBJECTIVE_REGISTRY: ObjectiveDefinition[] = [
  { id: "forest-escape", title: "Reach the ruined boundary", map: "forest", recapLabel: "Escaped the opening forest", required: true },
  { id: "ritual-choice", title: "Resolve the blood-moon ritual", map: "ritual", recapLabel: "Resolved the ritual clearing", required: true },
  { id: "village-survivors", title: "Defend the village", map: "village", recapLabel: "Villagers saved", required: true },
  { id: "bridge-crossing", title: "Cross the bandit bridge", map: "bridge", recapLabel: "Bridge secured", required: true },
  { id: "dungeon-exploration", title: "Explore Undermountain", map: "dungeon", recapLabel: "Dungeon rooms explored", required: true },
  { id: "dungeon-boss", title: "Defeat the Two-Headed King", map: "dungeon", recapLabel: "Boss defeated", required: true },
  { id: "level-two-entry", title: "Enter Level 2", map: "level-2", recapLabel: "Level 2 reached", required: true },
];

export const objectivesForMap = (map: ObjectiveDefinition["map"]) =>
  OBJECTIVE_REGISTRY.filter((objective) => objective.map === map);

const RECAP_TITLES: Record<number, string> = {
  2: "Missing Guards Trail",
  3: "Blood-Moon Ritual",
  4: "Village Defense",
  5: "Village Defense",
  6: "Stone Bridge",
  8: "Blood-Moon Poison Ambush",
  7: "Undermountain Level 1",
  9: "Undermountain Level 2",
};

export const recapTitleForScene = (scene: number) => RECAP_TITLES[scene] || "Map Recap";
