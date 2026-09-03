import { useEffect, type DependencyList } from "react";
import { isGuestReplicaActive } from "./multiplayer-runtime";

/**
 * Runs state-machine reactions after React has committed the triggering render.
 * This keeps event-driven transitions out of the synchronous effect body while
 * retaining cancellation and cleanup when dependencies change.
 */
export const useDeferredEffect = (
  effect: () => void | (() => void),
  dependencies: DependencyList,
) => {
  // This hook deliberately receives its caller's dependency list. The effect
  // callback is deferred through a microtask and therefore cannot be expressed
  // as a normal inline useEffect without duplicating this cancellation logic.
  useEffect(() => {
    let cancelled = false;
    let cleanup: void | (() => void);
    queueMicrotask(() => {
      // A guest commits direct player actions, but autonomous reactions remain
      // host-only so enemies, encounters, and turn transitions cannot run twice.
      if (!cancelled && !isGuestReplicaActive()) cleanup = effect();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
};
