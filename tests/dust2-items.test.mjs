import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const bundle = async (entry) => {
  const output = await build({ entryPoints:[new URL(entry, import.meta.url).pathname], bundle:true, format:"esm", platform:"node", write:false });
  return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
};

test("Dust 2 grants the complete spell-grenade level-five player loadout", async () => {
  const items = await bundle("../app/dust2-items.ts");
  assert.equal(items.DUST2_HERO_LEVEL, 5);
  assert.deepEqual([...items.DUST2_ITEM_LOADOUT], ["Emerald Frag Grenade", "Crystal Flashbang", "Alchemical Molotov", "Runic Smoke Grenade", "Frost Grenade", "Teleport Grenade", "Entangle Grenade", "Banishment Grenade", "Dragon Glass AWP", "Dragonfire Deagle"]);
  const loaded = items.grantDust2ItemLoadout({ id:"hero", skills:[] });
  assert.deepEqual(loaded.skills.map((skill) => skill.name), ["Throw Frag Grenade", "Throw Flashbang", "Throw Molotov", "Throw Smoke Grenade", "Throw Frost Grenade", "Throw Teleport Grenade", "Throw Entangle Grenade", "Throw Banishment Grenade"]);
  assert.deepEqual(items.mergeDust2ItemLoadout(["Ration", "Dragon Glass AWP"]), ["Ration", "Dragon Glass AWP", ...items.DUST2_ITEM_LOADOUT.filter((item) => item !== "Dragon Glass AWP")]);
  assert.equal(items.dust2ItemForSkill("Throw Smoke Grenade"), "Runic Smoke Grenade");
  assert.equal(items.dust2ItemForSkill("AWP Arc Shot"), null);
});

test("campaign Level 2 grants Dust 2 gear without changing earned levels", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const startLevelTwo = page.slice(page.indexOf("const startLevelTwo ="), page.indexOf("if (stage === \"editor\")"));
  assert.match(startLevelTwo, /grantDust2ItemLoadout/);
  assert.match(startLevelTwo, /mergeDust2ItemLoadout\(items\[hero\.id\]\)/);
  assert.match(startLevelTwo, /weapon:"Dragon Glass AWP"[\s\S]*quick1:"Emerald Frag Grenade"[\s\S]*quick2:"Runic Smoke Grenade"/);
  assert.doesNotMatch(startLevelTwo, /setLevel\(|heroFromRoster\(/);
});

test("Dust 2 throwables and the AWP own executable registry mechanics", async () => {
  const { ITEM_REGISTRY } = await bundle("../app/item-registry.ts");
  assert.equal(ITEM_REGISTRY["Emerald Frag Grenade"].skill.area, "square");
  assert.equal(ITEM_REGISTRY["Crystal Flashbang"].skill.power, 0);
  assert.equal(ITEM_REGISTRY["Alchemical Molotov"].skill.damageType, "fire");
  assert.equal(ITEM_REGISTRY["Runic Smoke Grenade"].skill.range, 8);
  assert.equal(ITEM_REGISTRY["Frost Grenade"].skill.damageType, "cold");
  assert.equal(ITEM_REGISTRY["Teleport Grenade"].skill.movement, "teleport");
  assert.equal(ITEM_REGISTRY["Entangle Grenade"].skill.area, "square");
  assert.equal(ITEM_REGISTRY["Banishment Grenade"].skill.range, 8);
  assert.equal(ITEM_REGISTRY["Dragon Glass AWP"].weapon.range, 14);
  assert.equal(ITEM_REGISTRY["Dragon Glass AWP"].weapon.hands, 2);
  assert.equal(ITEM_REGISTRY["Dragonfire Deagle"].weapon.hands, 1);
  assert.equal(ITEM_REGISTRY["Dragonfire Deagle"].weapon.range, 10);
});

test("approved Dust 2 item art has real transparency", async () => {
  for (const asset of ["dust2-frag-grenade.png", "dust2-molotov.png", "dust2-dragon-glass-awp.png", "dust2-dragonfire-deagle.png"]) {
    const metadata = await sharp(fileURLToPath(new URL(`../public/${asset}`, import.meta.url))).metadata();
    assert.equal(metadata.hasAlpha, true, `${asset} must preserve alpha`);
  }
});
