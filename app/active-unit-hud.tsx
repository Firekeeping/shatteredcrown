"use client";

type TurnResources = { movement:number; action:boolean; dashSpentAction:boolean };

export default function ActiveUnitHud({ name, role, hp, maxHp, move, elevation, armorClass, proficiency, investigation, resources, infiniteMovement }:{
  name?:string; role?:string; hp:number; maxHp:number; move:string|number; elevation?:number; armorClass:number;
  proficiency:number; investigation:string; resources:TurnResources; infiniteMovement:boolean;
}) {
  return <>
    <h2>{name}</h2><small>{role}</small>
    <div className="hp-row"><span>HP</span><b>{hp}/{maxHp}</b></div>
    <div className="bar"><i style={{ width:`${100 * hp / Math.max(1, maxHp)}%` }} /></div>
    <div className="stats">
      <span>MOVE<b>{move}</b></span>{elevation !== undefined && <span>ELEV<b>{elevation}ft</b></span>}
      <span>AC<b>{armorClass}</b></span><span>PROF<b>+{proficiency}</b></span><span>INV<b>{investigation}</b></span>
    </div>
    <div className="turn-resource-strip" aria-label="Turn resources">
      <span className={resources.movement > 0 ? "available" : "spent"}><b>MOVE</b>{infiniteMovement ? "∞" : elevation !== undefined ? `${Math.round(resources.movement * 5)}ft` : resources.movement}</span>
      <span className={resources.action ? "available" : "spent"}><b>ACTION</b>{resources.dashSpentAction ? "DASH" : resources.action ? "READY" : "SPENT"}</span>
      <span className="unavailable"><b>BONUS</b>—</span>
    </div>
  </>;
}
