export type Dust2Mode = "map-lab" | "dungeon-level-two" | "freeplay";
export type Dust2TeamId = "dungeoneers" | "counter-dungeoneers";
export type Dust2Side = "attack" | "defend";

export const DUST2_MAX_TEAM_SIZE = 8;
export const DUST2_MATCH_WINS_REQUIRED = 3;
export const DUST2_MAX_MATCH_ROUNDS = 5;

export type Dust2ModeRules = {
  mode: Dust2Mode;
  objectiveRounds: number;
  matchWinsRequired: number | null;
  maxTeamSize: number;
  hasRoundTimer: false;
  sharedTeamVision: false;
  johnWick: "never" | "after-objective";
};

export const DUST2_MODE_RULES: Record<Dust2Mode, Dust2ModeRules> = {
  "map-lab": {
    mode: "map-lab",
    objectiveRounds: 0,
    matchWinsRequired: null,
    maxTeamSize: 1,
    hasRoundTimer: false,
    sharedTeamVision: false,
    johnWick: "never",
  },
  "dungeon-level-two": {
    mode: "dungeon-level-two",
    objectiveRounds: 1,
    matchWinsRequired: null,
    maxTeamSize: DUST2_MAX_TEAM_SIZE,
    hasRoundTimer: false,
    sharedTeamVision: false,
    johnWick: "after-objective",
  },
  freeplay: {
    mode: "freeplay",
    objectiveRounds: 3,
    matchWinsRequired: DUST2_MATCH_WINS_REQUIRED,
    maxTeamSize: DUST2_MAX_TEAM_SIZE,
    hasRoundTimer: false,
    sharedTeamVision: false,
    johnWick: "never",
  },
};

export type Dust2FreeplayMatch = {
  round: number;
  startingAttackers: Dust2TeamId;
  scores: Record<Dust2TeamId, number>;
  winner: Dust2TeamId | null;
};

export const otherDust2Team = (team: Dust2TeamId): Dust2TeamId =>
  team === "dungeoneers" ? "counter-dungeoneers" : "dungeoneers";

export const createDust2FreeplayMatch = (
  startingAttackers: Dust2TeamId = "dungeoneers",
): Dust2FreeplayMatch => ({
  round: 1,
  startingAttackers,
  scores: { dungeoneers: 0, "counter-dungeoneers": 0 },
  winner: null,
});

export const dust2TeamSide = (match: Dust2FreeplayMatch, team: Dust2TeamId): Dust2Side => {
  const attackers = match.round % 2 === 1
    ? match.startingAttackers
    : otherDust2Team(match.startingAttackers);
  return team === attackers ? "attack" : "defend";
};

export const completeDust2FreeplayRound = (
  match: Dust2FreeplayMatch,
  roundWinner: Dust2TeamId,
): Dust2FreeplayMatch => {
  if (match.winner) return match;
  const scores = { ...match.scores, [roundWinner]: match.scores[roundWinner] + 1 };
  const winner = scores[roundWinner] >= DUST2_MATCH_WINS_REQUIRED ? roundWinner : null;
  return { ...match, scores, winner, round: winner ? match.round : match.round + 1 };
};

export const canJoinDust2Team = (currentSize: number) =>
  currentSize >= 0 && currentSize < DUST2_MAX_TEAM_SIZE;

export const dust2FreeplayRoundWinner = (
  match: Dust2FreeplayMatch,
  objective: { plantedSite: string | null; secured: boolean; defused: boolean },
  alive: Record<Dust2TeamId, boolean>,
): Dust2TeamId | null => {
  const attacker = dust2TeamSide(match, "dungeoneers") === "attack" ? "dungeoneers" : "counter-dungeoneers";
  const defender = otherDust2Team(attacker);
  if (objective.secured) return attacker;
  if (objective.defused) return defender;
  if (!alive[defender]) return attacker;
  if (!objective.plantedSite && !alive[attacker]) return defender;
  return null;
};
