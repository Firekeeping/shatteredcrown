"use client";

import { DUST2_FLAG_START, DUST2_SECRET_EXIT, type Dust2FlagSiteId, type Dust2ObjectiveState } from "./dust2-objective";
import { gridColumnLabel } from "./map-rendering";

type Dust2Summary = { state: Dust2ObjectiveState; roundsRemaining: number; carrierName: string };
type StandardSummary = { headline: string; room: string; status: string; discoveries: string; floor?: string };

export function ObjectiveTracker({ open, onToggle, dust2, standard }:{ open:boolean; onToggle:()=>void; dust2?:Dust2Summary; standard:StandardSummary }) {
  const title = dust2
    ? dust2.state.secured ? `Escape through ${DUST2_SECRET_EXIT.coordinate}`
      : dust2.state.plantedSite ? `Hold Site ${dust2.state.plantedSite} · ${dust2.roundsRemaining} round${dust2.roundsRemaining === 1 ? "" : "s"}`
      : dust2.state.flagCarrierId ? "Plant at Site A or B" : "Recover The One True Flag"
    : standard.headline;
  return <section className={`objective-tracker ${open ? "open" : "collapsed"}`} aria-label="Objective tracker">
    <button onClick={onToggle} aria-expanded={open}><span>OBJECTIVE</span><b>{title}</b><i>{open ? "−" : "+"}</i></button>
    {open && (dust2 ? <div>
      <span><b>Flag</b>{dust2.state.secured ? "SECURED" : dust2.state.plantedSite ? `PLANTED · SITE ${dust2.state.plantedSite}` : dust2.state.flagCarrierId ? `CARRIED · ${dust2.carrierName}` : `SPAWN · ${gridColumnLabel(DUST2_FLAG_START.x)}${DUST2_FLAG_START.y + 1}`}</span>
      <span><b>Sites</b>A · G6 / B · AA7</span><span><b>Elevation</b>Exact feet · sight and falls active</span>
      <span><b>Exit</b>{dust2.state.secured ? `${DUST2_SECRET_EXIT.coordinate} · OPEN` : "Red-rock wall · SEALED"}</span>
    </div> : <div>
      <span><b>Room</b>{standard.room}</span><span><b>Status</b>{standard.status}</span>
      <span><b>Discoveries</b>{standard.discoveries}</span>{standard.floor && <span><b>Floor</b>{standard.floor}</span>}
    </div>)}
  </section>;
}

export function Dust2ObjectivePanel({ state, roundsRemaining, carrierName, defuserName, sideLabel, plantSite, canDefuse, matchScore, onPlant, onDefuse }:{ state:Dust2ObjectiveState; roundsRemaining:number; carrierName:string; defuserName?:string; sideLabel?:string; plantSite?:Dust2FlagSiteId; canDefuse?:boolean; matchScore?:string; onPlant:()=>void; onDefuse?:()=>void }) {
  const looseFlag = state.looseFlagPosition || DUST2_FLAG_START;
  return <div className="dust2-objective-panel" role="status"><b>THE ONE TRUE FLAG</b>
    {matchScore && <small className="dust2-match-score">{matchScore}{sideLabel ? ` · ${sideLabel}` : ""}</small>}
    <small>{state.defused ? `Site ${state.plantedSite} defused. Counter-Dungeoneers win the round.`
      : state.secured ? `Site ${state.plantedSite} secured. Reach the red-rock exit at ${DUST2_SECRET_EXIT.coordinate}.`
      : state.plantedSite ? `Site ${state.plantedSite} · ${roundsRemaining} round${roundsRemaining === 1 ? "" : "s"} remaining.${state.defuseActions ? ` ${defuserName || "A defender"} is defusing · ${state.defuseActions}/2 actions.` : ""}`
      : state.flagCarrierId ? `${carrierName} carries the Flag. Plant at G6 or AA7.`
      : `The Flag is loose at ${gridColumnLabel(looseFlag.x)}${looseFlag.y + 1}.`}</small>
    {plantSite && !state.plantedSite && <button className="dust2-plant-action" onClick={onPlant}>Plant at Site {plantSite} · Spend Action</button>}
    {canDefuse && state.plantedSite && !state.defused && !state.secured && <button className="dust2-defuse-action" onClick={onDefuse}>
      {state.defuseActions === 1 ? "Finish Defusing · 1 Action" : "Begin Defusing · 2 Actions"}
    </button>}
  </div>;
}

export function Dust2ObjectiveMarkers({ site, planted, looseFlag, secretExit }:{ site?:{ id:Dust2FlagSiteId; coordinate:string }; planted:boolean; looseFlag:boolean; secretExit:boolean }) {
  return <>{site && <span className={`dust2-flag-site site-${site.id.toLowerCase()} ${planted ? "planted" : ""}`} aria-label={`Flag Site ${site.id} at ${site.coordinate}`}><b>{site.id}</b><small>SITE {site.id}</small>{planted && <i className="one-true-flag" aria-hidden="true" />}</span>}
    {looseFlag && <span className="dust2-loose-flag" aria-label="The One True Flag"><i className="one-true-flag" aria-hidden="true" /><small>THE ONE TRUE FLAG</small></span>}
    {secretExit && <span className="dust2-secret-exit" aria-label={`Open secret exit at ${DUST2_SECRET_EXIT.coordinate}`}><b>EXIT</b><small>RED-ROCK DOOR</small></span>}</>;
}
