import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPlayerVisionMask,
  combinePlayerVisionMasks,
  gridSegmentBlocksSight,
  mergeExploredMask,
  playerVisionTileState,
  terrainHorizonBlocksSight,
} from "../app/player-vision-runtime.ts";
import { crossesDust2SightLine as exactDust2SightBlocked, DUST2_UNDERPASS_SURFACE } from "../app/dust2-visibility-runtime.ts";
import { dust2PreferredPositionAt } from "../app/dust2-traversal.ts";
import { battlefieldSightBlocked, buildVillageSightCrossings, mapEdgeCrossingKey } from "../app/battlefield-vision-runtime.ts";

test("Player View separates live sight from persistent exploration memory", () => {
  const observer = { id: "koko", x: 1, y: 1, elevationFt: 0 };
  const first = buildPlayerVisionMask({
    width: 4,
    height: 3,
    observer,
    rangeSquares: null,
    blocksSight: (_from, to) => to.x >= 3,
  });
  assert.equal(first[1 * 4 + 1], 1, "the observer always sees its own square");
  assert.equal(first[1 * 4 + 2], 1);
  assert.equal(first[1 * 4 + 3], 0);
  const explored = mergeExploredMask(new Uint8Array(12), first);
  const second = buildPlayerVisionMask({
    width: 4,
    height: 3,
    observer: { ...observer, x: 0 },
    rangeSquares: 1,
    blocksSight: () => false,
  });
  assert.equal(playerVisionTileState(1 * 4 + 2, second, explored), "explored");
  assert.equal(playerVisionTileState(1 * 4 + 3, second, explored), "unexplored");
  assert.equal(playerVisionTileState(1 * 4, second, explored), "visible-now");
});

test("party vision is the union of cached per-observer masks and obeys range", () => {
  const left = buildPlayerVisionMask({ width: 5, height: 1, observer: { id: "left", x: 0, y: 0 }, rangeSquares: 1, blocksSight: () => false });
  const right = buildPlayerVisionMask({ width: 5, height: 1, observer: { id: "right", x: 4, y: 0 }, rangeSquares: 1, blocksSight: () => false });
  assert.deepEqual([...combinePlayerVisionMasks(5, [left, right])], [1, 1, 0, 1, 1]);
  assert.equal(mergeExploredMask(left, left), left, "an unchanged memory mask keeps object identity");
});

test("literal-foot terrain horizons hide low observers but allow a near-edge peek", () => {
  const heights = [[0], [2], [1], [-10]];
  const elevationAt = (point) => point.elevationFt ?? heights[point.y][point.x];
  const terrainBlocksRayAt = (x, y, rayZ) => rayZ <= heights[y][x] + .01;
  const pit = { x: 0, y: 3, elevationFt: -10 };
  assert.equal(terrainHorizonBlocksSight({ from: pit, to: { x: 0, y: 2, elevationFt: 1 }, elevationAt, terrainBlocksRayAt }), false, "the lip itself remains visible for peeking");
  assert.equal(terrainHorizonBlocksSight({ from: pit, to: { x: 0, y: 1, elevationFt: 2 }, elevationAt, terrainBlocksRayAt }), true, "the lip hides terrain beyond it from the pit");
  assert.equal(terrainHorizonBlocksSight({ from: { x: 0, y: 1, elevationFt: 2 }, to: pit, elevationAt, terrainBlocksRayAt }), true, "terrain occlusion is direction-symmetric");
});

test("ordinary downhill lanes remain visible without exposing negative hiding pits", () => {
  const gradualHeights = [[15], [10], [5], [0]];
  const gradualElevationAt = (point) => point.elevationFt ?? gradualHeights[point.y][point.x];
  const gradualBlocksRayAt = (x, y, rayZ) => rayZ <= gradualHeights[y][x] + .01;
  assert.equal(terrainHorizonBlocksSight({
    from: { x: 0, y: 0, elevationFt: 15 },
    to: { x: 0, y: 3, elevationFt: 0 },
    elevationAt: gradualElevationAt,
    terrainBlocksRayAt: gradualBlocksRayAt,
  }), false, "five-foot downhill steps do not become opaque terrain walls");

  const steepHeights = [[10], [10], [0]];
  const steepElevationAt = (point) => point.elevationFt ?? steepHeights[point.y][point.x];
  const steepBlocksRayAt = (x, y, rayZ) => rayZ <= steepHeights[y][x] + .01;
  assert.equal(terrainHorizonBlocksSight({
    from: { x: 0, y: 0, elevationFt: 10 },
    to: { x: 0, y: 2, elevationFt: 0 },
    elevationAt: steepElevationAt,
    terrainBlocksRayAt: steepBlocksRayAt,
  }), false, "a positive-height ledge does not black out the open floor below it");

  for (const interveningHeight of [10, 15]) {
    const buildingHeights = [[10], [0], [interveningHeight], [0]];
    const buildingElevationAt = (point) => point.elevationFt ?? buildingHeights[point.y][point.x];
    const buildingBlocksRayAt = (x, y, rayZ) => rayZ <= buildingHeights[y][x] + .01;
    assert.equal(terrainHorizonBlocksSight({
      from: { x: 0, y: 0, elevationFt: 10 },
      to: { x: 0, y: 3, elevationFt: 0 },
      elevationAt: buildingElevationAt,
      terrainBlocksRayAt: buildingBlocksRayAt,
    }), true, `a later ${interveningHeight}-foot building still blocks the downhill target`);
  }

  const hidingPitHeights = [[10], [10], [-10]];
  const hidingPitElevationAt = (point) => point.elevationFt ?? hidingPitHeights[point.y][point.x];
  const hidingPitBlocksRayAt = (x, y, rayZ) => rayZ <= hidingPitHeights[y][x] + .01;
  assert.equal(terrainHorizonBlocksSight({
    from: { x: 0, y: 0, elevationFt: 10 },
    to: { x: 0, y: 2, elevationFt: -10 },
    elevationAt: hidingPitElevationAt,
    terrainBlocksRayAt: hidingPitBlocksRayAt,
  }), true, "a deliberately negative hiding pit stays concealed behind its lip");
});

test("diagonal terrain sight only closes when both corner columns occlude", () => {
  const from = { x: 0, y: 0 }, to = { x: 2, y: 2 };
  assert.equal(gridSegmentBlocksSight(from, to, (tile) => tile.x === 1 && tile.y === 0), false, "one corner-touch square cannot create a dark diagonal wedge");
  assert.equal(gridSegmentBlocksSight(from, to, (tile) => (tile.x === 1 && tile.y === 0) || (tile.x === 0 && tile.y === 1)), true, "both side columns close a diagonal pinch");
});

test("exact-position sight keeps the Dust 2 bridge deck separate from its underpass", () => {
  const underWest = { x: 20, y: 7, surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 };
  const underEast = { x: 20, y: 8, surfaceId: DUST2_UNDERPASS_SURFACE, elevationFt: 0 };
  const deck = { x: 20, y: 7, elevationFt: 10 };
  assert.equal(exactDust2SightBlocked(underWest, deck), true, "an underpass observer cannot see an actor on the deck at the same x/y");
  assert.equal(exactDust2SightBlocked(underWest, { x: 20, y: 8, elevationFt: 10 }), true, "the bridge slab blocks diagonal deck sight through a neighboring underpass cell");
  assert.equal(exactDust2SightBlocked(underWest, underEast), false, "the authored underpass portal keeps its own lane visible");
  assert.equal(exactDust2SightBlocked(underWest, { x: 19, y: 7, elevationFt: 0 }), false, "the west portal remains visible at ground level");
  const underpassMask = buildPlayerVisionMask({ width: 33, height: 33, observer: { id: "under", ...underWest }, rangeSquares: 1, blocksSight: exactDust2SightBlocked, positionAt: dust2PreferredPositionAt });
  assert.equal(underpassMask[8 * 33 + 20], 1, "the 2D fog mask resolves the adjacent authored underpass surface instead of the deck");
});

test("the shared battlefield sight profile keeps ordinary descents open and negative pits hidden", () => {
  const gradual = {
    id:"woodland", cols:1, rows:4, terrain:[["floor"],["floor"],["floor"],["floor"]],
    elevationFt:[[15],[10],[5],[0]], facade:null, exactFootElevation:true, blocked:new Set(),
  };
  assert.equal(battlefieldSightBlocked({
    battlefield:gradual,
    from:{ id:"high", x:0, y:0, elevationFt:15 },
    to:{ x:0, y:3, elevationFt:0 },
  }), false, "the generic engine must not black out the bottom of a normal downhill lane");
  const pit = { ...gradual, rows:3, elevationFt:[[10],[10],[-10]], terrain:[["floor"],["floor"],["floor"]] };
  assert.equal(battlefieldSightBlocked({
    battlefield:pit,
    from:{ id:"ledge", x:0, y:0, elevationFt:10 },
    to:{ x:0, y:2, elevationFt:-10 },
  }), true, "a ten-foot hiding pit remains occluded until the observer reaches its edge");
});

test("Dust 2 high ground at W7 sees the ordinary zero-foot lane below", () => {
  assert.equal(exactDust2SightBlocked(
    { x:22, y:6, elevationFt:15 },
    { x:22, y:9, elevationFt:0 },
  ), false);
});

test("intact village doors and windows join the same sight-crossing registry as movement", () => {
  const edgeKey = "1,1,n", wallEdgeKeys = new Set(), entranceEdgeKeys = new Set([edgeKey]);
  const open = buildVillageSightCrossings({ wallEdgeKeys, entranceEdgeKeys, barriers:[] });
  const closed = buildVillageSightCrossings({ wallEdgeKeys, entranceEdgeKeys, barriers:[{ id:"test-door", name:"door", x:1, y:1, hp:10, maxHp:10, kind:"door", edgeKey }] });
  assert.equal(open.has(mapEdgeCrossingKey(edgeKey)), false);
  assert.equal(closed.has(mapEdgeCrossingKey(edgeKey)), true);
});
