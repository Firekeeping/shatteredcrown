import { spawnActor } from "./character-runtime";
import { dust2EnemyStarts } from "./dust2-map-data";
import { dust2PositionState } from "./dust2-traversal";

export const COUNTER_DUNGEONEER_ACTOR_IDS = [
  "John Wick", "Vesper Longshot", "Brakka Breach", "Nix Fusefinger",
  "Thorne Bastion", "Sable Null", "Mercy Hex", "Rook Ironjaw",
] as const;

export const COUNTER_DUNGEONEER_WEAPON_FINISHES = {
  "John Wick": { id:"obsidian-oath", kind:"pistol", label:"Obsidian Oath runed pistol" },
  "Vesper Longshot": { id:"dragon-glass", kind:"awp", label:"Dragon Glass arc AWP" },
  "Brakka Breach": { id:"ember-maw", kind:"shotgun", label:"Ember Maw breach gun" },
  "Nix Fusefinger": { id:"emerald-fuse", kind:"grenade", label:"Emerald Fuse alchemical grenade" },
  "Thorne Bastion": { id:"adamant-storm", kind:"rifle", label:"Adamant Storm suppression rifle" },
  "Sable Null": { id:"void-script", kind:"silenced", label:"Void Script suppressed carbine" },
  "Mercy Hex": { id:"neon-curse", kind:"smg", label:"Neon Curse hex SMG" },
  "Rook Ironjaw": { id:"sun-forged", kind:"carbine", label:"Sun-Forged rush carbine" },
} as const;

export const counterDungeoneerWeaponFinish = (name: string) =>
  COUNTER_DUNGEONEER_WEAPON_FINISHES[name as keyof typeof COUNTER_DUNGEONEER_WEAPON_FINISHES];

export const buildCounterDungeoneerSquad = ({ includeJohnWick = true }:{ includeJohnWick?:boolean } = {}) => COUNTER_DUNGEONEER_ACTOR_IDS.filter((actorId) => includeJohnWick || actorId !== "John Wick").map((actorId, index) => {
  const unit = spawnActor(actorId, `dust2-counter-${index}`, "enemy");
  const [x, y] = dust2EnemyStarts[index];
  return Object.assign(unit, { x, y, facing:"s" as const, encounterGroup:"dust2-counter-squad" }, dust2PositionState({ x, y }));
});

export const buildJohnWickReinforcement = (x:number, y:number) => {
  const unit = spawnActor("John Wick", "dust2-john-wick-reinforcement", "enemy");
  return Object.assign(unit, { x, y, facing:"s" as const, encounterGroup:"dust2-john-wick-boss" }, dust2PositionState({ x, y }));
};
