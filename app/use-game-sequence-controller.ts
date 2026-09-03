"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameBubble = {
  unitId: string;
  text: string;
  nonce: number;
  persistent?: boolean;
};

type DialogueEntry = {
  unitId: string;
  text: string;
  onContinue: () => void;
};

/**
 * The only owner of speech timing and authored cutscene timers.
 *
 * Transient combat barks never replace readable dialogue. Authored dialogue
 * always waits for an explicit Continue action and every new line joins one
 * FIFO queue. Clearing the controller invalidates every pending callback.
 */
export const useGameSequenceController = () => {
  const [bubble, setBubble] = useState<GameBubble | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogueQueueRef = useRef<DialogueEntry[]>([]);
  const dialogueActiveRef = useRef(false);
  const activeContinueRef = useRef<(() => void) | null>(null);
  const cutsceneTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generationRef = useRef(0);
  const nonceRef = useRef(0);

  const nextNonce = useCallback(() => {
    nonceRef.current += 1;
    return nonceRef.current;
  }, []);

  const presentNextDialogue = useCallback(() => {
    const next = dialogueQueueRef.current.shift();
    if (!next) {
      dialogueActiveRef.current = false;
      activeContinueRef.current = null;
      setBubble(null);
      return;
    }
    dialogueActiveRef.current = true;
    activeContinueRef.current = next.onContinue;
    setBubble({ unitId: next.unitId, text: next.text, nonce: nextNonce(), persistent: true });
  }, [nextNonce]);

  const showCombatBark = useCallback((unitId: string, text: string, duration = 950) => {
    if (dialogueActiveRef.current) return;
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    activeContinueRef.current = null;
    setBubble({ unitId, text, nonce: nextNonce() });
    bubbleTimerRef.current = setTimeout(() => {
      bubbleTimerRef.current = null;
      setBubble(null);
    }, duration);
  }, [nextNonce]);

  const showDialogueBubble = useCallback((
    unitId: string,
    text: string,
    onContinue: () => void = () => undefined,
  ) => {
    dialogueQueueRef.current.push({ unitId, text, onContinue });
    if (dialogueActiveRef.current) return;
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = null;
    presentNextDialogue();
  }, [presentNextDialogue]);

  const continueDialogueBubble = useCallback(() => {
    if (!dialogueActiveRef.current) return;
    const onContinue = activeContinueRef.current;
    activeContinueRef.current = null;
    dialogueActiveRef.current = false;
    setBubble(null);
    onContinue?.();
    if (!dialogueActiveRef.current) presentNextDialogue();
  }, [presentNextDialogue]);

  useEffect(() => {
    const advanceFromKeyboard = (event: KeyboardEvent) => {
      if (!dialogueActiveRef.current || event.repeat || (event.key !== " " && event.key !== "Enter")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      continueDialogueBubble();
    };
    window.addEventListener("keydown", advanceFromKeyboard);
    return () => window.removeEventListener("keydown", advanceFromKeyboard);
  }, [continueDialogueBubble]);

  const scheduleCutscene = useCallback((callback: () => void, delay: number) => {
    const generation = generationRef.current;
    const timer = setTimeout(() => {
      cutsceneTimersRef.current = cutsceneTimersRef.current.filter((candidate) => candidate !== timer);
      if (generation === generationRef.current) callback();
    }, delay);
    cutsceneTimersRef.current.push(timer);
    return timer;
  }, []);

  const clearSequence = useCallback(() => {
    cutsceneTimersRef.current.forEach((timer) => clearTimeout(timer));
    cutsceneTimersRef.current = [];
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = null;
    dialogueQueueRef.current = [];
    activeContinueRef.current = null;
    dialogueActiveRef.current = false;
    generationRef.current += 1;
    setBubble(null);
  }, []);

  const beginSequence = useCallback(() => {
    generationRef.current += 1;
    return generationRef.current;
  }, []);

  const invalidateSequence = useCallback(() => {
    generationRef.current += 1;
  }, []);

  const isSequenceCurrent = useCallback((generation: number) => generationRef.current === generation, []);

  useEffect(() => clearSequence, [clearSequence]);

  return {
    bubble,
    showCombatBark,
    showDialogueBubble,
    continueDialogueBubble,
    scheduleCutscene,
    clearSequence,
    beginSequence,
    invalidateSequence,
    isSequenceCurrent,
  };
};
