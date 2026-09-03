import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceDist = path.resolve(projectRoot, process.argv[2] || "dist");
const deployDist = path.resolve(projectRoot, process.argv[3] || "publish-ready/dist");
const deployRoot = path.dirname(deployDist);
const publicDir = path.join(projectRoot, "public");
const clientDir = path.join(deployDist, "client");
const sourceExtensions = /\.(?:css|ts|tsx)$/;
const assetReference = /["'`](\/[^"'`?]+\.(?:gif|jpe?g|mp3|ogg|png|svg|wav|webp))["'`)]/gi;

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else files.push(entryPath);
  }
  return files;
};

const sourceFiles = (await walk(path.join(projectRoot, "app"))).filter((file) => sourceExtensions.test(file));
const referencedAssets = new Set();
for (const sourceFile of sourceFiles) {
  const source = await readFile(sourceFile, "utf8");
  for (const match of source.matchAll(assetReference)) {
    const asset = match[1].slice(1);
    if (!asset.includes("${")) referencedAssets.add(asset);
  }
}

const publicFiles = await walk(publicDir);
const publicAssets = new Set(publicFiles.map((file) => path.relative(publicDir, file)));
const missingAssets = [...referencedAssets].filter((asset) => !publicAssets.has(asset));
if (missingAssets.length) {
  throw new Error(`Source references missing public assets:\n${missingAssets.sort().join("\n")}`);
}

// Equipment and effect URLs are assembled from validated registry values at runtime.
// Keep those families in addition to assets named literally in the source.
const equipmentSprite = /^(?:walker|lark|gromm|rowan|alric|veyra|shade|cinder|tenzin|garran|ash|vesper)(?:-(?:ballcap|wifebeater|lightsaber|awp|deagle))*-sprites\.png$/;
const isDynamicRuntimeAsset = (asset) =>
  equipmentSprite.test(asset) ||
  /(?:^|\/)vfx-[^/]+\.[^.]+$/.test(asset) ||
  asset.startsWith("audio/");

await rm(deployRoot, { recursive: true, force: true });
await mkdir(deployRoot, { recursive: true });
await cp(sourceDist, deployDist, { recursive: true });
await mkdir(path.join(deployRoot, ".openai"), { recursive: true });
await cp(path.join(projectRoot, ".openai", "hosting.json"), path.join(deployRoot, ".openai", "hosting.json"));

let removedBytes = 0;
let removedFiles = 0;
for (const sourceAsset of publicFiles) {
  const asset = path.relative(publicDir, sourceAsset);
  if (referencedAssets.has(asset) || isDynamicRuntimeAsset(asset)) continue;
  const stagedAsset = path.join(clientDir, asset);
  removedBytes += (await stat(stagedAsset)).size;
  removedFiles += 1;
  await rm(stagedAsset);
}

const stagedFiles = await walk(deployDist);
const stagedBytes = (await Promise.all(stagedFiles.map(async (file) => (await stat(file)).size)))
  .reduce((total, size) => total + size, 0);
const mib = (bytes) => (bytes / 1024 / 1024).toFixed(1);

console.log(`Prepared complete deploy artifact: ${path.relative(projectRoot, deployDist)}`);
console.log(`Removed ${removedFiles} unreferenced legacy assets (${mib(removedBytes)} MiB).`);
console.log(`Deploy artifact size: ${mib(stagedBytes)} MiB.`);
