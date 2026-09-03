export type Dust2FlagSiteId = "A" | "B";

export type Dust2ObjectiveState = {
  flagCarrierId: string | null;
  looseFlagPosition: { x:number; y:number } | null;
  plantedSite: Dust2FlagSiteId | null;
  countdownArmed: boolean;
  turnsRemaining: number;
  secured: boolean;
  defused: boolean;
  defusingActorId: string | null;
  defuseActions: number;
};

export const DUST2_FLAG_START = { x: 15, y: 31 } as const;
export const DUST2_FLAG_SITES = {
  A: { id: "A" as const, x: 6, y: 5, coordinate: "G6" },
  B: { id: "B" as const, x: 26, y: 6, coordinate: "AA7" },
} as const;
export const DUST2_SECRET_EXIT = { x: 12, y: 5, coordinate: "M6" } as const;

export const createDust2ObjectiveState = (): Dust2ObjectiveState => ({
  flagCarrierId: null,
  looseFlagPosition: DUST2_FLAG_START,
  plantedSite: null,
  countdownArmed: false,
  turnsRemaining: 0,
  secured: false,
  defused: false,
  defusingActorId: null,
  defuseActions: 0,
});

export const dust2FlagSiteAt = (x: number, y: number) =>
  Object.values(DUST2_FLAG_SITES).find((site) => site.x === x && site.y === y);

export const pickUpDust2Flag = (state: Dust2ObjectiveState, heroId: string): Dust2ObjectiveState =>
  state.flagCarrierId || state.plantedSite || state.secured ? state : { ...state, flagCarrierId: heroId, looseFlagPosition:null };

export const dust2LooseFlagPosition = (state:Dust2ObjectiveState) => state.looseFlagPosition || (!state.flagCarrierId && !state.plantedSite ? DUST2_FLAG_START : null);

export const dust2FlagCarrierBonus = (state:Dust2ObjectiveState, unitId:string) => state.flagCarrierId === unitId ? 1 : 0;

export const dropDust2Flag = (state:Dust2ObjectiveState, carrierId:string, position:{x:number;y:number}):Dust2ObjectiveState =>
  state.flagCarrierId !== carrierId || state.plantedSite ? state : { ...state, flagCarrierId:null, looseFlagPosition:{ x:position.x, y:position.y } };

export const plantDust2Flag = (
  state: Dust2ObjectiveState,
  heroId: string,
  site: Dust2FlagSiteId,
  initiativeCount: number,
): Dust2ObjectiveState => state.flagCarrierId !== heroId || state.plantedSite || state.secured
  ? state
  : {
      flagCarrierId: null,
      looseFlagPosition: null,
      plantedSite: site,
      countdownArmed: false,
      turnsRemaining: Math.max(1, initiativeCount) * 3,
      secured: false,
      defused: false,
      defusingActorId: null,
      defuseActions: 0,
    };

export const advanceDust2FlagCountdown = (state: Dust2ObjectiveState): Dust2ObjectiveState => {
  if (!state.plantedSite || state.secured || state.defused) return state;
  if (!state.countdownArmed) return { ...state, countdownArmed: true };
  const turnsRemaining = Math.max(0, state.turnsRemaining - 1);
  return { ...state, turnsRemaining, secured: turnsRemaining === 0 };
};

export const dust2CountdownRounds = (state: Dust2ObjectiveState, initiativeCount: number) =>
  state.secured || state.defused ? 0 : Math.ceil(state.turnsRemaining / Math.max(1, initiativeCount));

export const advanceDust2Defuse = (
  state: Dust2ObjectiveState,
  defenderId: string,
): Dust2ObjectiveState => {
  if (!state.plantedSite || state.secured || state.defused) return state;
  const continuedActions = state.defusingActorId === defenderId ? state.defuseActions + 1 : 1;
  return continuedActions >= 2
    ? { ...state, defused: true, defusingActorId: null, defuseActions: 2 }
    : { ...state, defusingActorId: defenderId, defuseActions: continuedActions };
};

export const cancelDust2Defuse = (
  state: Dust2ObjectiveState,
  defenderId: string,
): Dust2ObjectiveState => state.defusingActorId !== defenderId
  ? state
  : { ...state, defusingActorId: null, defuseActions: 0 };
