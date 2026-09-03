"use client";
import { useLayoutEffect, useRef } from "react";

export type EditorVisionLayer = {
  polygon:{ x:number; y:number }[];
  visible:Uint8Array;
  samples:Uint8Array;
  sampleResolution:number;
};

const tracePolygon = (context:CanvasRenderingContext2D, polygon:EditorVisionLayer["polygon"], tileSize:number) => {
  if (polygon.length < 3) return false;
  context.beginPath();
  context.moveTo(polygon[0].x * tileSize, polygon[0].y * tileSize);
  polygon.slice(1).forEach((point) => context.lineTo(point.x * tileSize, point.y * tileSize));
  context.closePath();
  return true;
};

const paintLayer = (canvas:HTMLCanvasElement, layer:EditorVisionLayer, width:number, height:number, tileSize:number) => {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  if (!tracePolygon(context, layer.polygon, tileSize)) { context.restore(); return; }
  context.clip();
  context.fillStyle = "#fff";
  const sampleSize = tileSize / layer.sampleResolution, sampleWidth = width * layer.sampleResolution;
  for (let sampleY = 0; sampleY < height * layer.sampleResolution; sampleY += 1) {
    let sampleX = 0;
    while (sampleX < sampleWidth) {
      while (sampleX < sampleWidth && !layer.samples[sampleY * sampleWidth + sampleX]) sampleX += 1;
      const start = sampleX;
      while (sampleX < sampleWidth && layer.samples[sampleY * sampleWidth + sampleX]) sampleX += 1;
      if (start < sampleX) context.fillRect(start * sampleSize, sampleY * sampleSize, (sampleX - start) * sampleSize + .75, sampleSize + .75);
    }
  }
  context.restore();
};

export default function MapEditorVisionOverlay({
  layer,
  width,
  height,
  tileSize,
}:{
  layer:EditorVisionLayer;
  width:number;
  height:number;
  tileSize:number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const memoryRef = useRef<{key:string;current:HTMLCanvasElement;seen:HTMLCanvasElement}|null>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const pixelWidth = width * tileSize, pixelHeight = height * tileSize;
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    const memoryKey = `${width}x${height}@${layer.sampleResolution}`;
    let memory = memoryRef.current;
    if (!memory || memory.key !== memoryKey) {
      memory = { key:memoryKey, current:document.createElement("canvas"), seen:document.createElement("canvas") };
      memoryRef.current = memory;
    }
    for (const surface of [memory.current, memory.seen]) {
      if (surface.width !== pixelWidth) surface.width = pixelWidth;
      if (surface.height !== pixelHeight) surface.height = pixelHeight;
    }
    paintLayer(memory.current, layer, width, height, tileSize);
    memory.seen.getContext("2d")?.drawImage(memory.current, 0, 0);
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.fillStyle = "#000";
    context.fillRect(0, 0, pixelWidth, pixelHeight);
    context.globalCompositeOperation = "destination-out";
    context.globalAlpha = .18;
    context.drawImage(memory.seen, 0, 0);
    context.globalAlpha = 1;
    context.drawImage(memory.current, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }, [height, layer, tileSize, width]);
  return <canvas ref={ref} aria-hidden="true" style={{position:"absolute",inset:0,zIndex:10,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}
