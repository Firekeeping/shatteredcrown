import type { AbilityZone } from "./ability-runtime";

const ZONE_ASSET: Readonly<Record<string, string>> = {
  "Spike Growth": "/vfx-spike-growth.webp",
  "Fog Cloud": "/vfx-fog-cloud.webp",
  "Smoke Grenade": "/vfx-fog-cloud.webp",
  Darkness: "/vfx-darkness.webp",
  "Hunger of Hadar": "/vfx-hunger-of-hadar.webp",
  "Healing Spirit": "/vfx-healing-spirit.png",
  "Wind Wall": "/vfx-wind-wall.png",
  "Plant Growth": "/vfx-plant-growth.png",
};

export const abilityZoneSliceStyle = (zone: AbilityZone, point: { x: number; y: number }) => {
  if (zone.name === "Wind Wall") return undefined; // A vector overlay renders the exact continuous segment.
  const asset = ZONE_ASSET[zone.name];
  if (!asset || !zone.tiles.length) return undefined;
  const xs = zone.tiles.map((tile) => tile.x), ys = zone.tiles.map((tile) => tile.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const width = right - left + 1, height = bottom - top + 1;
  const x = point.x - left, y = point.y - top;
  return {
    "--ability-zone-image": `url(${asset})`,
    "--ability-zone-size": `${width * 100}% ${height * 100}%`,
    "--ability-zone-position": `${width === 1 ? 50 : x * 100 / (width - 1)}% ${height === 1 ? 50 : y * 100 / (height - 1)}%`,
  };
};
