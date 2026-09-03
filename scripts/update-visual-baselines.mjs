import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { VISUAL_FIXTURE_NAMES, renderVisualFixture } from "./visual-fixtures.mjs";

const outputDir = resolve(fileURLToPath(new URL("../tests/visual-baselines", import.meta.url)));
await mkdir(outputDir, { recursive: true });
for (const name of VISUAL_FIXTURE_NAMES) {
  await writeFile(resolve(outputDir, `${name}.png`), await renderVisualFixture(name));
  process.stdout.write(`updated ${name}.png\n`);
}

