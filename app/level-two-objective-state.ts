export const LEVEL_TWO_FALSE_VICTORY_EVENTS = [
  "dust2-flag-secured",
  "dust2-false-victory",
  "dust2-john-wick-arrived",
] as const;

export const levelTwoFalseVictoryEvents = (events:string[]) =>
  [...new Set([...events, ...LEVEL_TWO_FALSE_VICTORY_EVENTS])];

export const levelTwoJohnWickDefeatEvents = (events:string[], johnWickDown:boolean) =>
  !johnWickDown || !events.includes("dust2-john-wick-arrived")
    ? events
    : [...new Set([...events, "dust2-john-wick-defeated", "dust2-secret-exit-open"])];

export const levelTwoExitIsOpen = (events:string[]) =>
  events.includes("dust2-john-wick-arrived") &&
  events.includes("dust2-john-wick-defeated") &&
  events.includes("dust2-secret-exit-open");

export const levelTwoObjectivePhase = (events:string[]) =>
  levelTwoExitIsOpen(events) ? "extraction" as const
    : events.includes("dust2-john-wick-arrived") ? "john-wick" as const
      : "flag" as const;
