import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("every authored map selects terrain, dimensions, facade, and literal-foot elevation through one battlefield registry", async () => {
  const engine = await readFile(new URL("../app/battlefield-engine.ts", import.meta.url), "utf8");
  const vision = await readFile(new URL("../app/use-battlefield-player-view.ts", import.meta.url), "utf8");
  const visionRuntime = await readFile(new URL("../app/battlefield-vision-runtime.ts", import.meta.url), "utf8");
  const visionOverlay = await readFile(new URL("../app/battlefield-vision-overlay.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const id of ["skirmish","woodland","ritual","village","bridge","dungeon","dust2"])
    assert.match(engine, new RegExp(`${id}: \\{ id:\"${id}\"`), `${id} must be registry-owned`);
  assert.equal((engine.match(/exactFootElevation:true/g) || []).length, 7);
  assert.match(engine, /campaignScene === 9[\s\S]*return "dust2"/);
  assert.match(engine, /campaignScene === 7[\s\S]*return "dungeon"/);
  assert.match(engine, /campaignScene === 6[\s\S]*return "bridge"/);
  assert.match(page, /battlefieldForState\(\{ campaign, campaignScene, mapVariant, trainingMap \}\)/);
  assert.match(page, /currentTerrain = battlefield\.terrain, currentHeight = battlefield\.elevationFt/);
  assert.match(page, /boardCols = battlefield\.cols, boardRows = battlefield\.rows/);
  assert.match(page, /currentBlocked = dungeonMode \? currentDungeonBlocked[\s\S]*battlefield\.blocked/);
  assert.match(page, /useBattlefieldPlayerView\(\{[\s\S]*battlefield,[\s\S]*blocked:currentBlocked,[\s\S]*blockedCrossings:currentSightCrossings/);
  assert.match(page, /<BattlefieldVisionOverlay view=\{playerView\}/);
  assert.match(page, /playerView\.visibleNow\.forEach\(\(visible, index\)/, "dungeon exploration memory should persist the shared Player View mask");
  assert.match(vision, /battlefieldBaseKey = `\$\{battlefield\.id\}:\$\{battlefield\.cols\}x\$\{battlefield\.rows\}`/);
  assert.match(vision, /effectiveScope === "selected" \? selected\?\.id : memoryNamespace/);
  assert.match(vision, /resolvedMemoryNamespace \? `\$\{battlefieldBaseKey\}:\$\{resolvedMemoryNamespace\}`/);
  assert.match(vision, /effectiveScope === "selected"/);
  assert.match(visionOverlay, /useRef<Map<string,AngularMemory>>/, "each selected character keeps separate angular exploration memory");
  assert.match(vision, /createBattlefieldVisionKernel/);
  assert.match(visionRuntime, /createVisionKernel/);
  assert.match(visionRuntime, /buildVillageSightCrossings/);
  assert.match(visionOverlay, /const ref = useRef<HTMLCanvasElement>/, "fog should remain one visible canvas instead of a DOM overlay per tile");
  assert.match(visionOverlay, /seen:document\.createElement\("canvas"\)/, "angular exploration should accumulate in an offscreen canvas without adding map DOM");
  assert.doesNotMatch(page, /blindness-veil/, "per-observer blindness must not be replaced by a board-wide active-unit veil");
  assert.doesNotMatch(page, /dust2PlayerView|useDust2PlayerView/);
  assert.doesNotMatch(page, /const trainingTerrain =|const trainingHeight =/);
});
