export type EncounterLifecycle = "dormant" | "introduced" | "choice" | "combat" | "resolved" | "rewarded";

export const encounterLifecycle = (input: {
  roomEntered: boolean;
  socialChoiceOpen: boolean;
  combatActive: boolean;
  resolved: boolean;
  rewarded: boolean;
}): EncounterLifecycle => {
  if (input.rewarded) return "rewarded";
  if (input.resolved) return "resolved";
  if (input.combatActive) return "combat";
  if (input.socialChoiceOpen) return "choice";
  if (input.roomEntered) return "introduced";
  return "dormant";
};

export type RoomEntryPhase = "forming" | "revealing" | "introducing";
export type RoomEntryPresentation = {
  roomId: string;
  title: string;
  description: string;
  phase: RoomEntryPhase;
};

export const roomEntryPhaseLabel: Record<RoomEntryPhase, string> = {
  forming: "PARTY ENTERING",
  revealing: "ROOM REVEALED",
  introducing: "ENCOUNTER READY",
};

export type DebugLayer = "collision" | "triggers" | "rooms" | "spawns" | "art";
export const DEBUG_LAYERS: { id: DebugLayer; label: string }[] = [
  { id: "collision", label: "Collision" },
  { id: "triggers", label: "Triggers" },
  { id: "rooms", label: "Rooms" },
  { id: "spawns", label: "Spawns" },
  { id: "art", label: "Art" },
];

export const turnResourceSummary = (input: {
  phase: "move" | "action" | "facing";
  moveRemaining: number;
  dashActive: boolean;
  encounterMode: "exploration" | "combat";
}) => ({
  movement: input.phase === "move" ? Math.max(0, input.moveRemaining) : 0,
  action: input.phase === "move" || input.phase === "action",
  bonus: false,
  endsTurnOnAction: input.encounterMode === "combat",
  dashSpentAction: input.dashActive && input.encounterMode === "combat",
});

export const hitPreviewLabel = (chance: number, power: number, attackBonus: number, armorClass: number) =>
  `d20 ${attackBonus >= 0 ? "+" : ""}${attackBonus} vs AC ${armorClass} · ${Math.max(5, Math.min(95, chance))}% HIT · ${Math.max(0, power)} BASE DAMAGE`;
