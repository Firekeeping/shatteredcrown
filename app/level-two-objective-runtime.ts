import { buildJohnWickReinforcement } from "./counter-dungeoneers";
import type { Unit } from "./game-types";

export const levelTwoFalseVictoryUnits = (units:Unit[], exit:{x:number;y:number}) =>
  units.some((unit) => unit.name === "John Wick") ? units : [...units, buildJohnWickReinforcement(exit.x, exit.y)];

export const levelTwoJohnWickIsDown = (units:Unit[]) => units.some((unit) => unit.name === "John Wick" && unit.downed);
