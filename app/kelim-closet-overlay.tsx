"use client";

import { DungeonOverlaySlot } from "./dungeon-object-overlay";

export function KelimClosetOverlay({ x, y, bark, onInspect }: { x: number; y: number; bark: string | null; onInspect: () => void }) {
  return <>
    <DungeonOverlaySlot x={x} y={y} className="kelim-door-interaction-slot">
      <button className="kelim-door-click-target" aria-label="Open Kelim's closet door" title="Kelim's Closet — click to inspect" onClick={(event) => { event.stopPropagation(); onInspect(); }} />
    </DungeonOverlaySlot>
    {bark && <DungeonOverlaySlot x={x} y={y} className="kelim-door-speech-slot"><span className="kelim-closet-bark">“{bark}”</span></DungeonOverlaySlot>}
  </>;
}
