import assert from "node:assert/strict";
import test from "node:test";

import {
  battlefieldOpaqueTiles,
  buildVillageSightCrossings,
  createBattlefieldVisionKernel,
} from "../app/battlefield-vision-runtime.ts";
import { DUST2_COLS, DUST2_ROWS, dust2HeightMap, dust2TerrainMap } from "../app/dust2-map-data.ts";
import { createVisionKernel, pointInVisionPolygon } from "../app/vision-kernel.ts";

const flatKernel = ({
  width = 6,
  height = 5,
  barriers = [],
  opaqueTiles = new Set(),
  visionOpaqueTiles = new Set(),
} = {}) => createVisionKernel({
  width,
  height,
  barriers,
  opaqueTiles,
  visionOpaqueTiles,
  positionAt: (observer, x, y) => ({ x, y, elevationFt:observer.elevationFt ?? 0 }),
  elevationAt: (point) => point.elevationFt ?? 0,
  sampleResolution: 8,
});

const layerShowsPoint = (layer, point, width) => {
  if (!pointInVisionPolygon(point, layer.polygon)) return false;
  const tileX = Math.floor(point.x), tileY = Math.floor(point.y);
  const sampleX = Math.max(0, Math.min(layer.sampleResolution - 1, Math.floor((point.x - tileX) * layer.sampleResolution)));
  const sampleY = Math.max(0, Math.min(layer.sampleResolution - 1, Math.floor((point.y - tileY) * layer.sampleResolution)));
  const sampleWidth = width * layer.sampleResolution;
  return !!layer.samples[(tileY * layer.sampleResolution + sampleY) * sampleWidth + tileX * layer.sampleResolution + sampleX];
};

const syntheticBattlefield = ({ id, terrain, elevationFt, blocked = new Set() }) => ({
  id,
  cols:terrain[0]?.length || 0,
  rows:terrain.length,
  terrain,
  elevationFt,
  facade:null,
  exactFootElevation:true,
  blocked,
});

test("ordinary walls cast true angular shadows through partial grid squares", () => {
  const kernel = flatKernel({
    barriers:[{
      id:"ordinary-wall",
      kind:"wall",
      a:{ x:2, y:1 },
      b:{ x:2, y:3 },
    }],
  });
  const observer = { id:"ranger", x:0, y:2, elevationFt:0 };
  const layer = kernel.layerFor(observer, null);

  assert.equal(kernel.blocksSight(observer, { x:4, y:2, elevationFt:0 }), true, "the wall blocks the square centered directly behind it");
  assert.equal(layerShowsPoint(layer, { x:2.25, y:.25 }, 6), true, "the open angle above the endpoint remains visible");
  assert.equal(layerShowsPoint(layer, { x:2.25, y:.875 }, 6), false, "the shadowed portion of that same square remains dark");
});

test("flat-map samples leave exact angular clipping to the visibility polygon", () => {
  const width = 7, height = 6;
  const kernel = flatKernel({
    width,
    height,
    barriers:[
      { id:"angle", kind:"wall", a:{ x:2.1, y:.4 }, b:{ x:3.8, y:3.2 } },
      { id:"vertical", kind:"wall", a:{ x:5, y:2 }, b:{ x:5, y:5.6 } },
    ],
  });
  const layer = kernel.layerFor({ id:"scanline", x:1, y:4, elevationFt:0 }, null);
  const sampleWidth = width * layer.sampleResolution;
  for (let sampleY = 0; sampleY < height * layer.sampleResolution; sampleY += 1)
    for (let sampleX = 0; sampleX < sampleWidth; sampleX += 1) {
      const point = {
        x:(sampleX + .5) / layer.sampleResolution,
        y:(sampleY + .5) / layer.sampleResolution,
      };
      assert.equal(layer.samples[sampleY * sampleWidth + sampleX], 1, "flat maps should not re-rasterize the polygon into coarse samples");
      assert.equal(layerShowsPoint(layer, point, width), pointInVisionPolygon(point, layer.polygon), "the exact polygon remains authoritative");
    }
});

test("finite wall height blocks low eyes without clipping legitimate high-ground sight", () => {
  const kernel = flatKernel({
    barriers:[{
      id:"ten-foot-parapet",
      kind:"wall",
      a:{ x:2, y:0 },
      b:{ x:2, y:5 },
      bottomFt:0,
      topFt:10,
    }],
  });
  const low = { id:"low", x:0, y:2, elevationFt:0 };
  const high = { id:"high", x:0, y:2, elevationFt:10 };

  assert.equal(kernel.blocksSight(low, { x:4, y:2, elevationFt:0 }), true);
  assert.equal(kernel.blocksSight(high, { x:4, y:2, elevationFt:10 }), false);
  assert.equal(layerShowsPoint(kernel.layerFor(high, null), { x:4.5, y:2.5 }, 6), true, "the sampled fog renderer agrees with the high-ground rules ray");
  const lowLayer = kernel.layerFor(low, null);
  assert.equal(pointInVisionPolygon({ x:4.5, y:2.5 }, lowLayer.polygon), false, "an eye-height finite wall casts a smooth polygon shadow");
  assert.equal(lowLayer.samples.every((sample) => sample === 1), true, "finite walls do not reappear as square sample shadows");
});

test("near-touching imported wall endpoints seal microscopic light leaks", () => {
  const kernel = flatKernel({
    width:6,
    height:5,
    barriers:[
      { id:"upper", kind:"wall", a:{ x:3, y:0 }, b:{ x:3, y:2.47 } },
      { id:"lower", kind:"wall", a:{ x:3, y:2.53 }, b:{ x:3, y:5 } },
    ],
  });
  const layer = kernel.layerFor({ id:"leak-check", x:1, y:2, elevationFt:0 }, null);
  assert.equal(layerShowsPoint(layer, { x:5.5, y:2.5 }, 6), false);
});

test("thirty-foot high ground sees across lower positive floors without radial terrain teeth", () => {
  const heights = [[30], [22], [20], [10], [0]];
  const kernel = createVisionKernel({
    width:1,
    height:5,
    barriers:[],
    opaqueTiles:new Set(),
    visionOpaqueTiles:new Set(),
    positionAt:(_observer, x, y) => ({ x, y, elevationFt:heights[y][x] }),
    elevationAt:(point) => point.elevationFt ?? heights[point.y][point.x],
    terrainIntervalsAt:(x, y) => [[Number.NEGATIVE_INFINITY, heights[y][x] + .01]],
    sampleResolution:6,
  });
  const observer = { id:"high-ground", x:0, y:0, elevationFt:30 };
  const street = { x:0, y:4, elevationFt:0 };
  assert.equal(kernel.blocksSight(observer, street), false);
  assert.equal(layerShowsPoint(kernel.layerFor(observer, null), { x:.5, y:4.5 }, 1), true);
});

test("Dust 2 exposes ordinary minus-five floors while preserving the minus-ten hiding trench", () => {
  const heights = [[10], [10], [-5], [-10]];
  const kernel = createVisionKernel({
    width:1,
    height:4,
    barriers:[],
    opaqueTiles:new Set(),
    visionOpaqueTiles:new Set(),
    positionAt:(_observer, x, y) => ({ x, y, elevationFt:heights[y][x] }),
    elevationAt:(point) => point.elevationFt ?? heights[point.y][point.x],
    terrainIntervalsAt:(x, y) => [[Number.NEGATIVE_INFINITY, heights[y][x] + .01]],
    openDownhillMinimumFt:-5,
    sampleResolution:6,
  });
  const observer = { id:"ledge", x:0, y:0, elevationFt:10 };
  assert.equal(kernel.blocksSight(observer, { x:0, y:2, elevationFt:-5 }), false);
  assert.equal(kernel.blocksSight(observer, { x:0, y:3, elevationFt:-10 }), true);
});

test("ordinary raised Dust 2 floors do not cast square elevation shadows", () => {
  const heights = [[10], [15], [20], [30]];
  const kernel = createVisionKernel({
    width:1,
    height:4,
    barriers:[],
    opaqueTiles:new Set(),
    visionOpaqueTiles:new Set(),
    positionAt:(_observer, x, y) => ({ x, y, elevationFt:heights[y][x] }),
    elevationAt:(point) => point.elevationFt ?? heights[point.y][point.x],
    terrainIntervalsAt:(x, y) => [[Number.NEGATIVE_INFINITY, heights[y][x] + .01]],
    openDownhillMinimumFt:-5,
    sampleResolution:6,
  });
  const observer = { id:"lower-walkway", x:0, y:0, elevationFt:10 };
  assert.equal(kernel.blocksSight(observer, { x:0, y:3, elevationFt:30 }), false);
  assert.equal(layerShowsPoint(kernel.layerFor(observer, null), { x:.5, y:3.5 }, 1), true);
});

test("village wall, door, and window edges share one open-or-closed sight contract", () => {
  const elevationFt = Array.from({ length:5 }, () => Array(7).fill(0));
  const terrain = Array.from({ length:5 }, () => Array(7).fill("floor"));
  const battlefield = syntheticBattlefield({ id:"village", terrain, elevationFt });
  const wallEdgeKeys = new Set(["1,2,n"]);
  const entranceEdgeKeys = new Set(["3,2,n", "5,2,n"]);
  const intact = [
    { id:"door", name:"door", kind:"door", x:3, y:2, hp:10, maxHp:10, edgeKey:"3,2,n" },
    { id:"window", name:"window", kind:"window", x:5, y:2, hp:10, maxHp:10, edgeKey:"5,2,n" },
  ];
  const closedCrossings = buildVillageSightCrossings({ wallEdgeKeys, entranceEdgeKeys, barriers:intact });
  const closedKernel = createBattlefieldVisionKernel({ battlefield, blockedCrossings:closedCrossings });
  for (const x of [1, 3, 5])
    assert.equal(closedKernel.blocksSight({ id:`north-${x}`, x, y:1 }, { x, y:3 }), true, `closed edge ${x} blocks sight`);

  const openedCrossings = buildVillageSightCrossings({
    wallEdgeKeys,
    entranceEdgeKeys,
    barriers:intact.map((barrier) => ({ ...barrier, hp:0 })),
  });
  const openedKernel = createBattlefieldVisionKernel({ battlefield, blockedCrossings:openedCrossings });
  assert.equal(openedKernel.blocksSight({ id:"wall", x:1, y:1 }, { x:1, y:3 }), true, "the permanent wall remains opaque");
  assert.equal(openedKernel.blocksSight({ id:"door", x:3, y:1 }, { x:3, y:3 }), false, "a destroyed door opens sight");
  assert.equal(openedKernel.blocksSight({ id:"window", x:5, y:1 }, { x:5, y:3 }), false, "a destroyed window opens sight");
});

test("bridge ravine is non-walkable space, not an opaque full-height vision wall", () => {
  const terrain = [["bridge", "ravine", "ravine", "bridge"]];
  const elevationFt = [[0, -20, -20, 0]];
  const blocked = new Set(["1,0", "2,0"]);
  const battlefield = syntheticBattlefield({ id:"bridge", terrain, elevationFt, blocked });
  const opaque = battlefieldOpaqueTiles(battlefield, blocked);
  assert.equal(opaque.has("1,0"), false);
  assert.equal(opaque.has("2,0"), false);

  const kernel = createBattlefieldVisionKernel({ battlefield, blocked });
  assert.equal(kernel.blocksSight(
    { id:"west", x:0, y:0, elevationFt:0 },
    { x:3, y:0, elevationFt:0 },
  ), false);
});

test("dungeon void walls and closed secret crossings both occlude, while an opened secret corridor reveals", () => {
  const terrain = [
    ["floor", "void", "floor", "floor"],
    ["floor", "floor", "floor", "floor"],
    ["floor", "floor", "floor", "floor"],
  ];
  const elevationFt = Array.from({ length:3 }, () => Array(4).fill(0));
  const blocked = new Set(["1,0"]);
  const battlefield = syntheticBattlefield({ id:"dungeon", terrain, elevationFt, blocked });
  const closedKernel = createBattlefieldVisionKernel({
    battlefield,
    blocked,
    blockedCrossings:new Set(["0,2|1,2"]),
  });
  assert.equal(closedKernel.blocksSight({ id:"hall", x:0, y:0 }, { x:2, y:0 }), true, "ordinary dungeon void blocks the continuing ray");
  assert.equal(closedKernel.blocksSight({ id:"secret", x:0, y:2 }, { x:2, y:2 }), true, "a closed secret crossing behaves like a real wall");

  const openedKernel = createBattlefieldVisionKernel({ battlefield, blocked, blockedCrossings:new Set() });
  assert.equal(openedKernel.blocksSight({ id:"secret", x:0, y:2 }, { x:2, y:2 }), false, "opening the secret panel opens the corridor's view");
});

test("the shared battlefield kernel preserves Dust 2 high-to-low sight at W7", () => {
  const battlefield = syntheticBattlefield({ id:"dust2", terrain:dust2TerrainMap, elevationFt:dust2HeightMap });
  assert.equal(battlefield.cols, DUST2_COLS);
  assert.equal(battlefield.rows, DUST2_ROWS);
  const kernel = createBattlefieldVisionKernel({ battlefield });
  assert.equal(kernel.blocksSight(
    { id:"W7", x:22, y:6, elevationFt:15 },
    { x:22, y:9, elevationFt:0 },
  ), false);
});

test("opaque spell zones form a joined perimeter and cast an angular shadow immediately", () => {
  const kernel = flatKernel({
    width:6,
    height:4,
    visionOpaqueTiles:new Set(["2,1", "3,1"]),
  });
  const observer = { id:"caster", x:0, y:1, elevationFt:0 };
  const layer = kernel.layerFor(observer, null);
  assert.equal(kernel.blocksSight(observer, { x:4, y:1, elevationFt:0 }), true);
  assert.equal(layerShowsPoint(layer, { x:4.5, y:1.5 }, 6), false);
  assert.equal(layerShowsPoint(layer, { x:4.5, y:.0625 }, 6), true, "the view outside the zone's real endpoint angle stays open");
});

test("each observer layer keeps its angular polygon paired with its elevation mask", () => {
  const openKernel = flatKernel({ width:5, height:4 });
  const blockedKernel = flatKernel({
    width:5,
    height:4,
    barriers:[{ id:"wall", kind:"wall", a:{ x:2, y:0 }, b:{ x:2, y:4 }, bottomFt:0, topFt:10 }],
  });
  const observer = { id:"observer", x:0, y:1, elevationFt:0 };
  const openLayer = openKernel.layerFor(observer, null);
  const blockedLayer = blockedKernel.layerFor(observer, null);
  const point = { x:4.5, y:1.5 };

  assert.equal(layerShowsPoint(openLayer, point, 5), true, "an unobstructed observer sees the point");
  assert.equal(layerShowsPoint(blockedLayer, point, 5), false, "the finite-height barrier is retained in that observer's elevation mask");
  assert.equal(openLayer.observerId, observer.id);
  assert.equal(blockedLayer.observerId, observer.id);
  assert.notEqual(openLayer.samples, blockedLayer.samples, "observer layers own independent sample masks");
});
