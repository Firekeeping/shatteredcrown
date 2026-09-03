import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const loadTsModule = (relativePath) => {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const js = ts.transpile(source, { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 });
  const loaded = { exports:{} };
  new Function("module", "exports", "require", js)(loaded, loaded.exports, () => ({}));
  return loaded.exports;
};

const { ACTOR_REGISTRY } = loadTsModule("../app/actor-registry.ts");
const { actorActionAnimation, spritePoseDuration, SPRITE_POSE_TIMING } = loadTsModule("../app/actor-animation.ts");

test("Dust 2 fields eight distinct Counter Dungeoneers with modern fantasy weapon profiles", () => {
  const ids = ["John Wick","Vesper Longshot","Brakka Breach","Nix Fusefinger","Thorne Bastion","Sable Null","Mercy Hex","Rook Ironjaw"];
  assert.ok(ids.every((id) => ACTOR_REGISTRY[id]), "all eight squad actors must be registry-owned");
  assert.equal(ACTOR_REGISTRY["John Wick"].statBlock.attacks[0].attacks, 2);
  assert.equal(ACTOR_REGISTRY["Vesper Longshot"].statBlock.attacks[0].name, "AWP Arc Shot");
  assert.equal(ACTOR_REGISTRY["Vesper Longshot"].statBlock.attacks[0].reach, 14);
  assert.equal(ACTOR_REGISTRY["Nix Fusefinger"].statBlock.attacks[0].save.ability, "dexterity");
});

test("John Wick owns a genuine high-DPI transparent six-cell action sheet", async () => {
  const metadata = await sharp(fileURLToPath(new URL("../public/counter-dungeoneer-john-wick-sprites.png", import.meta.url))).metadata();
  assert.equal(metadata.width, 2172);
  assert.equal(metadata.height, 724);
  assert.equal(metadata.width / 6, 362);
  assert.equal(metadata.hasAlpha, true);
});

test("every Counter Dungeoneer owns a unique transparent action sheet", async () => {
  const ids = ["John Wick","Vesper Longshot","Brakka Breach","Nix Fusefinger","Thorne Bastion","Sable Null","Mercy Hex","Rook Ironjaw"];
  const sprites = ids.map((id) => ACTOR_REGISTRY[id].sprite);
  assert.equal(new Set(sprites).size, ids.length, "squad members must not recycle another actor's art");
  for (const sprite of sprites) {
    assert.match(sprite, /^\/counter-dungeoneer-/);
    const metadata = await sharp(fileURLToPath(new URL(`../public${sprite}`, import.meta.url))).metadata();
    assert.ok(metadata.width >= 1900 && metadata.height >= 700, `${sprite} must remain high resolution`);
    assert.equal(metadata.hasAlpha, true, `${sprite} must preserve a transparent background`);
  }
});

test("Counter Dungeoneer sprites render their own weapons without a duplicate drawn overlay", () => {
  const squad = readFileSync(new URL("../app/counter-dungeoneers.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(squad, /Vesper Longshot[\s\S]*Dragon Glass arc AWP/);
  assert.doesNotMatch(page, /counter-weapon-overlay/);
  assert.doesNotMatch(css, /counter-weapon-overlay|weapon-finish-/);
});

test("sprite pacing preserves anticipation, impact, and recovery holds", () => {
  assert.deepEqual(SPRITE_POSE_TIMING, { walk:560, attack:720, damage:620, cast:900 });
  assert.equal(spritePoseDuration("attack", 520), 720);
  assert.equal(spritePoseDuration("cast", 1200), 1200, "authored longer signatures keep their full hold");
  assert.deepEqual(actorActionAnimation("Vesper Longshot", "AWP Arc Shot"), { pose:"attack", duration:1120 });
});

test("Level 2 starts with seven defenders and saves John Wick for the false victory", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const squad = readFileSync(new URL("../app/counter-dungeoneers.ts", import.meta.url), "utf8");
  const contact = readFileSync(new URL("../app/use-counter-dungeoneer-contact.ts", import.meta.url), "utf8");
  const levelTwo = readFileSync(new URL("../app/level-two-objective-runtime.ts", import.meta.url), "utf8");
  const levelTwoState = readFileSync(new URL("../app/level-two-objective-state.ts", import.meta.url), "utf8");
  const data = readFileSync(new URL("../app/dust2-map-data.ts", import.meta.url), "utf8");
  assert.match(squad, /COUNTER_DUNGEONEER_ACTOR_IDS[\s\S]*John Wick[\s\S]*Rook Ironjaw/);
  assert.match(data, /dust2EnemyStarts = \[\[29, 4\], \[6, 5\],[\s\S]*\[30, 6\]\]/);
  assert.match(page, /buildCounterDungeoneerSquad\(\{ includeJohnWick:false \}\)/);
  assert.match(levelTwoState, /dust2-false-victory[\s\S]*dust2-john-wick-arrived/);
  assert.match(page, /levelTwoFalseVictoryUnits\(current, DUST2_SECRET_EXIT\)/);
  assert.match(levelTwoState, /dust2-john-wick-defeated[\s\S]*dust2-secret-exit-open/);
  assert.match(squad, /buildJohnWickReinforcement/);
  assert.match(levelTwo, /buildJohnWickReinforcement\(exit\.x, exit\.y\)/);
  assert.match(contact, /encounterMode !== "exploration"[\s\S]*unit\.team === "enemy"[\s\S]*isVisible\(unit\)[\s\S]*onContact\(\)/);
});

test("Level 2 keeps extraction sealed through the false victory and opens it only after Wick falls", () => {
  const state = loadTsModule("../app/level-two-objective-state.ts");
  const initial = [];
  assert.equal(state.levelTwoObjectivePhase(initial), "flag");
  assert.equal(state.levelTwoExitIsOpen(initial), false);
  const falseVictory = state.levelTwoFalseVictoryEvents(initial);
  assert.equal(state.levelTwoObjectivePhase(falseVictory), "john-wick");
  assert.equal(state.levelTwoExitIsOpen(falseVictory), false);
  assert.deepEqual(state.levelTwoFalseVictoryEvents(falseVictory), falseVictory, "Wick arrival is idempotent");
  assert.equal(state.levelTwoJohnWickDefeatEvents(initial, true), initial, "Wick cannot be defeated before arriving");
  const extraction = state.levelTwoJohnWickDefeatEvents(falseVictory, true);
  assert.equal(state.levelTwoObjectivePhase(extraction), "extraction");
  assert.equal(state.levelTwoExitIsOpen(extraction), true);
});
