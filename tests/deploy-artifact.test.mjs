import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("deploy preparation retains literal and dynamic runtime assets", async () => {
  const script = await readFile(new URL("../scripts/prepare-deploy-artifact.mjs", import.meta.url), "utf8");

  assert.match(script, /Source references missing public assets/);
  assert.match(script, /asset\.includes\("\$\{"\)/);
  assert.match(script, /-sprites/);
  assert.match(script, /vfx-/);
  assert.match(script, /audio\//);

  await access(new URL("../public/dust2-dragon-glass-awp.png", import.meta.url));
  await access(new URL("../public/ash-ballcap-wifebeater-awp-sprites.png", import.meta.url));
});
