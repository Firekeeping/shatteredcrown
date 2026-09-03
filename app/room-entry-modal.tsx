import { roomEntryPhaseLabel, type RoomEntryPresentation } from "./playability-systems";

export default function RoomEntryModal({ entry, onDismiss }: { entry: RoomEntryPresentation; onDismiss: () => void }) {
  return <div className="room-entry-overlay" role="presentation" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
    <div className={`room-entry-presentation phase-${entry.phase}`} role="dialog" aria-modal="true" aria-labelledby="room-entry-title" aria-describedby="room-entry-description">
      <small>{roomEntryPhaseLabel[entry.phase]}</small>
      <b id="room-entry-title">{entry.roomId} · {entry.title}</b>
      <span id="room-entry-description">{entry.description}</span>
      <button type="button" onClick={onDismiss}>Continue</button>
    </div>
  </div>;
}
