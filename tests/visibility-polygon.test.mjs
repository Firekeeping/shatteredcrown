import test from "node:test";
import assert from "node:assert/strict";
import { visibilityPolygon } from "../app/visibility-polygon.ts";

const near = (value, expected, tolerance = .002) => Math.abs(value - expected) <= tolerance;

test("ordinary walls stop rays at the first hit", () => {
  const polygon = visibilityPolygon({
    origin: { x: 1, y: 2 },
    segments: [
      { a: { x: 2, y: 0 }, b: { x: 2, y: 4 }, kind: "wall" },
      { a: { x: 3, y: 0 }, b: { x: 3, y: 4 }, kind: "wall" },
    ],
    bounds: { left: 0, top: 0, right: 4, bottom: 4 },
  });
  const eastEdge = polygon.filter((point) => point.x > 1.5);
  assert.ok(eastEdge.length > 0);
  assert.ok(eastEdge.every((point) => point.x <= 2.002), "the farther wall must never win over the first ordinary wall");
  assert.ok(eastEdge.some((point) => near(point.x, 2)));
});

test("terrain walls block only at the second distinct hit", () => {
  const oneTerrainEdge = visibilityPolygon({
    origin: { x: 1, y: 2 },
    segments: [{ a: { x: 2, y: 0 }, b: { x: 2, y: 4 }, kind: "terrain-wall" }],
    bounds: { left: 0, top: 0, right: 5, bottom: 4 },
  });
  assert.ok(near(Math.max(...oneTerrainEdge.map((point) => point.x)), 5), "one terrain outline is transparent");

  const twoTerrainEdges = visibilityPolygon({
    origin: { x: 1, y: 2 },
    segments: [
      { a: { x: 2, y: 0 }, b: { x: 2, y: 4 }, kind: "terrain-wall" },
      { a: { x: 2.1, y: 0 }, b: { x: 2.1, y: 4 }, kind: "terrain-wall" },
      { a: { x: 3, y: 0 }, b: { x: 3, y: 4 }, kind: "terrain-wall" },
    ],
    bounds: { left: 0, top: 0, right: 5, bottom: 4 },
  });
  assert.ok(near(Math.max(...twoTerrainEdges.map((point) => point.x)), 3), "nearby duplicate strokes share the first cluster and the second distinct edge blocks");
  assert.ok(Math.max(...twoTerrainEdges.map((point) => point.x)) > 2.1 + 1 / 6, "a hit within one-sixth of a square is not a second edge");
});

test("long segments are clipped to the range and bounds remain a hard boundary", () => {
  const polygon = visibilityPolygon({
    origin: { x: 1, y: 2 },
    segments: [
      { a: { x: 3, y: -100 }, b: { x: 3, y: 100 }, kind: "wall" },
      { a: { x: 10, y: -100 }, b: { x: 10, y: 100 }, kind: "wall" },
    ],
    bounds: { left: 0, top: 0, right: 4, bottom: 4 },
  });
  assert.ok(polygon.every((point) => point.x >= -.001 && point.x <= 4.001 && point.y >= -.001 && point.y <= 4.001));
  assert.ok(polygon.some((point) => near(point.x, 3) && (near(point.y, 0) || near(point.y, 4))), "clipped wall endpoints shape the polygon at the range edge");
  assert.ok(near(Math.max(...polygon.map((point) => point.x)), 3), "the in-range portion of a long wall still blocks");
});

test("visibility polygons preserve angled wall edges inside grid squares", () => {
  const polygon = visibilityPolygon({
    origin: { x: 1.5, y: 1.5 },
    segments: [{ a: { x: 2, y: 1 }, b: { x: 3, y: 2 } }],
    bounds: { left: 0, top: 0, right: 4, bottom: 4 },
  });
  assert.ok(polygon.length >= 12);
  assert.ok(
    polygon.some((point) => Math.abs(point.x - Math.round(point.x)) > .001 || Math.abs(point.y - Math.round(point.y)) > .001),
    "rays must terminate at real sub-square intersections",
  );
  assert.ok(
    polygon.some((point) => point.x > 1.99 && point.x < 3.01 && point.y > .99 && point.y < 2.01),
    "the angled blocker must shape the polygon",
  );
});
