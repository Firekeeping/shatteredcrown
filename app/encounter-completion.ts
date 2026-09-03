export type EncounterOutcome = "peace" | "combat" | "retreat" | "special";
export type EncounterCompletion = {
  roomLabel: string;
  title: string;
  outcome: EncounterOutcome;
  summary?: string;
};

export const encounterCompletionFlags = (completion: EncounterCompletion) => [
  `room-state:${completion.roomLabel}:resolved`,
  `encounter-complete:${completion.roomLabel}`,
  `encounter-outcome:${completion.roomLabel}:${completion.outcome}`,
];
