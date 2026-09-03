export type EncounterDirectiveId =
  | "village-wave-one"
  | "village-rest-round"
  | "village-wave-two"
  | "village-victory-cheer"
  | "eye-hologram"
  | "combat-cleared"
  | "forest-pack"
  | "boss-arrival"
  | "boss-engagement"
  | "manticore-reward"
  | "boss-enrage"
  | "wandering-guardian"
  | "bridge-detection";

export type EncounterDirectorSnapshot = {
  stage: string;
  campaignScene: number;
  encounterMode: "combat" | "exploration";
  round: number;
  villageWave: number;
  villageWaveBreakUntil: number | null;
  flags: ReadonlySet<string>;
  defeat: boolean;
  activeEnemyCount: number;
  encounterCleared: boolean;
  forestWarningRound: number | null;
  dungeonMode: boolean;
  throneClaimable: boolean;
  bossHuntStarted: boolean;
  bossHasArrived: boolean;
  dungeonExplorationPercent: number;
  activeDungeonThreats: number;
  kingPresent: boolean;
  kingEngageable: boolean;
  kingBelowHalf: boolean;
  manticoresExist: boolean;
  livingManticores: number;
  guardianPresent: boolean;
  guardianReady: boolean;
  sceneBusy: boolean;
  bridgeTargetDetected: boolean;
  eyeHologramTriggered: boolean;
};

export type EncounterDirective = {
  id: EncounterDirectiveId;
  ready: (snapshot: EncounterDirectorSnapshot) => boolean;
};

export const ENCOUNTER_DIRECTIVES: EncounterDirective[] = [
  { id: "village-wave-one", ready: (s) => s.campaignScene === 4 && s.stage === "battle" && s.round >= 2 && !s.flags.has("village-wave1-arrived") && !s.defeat },
  { id: "village-rest-round", ready: (s) => s.campaignScene === 4 && s.stage === "battle" && s.villageWave === 1 && s.flags.has("village-wave1-ready") && !s.flags.has("village-wave2-starting") && s.villageWaveBreakUntil === null && s.activeEnemyCount === 0 && !s.defeat },
  { id: "village-wave-two", ready: (s) => s.campaignScene === 4 && s.stage === "battle" && s.villageWave === 1 && s.villageWaveBreakUntil !== null && s.round >= s.villageWaveBreakUntil && !s.flags.has("village-wave2-starting") && !s.defeat },
  { id: "village-victory-cheer", ready: (s) => s.campaignScene === 4 && s.stage === "battle" && s.villageWave === 2 && s.flags.has("village-wave2-arrived") && !s.flags.has("village-wave2-cheered") && s.activeEnemyCount === 0 && !s.defeat },
  { id: "eye-hologram", ready: (s) => s.campaignScene === 7 && s.stage === "battle" && s.eyeHologramTriggered && !s.flags.has("eye-hologram-awakened") },
  { id: "combat-cleared", ready: (s) => s.stage === "battle" && s.encounterMode === "combat" && s.encounterCleared && !s.defeat },
  { id: "forest-pack", ready: (s) => s.campaignScene === 2 && s.forestWarningRound !== null && s.round > s.forestWarningRound && s.encounterMode === "exploration" && !s.defeat },
  { id: "boss-arrival", ready: (s) => s.dungeonMode && s.stage === "battle" && s.encounterMode === "exploration" && !s.throneClaimable && !s.kingPresent && (s.bossHasArrived || (s.bossHuntStarted && s.dungeonExplorationPercent >= 90 && s.activeDungeonThreats === 0)) },
  { id: "boss-engagement", ready: (s) => s.dungeonMode && s.stage === "battle" && s.encounterMode === "exploration" && s.kingPresent && s.kingEngageable && !s.flags.has("two-headed-king-engaged") && !s.sceneBusy },
  { id: "manticore-reward", ready: (s) => s.dungeonMode && s.stage === "battle" && s.flags.has("manticore-den-intro-complete") && !s.flags.has("manticore-show-must-go-on-awarded") && s.manticoresExist && s.livingManticores === 0 },
  { id: "boss-enrage", ready: (s) => s.kingPresent && s.kingBelowHalf && !s.flags.has("two-headed-king-enraged") },
  { id: "wandering-guardian", ready: (s) => s.dungeonMode && s.stage === "battle" && s.encounterMode === "exploration" && !s.guardianPresent && s.guardianReady && !s.flags.has("wandering-guardian") && !s.sceneBusy },
  { id: "bridge-detection", ready: (s) => s.stage === "battle" && s.encounterMode === "exploration" && s.campaignScene === 6 && s.bridgeTargetDetected && !s.flags.has("bridge-detection") },
];

export const readyEncounterDirectives = (snapshot: EncounterDirectorSnapshot) =>
  ENCOUNTER_DIRECTIVES.filter((directive) => directive.ready(snapshot));
