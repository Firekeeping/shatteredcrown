import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEditorPlaytestVisionKernel, editorPlaytestObserver, editorPlaytestTarget } from "../app/map-editor-playtest.ts";

const tile = (elevationFt = 0, blocksSight = false) => ({ blocked:false, blocksSight, elevationFt });
const kernelFor = ({ width, height, tiles, barriers = [], edges = [] }) =>
  createEditorPlaytestVisionKernel({ width, height, tiles, barriers, edges });

test("Level Forge sight uses the shared exact-foot terrain horizon", () => {
  const ordinary = [tile(15), tile(10), tile(5), tile(0)];
  const downhill = kernelFor({ width:1, height:4, tiles:ordinary });
  const high = editorPlaytestObserver({ point:{ x:0, y:0 }, width:1, tiles:ordinary });
  const low = editorPlaytestTarget({ point:{ x:0, y:3 }, width:1, tiles:ordinary });
  assert.equal(downhill.blocksSight(high, low), false, "a normal stepped descent stays visible in the editor just like runtime");

  const pitTiles = [tile(10), tile(10), tile(-10)];
  const pit = kernelFor({ width:1, height:3, tiles:pitTiles });
  const ledge = editorPlaytestObserver({ point:{ x:0, y:0 }, width:1, tiles:pitTiles });
  const hiddenFloor = editorPlaytestTarget({ point:{ x:0, y:2 }, width:1, tiles:pitTiles });
  assert.equal(pit.blocksSight(ledge, hiddenFloor), true, "a negative hiding area remains below the terrain horizon");
});

test("Level Forge sight preserves arbitrary vector barriers and their vertical ranges", () => {
  const tiles = [tile(), tile(), tile()];
  const diagonalWall = {
    id:"diagonal",
    kind:"wall",
    a:{ x:1.25, y:0 },
    b:{ x:1.75, y:1 },
    bottomFt:0,
    topFt:10,
  };
  const kernel = kernelFor({ width:3, height:1, tiles, barriers:[diagonalWall] });
  const observer = editorPlaytestObserver({ point:{ x:0, y:0 }, width:3, tiles });
  const target = editorPlaytestTarget({ point:{ x:2, y:0 }, width:3, tiles });
  assert.equal(kernel.blocksSight(observer, target), true, "a sub-square diagonal wall blocks a five-foot eye ray");

  const highTiles = [tile(15), tile(15), tile(15)];
  const highKernel = kernelFor({ width:3, height:1, tiles:highTiles, barriers:[diagonalWall] });
  const highObserver = editorPlaytestObserver({ point:{ x:0, y:0 }, width:3, tiles:highTiles });
  const highTarget = editorPlaytestTarget({ point:{ x:2, y:0 }, width:3, tiles:highTiles });
  assert.equal(highKernel.blocksSight(highObserver, highTarget), false, "the same ray can see over a finite-height wall");
});

test("Level Forge playtest layers expose exact masks and angular partial-square geometry", () => {
  const tiles = Array.from({ length:12 }, () => tile());
  const wall = { id:"angle", kind:"wall", a:{ x:2, y:1 }, b:{ x:3, y:2 } };
  const kernel = kernelFor({ width:4, height:3, tiles, barriers:[wall] });
  const observer = editorPlaytestObserver({ point:{ x:1, y:1 }, width:4, tiles });
  const layer = kernel.layerFor(observer, null);
  assert.equal(layer.visible.length, 12);
  assert.equal(layer.samples.length, 12 * layer.sampleResolution * layer.sampleResolution);
  assert.ok(layer.visible[observer.y * 4 + observer.x]);
  assert.ok(layer.polygon.length >= 3);
  assert.ok(layer.polygon.some((point) =>
    Math.abs(point.x - Math.round(point.x)) > .001 || Math.abs(point.y - Math.round(point.y)) > .001
  ), "the editor fog boundary keeps the authored diagonal instead of snapping to whole squares");
});

test("Level Forge opaque tiles use the same visibility layer instead of a second editor-only ray rule", () => {
  const tiles = [tile(), tile(0, true), tile()];
  const kernel = kernelFor({ width:3, height:1, tiles });
  const observer = editorPlaytestObserver({ point:{ x:0, y:0 }, width:3, tiles });
  const layer = kernel.layerFor(observer, null);
  assert.equal(layer.visible[0], 1);
  assert.equal(layer.visible[1], 1, "the face of an opaque target square stays visible");
  assert.equal(layer.visible[2], 0, "the square behind opaque geometry is hidden");
});

test("Level Forge playtest renders live sub-square sight and dim exploration memory on one canvas", async () => {
  const [editor, overlay] = await Promise.all([
    readFile(new URL("../app/MapEditor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/map-editor-vision-overlay.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(editor, /editorVisionKernel\.layerFor/);
  assert.match(editor, /editorVisionKernel\.blocksSight/);
  assert.match(editor, /MapEditorVisionOverlay layer=\{playtestVision\}/);
  assert.match(overlay, /layer\.samples/);
  assert.match(overlay, /memoryRef/);
  assert.match(overlay, /context\.fillStyle = "#000"/);
  assert.match(overlay, /tracePolygon/);
  assert.match(overlay, /context\.clip\(\)/);
  assert.match(overlay, /paintLayer\(memory\.current/);
  assert.match(overlay, /context\.drawImage\(memory\.seen/);
  assert.match(editor, /setShowBarrierLayer\(false\)/, "hidden editor geometry should stay behind Player View until explicitly enabled");
  assert.doesNotMatch(editor, /barrierBlocksSightLine/);
});
