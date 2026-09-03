"use client";

import { useEffect } from "react";

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Shattered Crown recovered from a runtime failure", error);
  }, [error]);

  return (
    <main className="game-recovery-screen">
      <section>
        <small>TACTICS OF THE SHATTERED CROWN</small>
        <h1>The dungeon lost the thread.</h1>
        <p>Your campaign save is still intact. Retry the current scene first; reload only if the scene cannot recover.</p>
        <div>
          <button type="button" onClick={reset}>Retry Current Scene</button>
          <button type="button" onClick={() => window.location.reload()}>Reload Saved Campaign</button>
        </div>
      </section>
    </main>
  );
}
