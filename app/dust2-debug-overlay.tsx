"use client";
import { memo, useEffect, useRef } from "react";
import { DUST2_COLS, DUST2_ROWS, dust2Barriers, dust2HeightMap } from "./dust2-map-data";

const TILE = 52;
const ELEVATION_LABELS = (() => {
  const visited = new Set<string>();
  const labels: { x:number; y:number; height:number; bridge?:boolean }[] = [];
  dust2HeightMap.forEach((row, y) => row.forEach((height, x) => {
    const startKey = `${x},${y}`;
    if (!height || visited.has(startKey)) return;
    const region: { x:number; y:number }[] = [], pending = [{ x, y }];
    visited.add(startKey);
    while (pending.length) {
      const point = pending.pop()!;
      region.push(point);
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
        const nx = point.x + dx, ny = point.y + dy, nextKey = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= DUST2_COLS || ny >= DUST2_ROWS || visited.has(nextKey) || dust2HeightMap[ny]?.[nx] !== height) return;
        visited.add(nextKey); pending.push({ x: nx, y: ny });
      });
    }
    const centerX = region.reduce((sum, point) => sum + point.x, 0) / region.length;
    const centerY = region.reduce((sum, point) => sum + point.y, 0) / region.length;
    const representative = region.reduce((best, point) =>
      Math.hypot(point.x - centerX, point.y - centerY) < Math.hypot(best.x - centerX, best.y - centerY) ? point : best, region[0]);
    labels.push({ ...representative, height, bridge: region.some((point) => point.x === 20 && (point.y === 7 || point.y === 8)) });
  }));
  return labels;
})();
const drawGeometryCanvas = (canvas: HTMLCanvasElement, draw: (context: CanvasRenderingContext2D) => void) => {
  const width = DUST2_COLS * TILE, height = DUST2_ROWS * TILE;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  draw(context);
};

const Dust2GeometryCanvas = memo(function Dust2GeometryCanvas({ walls, elevation, grid }:{ walls:boolean; elevation:boolean; grid:boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    drawGeometryCanvas(ref.current, (context) => {
      if (elevation) {
        dust2HeightMap.forEach((row, y) => row.forEach((height, x) => {
          if (!height) return;
          context.fillStyle = height > 0 ? "#ffd44b20" : "#46b8ff2b";
          context.fillRect(x * TILE, y * TILE, TILE, TILE);
        }));
        context.strokeStyle = "#090a08e8";
        context.lineWidth = 3;
        context.font = "700 8px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        ELEVATION_LABELS.forEach(({ x, y, height, bridge }) => {
          context.fillStyle = height > 0 ? "#fff3bd" : "#bfe8ff";
          const label = bridge ? "+10 deck / 0 under" : `${height > 0 ? "+" : ""}${height} ft`;
          const cx = (x + .5) * TILE, cy = (y + .5) * TILE;
          context.strokeText(label, cx, cy); context.fillText(label, cx, cy);
        });
      }
      if (walls) dust2Barriers.forEach((barrier) => {
        if (barrier.open) context.setLineDash([6, 4]);
        else if (barrier.kind === "terrain-wall") context.setLineDash([2, 3]);
        else context.setLineDash([]);
        context.strokeStyle = barrier.open || barrier.kind === "terrain-wall" ? "#72ff8a" : barrier.bottomFt !== undefined || barrier.topFt !== undefined ? "#55e9ff" : "#ff39d4";
        context.lineWidth = 1.5;
        context.beginPath(); context.moveTo(barrier.a.x * TILE, barrier.a.y * TILE); context.lineTo(barrier.b.x * TILE, barrier.b.y * TILE); context.stroke();
      });
      context.setLineDash([]);
      if (grid) {
        const width = DUST2_COLS * TILE, height = DUST2_ROWS * TILE;
        context.strokeStyle = "#8ffcff52"; context.lineWidth = 1;
        context.beginPath();
        for (let x = 0; x <= DUST2_COLS; x += 1) { const px = x === DUST2_COLS ? width - .5 : x * TILE + .5; context.moveTo(px, .5); context.lineTo(px, height - .5); }
        for (let y = 0; y <= DUST2_ROWS; y += 1) { const py = y === DUST2_ROWS ? height - .5 : y * TILE + .5; context.moveTo(.5, py); context.lineTo(width - .5, py); }
        context.stroke();
      }
    });
  }, [walls, elevation, grid]);
  return <canvas ref={ref} className="dust2-geometry-canvas" aria-hidden="true" />;
});

export default function Dust2DebugOverlay({ debug = true, walls = false, elevation = true, grid = true }:{ debug?:boolean; walls?:boolean; elevation?:boolean; grid?:boolean }) {
  if (!debug) return null;
  return <div className="dust2-debug-overlay"><Dust2GeometryCanvas walls={walls} elevation={elevation} grid={grid} /></div>;
}
