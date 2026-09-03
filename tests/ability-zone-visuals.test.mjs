import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/ability-zone-visuals.ts", import.meta.url), "utf8");
const js = ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
const module = { exports: {} };
new Function("module", "exports", "require", js)(module, module.exports, () => ({}));
const { abilityZoneSliceStyle } = module.exports;
const zone = { name: "Hunger of Hadar", tiles: Array.from({ length: 9 }, (_, index) => ({ x: 4 + index % 3, y: 8 + Math.floor(index / 3) })) };

test("persistent field art is sliced coherently across its board tiles", () => {
  assert.deepEqual(abilityZoneSliceStyle(zone, { x: 4, y: 8 }), {
    "--ability-zone-image": "url(/vfx-hunger-of-hadar.webp)",
    "--ability-zone-size": "300% 300%",
    "--ability-zone-position": "0% 0%",
  });
  assert.equal(abilityZoneSliceStyle(zone, { x: 5, y: 9 })["--ability-zone-position"], "50% 50%");
  assert.equal(abilityZoneSliceStyle(zone, { x: 6, y: 10 })["--ability-zone-position"], "100% 100%");
});

test("non-art zones keep their lightweight renderer", () => {
  assert.equal(abilityZoneSliceStyle({ name: "Unknown", tiles: [{ x: 0, y: 0 }] }, { x: 0, y: 0 }), undefined);
});
