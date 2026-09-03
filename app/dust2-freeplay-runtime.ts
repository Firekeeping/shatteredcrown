import { buildCounterDungeoneerSquad } from "./counter-dungeoneers";
import { dust2PositionState } from "./dust2-traversal";
import type { Facing, Unit } from "./game-types";
import { dust2FreeplayRoundWinner, dust2TeamSide, type Dust2FreeplayMatch, type Dust2TeamId } from "./dust2-modes";
import { DUST2_MAX_TEAM_SIZE } from "./dust2-modes";
import { dust2EnemyStarts } from "./dust2-map-data";
import { DUST2_FLAG_SITES, dust2LooseFlagPosition, type Dust2ObjectiveState } from "./dust2-objective";

export const DUST2_FREEPLAY_ATTACKER_STARTS = [[15,30],[16,30],[14,30],[17,30],[13,30],[18,30],[14,29],[17,29]] as const;

export const buildDust2FreeplayDeployment = ({ team, characterIds, rosterIds, makeHero }:{
  team:Dust2TeamId; characterIds:string[]; rosterIds:string[]; makeHero:(id:string)=>Unit;
}) => {
  const counters = buildCounterDungeoneerSquad().filter((unit) => unit.name !== "John Wick");
  const selectedIds = characterIds.slice(0, DUST2_MAX_TEAM_SIZE);
  const selectedUnits = team === "dungeoneers" ? selectedIds.map((id, index) => {
    const unit = makeHero(id), [x, y] = DUST2_FREEPLAY_ATTACKER_STARTS[index];
    return Object.assign(unit, { x, y, facing:"n" as Facing, npc:false, encounterGroup:"dust2-freeplay-dungeoneers" }, dust2PositionState({ x, y }));
  }) : counters.filter((unit) => selectedIds.includes(unit.name)).slice(0, DUST2_MAX_TEAM_SIZE).map((unit) => ({ ...unit, team:"hero" as const, npc:false }));
  const opposingUnits = team === "dungeoneers" ? counters : rosterIds.slice(0, 8).map((id, index) => {
    const unit = makeHero(id), [x, y] = DUST2_FREEPLAY_ATTACKER_STARTS[index];
    return Object.assign(unit, { id:`dust2-freeplay-ai-${id}`, team:"enemy" as const, x, y, facing:"n" as Facing, encounterGroup:"dust2-freeplay-dungeoneers" }, dust2PositionState({ x, y }));
  });
  return { selectedUnits, opposingUnits };
};

export const resetDust2FreeplayUnits = (units:Unit[], match:Dust2FreeplayMatch) => {
  const indexes:Record<Dust2TeamId,number> = { dungeoneers:0, "counter-dungeoneers":0 };
  return units.map((unit) => {
    const faction:Dust2TeamId = unit.encounterGroup === "dust2-counter-squad" ? "counter-dungeoneers" : "dungeoneers";
    const starts = dust2TeamSide(match, faction) === "attack" ? DUST2_FREEPLAY_ATTACKER_STARTS : dust2EnemyStarts;
    const [x, y] = starts[indexes[faction]++ % starts.length];
    return { ...unit, x, y, ...dust2PositionState({ x, y }), hp:unit.maxHp, downed:false, conditions:{}, stunned:false, poisoned:false, bleeding:false,
      skills:unit.skills.map((skill) => ({ ...skill, charges:skill.maxCharges ?? skill.charges })) };
  });
};

export const dust2FactionForUnit = (unit?:Pick<Unit,"encounterGroup">):Dust2TeamId|null =>
  unit?.encounterGroup === "dust2-counter-squad" ? "counter-dungeoneers" : unit?.encounterGroup === "dust2-freeplay-dungeoneers" ? "dungeoneers" : null;

export const dust2FreeplayWinnerForUnits = (match:Dust2FreeplayMatch, objective:Dust2ObjectiveState, units:Unit[]) =>
  dust2FreeplayRoundWinner(match, objective, {
    dungeoneers:units.some((unit) => dust2FactionForUnit(unit) === "dungeoneers" && !unit.downed),
    "counter-dungeoneers":units.some((unit) => dust2FactionForUnit(unit) === "counter-dungeoneers" && !unit.downed),
  });

export const dust2ObjectiveAiPlan = (match:Dust2FreeplayMatch, objective:Dust2ObjectiveState, active:Unit, units:Unit[], enemyVisible = false) => {
  const faction = dust2FactionForUnit(active);
  if (!faction || objective.secured || objective.defused) return null;
  if (dust2TeamSide(match, faction) === "defend") {
    if (!objective.plantedSite) {
      if (enemyVisible) return null;
      const defenders = units.filter((unit) => !unit.downed && dust2FactionForUnit(unit) === faction).sort((a, b) => a.id.localeCompare(b.id));
      const index = Math.max(0, defenders.findIndex((unit) => unit.id === active.id)), site = index % 2 ? DUST2_FLAG_SITES.B : DUST2_FLAG_SITES.A;
      const offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1]] as const, [dx, dy] = offsets[Math.floor(index / 2) % offsets.length];
      return { action:"guard" as const, target:{ ...site, x:site.x + dx, y:site.y + dy } };
    }
    const target = DUST2_FLAG_SITES[objective.plantedSite];
    const primaryDefuser = units.filter((unit) => !unit.downed && dust2FactionForUnit(unit) === faction)
      .sort((a, b) => Math.max(Math.abs(a.x-target.x),Math.abs(a.y-target.y))-Math.max(Math.abs(b.x-target.x),Math.abs(b.y-target.y)) || a.id.localeCompare(b.id))[0];
    return primaryDefuser?.id === active.id ? { action:"defuse" as const, target } : null;
  }
  if (objective.plantedSite) return null;
  if (!objective.flagCarrierId) return { action:"recover" as const, target:dust2LooseFlagPosition(objective)! };
  if (objective.flagCarrierId !== active.id) {
    if (enemyVisible) return null;
    const carrier = units.find((unit) => unit.id === objective.flagCarrierId);
    if (!carrier) return null;
    const escorts = units.filter((unit) => !unit.downed && unit.id !== carrier.id && dust2FactionForUnit(unit) === faction).sort((a, b) => a.id.localeCompare(b.id));
    const index = Math.max(0, escorts.findIndex((unit) => unit.id === active.id)), offsets = [[-1,1],[1,1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1]] as const, [dx,dy] = offsets[index % offsets.length];
    return { action:"escort" as const, target:{ id:"FLAG" as const, x:carrier.x + dx, y:carrier.y + dy } };
  }
  const sites = Object.values(DUST2_FLAG_SITES).sort((a, b) => Math.max(Math.abs(active.x-a.x),Math.abs(active.y-a.y))-Math.max(Math.abs(active.x-b.x),Math.abs(active.y-b.y)));
  return { action:"plant" as const, target:sites[0] };
};
