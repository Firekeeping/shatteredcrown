"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

type EncounterMode = "combat" | "exploration";
type TurnPhase = "move" | "action" | "facing";
type Choice = { kind: "attack" | "skill"; i?: number } | null;

export type CombatTransitionOptions = {
  restartRound?: boolean;
  round?: number;
  keepAiBusy?: boolean;
};

type TransitionSetters = {
  setEncounterMode: Dispatch<SetStateAction<EncounterMode>>;
  setRound: Dispatch<SetStateAction<number>>;
  setTurn: Dispatch<SetStateAction<number>>;
  setPhase: Dispatch<SetStateAction<TurnPhase>>;
  setChosen: Dispatch<SetStateAction<Choice>>;
  setAiBusy: Dispatch<SetStateAction<boolean>>;
  setChapterIntro: Dispatch<SetStateAction<boolean>>;
  setInventoryOpen: Dispatch<SetStateAction<boolean>>;
  setDashActive: Dispatch<SetStateAction<boolean>>;
  setMovementSpent: Dispatch<SetStateAction<number>>;
};

/**
 * The single vocabulary for changing encounter and turn state.
 *
 * Content code should request a transition instead of remembering every
 * individual flag that must be reset when combat starts or ends.
 */
export const useGameStateTransitions = ({
  setEncounterMode,
  setRound,
  setTurn,
  setPhase,
  setChosen,
  setAiBusy,
  setChapterIntro,
  setInventoryOpen,
  setDashActive,
  setMovementSpent,
}: TransitionSetters) => {
  const resetTurnControls = useCallback(() => {
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setInventoryOpen(false);
    setDashActive(false);
    setMovementSpent(0);
  }, [setTurn, setPhase, setChosen, setInventoryOpen, setDashActive, setMovementSpent]);

  const startCombat = useCallback((options: CombatTransitionOptions = {}) => {
    setEncounterMode("combat");
    if (options.restartRound !== false) setRound(options.round ?? 1);
    if (!options.keepAiBusy) setAiBusy(false);
    setChapterIntro(false);
    resetTurnControls();
  }, [setEncounterMode, setRound, setAiBusy, setChapterIntro, resetTurnControls]);

  const startExploration = useCallback(() => {
    setEncounterMode("exploration");
    setAiBusy(false);
    setChapterIntro(false);
    resetTurnControls();
  }, [setEncounterMode, setAiBusy, setChapterIntro, resetTurnControls]);

  const releaseAi = useCallback(() => setAiBusy(false), [setAiBusy]);

  return { resetTurnControls, startCombat, startExploration, releaseAi };
};

