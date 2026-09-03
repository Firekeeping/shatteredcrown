"use client";

import { useEffect } from "react";
import type { EncounterMode, Stage, Unit } from "./game-types";

export const useCounterDungeoneerContact = ({ enabled, stage, encounterMode, units, isVisible, onContact }:{ enabled:boolean; stage:Stage; encounterMode:EncounterMode; units:Unit[]; isVisible:(unit:Unit)=>boolean; onContact:()=>void }) => {
  useEffect(() => {
    if (!enabled || stage !== "battle" || encounterMode !== "exploration") return;
    if (units.some((unit) => unit.team === "enemy" && !unit.downed && isVisible(unit))) onContact();
  }, [enabled, stage, encounterMode, units, isVisible, onContact]);
};
