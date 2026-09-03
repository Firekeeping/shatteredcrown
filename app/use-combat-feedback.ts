"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMBAT_TIMING, type CombatFloat, type CombatFloatTone } from "./combat-presentation";

export const useCombatFeedback = () => {
  const [combatFloats, setCombatFloats] = useState<CombatFloat[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pushCombatFloat = useCallback((unitId: string, text: string, tone: CombatFloatTone) => {
    nextId.current += 1;
    const id = nextId.current;
    setCombatFloats((current) => [...current, { id, unitId, text, tone }]);
    const timer = setTimeout(() => {
      timers.current = timers.current.filter((candidate) => candidate !== timer);
      setCombatFloats((current) => current.filter((entry) => entry.id !== id));
    }, COMBAT_TIMING.feedbackMs);
    timers.current.push(timer);
  }, []);

  const clearCombatFeedback = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
    setCombatFloats([]);
  }, []);

  useEffect(() => clearCombatFeedback, [clearCombatFeedback]);

  return { combatFloats, pushCombatFloat, clearCombatFeedback };
};
