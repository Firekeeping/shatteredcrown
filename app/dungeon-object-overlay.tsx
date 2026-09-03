import type { CSSProperties, ReactNode } from "react";
import type { DungeonPoiArt, SceneryProp } from "./visual-registry";

type OverlayProp = Pick<SceneryProp, "id" | "x" | "y" | "atlas" | "slot" | "scale" | "rotate" | "offsetX" | "offsetY" | "visualKind" | "asset" | "width" | "height" | "anchor" | "bottom" | "opacity" | "filter"> | ({ id: string; x: number; y: number } & DungeonPoiArt);

export function DungeonOverlaySlot({ x, y, offsetX = 0, offsetY = 0, className = "", children }: { x: number; y: number; offsetX?: number; offsetY?: number; className?: string; children: ReactNode }) {
  return (
    <span className={`dungeon-object-overlay ${className}`} style={{ gridColumnStart: x + 1, gridRowStart: y + 1, "--overlay-offset-x": `${offsetX}px`, "--overlay-offset-y": `${offsetY}px` } as CSSProperties}>
      {children}
    </span>
  );
}

export default function DungeonObjectOverlay({ prop, extraClass = "" }: { prop: OverlayProp; extraClass?: string }) {
  return (
    <DungeonOverlaySlot x={prop.x} y={prop.y} offsetX={prop.offsetX} offsetY={prop.offsetY}>
      <span
        className={`map-scenery-prop visual-kind-${prop.visualKind || "interactive-object"} prop-atlas-${prop.atlas} prop-slot-${prop.slot} ${prop.asset ? `prop-custom-asset prop-anchor-${prop.anchor || "center"}` : ""} ${extraClass}`}
        style={{
          "--prop-scale": prop.scale || 1,
          "--prop-rotate": `${prop.rotate || 0}deg`,
          opacity: prop.opacity,
          filter: prop.filter,
          ...(prop.asset ? {
            backgroundImage: `url("${prop.asset}")`,
            width: `${prop.width || 72}px`,
            height: `${prop.height || 144}px`,
            "--prop-bottom": `${prop.bottom || 0}px`,
          } : {}),
        } as CSSProperties}
        aria-hidden="true"
      />
    </DungeonOverlaySlot>
  );
}
