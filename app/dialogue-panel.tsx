import type { ReactNode } from "react";

type DialoguePanelProps = {
  ariaLabel: string;
  speaker: string;
  text: string;
  portrait?: string | null;
  portraitMode?: "sprite-sheet" | "illustration";
  sceneTitle?: string;
  children?: ReactNode;
  onContinue?: () => void;
};

/**
 * One presentation surface for authored dialogue and social choices.
 * Keeping the speaker, portrait, copy, and controls together prevents the
 * campaign from drifting back into unrelated bubbles, sidebars, and modals.
 */
export default function DialoguePanel({
  ariaLabel,
  speaker,
  text,
  portrait,
  portraitMode = "sprite-sheet",
  sceneTitle,
  children,
  onContinue,
}: DialoguePanelProps) {
  const hasChoices = !!children;
  return (
    <div
      className={`portrait-dialogue-panel${hasChoices ? " choice-dialogue-panel" : ""}`}
      role="dialog"
      aria-modal={hasChoices || undefined}
      aria-label={ariaLabel}
    >
      <div className="portrait-dialogue-frame" aria-hidden="true">
        {portrait ? (
          <span
            className={`portrait-dialogue-sprite portrait-mode-${portraitMode}`}
            style={{ backgroundImage: `url(${portrait})` }}
          />
        ) : (
          <span className="portrait-dialogue-fallback">?</span>
        )}
      </div>
      <div className="portrait-dialogue-copy">
        {sceneTitle && <small className="dialogue-scene-title">{sceneTitle}</small>}
        <b>{speaker}</b>
        <p>“{text}”</p>
        {hasChoices && (
          <>
            <span className="dialogue-choice-prompt">Choose a response</span>
            <div className="story-options social-options dialogue-panel-options">
              {children}
            </div>
          </>
        )}
      </div>
      {onContinue && (
        <button type="button" className="dialogue-continue" onClick={onContinue}>
          Continue <kbd>Space</kbd>
        </button>
      )}
    </div>
  );
}
