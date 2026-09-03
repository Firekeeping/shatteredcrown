"use client";

import type { Dust2FreeplayMatch, Dust2TeamId } from "./dust2-modes";

export default function Dust2FreeplayResult({ match, team, onRematch, onChangeTeam, onMenu }:{ match:Dust2FreeplayMatch; team:Dust2TeamId; onRematch:()=>void; onChangeTeam:()=>void; onMenu:()=>void }) {
  const winner = match.winner === "dungeoneers" ? "DUNGEONEERS" : "COUNTER-DUNGEONEERS";
  return <div className="dust2-freeplay-result"><p>{winner} WIN</p><h2>{match.scores.dungeoneers} — {match.scores["counter-dungeoneers"]}</h2>
    <small>First to three complete. Attack and defense swapped after every round.</small>
    <div className="story-options"><button onClick={onRematch}>Rematch · Same Team</button><button onClick={onChangeTeam}>Change Team</button><button onClick={onMenu}>Main Menu</button></div>
    <span>You played as {team === "dungeoneers" ? "the Dungeoneers" : "the Counter-Dungeoneers"}.</span>
  </div>;
}
