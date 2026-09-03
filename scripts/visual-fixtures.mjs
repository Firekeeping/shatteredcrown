import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const asset = (name) => resolve(projectRoot, "public", name);
const TILE = 52;
const WIDTH = TILE * 6;
const HEIGHT = TILE * 3;

const floorTile = () => sharp(asset("dungeon-floor-cavern.webp"))
  .extract({ left: 390, top: 360, width: 280, height: 280 })
  .resize(TILE, TILE)
  .png()
  .toBuffer();

const wallSlice = (rotate = 0) => sharp(asset("dungeon-wall-atlas-v2-runtime.png"))
  .extract({ left: 0, top: 0, width: 362, height: 83 })
  .resize(TILE, 12)
  .rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const landmarkSlice = (slot) => sharp(asset("dungeon-landmarks-a.webp"))
  .extract({ left: 362 * slot, top: 0, width: 362, height: 724 })
  .resize(78, 156, { fit: "contain" })
  .png()
  .toBuffer();

const floor = async () => {
  const tile = await floorTile();
  const composites = [];
  for (let y = 0; y < HEIGHT; y += TILE)
    for (let x = 0; x < WIDTH; x += TILE) composites.push({ input: tile, left: x, top: y });
  return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#050605" } })
    .composite(composites).png().toBuffer();
};

const wallRun = async (count, y, x = 0) => {
  const wall = await wallSlice();
  return Array.from({ length: count }, (_, index) => ({ input: wall, left: x + index * TILE, top: y }));
};

const scenes = {
  async walls() {
    return sharp(await floor()).composite([
      ...await wallRun(6, 0),
      ...await wallRun(6, HEIGHT - 12),
    ]).png().toBuffer();
  },
  async fog() {
    return sharp(await floor()).composite([
      ...await wallRun(3, TILE - 12, TILE * 3),
      { input: { create: { width: TILE * 3, height: HEIGHT, channels: 4, background: "#000000" } }, left: 0, top: 0 },
      { input: { create: { width: TILE, height: TILE, channels: 4, background: "#000000" } }, left: TILE * 4, top: TILE },
    ]).png().toBuffer();
  },
  async projectors() {
    const projector = await sharp(asset("arcane-projector-original-clean-v2.png")).resize(64, 86, { fit: "contain" }).png().toBuffer();
    return sharp(await floor()).composite([
      ...await wallRun(6, HEIGHT - 12),
      { input: projector, left: 46, top: 64 },
      { input: projector, left: 202, top: 64 },
    ]).png().toBuffer();
  },
  async statues() {
    const statue = await landmarkSlice(0);
    return sharp(await floor()).composite([
      ...await wallRun(6, HEIGHT - 12),
      { input: statue, left: 39, top: 0 },
      { input: statue, left: 195, top: 0 },
    ]).png().toBuffer();
  },
  async secretDoors() {
    const closedWall = await wallRun(3, HEIGHT - 12, 0);
    const openWall = await wallRun(2, HEIGHT - 12, TILE * 3);
    return sharp(await floor()).composite([
      ...closedWall,
      ...openWall,
      { input: { create: { width: TILE, height: 12, channels: 4, background: "#000000" } }, left: TILE * 4, top: HEIGHT - 12 },
    ]).png().toBuffer();
  },
  async posters() {
    const poster = await sharp(asset("fantasy-prison-poster.png")).resize(34, 44, { fit: "contain" }).rotate(180).png().toBuffer();
    return sharp(await floor()).composite([
      ...await wallRun(3, HEIGHT - 12, TILE + TILE / 2),
      { input: poster, left: Math.round(WIDTH / 2 - 17), top: HEIGHT - 50 },
    ]).png().toBuffer();
  },
};

export const VISUAL_FIXTURE_NAMES = Object.freeze(Object.keys(scenes));
export const renderVisualFixture = (name) => {
  if (!scenes[name]) throw new Error(`Unknown visual fixture: ${name}`);
  return scenes[name]();
};

