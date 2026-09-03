"use client";

import { useState } from "react";
import { DUST2_MAX_TEAM_SIZE, type Dust2TeamId } from "./dust2-modes";

export type Dust2FreeplayChoice = { id: string; name: string; detail: string };

export default function Dust2FreeplaySetup({
  dungeoneers,
  counterDungeoneers,
  onBack,
  onStart,
}: {
  dungeoneers: Dust2FreeplayChoice[];
  counterDungeoneers: Dust2FreeplayChoice[];
  onBack: () => void;
  onStart: (team: Dust2TeamId, characterIds: string[]) => void;
}) {
  const [team, setTeam] = useState<Dust2TeamId>("dungeoneers");
  const [selected, setSelected] = useState<string[]>([]);
  const choices = team === "dungeoneers" ? dungeoneers : counterDungeoneers;
  const chooseTeam = (next: Dust2TeamId) => { setTeam(next); setSelected([]); };
  const toggle = (id: string) => setSelected((current) => current.includes(id)
    ? current.filter((entry) => entry !== id)
    : current.length < DUST2_MAX_TEAM_SIZE ? [...current, id] : current);

  return <main className="setup-shell dust2-freeplay-setup">
    <header><div><p className="eyebrow">DUST 2 · FREEPLAY</p><h1>Search &amp; Destroy</h1>
      <p className="setup-note">First to three wins. Attack and defense swap after every round. There is no round timer.</p></div>
      <div className="step">MATCH SETUP<br/><b>CHOOSE SIDE</b></div>
    </header>
    <div className="dust2-side-picker" role="group" aria-label="Choose a starting team">
      <button className={team === "dungeoneers" ? "selected" : ""} onClick={() => chooseTeam("dungeoneers")}>
        <b>Dungeoneers</b><small>Attack first · Carry and plant The One True Flag</small>
      </button>
      <button className={team === "counter-dungeoneers" ? "selected" : ""} onClick={() => chooseTeam("counter-dungeoneers")}>
        <b>Counter-Dungeoneers</b><small>Defend first · Eliminate attackers or defuse the Flag</small>
      </button>
    </div>
    <section className="dust2-freeplay-rules" aria-label="Freeplay rules">
      <span><b>3</b> wins</span><span><b>8</b> maximum per side</span><span><b>3</b> rounds to activate</span><span><b>2</b> actions to defuse</span>
      <p>Each character uses only their own vision. John Wick never appears in Freeplay.</p>
    </section>
    <div className="dust2-freeplay-roster">
      {choices.map((choice) => <button key={choice.id} className={selected.includes(choice.id) ? "selected" : ""} onClick={() => toggle(choice.id)}>
        <b>{choice.name}</b><small>{choice.detail}</small>
      </button>)}
    </div>
    <div className="setup-bar"><button onClick={onBack}>← Main Menu</button><span>{selected.length}/{DUST2_MAX_TEAM_SIZE} selected</span>
      <button disabled={!selected.length} onClick={() => onStart(team, selected)}>Deploy to Dust 2 →</button></div>
  </main>;
}
