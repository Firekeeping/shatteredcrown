import type { CSSProperties } from "react";
import type { AbilityZone } from "./ability-runtime";
import { WIND_WALL_MAX_FEET, segmentDistanceFeet, zoneSegment, type SegmentEndpoints, type SegmentPoint } from "./segment-spell-runtime";

type SegmentPreview = SegmentEndpoints & { valid: boolean };

const segmentStyle = (segment: SegmentEndpoints, columns: number, rows: number) => {
  const dx = segment.b.x - segment.a.x, dy = segment.b.y - segment.a.y;
  const distance = Math.hypot(dx, dy), unitX = distance ? dx / distance : 0, unitY = distance ? dy / distance : 0;
  return {
    left: `${(segment.a.x + 0.5 - unitX * 0.5) * 100 / columns}%`,
    top: `${(segment.a.y + 0.5 - unitY * 0.5) * 100 / rows}%`,
    width: `${Math.max(1, distance + 1) * 100 / columns}%`,
    height: `${135 / rows}%`,
    transform: `translateY(-50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`,
  } as CSSProperties;
};

const markerStyle = (point: { x: number; y: number }, columns: number, rows: number) => ({
  left: `${(point.x + 0.5) * 100 / columns}%`,
  top: `${(point.y + 0.5) * 100 / rows}%`,
} as CSSProperties);

export default function SegmentSpellOverlay({ zones, start, preview, columns, rows }: {
  zones: readonly AbilityZone[];
  start: SegmentPoint | null;
  preview: SegmentPreview | null;
  columns: number;
  rows: number;
}) {
  const walls = zones.flatMap((zone) => zone.name === "Wind Wall" ? [{ id: zone.id, segment: zoneSegment(zone) }] : []).filter((entry): entry is { id: string; segment: SegmentEndpoints } => !!entry.segment);
  if (!walls.length && !start) return null;
  return <div className="segment-spell-layer" aria-hidden="true">
    {walls.map(({ id, segment }) => <span key={id} className="wind-wall-segment persistent" style={segmentStyle(segment, columns, rows)} />)}
    {preview && <>
      <span className={`wind-wall-segment preview ${preview.valid ? "valid" : "invalid"}`} style={segmentStyle(preview, columns, rows)} />
      <span className="segment-endpoint point-a" style={markerStyle(preview.a, columns, rows)}>A</span>
      <span className={`segment-endpoint point-b ${preview.valid ? "valid" : "invalid"}`} style={markerStyle(preview.b, columns, rows)}>B</span>
      <span className={`segment-distance ${preview.valid ? "valid" : "invalid"}`} style={{ left: `${(preview.a.x + preview.b.x + 1) * 50 / columns}%`, top: `${(preview.a.y + preview.b.y + 1) * 50 / rows}%` }}>{segmentDistanceFeet(preview.a, preview.b)} / {WIND_WALL_MAX_FEET} FT</span>
    </>}
    {start && !preview && <><span className="segment-endpoint point-a" style={markerStyle(start, columns, rows)}>A</span><span className="segment-start-instruction" style={markerStyle(start, columns, rows)}>POINT A SET · CHOOSE POINT B</span></>}
  </div>;
}
