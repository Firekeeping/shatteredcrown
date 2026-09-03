"use client";
import { memo, useLayoutEffect, useRef } from "react";
import type { BattlefieldAngularVisionLayer, BattlefieldPlayerViewModel } from "./use-battlefield-player-view";

// The board itself is 52 pixels per five-foot square. Matching it one-for-one
// keeps free-wall angles smooth and avoids pixel-scaled, uneven grid corners.
const FOG_TILE = 52;

type AngularMemory = {
  battlefieldKey:string;
  revision:number;
  current:HTMLCanvasElement;
  seen:HTMLCanvasElement;
};

const resizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
};

const tracePolygon = (context: CanvasRenderingContext2D, polygon: { x:number; y:number }[]) => {
  if (polygon.length < 3) return false;
  context.beginPath();
  context.moveTo(polygon[0].x * FOG_TILE, polygon[0].y * FOG_TILE);
  polygon.slice(1).forEach((point) => context.lineTo(point.x * FOG_TILE, point.y * FOG_TILE));
  context.closePath();
  return true;
};

const paintSampleRuns = (context:CanvasRenderingContext2D, samples:Uint8Array, sampleWidth:number, sampleHeight:number, sampleSize:number) => {
  for (let sampleY = 0; sampleY < sampleHeight; sampleY += 1) {
    let sampleX = 0;
    while (sampleX < sampleWidth) {
      while (sampleX < sampleWidth && !samples[sampleY * sampleWidth + sampleX]) sampleX += 1;
      const start = sampleX;
      while (sampleX < sampleWidth && samples[sampleY * sampleWidth + sampleX]) sampleX += 1;
      if (start < sampleX)
        context.fillRect(start * sampleSize, sampleY * sampleSize, (sampleX - start) * sampleSize + .75, sampleSize + .75);
    }
  }
};

const paintAngularLayers = (
  canvas: HTMLCanvasElement,
  layers: readonly BattlefieldAngularVisionLayer[],
  cols: number,
  rows: number,
) => {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  layers.forEach(({ polygon, visible, samples, sampleResolution }) => {
    context.save();
    if (!tracePolygon(context, polygon)) { context.restore(); return; }
    context.clip();
    if (samples.length && sampleResolution > 1) {
      const sampleWidth = cols * sampleResolution, sampleSize = FOG_TILE / sampleResolution;
      paintSampleRuns(context, samples, sampleWidth, rows * sampleResolution, sampleSize);
    } else {
      for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1)
        if (visible[y * cols + x]) context.fillRect(x * FOG_TILE, y * FOG_TILE, FOG_TILE, FOG_TILE);
    }
    context.restore();
  });
};

const BattlefieldVisionOverlay = memo(function BattlefieldVisionOverlay({ view }:{ view:BattlefieldPlayerViewModel }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const angularMemoryRef = useRef<Map<string,AngularMemory>>(new Map());
  const { enabled, viewEnabled, visibleNow, angularVisionLayers, explored, width:cols, height:rows, visualMemoryRevision } = view;
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const width = cols * FOG_TILE, height = rows * FOG_TILE;
    resizeCanvas(canvas, width, height);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (!enabled || !viewEnabled) return;

    if (angularVisionLayers.length) {
      const battlefieldKey = view.memoryKey;
      let memory = angularMemoryRef.current.get(battlefieldKey);
      if (!memory || memory.revision !== visualMemoryRevision) {
        memory = {
          battlefieldKey,
          revision:visualMemoryRevision,
          current:document.createElement("canvas"),
          seen:document.createElement("canvas"),
        };
        angularMemoryRef.current.set(battlefieldKey, memory);
      }
      resizeCanvas(memory.current, width, height);
      resizeCanvas(memory.seen, width, height);
      paintAngularLayers(memory.current, angularVisionLayers, cols, rows);
      const seenContext = memory.seen.getContext("2d");
      if (!seenContext) return;
      seenContext.globalCompositeOperation = "source-over";
      seenContext.globalAlpha = 1;
      seenContext.drawImage(memory.current, 0, 0);

      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "destination-out";
      context.globalAlpha = .18;
      context.drawImage(memory.seen, 0, 0);
      context.globalAlpha = 1;
      context.drawImage(memory.current, 0, 0);
      context.globalCompositeOperation = "source-over";
      return;
    }

    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      const index = y * cols + x;
      if (visibleNow[index]) context.clearRect(x * FOG_TILE, y * FOG_TILE, FOG_TILE, FOG_TILE);
      else if (explored[index]) {
        context.clearRect(x * FOG_TILE, y * FOG_TILE, FOG_TILE, FOG_TILE);
        context.fillStyle = "rgba(4, 7, 9, .82)";
        context.fillRect(x * FOG_TILE, y * FOG_TILE, FOG_TILE, FOG_TILE);
        context.fillStyle = "#000";
      }
    }
  }, [angularVisionLayers, cols, enabled, explored, rows, view.battlefieldId, viewEnabled, visibleNow, visualMemoryRevision]);
  return <canvas ref={ref} className="battlefield-vision-canvas" data-angular={angularVisionLayers.length ? "true" : "false"} data-battlefield={view.battlefieldId} aria-hidden="true" />;
});

export default BattlefieldVisionOverlay;
