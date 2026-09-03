"use client";

import { useMemo, useState } from "react";
import {
  LEVEL_ONE_REGRESSION_CHECKPOINTS,
  checkpointAutomated,
  type RegressionCheckpoint,
  type RegressionSnapshot,
} from "./level-one-regression";
import styles from "./level-one-regression-runner.module.css";

type LevelOneRegressionRunnerProps = {
  snapshot: RegressionSnapshot;
  onStage: (checkpoint: RegressionCheckpoint) => void;
};

export default function LevelOneRegressionRunner({ snapshot, onStage }: LevelOneRegressionRunnerProps) {
  const [open, setOpen] = useState(false);
  const [manualChecks, setManualChecks] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([]);
  const results = useMemo(() => LEVEL_ONE_REGRESSION_CHECKPOINTS.map((checkpoint) => {
    const automated = checkpointAutomated(checkpoint, snapshot);
    const manual = !checkpoint.manual || manualChecks.has(checkpoint.id);
    return { checkpoint, automated, manual, complete: (checkpoint.probes.length ? automated : true) && manual };
  }), [manualChecks, snapshot]);
  const completeCount = results.filter((result) => result.complete).length;

  const confirmManual = (id: string) => {
    setManualChecks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setHistory((entries) => [...entries, id]);
      }
      return next;
    });
  };
  const undo = () => setHistory((entries) => {
    const id = entries.at(-1);
    if (!id) return entries;
    setManualChecks((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    return entries.slice(0, -1);
  });
  const nextPending = results.find((result) => !result.complete && result.checkpoint.approach);
  const stage = (checkpoint: RegressionCheckpoint) => {
    onStage(checkpoint);
    setOpen(false);
  };

  return (
    <>
      <button
        className={`new-battle ${open ? "active" : ""}`}
        onClick={() => setOpen(true)}
        title="Open the executable Level 1 encounter and reward checklist."
      >
        Run Level 1 Regression
      </button>
      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="level-one-regression-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <small>PLAYTEST TOOL</small>
                <h2 id="level-one-regression-title">Level 1 Regression Tour</h2>
                <p>{completeCount} of {results.length} checkpoints complete</p>
              </div>
              <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close regression tour">×</button>
            </header>
            <div className={styles.controls}>
              <button disabled={!nextPending} onClick={() => nextPending && stage(nextPending.checkpoint)}>Stage Next Pending</button>
              <button disabled={!history.length} onClick={undo}>Undo Manual Check</button>
              <button onClick={() => { setManualChecks(new Set()); setHistory([]); }}>Reset Manual Checks</button>
            </div>
            <p className={styles.instructions}>Stage Nearby moves the selected playtest hero to the approach square. Take the final step normally so the real room trigger, dialogue, combat, and reward code runs.</p>
            <div className={styles.list}>
              {results.map(({ checkpoint, automated, manual, complete }, index) => (
                <article className={`${styles.checkpoint} ${complete ? styles.complete : ""}`} key={checkpoint.id}>
                  <div className={styles.status} aria-label={complete ? "Complete" : "Pending"}>{complete ? "✓" : index + 1}</div>
                  <div className={styles.copy}>
                    <small>{checkpoint.group} · {checkpoint.area}</small>
                    <h3>{checkpoint.setup}</h3>
                    <p>{checkpoint.action}</p>
                    <div className={styles.signals}>
                      {!!checkpoint.probes.length && <span className={automated ? styles.signalPass : ""}>{automated ? "AUTOMATED PASS" : "AWAITING GAME STATE"}</span>}
                      {checkpoint.manual && <span className={manual ? styles.signalPass : ""}>{manual ? "VISUAL CONFIRMED" : "VISUAL CHECK NEEDED"}</span>}
                    </div>
                    {checkpoint.manual && <p className={styles.manual}>{checkpoint.manual}</p>}
                  </div>
                  <div className={styles.actions}>
                    {checkpoint.approach && <button onClick={() => stage(checkpoint)}>Stage Nearby</button>}
                    {checkpoint.manual && <button className={manual ? styles.checked : ""} onClick={() => confirmManual(checkpoint.id)}>{manual ? "Confirmed" : "Confirm Visual"}</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
