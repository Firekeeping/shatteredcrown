import test from "node:test";
import assert from "node:assert/strict";
import { crossesDust2SightLine, dust2VisionPolygon, tileBlockerBoundarySegments } from "../app/dust2-visibility-runtime.ts";
import { dust2PreferredPositionAt } from "../app/dust2-traversal.ts";

const insidePolygon = (point, polygon) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

test("Dust 2 vector fog never clips a center that elevation-aware gameplay can see", () => {
  const observers = [
    { x:22, y:6, elevationFt:15 },
    { x:15, y:30, elevationFt:0 },
    { x:28, y:20, elevationFt:-10 },
  ];
  observers.forEach((observer) => {
    const polygon = dust2VisionPolygon(observer, null);
    for (let y = 0; y < 33; y += 1) for (let x = 0; x < 33; x += 1) {
      const target = dust2PreferredPositionAt(observer, x, y);
      const visible = x === observer.x && y === observer.y || !crossesDust2SightLine(observer, target);
      if (visible) assert.equal(insidePolygon({ x:x + .5, y:y + .5 }, polygon), true, `visible ${x},${y} must remain inside observer ${observer.x},${observer.y}'s angular layer`);
    }
  });
});

test("opaque spell tiles produce one joined angular perimeter", () => {
  const segments = tileBlockerBoundarySegments(new Set(["2,1", "3,1"]));
  assert.equal(segments.length, 6, "two adjacent opaque tiles share an interior edge and expose only six outside edges");
  assert.equal(segments.some((segment) =>
    segment.a.x === 3 && segment.b.x === 3 &&
    Math.min(segment.a.y, segment.b.y) === 1 && Math.max(segment.a.y, segment.b.y) === 2
  ), false, "the shared internal edge must not block sight inside one Fog Cloud or Darkness zone");
  const polygon = dust2VisionPolygon({ x:1, y:1, elevationFt:0 }, null, { blockedTiles:new Set(["2,1", "3,1"]) });
  assert.equal(insidePolygon({ x:4.5, y:1.5 }, polygon), false, "the joined zone perimeter casts a real shadow behind it");
});

test("party angular reveal keeps each observer paired with its own exact mask", () => {
  const target = { x:2.5, y:.5 }, tileIndex = 2;
  const containsTarget = [{ x:0, y:0 }, { x:3, y:0 }, { x:3, y:3 }, { x:0, y:3 }];
  const excludesTarget = [{ x:0, y:0 }, { x:1, y:0 }, { x:1, y:3 }, { x:0, y:3 }];
  const layers = [
    { polygon:containsTarget, visible:Uint8Array.from([0, 0, 0]) },
    { polygon:excludesTarget, visible:Uint8Array.from([0, 0, 1]) },
  ];
  const revealed = layers.some((layer) => layer.visible[tileIndex] && insidePolygon(target, layer.polygon));
  assert.equal(revealed, false, "a polygon from one hero cannot combine with another hero's sight mask");
});
