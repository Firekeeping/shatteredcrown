import test from "node:test";
import assert from "node:assert/strict";
import {
  barrierBlocksMovementLine,
  barrierBlocksSightLine,
  barrierBlocksSegment,
  pointToBarrierDistance,
  segmentGridCellKeys,
  segmentsIntersect,
} from "../app/barrier-geometry.ts";

test("sight-ray bucket traversal includes exact corner contacts without scanning its bounding rectangle", () => {
  const forward = new Set(segmentGridCellKeys({ x:.5, y:.5 }, { x:3.5, y:3.5 }));
  const reverse = new Set(segmentGridCellKeys({ x:3.5, y:3.5 }, { x:.5, y:.5 }));
  assert.deepEqual(forward, reverse, "candidate traversal should be direction-symmetric");
  for (const cell of ["0,0", "1,0", "0,1", "1,1", "2,1", "1,2", "2,2", "3,2", "2,3", "3,3"])
    assert.ok(forward.has(cell), `corner contact should include ${cell}`);
  assert.ok(forward.size < 16, "a diagonal ray should not scan its full rectangular bounds");
});

test("free-floating barriers block only movement segments they actually cross", () => {
  assert.equal(
    segmentsIntersect({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 }),
    true,
    "crossing diagonal segments should intersect",
  );
  assert.equal(
    segmentsIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }),
    false,
    "collinear but disjoint walls must not create invisible mud across the map",
  );
  assert.equal(
    segmentsIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }),
    true,
    "touching endpoints should remain sealed",
  );

  const barriers = [
    { id: "doorway", kind: "wall", a: { x: 1, y: 0 }, b: { x: 1, y: 2 } },
    { id: "far-wall", kind: "wall", a: { x: 5, y: 0 }, b: { x: 6, y: 0 } },
    { id: "open-door", kind: "door", open: true, a: { x: 3, y: 0 }, b: { x: 3, y: 2 } },
  ];
  assert.equal(barrierBlocksSegment(barriers, { x: .5, y: 1 }, { x: 1.5, y: 1 }), true);
  assert.equal(barrierBlocksSegment(barriers, { x: .5, y: 3 }, { x: 1.5, y: 3 }), false);
  assert.equal(barrierBlocksSegment([barriers[2]], { x: 2.5, y: 1 }, { x: 3.5, y: 1 }), false, "open doors should remain traversable");
});

test("barrier vertical ranges make Dust 2 sight lines elevation-aware", () => {
  const wall = { id: "ten-foot-wall", kind: "wall", a: { x: 1, y: 0 }, b: { x: 1, y: 2 }, bottomFt: 0, topFt: 10 };
  const infiniteRange = () => ({ bottomFt: Number.NEGATIVE_INFINITY, topFt: Number.POSITIVE_INFINITY });
  assert.equal(barrierBlocksSightLine([wall], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), true);
  assert.equal(barrierBlocksSightLine([wall], { x: 0, y: 1, zFt: 15 }, { x: 2, y: 1, zFt: 15 }, infiniteRange), false);
  assert.equal(barrierBlocksSightLine([{ ...wall, topFt: 5 }], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), false, "a ray exactly at a wall top should see over its top-exclusive height range");
  assert.equal(barrierBlocksSightLine([{ ...wall, bottomFt: 10, topFt: 20 }], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), false);
  assert.equal(barrierBlocksSightLine([{ ...wall, a: { x: 0, y: 0 }, b: { x: 3, y: 0 }, topFt: 5 }], { x: 1, y: 0, zFt: 0 }, { x: 2, y: 0, zFt: 20 }, infiniteRange), true, "a ray lying inside a longer low wall should meet it at the first overlap");
  assert.equal(barrierBlocksSightLine([{ ...wall, a: { x: 0, y: 0 }, b: { x: 3, y: 0 }, topFt: 5 }], { x: 2, y: 0, zFt: 20 }, { x: 1, y: 0, zFt: 0 }, infiniteRange), true, "collinear sight must be direction-symmetric");
  const openDoor = { ...wall, id: "open", kind: "door", open: true };
  assert.equal(barrierBlocksSightLine([openDoor], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), false, "open doors should not block sight");
  assert.equal(barrierBlocksMovementLine([openDoor], { x: 0, y: 1, zFt: 0 }, { x: 2, y: 1, zFt: 0 }), false, "open doors should not block movement");
  const terrainEdge = { ...wall, id: "cover-front", kind: "terrain-wall" };
  const terrainBack = { ...wall, id: "cover-back", kind: "terrain-wall", a: { x: 1.5, y: 0 }, b: { x: 1.5, y: 2 } };
  assert.equal(barrierBlocksSegment([terrainEdge], { x: 0, y: 1 }, { x: 2, y: 1 }), false, "terrain cover should permit entry through its visible first edge");
  assert.equal(barrierBlocksMovementLine([terrainEdge], { x: 0, y: 1, zFt: 0 }, { x: 2, y: 1, zFt: 0 }), false, "one terrain edge should remain enterable");
  assert.equal(barrierBlocksMovementLine([terrainEdge, terrainBack], { x: 0, y: 1, zFt: 0 }, { x: 2, y: 1, zFt: 0 }), false, "terrain cover should never turn a narrow grid step into sticky collision");
  assert.equal(barrierBlocksSegment([terrainEdge, terrainBack], { x: 0, y: 1 }, { x: 2, y: 1 }), false, "the unmeasured movement helper should also keep terrain cover walkable");
  assert.equal(barrierBlocksSightLine([terrainEdge], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), false, "the visible front edge of terrain cover should not hide itself");
  assert.equal(barrierBlocksSightLine([terrainEdge, terrainBack], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), true, "space behind the second terrain edge should be hidden");
  assert.equal(barrierBlocksSightLine([terrainBack, terrainEdge], { x: 2, y: 1, zFt: 5 }, { x: 0, y: 1, zFt: 5 }, infiniteRange), true, "terrain cover clustering should be direction- and array-order-independent");
  assert.equal(barrierBlocksSightLine([terrainEdge, { ...terrainBack, topFt: 5 }], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), false, "a vertically inactive second edge should not hide the target");
  const nearDuplicate = { ...terrainBack, id: "cover-near-duplicate", a: { x: 1.64, y: 0 }, b: { x: 1.64, y: 2 } };
  assert.equal(barrierBlocksSightLine([terrainBack, nearDuplicate], { x: 0, y: 1, zFt: 5 }, { x: 2, y: 1, zFt: 5 }, infiniteRange), false, "nearby duplicate outline hits should cluster as one edge");
  const chainedHits = [0, .16, .32].map((x, index) => ({ ...terrainEdge, id: `chain-${index}`, a: { x, y: 0 }, b: { x, y: 2 } }));
  assert.equal(barrierBlocksSightLine([chainedHits[1], chainedHits[0], chainedHits[2]], { x: -.5, y: 1, zFt: 5 }, { x: .5, y: 1, zFt: 5 }, infiniteRange), true, "hit clustering should sort along the ray before anchoring nearby strokes");
  assert.equal(barrierBlocksMovementLine([wall], { x: 0, y: 1, zFt: 10 }, { x: 2, y: 1, zFt: 10 }), false, "movement above a low wall should stay open");
  assert.equal(barrierBlocksMovementLine([{ ...wall, bottomFt: 10, topFt: 20 }], { x: 0, y: 1, zFt: 0 }, { x: 2, y: 1, zFt: 0 }), false, "movement below an overhead wall should stay open");
  assert.equal(barrierBlocksMovementLine([wall], { x: 0, y: 1, zFt: 0 }, { x: 2, y: 1, zFt: 0 }), true);
  const heightOnly = [{ id: "relative", kind: "wall", a: { x: 1, y: 0 }, b: { x: 1, y: 2 }, heightFt: 5 }];
  assert.equal(barrierBlocksMovementLine(heightOnly, { x: 0, y: 1, zFt: 10 }, { x: 2, y: 1, zFt: 10 }, 5, () => ({ bottomFt: 0, topFt: 5 })), false, "height-only map barriers should use the caller's terrain-relative range");
});

test("the vector eraser measures distance to the barrier body", () => {
  const barrier = { id: "wall", kind: "wall", a: { x: 1, y: 1 }, b: { x: 4, y: 1 } };
  assert.equal(pointToBarrierDistance({ x: 2, y: 2 }, barrier), 1);
  assert.equal(pointToBarrierDistance({ x: 5, y: 1 }, barrier), 1);
  assert.equal(pointToBarrierDistance({ x: 2, y: 1 }, barrier), 0);
});
