import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publicReleaseMeta =
  /<meta(?=[^>]*\bproperty=["']og:image["'])(?=[^>]*\bcontent=["']https:\/\/shattered-crown-tactics\.firekeeping\.chatgpt\.site\/og\.png["'])[^>]*>/i;

const readGameSource = async () => (await Promise.all([
  "page.tsx",
  "encounter-engine.ts",
  "item-registry.ts",
  "poi-registry.ts",
  "use-game-sequence-controller.ts",
  "reset-policy.ts",
  "objective-registry.ts",
  "visual-registry.ts",
  "dungeon-content.ts",
  "actor-registry.ts",
  "map-trigger-engine.ts",
  "game-runtime.ts",
  "game-types.ts",
  "character-runtime.ts",
  "map-runtime.ts",
  "battlefield-engine.ts",
  "battlefield-vision-runtime.ts",
  "content-validator.ts",
  "combat-engine.ts",
  "dnd-rules.ts",
  "ability-score-grid.tsx",
  "enemy-ai.ts",
  "encounter-director.ts",
  "use-game-state-transitions.ts",
  "equipment-visuals.ts",
  "combat-presentation.ts",
  "fight-club-runtime.ts",
  "sound-engine.ts",
  "trap-presentation.ts",
  "prologue-content.ts",
  "unit-inspector-overlay.tsx",
  "use-school-dialogue-controller.ts",
  "kelim-spellbook.ts",
  "level-one-regression-runner.tsx",
  "level-one-regression-controller.ts",
].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");

test("the game menu includes the exportable Dialogue Forge", async () => {
  const source = await readGameSource();
  const editor = await readFile(new URL("../app/DialogueEditor.tsx", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");
  assert.match(source, /stage === "dialogue-editor"[\s\S]*<DialogueEditor/);
  assert.match(source, /Dialogue Forge[\s\S]*export branching conversations/);
  assert.match(editor, /format: "shattered-crown-dialogue"/);
  assert.match(editor, /Export Dialogue/);
  assert.match(editor, /Attach that JSON here/);
  assert.match(editor, />Undo<\/button>/);
  assert.match(editor, />Reset to Default<\/button>/);
  assert.match(editor, /localStorage\.removeItem\(draftKey\(interactionId\)\)/);
  assert.match(editor, /Undo is still available/);
  assert.match(editor, /responseText[\s\S]*toLowerCase\(\) !== "new response"/);
  assert.match(editor, /speaker: "Player"/);
  assert.match(catalog, /format: "shattered-crown-dialogue", version: 1/);
  assert.match(editor, /INTERACTION<select[\s\S]*DIALOGUE_CATALOG\.map/);
  assert.match(editor, /draftKey\(interactionId\)[\s\S]*lastInteractionKey/);
  assert.match(catalog, /Object\.values\(SCRIPTED_DUNGEON_ENCOUNTERS\)[\s\S]*encounterFile/);
  assert.match(catalog, /sourceInteractionId: encounter\.kind/);
});

test("renders public release metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), publicReleaseMeta);
});

test("content additions use blueprints, actor registries, triggers, and validation", async () => {
  const source = await readGameSource();
  assert.match(source, /export type DungeonRoomBlueprint/);
  assert.match(source, /export const ROOM_BLUEPRINTS/);
  assert.match(source, /actors\?: RoomActorBlueprint\[\]/);
  assert.match(source, /entry: RoomEntryBlueprint/);
  assert.match(source, /export const ACTOR_REGISTRY/);
  assert.match(source, /export const ABILITY_REGISTRY/);
  assert.match(source, /export const DUNGEON_MAP_TRIGGERS/);
  assert.match(source, /export const readyMapTriggers/);
  assert.match(source, /export const createUnitSeed/);
  assert.match(source, /export const assertValidGameContent/);
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const buildScript = await readFile(new URL("../scripts/build-verified.sh", import.meta.url), "utf8");
  const executableValidator = await readFile(new URL("../scripts/validate-game-content.mjs", import.meta.url), "utf8");
  assert.match(buildScript, /validate-game-content\.mjs/);
  assert.match(executableValidator, /validator\.validateGameContent\(\)/);
  assert.doesNotMatch(rooms, /"6c": \[\{ x: 10, y: 42 \}/);
  assert.match(source, /export const getPoiPanelModel/);
  assert.match(source, /export const ENCOUNTER_DIRECTIVES/);
  assert.match(source, /export const useGameStateTransitions/);
  assert.match(source, /resolveD20Attack/);
  assert.doesNotMatch(source, /export const hitChance/);
  assert.match(source, /export const rankEnemyTargets/);
  assert.doesNotMatch(source, /poi\.id ===/);
  assert.match(source, /Actor footprint does not fit walkable map geometry/);
  assert.doesNotMatch(source, /import \{ DUNGEON_ROOMS \}/);
});

test("heroes use persistent D&D ability profiles without changing the large damage scale", async () => {
  const source = await readGameSource();
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  for (const role of ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Wizard", "Rogue", "Sorcerer"])
    assert.match(characters, new RegExp(`${role}: dndProfile\\(\\{ strength:`));
  assert.match(source, /export const ABILITIES:[\s\S]*strength[\s\S]*dexterity[\s\S]*constitution[\s\S]*intelligence[\s\S]*wisdom[\s\S]*charisma/);
  assert.match(source, /Rogue:[\s\S]*"Thieves' Tools"/);
  assert.match(source, /resolveD20Attack[\s\S]*natural === 20[\s\S]*natural !== 1[\s\S]*total >= armorClass/);
  assert.match(source, /grantHeroProficiency[\s\S]*proficiencies:[\s\S]*heroFromRoster/);
  assert.ok((source.match(/\[heroId\]: \{\s*\.\.\.current\[heroId\]/g) || []).length >= 2);
  assert.match(source, /const ownedItems = new Set\(dungeonItems\[heroId\][\s\S]*uniqueCarry && ownedItems\.has\(item\)\) return/);
  assert.match(source, /migrateHeroToDnd[\s\S]*bonuses\.proficiencies/);
  assert.match(source, /heroFromRoster = \(id: string, heroLevel = level\)[\s\S]*unit\.level = heroLevel;[\s\S]*unit\.investigation = skillCheckBonus/);
  assert.match(source, /awardDungeonXp[\s\S]*xpForNextLevel[\s\S]*returns at full HP/);
  assert.doesNotMatch(source, /\.map\(heroFromRoster\)/);
  assert.match(source, /<AbilityScoreGrid/);
  assert.doesNotMatch(source, /export const hitChance/);
});

test("the main screen delegates map, encounter, combat, dialogue, and campaign ownership", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/map-rendering.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const combat = await readFile(new URL("../app/combat-engine.ts", import.meta.url), "utf8");
  const dialogue = await readFile(new URL("../app/dialogue-model.ts", import.meta.url), "utf8");
  const campaign = await readFile(new URL("../app/campaign-state-audit.ts", import.meta.url), "utf8");

  assert.match(page, /from "\.\/map-rendering"/);
  assert.match(page, /from "\.\/encounter-engine"/);
  assert.match(page, /from "\.\/combat-engine"/);
  assert.match(page, /from "\.\/dialogue-model"/);
  assert.match(page, /from "\.\/campaign-state-audit"/);
  assert.match(map, /selectDungeonObjectOverlays/);
  assert.match(encounters, /HOSTILE_FLAG_BY_ENCOUNTER_GROUP/);
  assert.match(combat, /skillAreaTiles/);
  assert.match(dialogue, /VILLAGER_QUOTES/);
  assert.match(campaign, /CAMPAIGN_SAVE_KEY/);
  assert.doesNotMatch(page, /const lineTilesFrom|const chargedSourceKey|const villagerQuotes|const SAVE_KEY/);
});

test("oversized dungeon props use one overlay plane and registry-owned presentation", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const overlay = await readFile(new URL("../app/dungeon-object-overlay.tsx", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/map-rendering.ts", import.meta.url), "utf8");
  const registry = await readFile(new URL("../app/visual-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(map, /const overlaySceneryProps = dungeonSceneryProps/);
  assert.match(page, /elevatedSceneryOverlays\.map/);
  assert.match(page, /<DungeonOverlaySlot x=\{bossThronePoint\.x\} y=\{bossThronePoint\.y\}>/);
  assert.match(overlay, /export function DungeonOverlaySlot/);
  assert.match(registry, /asset: "\/arcane-projector-original-clean-v2\.png", width: 64, height: 86, anchor: "bottom", bottom: -8/);
  assert.match(registry, /"dead-mage":[\s\S]*opacity: 1, filter:/);
  assert.match(css, /\.map-scenery-prop\.prop-custom-asset\.prop-anchor-bottom/);
  assert.doesNotMatch(css, /\.map-scenery-prop\.prop-id-|\.prop-id-/);
  assert.doesNotMatch(css, /\.dungeon-board \.cell:has\(\.(?!speech-bubble|dialogue-choice-bubble)/);
});

test("Level 1 ends through the defeated king's throne, with no separate stair exit", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8");

  assert.match(source, /const throneClaimable = firedMapEvents\.includes\("two-headed-king-defeated"\)/);
  assert.match(source, /boss-throne-scenery \$\{throneClaimable \? "throne-unlocked"/);
  assert.match(source, /setThroneClaimPrompt\(true\)/);
  assert.match(source, /CLAIM THE THRONE\?/);
  assert.match(source, /Claim Throne &amp; Finish Level 1/);
  assert.doesNotMatch(source, /dungeonExitDoor|heroAtStairs|bossBreachTiles|westernBossChamberTileKeys/);
  assert.doesNotMatch(map, /"kind": "stairs-down"/);
  assert.match(css, /\.boss-throne-scenery\.throne-unlocked/);
  assert.match(source, /className="level2-modal"/);
  assert.match(source, /role="dialog"/);
});
test("Undermountain playtest exposes no-fog teleport controls", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const mapRendering = await readFile(new URL("../app/map-rendering.ts", import.meta.url), "utf8");

  assert.match(source, /tileRevealed = \(!dungeonMode \|\| dungeonPlaytest \|\| storyVisionDisabled \|\| revealedTileSet\.has[\s\S]*&& !secretHallConcealed/);
  assert.match(source, /WESTERN_SECRET_CONCEAL_KEYS[\s\S]*westernSecretDoorEvent/);
  assert.doesNotMatch(source, /hiddenTiles/);
  assert.match(source, /Resume Normal Movement/);
  assert.match(source, /Playtest \{dungeonPlaytest \? "ON" : "OFF"\}/);
  assert.match(source, /const landing = Array\.from\(\{ length: boardCols \* boardRows \}/);
  assert.match(source, /nearest clear tile/);
  assert.match(source, /if \(mapPlaytest && teleportMode\)/);
  assert.match(source, /mapPlaytest && showGridCoordinates \? "show-grid-coordinates"/);
  assert.match(source, /Grid \{showGridCoordinates \? "ON" : "OFF"\}/);
  assert.match(mapRendering, /const gridColumnLabel = \(x: number\) => String\.fromCharCode\(65 \+ \(x % 26\)\)\.repeat\(Math\.floor\(x \/ 26\) \+ 1\)/);
  assert.match(source, /\{gridColumnLabel\(x\)\}\{y \+ 1\}/);
  assert.match(css, /\.battlefield\.show-grid-coordinates \.tile-info/);
  assert.match(source, /Teleport hero[\s\S]*setTeleportHeroId\(event\.target\.value\)/);
  assert.doesNotMatch(source, /dungeonPlaytest && encounterMode === "exploration" && teleportMode/);
  assert.match(source, /encounterMode === "exploration" && \(\s*<button className="secondary" onClick=\{finish\}>\s*Done \/ End Turn/s);
  assert.doesNotMatch(source, /room\.bubble \|\| "Intruders!"/);
});

test("story maps present their full scenery without vision fog", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /storyVisionDisabled = villageMapActive \|\| dungeonMode \|\| poisonCutscene/);
  assert.match(source, /enabled:stage === "battle" && !storyVisionDisabled/);
  assert.match(source, /!playerView\.enabled \|\| playerView\.hasLineOfSight\(unit, mount\.host, true\)/);
  assert.match(source, /disabled=\{dungeonMode && \(!tileRevealed \|\| !dungeonOpen\.has\(key\(x, y\)\)\)\}/);
  assert.match(source, /aria-label=\{dungeonMode && !tileRevealed[\s\S]*\? "Unexplored"/);
  assert.match(css, /\.dungeon-board \.cell\.fogged \{[\s\S]*?background: #000 !important;[\s\S]*?background-image: none !important;/);
  assert.match(css, /\.dungeon-board \.cell\.fogged::before,[\s\S]*?content: none !important;/);
  assert.match(css, /\.dungeon-board \.cell\.fogged > \* \{[\s\S]*?display: none !important;/);
  assert.match(source, /const startDungeonScene = \(playtest = false\)/);
  assert.match(source, /tutorial-recap-reviewed[\s\S]*?continuePastBridge\(\)/);
  assert.match(css, /\.dungeon-board \.cell\.terrain-void[\s\S]*pointer-events: none/);
  assert.match(css, /\.dungeon-board \.cell\.terrain-dungeon-floor:not\(\.fogged\) \{[\s\S]*?z-index: 1;/);
});

test("Continue Campaign reads the local save instead of treating the click event as a multiplayer snapshot", async () => {
  const source = await readGameSource();
  assert.match(source, /<button onClick=\{\(\) => continueCampaign\(\)\}>/);
  assert.doesNotMatch(source, /<button onClick=\{continueCampaign\}>/);
});

test("wall-mounted art is visible only from the exposed face of its wall", async () => {
  const source = await readGameSource();
  assert.match(source, /mount\.side === "n" \? unit\.y < mount\.host\.y/);
  assert.match(source, /mount\.side === "s" \? unit\.y > mount\.host\.y/);
  assert.match(source, /mount\.side === "e" \? unit\.x > mount\.host\.x : unit\.x < mount\.host\.x/);
});

test("the poisoned-wolf feeding scene stays visible before the heroes emerge", async () => {
  const source = await readGameSource();
  assert.match(source, /storyVisionDisabled = villageMapActive \|\| dungeonMode \|\| poisonCutscene/);
  assert.match(source, /setPoisonCutscene\(true\)[\s\S]*setUnits\(wolves\)/);
  assert.match(source, /setPoisonCutscene\(false\)[\s\S]*return \[\.\.\.heroes, \.\.\.returnedWolves\]/);
});

test("poisoning the wolves skips the redundant story explanation page", async () => {
  const source = await readGameSource();
  assert.match(source, /levelReturn, setLevelReturn\] = useState<"story" \| "battle" \| "poison" \| "dungeon">/);
  assert.match(source, /destination === "poison"\) startPoisonBaitScene\(\)/);
  assert.match(source, /nextRoute === "poison_bait"\) startPoisonBaitScene\(level\)/);
  assert.doesNotMatch(source, /choice === "poison" \? "poison" : "story"/);
});

test("dialogue stays inside the viewport and interactive props advertise keyboard actions", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /x < 2 \? "board-edge-left"/);
  assert.match(source, /y < 2 \? "board-edge-top"/);
  assert.match(source, /document\.querySelector<HTMLElement>\("\.global-speech-bubble"\)/);
  assert.match(source, /window\.innerWidth - width - 8/);
  assert.match(source, /window\.innerHeight - height - 8/);
  assert.match(source, /window\.addEventListener\("scroll", updateBubblePlacement, true\)/);
  assert.match(css, /\.global-speech-bubble \{[\s\S]*position: fixed/);
  assert.match(css, /\.poi-token\.poi-has-scenery-art::after/);
  assert.match(source, /className=\{drop\.contents \? "dungeon-chest-token" : `dropped-item-token[\s\S]*?role="button"[\s\S]*?tabIndex=\{0\}/);
  assert.match(source, /className=\{`poi-token[\s\S]*?role="button"[\s\S]*?tabIndex=\{0\}/);
});

test("forest tutorial reveals tracks and makes the cap an explicit gift choice", async () => {
  const source = await readGameSource();

  assert.match(source, /"forest-wolf-tracks"/);
  assert.match(source, /showDialogueBubble\(finder\.id, finder\.role === "Ranger"[\s\S]*rangerTrackCallout\(point\)[\s\S]*point\.text/);
  assert.match(source, /The brush erupts\. The pack closes on the trail!/);
  assert.match(source, /showDialogueBubble\(movedUnit\.id, "One guard still breathes\."/);
  assert.match(source, /Hurry, we don't have much time, there's some sort of ritual going on deeper in the forest\./);
  assert.match(source, /showDialogueBubble\("forest-wounded-guard", FOREST_GUARD_WARNING/);
  assert.match(source, /persistentDialogueIsWoundedGuard[\s\S]*?"Wounded Guard"[\s\S]*?"\/guard-sprites\.png"/);
  assert.match(source, /kind: "forest-guard"/);
  assert.match(source, /socialScene\.kind === "forest-guard"/);
  assert.doesNotMatch(source, /chooseGuardSpeaker\(movedUnit\.id\);\s*setExitReached\(true\)/);
  assert.match(source, /Take this, he says as his hand loosens around the battered blue ball cap…/);
  assert.match(source, /text: FOREST_GUARD_CAP_OFFER/);
  assert.match(source, /Take a dirty ballcap/);
  assert.match(source, /Leave It With Him/);
  assert.match(source, /fallen-guard-ballcap/);
  assert.match(source, /guardHatDecision/);
  assert.match(source, /Ball Cap of Bad Ideas/);
  assert.match(source, /equippedDialogueItems/);
  assert.match(source, /setEnemyTypes\(forestEnemies\);\s*setEncounterMode\("combat"\);\s*setAiBusy\(false\);\s*setTurn\(0\)/);
});

test("village tutorial centers villagers and delays the first wave one round", async () => {
  const source = await readGameSource();

  assert.match(source, /const start = villageVillagerStarts\[i\]/);
  assert.match(source, /const partyLeader = heroes\.find\(\(hero\) => hero\.id === leaderId\)/);
  assert.match(source, /showDialogueBubble\(partyLeader\.id, "I can hear the howls getting closer\. Better get ready\."/);
  assert.doesNotMatch(source, /makeUnit\("village-wayfarer"/);
  assert.match(source, /one round to move/i);
  assert.match(source, /s\.round >= 2/);
  assert.match(source, /village-wave1-arrived/);
  assert.doesNotMatch(source, /id: "village-tracks"/);
  assert.doesNotMatch(source, /Tear down the door!/);
  assert.match(source, /setEncounterMode\("combat"\);\s*setAiBusy\(false\);\s*setTurn\(0\);\s*setPhase\("move"\)/);
});

test("village exit keeps its walk-over zone without a wooden signpost", async () => {
  const source = await readGameSource();

  assert.match(source, /campaignScene === 4 &&\s*movedUnit\.y === 1 &&\s*\(movedUnit\.x === 6 \|\| movedUnit\.x === 7\)/);
  assert.doesNotMatch(source, /const exitSign/);
  assert.doesNotMatch(source, /exit-ground-marker/);
  assert.doesNotMatch(source, /exit-arrow-board/);
  assert.doesNotMatch(source, /label: "Village Road"/);
});

test("village doors block wolves and survivors celebrate before progression", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /const villageDoorEdgeKeys = new Set/);
  assert.match(source, /buildVillageSightCrossings/);
  assert.match(source, /entranceEdgeKeys\.forEach\(\(edgeKey\)/);
  assert.match(source, /barrier\.edgeKey === edgeKey/);
  assert.match(source, /setVillageCelebrating\(true\)/);
  assert.match(source, /We made it! We actually made it!/);
  assert.match(source, /setVillageCelebrating\(false\);\s*grantCompanyLevels/);
  assert.match(source, /\(victory \|\| defeat\) && !villageCelebrating/);
  assert.doesNotMatch(source, /THE VILLAGE CHEERS/);
  assert.match(source, /Poor Jim\./);
  assert.match(source, /village-wave2-cheered/);
  assert.match(source, /The surviving villagers cheer inside the battered inn/);
  assert.match(source, /villageWindowEdgeKeys/);
  assert.match(source, /kind: "window" as const/);
  assert.match(css, /village-structure-atlas-v2-runtime\.png/);
  assert.match(css, /edge-window\.state-damaged/);
});

test("a completed ritual route never labels the village exit as returning to the ritual", async () => {
  const source = await readGameSource();
  assert.match(source, /route === "deeper_forest"/);
  assert.match(source, /ritualAlreadyResolved \? "Continue to the bridge" : "Follow the trail to the ritual"/);
  assert.match(source, /const finishRepeatedVillageDefense[\s\S]*if \(stay\) startVillageReinforcement\(\);\s*else startBridgeScene\(\)/);
});

test("village defense uses the Forge map and its centered spawn markers", async () => {
  const source = await readGameSource();
  assert.match(source, /import villageDefenseMap from "\.\/village-defense-map\.json"/);
  assert.match(source, /villagePartyCenter/);
  assert.match(source, /villageWolfCenters/);
  assert.match(source, /Math\.floor\(randomUnit\(\) \* approaches\.length\)/);
  assert.match(source, /VILLAGE_ROWS - 1/);
  assert.match(source, /villageWallEdgeKeys/);
  assert.match(source, /villageBarricadeStarts\.map/);
});

test("opportunity attacks trigger only when leaving melee threat", async () => {
  const source = await readGameSource();

  assert.match(source, /attackDist\(attacker, tile\) === 1/);
  assert.match(source, /opportunityPairsRef = useRef<\{ turnKey: string; pairs: Set<string> \}>/);
  assert.match(source, /opportunityTurnKey[\s\S]*opportunityPairsRef\.current\.pairs/);
  assert.match(source, /meleeThreatens\(unit, moved\) &&\s*!meleeThreatens\(unit, step\)/);
  assert.match(source, /!attacker\.downed && !unitCannotAct\(attacker\) && !cannotMakeOpportunityAttack\(attacker\)/);
  assert.match(source, /!opportunityPairs\.has\(`\$\{unit\.id\}:\$\{moved\.id\}`\)/);
  assert.match(source, /const retreat = moveAlongRoute\(active, path, effectiveMovement\(active\), units\)/);
  assert.match(source, /const movement = moveAlongRoute\(active, route\.path, active\.move, units\)/);
  assert.doesNotMatch(source, /opportunityRound/);
  assert.match(source, /currentHeight\[attacker\.y\]\[attacker\.x\].*currentHeight\[tile\.y\]\[tile\.x\]/s);
});

test("dungeon encounter groups join combat without restarting initiative", async () => {
  const source = await readGameSource();

  assert.match(source, /enemy\.encounterGroup = label/);
  assert.match(source, /consciousHeroes\.some/);
  assert.match(source, /encounterMode === "combat"[\s\S]*joins the existing battle/);
  assert.match(source, /setTurn\(Math\.max\(0, nextOrder\.findIndex/);
});

test("passive discoveries check every nearby conscious hero", async () => {
  const source = await readGameSource();

  assert.match(source, /nearbyHeroes = units\.filter/);
  assert.match(source, /hero\.investigation/);
  assert.match(source, /passive Investigation/);
  assert.match(source, /attackDist\(hero, point\) <= Math\.max\(1, hero\.investigation \|\| 0\)/);
  assert.doesNotMatch(source, /point\.threshold|point\.radius/);
});

test("LOS ignores units, AoE protects allies, and generic cover is disabled", async () => {
  const source = await readGameSource();

  assert.match(source, /currentBlocked\.has\(key\(x, y\)\)/);
  assert.doesNotMatch(source, /currentTerrain\[t\.y\]\[t\.x\] === "forest"/);
  assert.match(source, /u\.team !== active\.team[\s\S]*tiles\.some/);
});

test("lightweight social encounters use nearby heroes and the hollow R62 cache", async () => {
  const source = await readGameSource();
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const dialoguePanel = await readFile(new URL("../app/dialogue-panel.tsx", import.meta.url), "utf8");
  const kelimRuntime = await readFile(new URL("../app/use-kelim-closet-bark.ts", import.meta.url), "utf8");
  const kelimOverlay = await readFile(new URL("../app/kelim-closet-overlay.tsx", import.meta.url), "utf8");
  const kelimSpellbook = await readFile(new URL("../app/kelim-spellbook.ts", import.meta.url), "utf8");

  assert.match(source, /type SocialScene/);
  assert.doesNotMatch(source, /Who answers\?/);
  assert.match(source, /nearbySocialHeroes/);
  assert.match(source, /automaticSocialHero/);
  assert.match(dialoguePanel, /choice-dialogue-panel/);
  assert.match(source, /const westernGoldCache = \{ x: 17, y: 61 \}/);
  assert.match(source, /Lift the Tile — Take 25 gp/);
  assert.doesNotMatch(encounters, /Go deal with your rivals|undertaker-rival-cleared/);
  assert.match(encounters, /Here's some gold to tell us what to watch out for and to stay quiet about us being here\./);
  assert.match(encounters, /Paid breaks\?/);
  assert.match(encounters, /Bombs, wire traps, and ghosts that don't stay dead\./);
  assert.match(encounters, /two faces and twice the temper/);
  assert.match(encounters, /pillar-bugbears-paid-break/);
  assert.match(source, /Math\.ceil\(barrier\.maxHp \/ 5\)/);
  assert.match(source, /barrier\.edgeKey === edgeKey/);
  assert.match(source, /Let the Pack Arrive/);
  assert.match(source, /is catapulted onto the enemy side of the bridge/);
  assert.match(source, /Take the road to the bridge/);
  assert.match(source, /openSocialScene\("dead-mage"/);
  assert.match(source, /openSocialScene\("kelim"/);
  assert.match(source, /socialScene\?\.kind === "kelim"[\s\S]*"\/kelim-closet-door\.png"/);
  assert.match(source, /"kelim-closet": \{ atlas: "dungeon-e", slot: 0, asset: "\/kelim-closet-door\.png", width: 44, height: 66/);
  assert.match(source, /releasedKelimPoint[\s\S]*id: "released-kelim"[\s\S]*asset: "\/kelim-sprite\.png", width: 34, height: 50/);
  assert.match(source, /KELIM_CLOSET_POINT = \{ x: 31, y: 73 \}[\s\S]*FF74, facing east into GG74/);
  assert.match(source, /"kelim-closet": \{[\s\S]*anchor: "center", rotate: -90/);
  assert.match(source, /resolvedPoi\.includes\("kelim-closet"\) \? "\/kelim-sprite\.png" : "\/kelim-closet-door\.png"/);
  assert.match(source, /Thank you! I thought those things were going to tear through the door/);
  assert.match(source, /useKelimClosetBark/);
  assert.match(source, /kelimClosetBark[\s\S]*KelimClosetOverlay/);
  assert.match(kelimOverlay, /kelim-closet-bark/);
  assert.match(source, /room-36b"\) && !resolvedPoi\.includes\("kelim-closet"\)/);
  assert.match(source, /const danger = threats\.map[\s\S]*scenePath\(KELIM_ESCAPE_PATH\[0\], monster[\s\S]*kelim-eaten/);
  assert.match(kelimRuntime, /KELIM_ESCAPE_PATH = \[\{ x: 32, y: 73 \}[\s\S]*\{ x: 31, y: 75 \}[\s\S]*GG74 → FF76/);
  assert.match(kelimRuntime, /Please help![\s\S]*They're breaking through the door![\s\S]*Please—don't leave me in here!/);
  assert.match(kelimRuntime, /KELIM_SIGHTING_TRIGGER = \{ x: 24, y: 73 \}[\s\S]*Y74/);
  assert.match(kelimRuntime, /KELIM_LATENT_GRICK_POINT = \{ x: 32, y: 74 \}[\s\S]*KELIM_LATENT_GRICK_ALPHA_POINT = \{ x: 28, y: 77 \}[\s\S]*Room 36c/);
  assert.match(kelimRuntime, /pendingKelimPredator[\s\S]*pending\("36b"\)[\s\S]*pending\("36c"\)[\s\S]*Grick Alpha/);
  assert.match(kelimRuntime, /kelimCorpseFlag[\s\S]*kelimCorpsePointFromFlags/);
  assert.doesNotMatch(kelimRuntime, /setTimeout/);
  assert.match(kelimOverlay, /kelim-door-click-target[\s\S]*onInspect/);
  assert.doesNotMatch(kelimOverlay, /Find the closet door/);
  assert.match(source, /kelim-first-plea-seen[\s\S]*KELIM_CLOSET_POINT\.x \* 52[\s\S]*I'm trapped and they're trying to eat me!/);
  assert.match(source, /unit\.encounterGroup === "36b" \|\| unit\.encounterGroup === "36c"[\s\S]*latentPredator = pendingKelimPredator\(firedMapEvents\)/);
  assert.match(source, /deathPoint\.x \* 52[\s\S]*KELIM: “AHHHHH!”[\s\S]*kelimCorpseFlag\(deathPoint\)[\s\S]*kelim-corpse/);
  assert.match(source, /kelim-corpse-spellbook[\s\S]*Kelim's Spellbook[\s\S]*body and spellbook remain/);
  assert.match(source, /if \(danger \|\| latentPredator\)[\s\S]*kelim-corpse-spellbook[\s\S]*return; \}[\s\S]*awardAchievement\(scene\.heroId, \{ key: "rescue-kelim"/);
  assert.match(source, /special === "spellbook"[\s\S]*openSpellbook\(active\.id\)[\s\S]*Learn Kelim/);
  assert.match(source, /const openSpellbook[\s\S]*KELIM_SHORTCUT_SKILL[\s\S]*reads Kelim's spellbook[\s\S]*indexOf\("Kelim's Spellbook"\)[\s\S]*carried\.splice\(index, 1\)/);
  assert.match(source, /Object\.values\(s\.bonusSkills \|\| \{\}\)[\s\S]*isKelimSpellbookSkill[\s\S]*recoverKelimBook/);
  assert.match(kelimSpellbook, /Kelim's Shortcut[\s\S]*range: 6[\s\S]*dailyCharges: 1[\s\S]*movement: "teleport"[\s\S]*source: "kelim-spellbook"/);
  assert.doesNotMatch(kelimSpellbook, /Burning Hands|Lightning Bolt|Arcane Bolt/);
  assert.match(source, /selectedSkill\?\.movement === "teleport"[\s\S]*kelimTeleportIssue[\s\S]*charges: Math\.max\(0, skill\.charges - 1\)/);
  assert.match(source, /selectedSkill\.name !== "Leap of the Clouds"[\s\S]*setTeleportingUnitId\(active\.id\)[\s\S]*setTeleportingUnitId\(null\), 1650[\s\S]*animateSprite\(active\.id, "cast", 1650/);
  assert.match(source, /const pantryTriggered = triggerPantryTeleport[\s\S]*const landingTrap = pointsOfInterest\.find[\s\S]*triggerDungeonTrap\(landingTrap/);
  assert.match(source, /kelimTeleportIssue[\s\S]*more than 30 feet away/);
  assert.match(kelimSpellbook, /dailyCharges: 1[\s\S]*source: "kelim-spellbook"/);
  assert.doesNotMatch(source, /Xanathar/);
});

test("Level 1 traps and the single-target acid box are interactive", async () => {
  const source = await readGameSource();
  const visuals = await readFile(new URL("../app/visual-registry.ts", import.meta.url), "utf8");

  assert.match(source, /id: "ceramic-alarm"/);
  assert.match(source, /id: "heart-acid"/);
  assert.match(source, /triggerDungeonTrap/);
  assert.match(source, /takes 12 damage/);
  assert.match(source, /Insert Stone-box Key/);
  assert.match(source, /Stone-box Key from the hidden club/);
  assert.match(source, /label: "Force the Box"/);
  assert.doesNotMatch(source, /Force the Box — Trigger the Trap/);
  assert.match(source, /acid drops on that hero alone for 12 damage/);
  assert.match(visuals, /"heart-acid": \{ atlas: "dungeon-a", slot: 5, scale: 0\.9, rotate: 90, offsetX: 52, visibleFrom: \{ left: 17, top: 21, right: 18, bottom: 23 \} \}/);
  assert.match(source, /poiVisibleFromParty[\s\S]*unit\.team === "hero"[\s\S]*poiProp\.visibleFrom/);
  assert.match(source, /DUNGEON_LANDMARKS\.heartAcid\.mountPoint/);
  assert.match(source, /poi-offset-mounted[\s\S]*--poi-offset-x/);
  assert.match(source, /hosts are alerted/);
  assert.match(source, /HALASTER/);
  assert.doesNotMatch(source, /id: "mirror-gate"/);
});

test("wandering shield guardian crosses the dungeon and pushes without attacking", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /type WanderingGuardian/);
  assert.match(source, /const shieldGuardianPatrol = \[/);
  assert.match(source, /socialScene \|\|[\s\S]*bubble\?\.persistent/);
  assert.match(source, /guardianTriggerRoom/);
  assert.match(source, /wandering-guardian/);
  assert.match(source, /const shieldGuardianPatrol = \[/);
  assert.match(source, /const shieldGuardianTrigger = \{ x: 12, y: 62 \}/);
  assert.match(source, /guardianReady:[\s\S]*unit\.x === shieldGuardianTrigger\.x && unit\.y === shieldGuardianTrigger\.y/);
  assert.match(source, /\{ x: 12, y: 67 \}, \{ x: 12, y: 66 \}[\s\S]*\{ x: 12, y: 61 \}, \{ x: 12, y: 60 \}/);
  assert.match(source, /dungeonAuthoredTriggerKeys = new Set/);
  assert.match(source, /debugTrigger = dungeonMode && dungeonAuthoredTriggerKeys\.has\(key\(x, y\)\)/);
  assert.doesNotMatch(source, /debugTrigger = dungeonMode && \(!!poi \|\|/);
  assert.match(source, /A shield guardian marches in from M68/);
  assert.match(css, /shield-guardian-walk-sprites\.webp[\s\S]*wandering-guardian-walk/);
  assert.doesNotMatch(css, /\.dungeon-board \.cell:has\(\.wandering-guardian\)/);
  assert.match(css, /\.wandering-guardian-sprite[\s\S]*width: 62px;[\s\S]*height: 74px;[\s\S]*bottom: 0/);
  assert.match(source, /Watched the shield guardian complete its extremely important patrol/);
  assert.match(source, /boxName: "Hall Monitor"/);
  assert.doesNotMatch(source, /Pantomime Wizard/);
  assert.match(source, /returned to the same elsewhere/);
  assert.match(source, /Who is my master/);
  assert.match(source, /gently but firmly pushes/);
  assert.match(source, /Stand aside\. My master requires me elsewhere/);
  assert.match(source, /<em>“\{shieldGuardianPassText\[\(wanderingGuardian\?\.pass \|\| 1\) - 1\]\.speech\}”<\/em>/);
  assert.doesNotMatch(source, /wanderingGuardian\?\.step \|\| 0\) <= 1/);
  assert.match(css, /\.wandering-guardian small[\s\S]*font: 600 5px/);
  assert.match(source, /disappears around the corner at M61/);
});

test("dungeon loot can be dropped and Holy Water is a splash attack", async () => {
  const source = await readGameSource();

  assert.match(source, /type DroppedDungeonItem/);
  assert.match(source, /dropDungeonItem/);
  assert.match(source, /pickUpDungeonItem/);
  assert.match(source, /"dungeon-chest-token" : `dropped-item-token/);
  assert.match(source, /Throw Holy Water[\s\S]*single-use 3×3 radiant splash\.[\s\S]*"square"/);
});

test("Gelatinous Cube overlaps its target with unavoidable damage and remains selectable", async () => {
  const source = await readGameSource();

  assert.match(source, /active\.role === "Gelatinous Cube"/);
  assert.match(source, /forfeits the stalled turn/);
  assert.match(source, /const cubeTarget = active\.role === "Gelatinous Cube"[\s\S]*dist\(active, a\) - dist\(active, b\)/);
  assert.match(source, /cannot find a valid target and loses the turn[\s\S]*finishTurnRef\.current\(\)/);
  assert.match(source, /moveAlongRoute\(active, route\.path, active\.move, units\)/);
  assert.match(source, /flows over \$\{target\.name\}.*unavoidable damage/);
  assert.match(source, /livingTargets\.length > 1/);
  assert.match(source, /OCCUPIED SPACE/);
  assert.match(source, /Select \{unit\.name\}/);
});

test("Level 1 conversations show actors and permit noncombat outcomes", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const dialogueSpeaker = await readFile(new URL("../app/dialogue-speaker.ts", import.meta.url), "utf8");
  assert.match(rooms, /"2b": \[\{ x: 11, y: 58 \}, \{ x: 12, y: 58 \}\]/);
  assert.match(rooms, /"2b": \["Pillar Bugbear", "Pillar Bugbear"\]/);
  assert.match(source, /const lineOfSightCornerBlocked =/);
  assert.match(source, /A single wall corner leaves an open viewing angle/);
  assert.match(source, /attackDist\(position, point\) <= \(room\.entry\.radius \?\? 2\)/);
  assert.match(rooms, /"2a": \{ radius: 0, triggerTiles: \[\{ x: 15, y: 60 \}\] \}/);
  assert.match(rooms, /"2b": \{ radius: 0, triggerTiles: \[\{ x: 12, y: 59 \}, \{ x: 12, y: 60 \}\], encounter: "pillar-bugbears" \}/);
  assert.match(rooms, /starts: \[\{ x: 8, y: 58 \}, \{ x: 9, y: 58 \}\]/);
  assert.match(rooms, /Easy! We're running off, not running at you!/);
  assert.match(rooms, /Move\. We're coming through\./);
  assert.doesNotMatch(rooms, /Hold\. Let us pass\./);
  assert.match(source, /Reconcile older or interrupted saves where a scripted room was marked/);
  assert.match(source, /const livingCast = units\.filter\(\(unit\) => unit\.encounterGroup === label && !unit\.downed\)\.length;/);
  assert.match(source, /if \(livingCast < actors\.length\) spawnConversationUnits/);
  assert.match(source, /spawnConversationUnits\([\s\S]*actors\.flatMap[\s\S]*true,/);
  assert.match(encounters, /I'll let you hit me first\./);
  assert.match(encounters, /What are you running from\?/);
  assert.match(encounters, /Ghosts, bombs, monsters, traps\.\.\./);
  assert.match(encounters, /Overbearing, two-faced bosses\.\.\./);
  assert.match(encounters, /The only good bugbear is a dead one\./);
  assert.match(encounters, /Two bugbears shoulder into the passage/);
  assert.match(dialogueSpeaker, /unit\.name === scene\.speaker[\s\S]*unit\.encounterGroup === scene\.roomLabel[\s\S]*unit\.id === scene\.heroId/);
  assert.match(source, /const bugbearsHitFirst = scene\.kind === "pillar-bugbears" && choice\.id === "ball-cap-first-hit"/);
  assert.match(source, /bugbearsHitFirst \? \{ initiativeRoll: 100 \}/);
  assert.match(rooms, /"39c": \["Goblin in a White Shirt", "Hungry Goblin"/);
  assert.match(rooms, /"39c": \{ title: "Goblin Hall"[^\n]*monsters: \["Goblin", "Goblin"\] \}/);
  assert.match(rooms, /"8b": \[\{ x: 9, y: 32 \}, \{ x: 10, y: 32 \}\]/);
  assert.match(rooms, /"5": \[\{ x: 5, y: 47 \}, \{ x: 6, y: 47 \}\]/);
  assert.match(source, /actors\.map\(\(actor\) => actor\.name \|\| actor\.actorId\)/);
  assert.match(source, /unit\.encounterGroup === scene\.roomLabel[\s\S]*\{ \.\.\.unit, team: "enemy", npc: false/);
  assert.match(rooms, /"26b": \{ title: "Empty Closet"/);
});

test("every authored Level 1 room event catches path crossings and repairs interrupted casts", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const validator = await readFile(new URL("../app/content-validator.ts", import.meta.url), "utf8");

  assert.match(source, /const pendingDungeonRoomEntryAt =/);
  assert.match(source, /route\.path\.map\(\(step\) => pendingDungeonRoomEntryAt\(step, movementEventFlags\)\)/);
  assert.match(source, /setPendingDungeonRoomId\(enteredRoomId\)/);
  assert.match(source, /dungeonRoomEntryMatches\(label, room, hero, eventFlags\)/);
  assert.match(source, /Content flags should never[\s\S]*leave a live encounter empty/);
  assert.match(source, /roomLifecycle\(label, firedMapEvents\) === "active"/);
  assert.match(source, /spawnConversationUnits\([\s\S]*openScriptedEncounter\(room\.entry\.encounter\)/);
  assert.match(source, /room-encounter-spawned-\$\{scene\.roomLabel\}/);
  assert.match(rooms, /"8b"[\s\S]*monsters: \["Harria", "Flesh Golem"\]/);
  assert.match(rooms, /"19b"[\s\S]*loot: \["Copper Tankard"\]/);
  assert.match(rooms, /"19c"[\s\S]*monsters: \["Dwarf Survivor"\]/);
  assert.match(validator, /Scripted encounters require at least one actor/);
  assert.match(validator, /Scripted encounters require explicit walkable activation tiles/);
  assert.match(validator, /does not point back to encounter/);
  assert.match(validator, /A golem dialogue line requires a Flesh Golem actor/);
  assert.match(validator, /Trigger is not on walkable map geometry/);
  assert.match(source, /Restore ordinary room loot if an interrupted save/);
  assert.match(source, /roomLifecycle\(label, firedMapEvents\) !== "resolved"/);
  assert.match(source, /room-state:28b:looted/);
  assert.match(source, /Math\.min\(\.\.\.heroDistances\) <= condition\.distance/);
});

test("scripted dialogue uses one explicit keyboard-or-button advance contract", async () => {
  const source = await readGameSource();
  const dialoguePanel = await readFile(new URL("../app/dialogue-panel.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const showDialogueBubble/);
  assert.match(source, /activeContinueRef/);
  assert.match(source, /dialogueQueueRef\.current\.push/);
  assert.match(source, /showDialogueBubble\(speakerId, effect\.text, \(\) => runEffect\(effectIndex \+ 1\)\)/);
  assert.match(source, /window\.addEventListener\("keydown", advanceFromKeyboard\)/);
  assert.match(source, /event\.key !== " " && event\.key !== "Enter"/);
  assert.match(dialoguePanel, /Continue <kbd>Space<\/kbd>/);
  assert.match(source, /continueDialogueBubble\(\)/);
  assert.match(source, /data-unit-id=\{u\.id\}/);
  assert.match(dialoguePanel, /className=\{`portrait-dialogue-panel/);
  assert.match(source, /className=\{`global-speech-bubble[\s\S]*?transient`\}/);
  assert.match(dialoguePanel, /className="dialogue-continue"/);
  assert.doesNotMatch(source, /onClick=\{bubble\.persistent/);
  assert.match(css, /\.portrait-dialogue-panel \{[\s\S]*position: fixed/);
  assert.match(css, /\.portrait-dialogue-sprite[\s\S]*background-size: 600% 100%/);
  assert.match(css, /\.dialogue-continue[\s\S]*pointer-events: auto/);
  assert.match(css, /\.global-speech-bubble\.transient \{ pointer-events: none; \}/);
});

test("dungeon XP growth is silent and never interrupts play with an ability picker", async () => {
  const source = await readGameSource();

  assert.match(source, /const awardDungeonXp/);
  assert.match(source, /level: nextLevel/);
  assert.match(source, /maxHp/);
  assert.match(source, /reaches Level \$\{hero\.level\}, returns at full HP, and grows stronger/);
  assert.doesNotMatch(source, /dungeonLevelChoices/);
  assert.doesNotMatch(source, /chooseDungeonLevelAbility/);
  assert.doesNotMatch(source, /dungeon-levelup/);
  assert.doesNotMatch(source, /showCombatBark\(hero\.id, `LEVEL/);
});

test("poison cutscene always hands control back to combat", async () => {
  const source = await readGameSource();

  assert.match(source, /const beginPoisonCombat = \(\) =>/);
  assert.match(source, /if \(combatStarted\) return/);
  assert.match(source, /setPoisonCutscene\(false\)/);
  assert.match(source, /runEncounterSequence\([\s\S]*?"Spring the Ambush Now"/);
  assert.match(source, /Spring the Ambush Now/);
  assert.match(source, /wolf\.initiativeRoll = -100/);
  assert.match(source, /setPoisonCutscene\(false\);\s*setAiBusy\(false\)/);
});

test("authored encounter sequences share guarded completion and manual recovery", async () => {
  const source = await readGameSource();
  assert.match(source, /const runEncounterSequence =/);
  assert.match(source, /!isSequenceCurrent\(generation\)/);
  assert.match(source, /scheduleCutscene\(complete, completeAt \+ 1800\)/);
  assert.match(source, /completeEncounterSequenceRef\.current\?\.\(\)/);
  assert.match(source, /"Finish the Celebration"/);
  assert.match(source, /showDialogueBubble\(wayfarer\.id, "Heh\. I like that hat\."[\s\S]*setWayfarerLaunchedUnitId\(montySpeaker\.id\)/);
  assert.match(source, /playTeleportAway\(wayfarer\.id, finishWayfarerBoon\)/);
});

test("dialogue-key items unlock Flyndol and ration-based goblin choices", async () => {
  const source = await readGameSource();
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");

  assert.match(source, /Statue of the Questioner/);
  assert.match(source, /Glasses of Good Questions/);
  assert.match(encounters, /Could you make me a wererat\?/);
  assert.match(encounters, /kind: "hero-item", item: "Glasses of Good Questions"/);
  assert.match(source, /setDungeonItems\(\(items\) => Object\.fromEntries/);
  assert.match(source, /\.\.\.\(items\[hero\.id\] \|\| \[\]\)[\s\S]*"Ration"/);
  assert.match(encounters, /Take my ration and go\./);
  assert.doesNotMatch(source, /GREED WAITS IN THE CORNER|Follow the Arrow to the Corner/);
  assert.match(source, /name: "Hollow Floor Tile", \.\.\.westernGoldCache/);
});

test("declarative encounter engine owns conditions, consequences, and combat handoff", async () => {
  const source = await readGameSource();
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const scenes = await readFile(new URL("../app/scene-content.ts", import.meta.url), "utf8");

  for (const kind of ["pillar-bugbears", "flyndol", "starving-goblins"])
    assert.match(encounters, new RegExp(`kind: "${kind}"`));
  assert.match(encounters, /"secret-club": secretClubEncounter/);
  assert.match(encounters, /"undertakers-harria": harriaUndertakerEncounter/);
  assert.match(encounters, /grant-skill-proficiency/);
  assert.match(encounters, /Pay 25 gp and leave quietly/);
  assert.match(encounters, /kind: "secret-club-tour"/);
  assert.match(source, /grantDungeonLoot\(heroId, completion\.items\)/);
  assert.match(source, /Finish the Extremely Secret Tour/);
  assert.match(encounters, /SECRET_CLUB_TOUR_COMPLETION[\s\S]*Dwarven Signet Ring[\s\S]*Stone-box Key[\s\S]*proficiency: "Acrobatics"/);
  assert.doesNotMatch(scenes, /lockbox|reward had better/i);
  assert.match(scenes, /DELVER_ORIENTATION_MESSAGE[\s\S]*Clear them out, and I’ll open Level Two\.[\s\S]*FINAL_PRACTICAL_MESSAGE/);
  assert.doesNotMatch(scenes, /DELVER_ORIENTATION_MESSAGE[^\n]*survive the Final Practical/);
  assert.match(source, /SOCIAL ENCOUNTER[\s\S]*Items, skills, and good judgment can avoid a fight/);
  assert.match(source, /ROGUE TRAP MARKING[\s\S]*Rogues automatically mark hidden traps/);
  assert.match(source, /ITEM DIALOGUE AVAILABLE[\s\S]*unique solutions and consequences/);
  assert.match(encounters, /SECRET_CLUB_EXIT = \{ x: 15, y: 46 \}/);
  assert.match(source, /I survived the orientation/);
  for (const requirement of ["hero-item", "party-item", "hero-class", "investigation", "flag-absent"])
    assert.match(encounters, new RegExp(`kind: "${requirement}"`));
  for (const effect of ["start-combat", "dismiss-group", "award-peace-xp", "set-flag"])
    assert.match(encounters, new RegExp(`kind: "${effect}"`));
  assert.match(source, /resolveScriptedEncounterChoice/);
  assert.match(source, /if \(encounterMode === "exploration"\)/);
  assert.match(source, /encounter-choice tone-\$\{choice\.tone\}/);
  assert.match(source, /choices\.filter\(encounterRequirementMet\)\.map/);
});

test("unsupported secret-passage references are removed", async () => {
  const page = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");

  assert.doesNotMatch(page, /conceals the outline of a secret door/);
  assert.doesNotMatch(rooms, /Secret Tunnel/);
  assert.match(rooms, /Goblin Passage/);
});

test("Ball Cap inventory ownership unlocks bad ideas and the goblin shirt", async () => {
  const source = await readGameSource();
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");

  assert.match(source, /Poison the guard's body and use it as bait to stop the ritual/);
  assert.match(source, /\{FOREST_POISON_BAIT_CHOICE\}/);
  assert.match(source, /heroHasItem\(guardSpeakerId, "Ball Cap of Bad Ideas"\)/);
  assert.match(source, /A dirty blue ballcap taken from the fallen guard/);
  assert.match(source, /describeItem\(drop\.name, active\?\.name \|\| "this hero"\)/);
  assert.doesNotMatch(source, /Unlocks reckless options for its carrier|Ball Cap may inspire a worse idea|The first reckless touch requires the Ball Cap/);
  assert.match(source, /setDungeonItems\(\(items\) => Object\.fromEntries\([\s\S]*?items\[hero\.id\][\s\S]*?"Ration"/);
  assert.match(source, /startPoisonBaitScene/);
  assert.match(source, /unit\.team === "enemy" \? \{ \.\.\.unit, poisoned: true \}/);
  assert.match(source, /DC 12 CON save[\s\S]*10 damage/);
  assert.match(source, /campaignScene === 8/);
  assert.match(source, /Go to the village/);
  assert.match(source, /Go to the bridge — leave the village behind/);
  assert.match(source, /Blue\. No—yellow!/);
  assert.match(source, /resolveWayfarer\(true\)/);
  assert.match(source, /setAbilityQueue\(heroes\.map/);
  assert.match(encounters, /kind: "starving-goblins"[\s\S]*id: "ball-cap-shirt"[\s\S]*That's a nice shirt\.\.\. I want it\.[\s\S]*Ball Cap of Bad Ideas[\s\S]*choose-goblin-shirt/);
  assert.doesNotMatch(encounters, /kind: "paranoid-dwarf"[\s\S]*id: "ball-cap-shirt"[\s\S]*kind: "starving-goblins"/);
  assert.match(source, /effect\.kind === "choose-goblin-shirt"[\s\S]*setGoblinShirtClaim\(true\)[\s\S]*setSocialScene\(scene\)/);
  assert.match(catalog, /SCRIPTED_DUNGEON_ENCOUNTERS/);
  assert.match(source, /Wife-Beater of Questionable Resilience/);
  assert.match(source, /"Wife-Beater of Questionable Resilience"[\s\S]*stats: \{ defense: 1 \}/);
});

test("the revised Troll and Halleth exports are represented in authored encounters", async () => {
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const halleth = encounters.slice(encounters.indexOf("const hallethBardEncounter"), encounters.indexOf("export const SCRIPTED_DUNGEON_ENCOUNTERS"));
  assert.match(encounters, /kind: "troll"[\s\S]*Get in my belly\./);
  assert.match(halleth, /kind: "halleth-bard"[\s\S]*completionFlag: "halleth-bard-met"[\s\S]*willing to waive the cover charge/);
  assert.match(halleth, /flag-absent[\s\S]*HALLETH_DIALOGUE_FLAGS\[0\][\s\S]*I heard there was a secret ooze[\s\S]*I\.\.\./);
  assert.match(halleth, /flag-absent[\s\S]*HALLETH_DIALOGUE_FLAGS\[1\][\s\S]*Tough crowd\./);
  assert.match(halleth, /flag-absent[\s\S]*HALLETH_DIALOGUE_FLAGS\[2\][\s\S]*what is moving underneath me/);
  assert.doesNotMatch(halleth, /reopen-encounter|halleth-finish-questions/);
});

test("the Blood-Moon ritual supports cleansing and a shared fractional curse", async () => {
  const source = await readGameSource();

  assert.match(source, /restores 5 HP to each living werewolf/);
  assert.doesNotMatch(source, /ritualAnchors|breakRitualAnchor|BLOOD-MOON SURGE/);
  assert.match(source, /\["Cleric", "Wizard"\]/);
  assert.match(source, /acceptWolfTouch/);
  assert.match(source, /wolf-touch-unlocked/);
  assert.match(source, /grantDungeonLoot\(active\.id, \["Werewolf Lycanthropy"\]\)/);
  assert.match(source, /Rat-Touched: this character can speak with rats/);
  assert.match(source, /Wolf-Touched: this character can speak with dogs and wolves/);
  assert.doesNotMatch(source, /werewolf-ritual-focus\.png/);
  assert.match(source, /className=\{`ritual-focus-glow/);
  assert.match(source, /THE TRAIL FORKS/);
  assert.match(source, /startBridgeScene\(true\)/);
  assert.match(source, /I can hear the screams of the villagers\. Why didn't you save them\?/);
  assert.match(source, /abandoned_village_for_bridge/);
  assert.doesNotMatch(source, /Keep exploring the clearing/);
});

test("the R62 hollow tile reveals gold without a separate corner stash", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const westernSecretDoor = \{ x: 14, y: 61 \}/);
  assert.match(source, /const westernGoldCache = \{ x: 17, y: 61 \}/);
  assert.match(source, /crossedHollowGoldTile[\s\S]*?showDialogueBubble\(active\.id, "Click\. That floor tile is hollow\."\)/);
  assert.match(source, /"gold-cache"[\s\S]*visualKind: "floor"[\s\S]*visibility: "hidden"/);
  assert.match(source, /className="hollow-floor-tile-art"/);
  assert.match(css, /\.poi-token\.poi-id-gold-cache[\s\S]*\.hollow-floor-tile-art/);
  assert.match(source, /grantDungeonLoot\(consciousActive\.id, \["25 gp"\]\)/);
  assert.doesNotMatch(source, /id: "western-pillar-gold-cache"/);
});

test("opening forest victory requires a hero to approach the dying guard", async () => {
  const source = await readGameSource();
  assert.doesNotMatch(source, /\(campaignScene === 2 \|\| campaignScene === 8\) &&\s*encounterCleared/);
  assert.match(source, /const woundedGuardTile = \{ x: 15, y: 1 \}/);
  assert.match(source, /attackDist\(movedUnit, woundedGuardTile\) <= 1/);
  assert.match(source, /showDialogueBubble\(movedUnit\.id, "One guard still breathes\."[\s\S]*chooseGuardSpeaker\(movedUnit\.id\)/);
  assert.match(source, /guardDialogueStartedRef\.current = true;[\s\S]*showDialogueBubble\("forest-wounded-guard"[\s\S]*setSocialScene\(\{/);
  assert.match(source, /forest-guard-token \$\{guardHatDecision !== null \? "fallen" : "alive"\}/);
  assert.match(source, /kind: "forest-guard"[\s\S]*title: "The Missing Guard"/);
  assert.doesNotMatch(source, /chooseGuardSpeaker\(movedUnit\.id\);\s*setExitReached\(true\)/);
  assert.match(source, /campaignScene !== 2 && campaignScene !== 3 && campaignScene !== 4 && campaignScene !== 8/);
  assert.doesNotMatch(source, /const exitSign/);
  assert.doesNotMatch(source, /ONE GUARD STILL BREATHES/);
});

test("game start uses the authored Opening Forest map", async () => {
  const source = await readGameSource();
  assert.match(source, /import openingForestMap from "\.\/opening-forest-map\.json"/);
  assert.match(source, /woodland: \{ id:"woodland"[\s\S]*terrain:openingForestTerrain[\s\S]*elevationFt:openingForestHeightMap/);
  assert.match(source, /battlefieldForState\(\{ campaign, campaignScene, mapVariant, trainingMap \}\)/);
  assert.match(source, /openingForestPartyStarts\.forEach/);
  assert.match(source, /const center = openingForestEnemyStarts\[0\]/);
  assert.match(source, /openingForestTrackTiles\.map/);
});

test("forest campaign maps use the reusable edge-aware visual renderer", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const forestVisualMapActive = openingForestMapActive \|\| ritualMapActive/);
  assert.match(css, /terrain-edge-n/);
  assert.match(source, /terrainVariant = \(x \* 17 \+ y \* 31\) % 4/);
  assert.match(source, /forest-tile-detail/);
  assert.match(css, /Campaign renderer v1/);
  assert.match(css, /forest-visual-board\.campaign-map \.tile-info \{ display: none; \}/);
  assert.match(css, /terrain-tree \.forest-tile-detail::after/);
  assert.match(source, /creatureSpriteClass/);
  assert.match(source, /dire-wolf-sprite/);
  assert.match(source, /werewolf-sprite/);
  assert.match(source, /werewolf-sprites-v3\.png/);
  assert.match(source, /forest-guard-token/);
  assert.match(css, /guard-breathe/);
  assert.match(source, /opening-forest-facade\.webp/);
  assert.match(source, /opening-forest-facade/);
  assert.match(css, /The JSON grid remains/);
  assert.match(css, /painted-map-facade \.forest-tile-detail \{ display: none; \}/);
});

test("every playable battlefield can use a painted facade over its logic grid", async () => {
  const source = await readGameSource();
  assert.match(source, /paintedMapFacadeActive = !!battlefield\.facade/);
  assert.match(source, /\/ritual-clearing-facade-v2\.webp/);
  assert.match(source, /\/village-defense-facade\.webp/);
  assert.match(source, /\/bridge-crossing-facade\.webp/);
  assert.match(source, /painted-map-facade/);
});

test("Undermountain keeps room-aware wall themes over one continuous floor plane", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /type DungeonVisualTheme/);
  assert.match(source, /const dungeonVisualThemeMap = Array\.from/);
  assert.match(source, /dungeon-theme-\$\{dungeonTheme\}/);
  assert.match(css, /The grid owns the floor paintings/);
  assert.match(css, /\.dungeon-board \.grid \{[\s\S]*dungeon-floor-cavern\.webp/);
  assert.match(css, /dungeon-structure-edge\.structure-edge-n/);
  assert.match(css, /dungeon-board \.tile-info \{ display: none; \}/);
  assert.match(source, /dungeon-structure-kit/);
  assert.doesNotMatch(source, /dungeon-corner-post/);
  assert.match(css, /dungeon-wall-atlas-v2-runtime\.png/);
  assert.doesNotMatch(css, /dungeon-structure-props\.png/);
  assert.match(css, /dungeon-kit-undertaker/);
});

test("the opening dungeon rooms use the shared continuous floor masked by void", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const dungeonOpeningArtZone = \{ left: 5, top: 52, width: 19, height: 15 \}/);
  assert.match(source, /dungeon-art-opening/);
  assert.match(css, /dungeon-floor-cavern\.webp/);
  assert.doesNotMatch(css, /undermountain-opening-ground-plate\.webp/);
  assert.match(css, /\.dungeon-board \.cell\.terrain-void[\s\S]*background: #080907 !important/);
});

test("poisoned bait victory keeps the clearing open until its marked walk-off exit", async () => {
  const source = await readGameSource();
  assert.doesNotMatch(source, /\(campaignScene === 2 \|\| campaignScene === 8\) &&\s*encounterCleared/);
  assert.match(source, /campaignScene === 3 \|\| campaignScene === 8\s*\? \{ x: 5, y: 1, label: "Moonlit Forest Path" \}/);
  assert.match(source, /const ritualExitTiles = Array\.from\(\{ length: 4 \}/);
  assert.match(source, /\[4, 5, 6\]\.map/);
  assert.match(source, /ritualExitKeys\.has\(key\(movedUnit\.x, movedUnit\.y\)\)/);
  assert.doesNotMatch(source, /const exitSign/);
  assert.doesNotMatch(source, /exit-ground-marker/);
  assert.match(source, /THE PACK IS DEAD/);
  assert.match(source, /Go to the village/);
  assert.match(source, /Go to the bridge — leave the village behind/);
  assert.doesNotMatch(source, /Keep exploring the clearing/);
});

test("ritual and poison routes share the authored Ritual Clearing map", async () => {
  const source = await readGameSource();
  assert.match(source, /import ritualClearingMap from "\.\/ritual-clearing-map\.json"/);
  assert.match(source, /campaignScene === 3 \|\| campaignScene === 8/);
  assert.match(source, /const poisonBodyTile = ritualClearingMap\.tiles/);
  assert.match(source, /className="poison-guard-body"/);
  assert.match(source, /const start = ritualEnemyStarts\[i\]/);
  assert.match(source, /const start = ritualPartyStarts\[i\]/);
  assert.match(source, /startPoisonBaitScene[\s\S]*?setRitualActive\(true\)/);
  assert.match(source, /\(campaignScene === 3 \|\| campaignScene === 8\) &&\s*ritualActive &&\s*active\?\.team === "hero" &&\s*attackDist\(active, ritualTile\) <= 1 &&\s*attackDist\(\{ x, y \}, ritualTile\) <= 1/);
  assert.match(source, /\(campaignScene === 3 \|\| campaignScene === 8\) && ritualSelected/);
});

test("the defended village preserves all three onward plans", async () => {
  const source = await readFile("app/page.tsx", "utf8");
  assert.match(source, /Continue to the bridge/);
  assert.match(source, /Find and cleanse the forest ritual/);
  assert.match(source, /Poison the wolves with the fallen guard or Jim/);
  assert.match(source, /completeCampaignScene\("deeper", "deeper_forest"\)/);
  assert.match(source, /completeCampaignScene\("poison", "poison_bait"\)/);
});

test("starting a new campaign immediately retires the previous autosave", async () => {
  const source = await readGameSource();
  assert.match(source, /const beginNewCampaign = \(\) => \{[\s\S]*?localStorage\.removeItem\(CAMPAIGN_SAVE_KEY\)[\s\S]*?setHasSave\(false\)[\s\S]*?setCampaign\(true\)[\s\S]*?setStage\("heroes"\)/);
  assert.match(source, /onClick=\{beginNewCampaign\}[\s\S]*?<b>New Campaign<\/b>/);
});

test("the in-game Menu button preserves and rechecks the campaign save", async () => {
  const source = await readGameSource();

  assert.match(source, /const restart = \(\) => \{\s*clearTransientTimers\(\);\s*const savedCampaignExists = !!localStorage\.getItem\(CAMPAIGN_SAVE_KEY\)/);
  assert.match(source, /setHasSave\(savedCampaignExists\)/);
  assert.match(source, /<button className="new-battle" onClick=\{restart\}>\s*Menu\s*<\/button>/);
  assert.doesNotMatch(source, /<button className="new-battle" onClick=\{restart\}>\s*New Battle/);
});

test("forest warning grants a setup round and a downed leader can be revived", async () => {
  const source = await readGameSource();

  assert.match(source, /setForestWarningRound\(round\)/);
  assert.match(source, /s\.round > s\.forestWarningRound/);
  assert.match(source, /setTurn\(0\)[\s\S]*setPhase\("move"\)/);
  assert.match(source, /const leaderDowned =/);
  assert.doesNotMatch(source, /\|\|\s*\(campaign &&\s*!!leaderId/);
  assert.match(source, /if \(leaderDowned\)[\s\S]*setLeaderAbandoned\(true\)/);
  assert.match(source, /THE THREAD OF FATE HAS BEEN SEVERED/);
  assert.match(source, /Revive the company leader before continuing the campaign/);
});

test("training woodland uses the authored Opening Forest map", async () => {
  const source = await readGameSource();

  assert.match(source, /woodland: \{ id:"woodland"[\s\S]*terrain:openingForestTerrain[\s\S]*elevationFt:openingForestHeightMap/);
  assert.match(source, /if \(!campaign\) return trainingMap === "gallery" \? "skirmish" : trainingMap/);
  assert.match(source, /!campaign && trainingMap === "woodland"/);
  assert.match(source, /blocked:openingForestSceneryBlocked/);
  assert.match(source, /if \(trainingMap === "woodland"\)[\s\S]*openingForestPartyStarts\.forEach/);
  assert.match(source, /const center = openingForestEnemyStarts\[0\]/);
  assert.match(source, /openingForestSceneryBlocked[\s\S]*\["rock", "water"\]\.includes\(tile\.kind\) \|\| tileIsExplicitlyBlocked\(tile\)/);
  assert.match(source, /villageSceneryBlocked[\s\S]*\["rock", "water"\]\.includes\(tile\.kind\) \|\| tileIsExplicitlyBlocked\(tile\)/);
  assert.match(source, /ritualSceneryBlocked[\s\S]*tileIsExplicitlyBlocked\(tile\) \|\| \["rock", "water"\]\.includes\(tile\.kind\)/);
  assert.doesNotMatch(source, /\["tree", "rock", "water"\]\.includes\(tile\.kind\)/);
});

test("story encounters use automatic panels and bridge continues to Level 1", async () => {
  const source = await readGameSource();
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  const dialoguePanel = await readFile(new URL("../app/dialogue-panel.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /campaignScene === 3 &&\s*encounterCleared/);
  assert.doesNotMatch(source, /\(campaignScene === 3 \|\| campaignScene === 6\) &&\s*encounterCleared/);
  assert.match(landmarks, /North Bridge Exit/);
  assert.match(source, /setExitReached\(true\)/);
  assert.match(source, /tutorial-recap-reviewed[\s\S]*continuePastBridge\(\)/);
  assert.match(source, /onClick=\{\(\) => startDungeonScene\(true\)\}/);
  assert.match(source, /onClick=\{\(\) => startBridgeScene\(\)\}>\s*Continue to the bridge/s);
  assert.match(source, /bridge-wayfarer/);
  assert.match(dialoguePanel, /dialogue-choice-prompt/);
  assert.match(dialoguePanel, /Choose a response/);
  assert.doesNotMatch(source, /dialogue-choice-bubble/);
  assert.match(source, /Congratulations on saving the village\. There's makings of a hero in you\. Take this\./);
  assert.doesNotMatch(source, /showDialogueBubble\(heroes\[0\]\.id, "Gross, did a troll cook this\?"\)/);
  assert.match(source, /setPoisonCutscene\(true\)/);
  assert.doesNotMatch(source, /A Stranger on the Bridge/);
  assert.doesNotMatch(source, /units\.some\(\(unit\) => unit\.id === "bridge-stranger"\)/);
});

test("ordinary progression applies immediately from shared XP", async () => {
  const source = await readGameSource();

  assert.match(source, /const awardDungeonXp[\s\S]*const shared = Math\.max\(1, Math\.floor\(enemyXp \/ heroes\.length\)\)/);
  assert.match(source, /const continuePastBridge = \(\) => \{/);
  assert.match(source, /setLevelReturn\("dungeon"\)/);
  assert.match(source, /tutorial-recap-reviewed[\s\S]*continuePastBridge\(\)/);
  assert.match(source, /destination === "dungeon"\) startDungeonScene\(false\)/);
});

test("the prologue recap appears only after the bridge and preserves Level 1 as delver orientation", async () => {
  const source = await readGameSource();
  assert.match(source, /campaignScene === 6 &&[\s\S]*?!firedMapEvents\.includes\("tutorial-recap-reviewed"\)/);
  assert.doesNotMatch(source, /segmentRecapVisible/);
  assert.match(source, /PROLOGUE COMPLETE/);
  assert.match(source, /Delver Orientation Awaits/);
  assert.match(source, /tutorial-completion-recap[\s\S]*openAchievementBox\(award\.id\)/);
  assert.match(source, /tutorialRecapChecklist/);
  assert.match(source, /heroCombatStats/);
  assert.match(source, /Party Hit Rate/);
  assert.match(source, /Abilities Used/);
  assert.match(source, /Damage Dealt/);
  assert.match(source, /Damage Taken/);
  assert.match(source, /className="combat-stat-grid"/);
  assert.match(source, /Open All \{achievements\.length\} Boxes/);
  assert.match(source, /tutorial-recap-reviewed/);
});

test("the bridge projector sign is click-only and does not reveal the wire trap", async () => {
  const source = await readGameSource();
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  assert.match(source, /A wooden sign hangs from the dead projector like a necklace: PAY TOLL AHEAD\.\.\. OR ELSE\./);
  assert.match(landmarks, /waystone:[\s\S]*id: "bridge-waystone"[\s\S]*x: 6, y: 6/);
  assert.match(source, /point\.id === "bridge-waystone"/);
  assert.doesNotMatch(source, /WIRE AT MIDSPAN/);
});

test("poison bait movement stays in the same cutscene generation", async () => {
  const source = await readGameSource();
  assert.match(source, /const poisonSequenceGeneration = beginSequence\(\);[\s\S]*?animateSceneWalk\(wolves\[i\]\.id,[\s\S]*?isSequenceCurrent\(poisonSequenceGeneration\)/);
  assert.match(source, /POISON_BAIT_ENEMY_TYPES = \[[\s\S]*"Werewolf"[\s\S]*"Dire Wolf"/);
  assert.match(source, /const speakingWerewolf = wolves\.find\(\(unit\) => unit\.role === "Werewolf"\)!/);
  assert.match(source, /showDialogueBubble\(speakingWerewolf\.id, POISON_BAIT_DIALOGUE\.scent[\s\S]*showDialogueBubble\(speakingWerewolf\.id, POISON_BAIT_DIALOGUE\.reaction/);
  assert.doesNotMatch(source, /Poisoned Wolf/);
  assert.match(source, /const generation = preparedGeneration \?\? beginSequence\(\)/);
});

test("opening forest ruins, abandoned-village bluff, and bridge chest have visible consequences", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(source, /id: "forest-ruin-marker"[\s\S]*x: 2,[\s\S]*y: 2/);
  assert.match(source, /forest-ruin-marker-prop/);
  assert.match(source, /Take the 5 gp/);
  assert.match(source, /\[consciousActive\.id\]: \[\.\.\.\(items\[consciousActive\.id\] \|\| \[\]\), "5 gp"\]/);
  assert.match(css, /\.forest-ruin-marker-prop/);
  assert.match(css, /forest-ruin-gold-cache\.png/);
  assert.match(encounters, /conditionalEffects:[\s\S]*id: "village-abandoned"[\s\S]*Nice try, we can hear the villagers screaming from here\. You're a monster\./);
  assert.match(source, /const conditionalEffects = choice\.conditionalEffects\?\.find/);
  assert.match(source, /effect\.kind === "start-combat"[\s\S]*gameTransitions\.startCombat\(\)/);
  assert.match(encounters, /The guards know the village was abandoned/);
  assert.match(source, /dungeon-chest-token bridge-default-chest/);
  assert.match(source, /data-chest-state=\{resolvedPoi\.includes\(poi!\.id\) \? "open" : "closed"\}/);
  assert.match(source, /Move a conscious hero beside the roadside cache before opening it\./);
  assert.match(css, /\.dungeon-chest-token[\s\S]*border-radius: 11px 11px 5px 5px/);
  assert.match(css, /\.dungeon-chest-token\[data-chest-state="open"\][\s\S]*treasure-chest-open\.png/);
});

test("the dialogue forge exposes both conditional bridge bluff outcomes", async () => {
  const catalog = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");
  const editor = await readFile(new URL("../app/DialogueEditor.tsx", import.meta.url), "utf8");
  assert.match(catalog, /If the village was saved/);
  assert.match(catalog, /choice\.conditionalEffects/);
  assert.match(editor, /"bridge-bandits": 4/);
});

test("the dialogue forge exposes complete club and manticore sequences", async () => {
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");
  const editor = await readFile(new URL("../app/DialogueEditor.tsx", import.meta.url), "utf8");
  assert.match(encounters, /entryVariants:[\s\S]*If the secret door opens normally[\s\S]*If someone trips over the power cable/);
  assert.match(encounters, /SECRET_CLUB_TOUR:[\s\S]*Station one:[\s\S]*Final station:/);
  assert.match(catalog, /effect\.kind === "secret-club-tour"[\s\S]*station\.aside[\s\S]*station\.reply/);
  assert.match(encounters, /quiz:[\s\S]*MANTICORE_SHOW_QUESTIONS[\s\S]*correctResponse[\s\S]*losingOutcome/);
  assert.match(catalog, /quiz\.questions\.forEach[\s\S]*quiz-outcome[\s\S]*quiz-win[\s\S]*quiz-loss/);
  assert.match(editor, /"secret-club": 4/);
  assert.match(editor, /"manticore-show": 3/);
});

test("the Dialogue Forge exposes item callbacks, shared continuations, special mechanics, and Nimraith", async () => {
  const forge = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(forge, /\[ITEM TRIGGER\] \$\{callback\.item\}/);
  assert.match(forge, /Automatic Item Trigger/);
  assert.match(forge, /SHARED CONTINUATION/);
  assert.match(forge, /authored tour stations followed by the room exit/);
  assert.match(forge, /Nimraith's Academic Suspension/);
  assert.match(encounters, /sharedSequences: \[\{ id: "realization"[\s\S]*sharedSequence: "realization"/);
  assert.match(encounters, /SECRET_CLUB_TOUR_COMPLETION[\s\S]*achievement:[\s\S]*items:[\s\S]*proficiency:[\s\S]*flags:/);
});

test("Flyndol and the Extremely Secret Club use the revised Forge dialogue", async () => {
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(encounters, /Thank you\.\.\. Come, children\./);
  assert.match(encounters, /Flyndol bites the volunteer, then pulls back with a satisfied smile\./);
  assert.doesNotMatch(encounters, /Fine\. We are apparently tonight's booking|unexpected guests/);
  assert.match(encounters, /Station three: the cage\. Little piggy goes in\. Click\. He does not come out\./);
  assert.match(encounters, /Station four: obedience\./);
});

test("Harria can hand the conversation to the golem", async () => {
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");
  assert.match(encounters, /id: "pay-gold"[\s\S]*consume-party-item", item: "25 gp"/);
  assert.match(encounters, /id: "glasses-seal"[\s\S]*Glasses of Good Questions[\s\S]*harria-speaking-to-golem/);
  assert.match(encounters, /id: "spellcaster-inspection"[\s\S]*hero-archetype[\s\S]*harria-speaking-to-golem/);
  assert.match(encounters, /id: "address-golem"[\s\S]*speaker: "golem"/);
  assert.match(encounters, /id: "ask-golem-memories"[\s\S]*id: "free-golem"[\s\S]*id: "call-golem-monster"[\s\S]*id: "return-to-harria"/);
  assert.match(catalog, /phaseFlags[\s\S]*phaseHubs[\s\S]*Continue conversation/);
});

test("opening forest shrine is click-only and wolf-track progression cannot be skipped by simultaneous discovery", async () => {
  const source = await readGameSource();
  assert.match(source, /point\.id === "forest-ruin-marker"[\s\S]*point\.id === "gold-cache"[\s\S]*point\.id === "dead-mage"[\s\S]*return \[\]/);
  assert.match(source, /const forestTrackDiscovery = newlyFound\.find\([\s\S]*?foundPoint\.id === "forest-wolf-tracks"/);
  assert.match(source, /if \(forestTrackDiscovery\) \{[\s\S]*?setForestWarningRound\(round\)/);
});

test("dungeon XP is divided equally and a level-up fully heals the party", async () => {
  const source = await readGameSource();
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(source, /const shared = Math\.max\(1, Math\.floor\(enemyXp \/ heroes\.length\)\)/);
  assert.doesNotMatch(source, /finisherBonus/);
  assert.match(source, /const nextXp = \(unit\.xp \|\| 0\) \+ shared/);
  assert.match(source, /hp: maxHp,[\s\S]*downed: false/);
  assert.match(source, /previousClassSkill[\s\S]*nextClassSkill[\s\S]*maxCharges/);
  assert.match(source, /awardPeaceXp\(scene\.roomLabel\)/);
  assert.match(encounters, /roomLabel: "39c"[\s\S]*kind: "award-peace-xp"/);
});

test("the full conversion starts a clean version-two campaign save", async () => {
  const source = await readGameSource();
  const audit = await readFile(new URL("../app/campaign-state-audit.ts", import.meta.url), "utf8");
  assert.match(audit, /CAMPAIGN_SAVE_SCHEMA_VERSION = 2/);
  assert.match(audit, /CAMPAIGN_SAVE_KEY = "shattered-crown-campaign-v2"/);
  assert.match(source, /schemaVersion: CAMPAIGN_SAVE_SCHEMA_VERSION/);
  assert.match(source, /if \(!isCurrentCampaignSave\(s\)\)/);
});

test("Room 1 keeps only useful interactions and omits the ledger, rope, and expedition pack", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /question-statue[\s\S]*x: 20, y: 55/);
  assert.match(css, /\.wearing-good-question-glasses::after[\s\S]*question-glasses-sprite\.png/);
  assert.doesNotMatch(source, /entry-rope|orientation-intake-ledger/);
  assert.doesNotMatch(source, /entry-gear/);
  assert.doesNotMatch(source, /entry-expedition-pack/);
  assert.doesNotMatch(source, /entry-well-rope/);
  assert.match(source, /Leave the Glasses/);
  assert.match(source, /halaster-entry-warning/);
  assert.match(source, /GOBLIN WAAAAAHHH!/);
});

test("only Rogues automatically detect and mark hidden traps", async () => {
  const source = await readGameSource();
  const poiRegistry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  assert.match(source, /point\.kind === "trap"[\s\S]*hero\.role === "Rogue" && attackDist\(hero, point\) <= 2/);
  assert.match(source, /Rogue instincts automatically mark/);
  assert.doesNotMatch(source, /case "disarm-trap"/);
  assert.doesNotMatch(poiRegistry, /Disarm Trap — Rogue|"disarm-trap"/);
});

test("the one-click Tester has Walker visuals, four test spells, and infinite movement", async () => {
  const source = await readGameSource();
  assert.match(source, /name: "Avada Kedavra"/);
  assert.match(source, /unlimited: true/);
  assert.match(source, /instakill: true/);
  assert.match(source, /const addTester = \(\) =>/);
  assert.match(source, /name: "Tester"[\s\S]*role: "Barbarian"[\s\S]*Sanctuary[\s\S]*Fireball[\s\S]*playtestMapWideRevive[\s\S]*playtestKillingCurse/);
  assert.match(source, /Run it Back, Turbo[\s\S]*range: 999[\s\S]*power: 999999[\s\S]*unlimited: true[\s\S]*mapWide: true/);
  assert.match(source, /ensureTesterRevive[\s\S]*unit\.id === "custom-hero" && unit\.name === "Tester"/);
  assert.match(source, /setCustom\(s\.custom \? \{ \.\.\.s\.custom, skills:[\s\S]*ensureTesterRevive/);
  assert.match(source, /sk\?\.mapWide \|\| attackDist\(active, target\)/);
  assert.match(source, /sk\?\.mapWide \|\| clearLine\(active, target\)/);
  assert.match(source, /active\.id === "custom-hero"/);
  assert.match(source, /onClick=\{addTester\}/);
  assert.doesNotMatch(source, /Create Custom Tester|customCheat/);
  assert.match(source, /showCombatBark\(active\.id, "Avada Kedavra!"/);
  assert.match(source, /const curseTargets = units\.filter/);
  assert.match(source, /new Set\(curseTargets\.map/);
  assert.match(source, /every enemy anywhere on the map/);
});

test("bridge exploration visibly walks every hero before the exit completes", async () => {
  const source = await readGameSource();
  assert.match(source, /const animatedBridgeExplorationWalk =[\s\S]*campaignScene === 6[\s\S]*encounterMode === "exploration"[\s\S]*traveledSteps\.length > 1/);
  assert.doesNotMatch(source, /animatedBridgeExplorationWalk =[\s\S]*active\.id === "custom-hero"/);
  assert.match(source, /animatedDust2Walk = dust2MapActive && traveledSteps\.length > 0/);
  assert.match(source, /animateComputedMove\(active, travelPath, movedUnit, finalMovedUnits, animatedDust2Walk \? 75 : 140\)/);
  assert.match(source, /if \(animatedBridgeExplorationWalk\) scheduleCutscene\(completeActiveExit, animatedWalkDuration\)/);
});

test("named heroes use their new sprite sheets", async () => {
  const equipment = await readFile(new URL("../app/equipment-visuals.ts", import.meta.url), "utf8");
  assert.match(equipment, /unit\.name === "Dwarf Survivor" \|\| unit\.name === "Gromm"[\s\S]*gromm-sprites\.png/);
  assert.match(equipment, /unit\.name === "Veyra"[\s\S]*veyra-sprites\.png/);
  assert.match(equipment, /unit\.name === "Alric"[\s\S]*alric-sprites\.png/);
});

test("every playable hero class and village NPC has a sprite sheet", async () => {
  const source = `${await readGameSource()}\n${await readFile(new URL("../app/equipment-visuals.ts", import.meta.url), "utf8")}`;
  for (const [role, prefix] of [["Barbarian", "walker"], ["Bard", "lark"], ["Cleric", "gromm"], ["Druid", "rowan"], ["Fighter", "alric"], ["Wizard", "veyra"], ["Rogue", "shade"], ["Sorcerer", "cinder"]])
    assert.match(source, new RegExp(`${role}: "${prefix}"`));
  for (const asset of ["villager", "wayfarer"])
    assert.match(source, new RegExp(`/${asset}-sprites\\.png`));
});

test("village bunker uses a continuous floor plate and destructible scenery can be attacked", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /villageInteriorArt = villageMapActive && x >= 8 && x <= 13 && y >= 7 && y <= 11/);
  assert.match(css, /village-bunker-interior-floor\.webp/);
  assert.match(source, /barrierTarget && phase === "action" && chosen\?\.kind === "attack"/);
  assert.match(source, /setPhase\("facing"\)/);
  assert.match(source, /barrier-targetable/);
});

test("authored landmarks and village furniture render as walkable scenery instead of generic icons", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const mapRendering = await readFile(new URL("../app/map-rendering.ts", import.meta.url), "utf8");

  assert.match(source, /createDungeonSceneryProps/);
  assert.match(source, /"question-statue": \{ atlas: "dungeon-a", slot: 0/);
  assert.doesNotMatch(source, /roomProp\("bone-throne"/);
  assert.doesNotMatch(source, /roomProp\("demon-reliefs"/);
  assert.doesNotMatch(source, /roomProp\("shield-eye"/);
  assert.doesNotMatch(source, /roomProp\("manticore-nests"/);
  assert.doesNotMatch(source, /roomProp\("goblin-marionette"/);
  assert.doesNotMatch(source, /roomProp\("shattered-statue"/);
  assert.match(source, /"19a": \["fresh-meat-table"\]/);
  assert.match(source, /"fresh-meat-table": \{ atlas: "dungeon-d", slot: 3/);
  assert.doesNotMatch(source, /roomProp\("floating-candles", "26a"/);
  assert.match(source, /VILLAGE_SCENERY_PROPS: SceneryProp\[\]/);
  assert.match(source, /id: "communal-table"/);
  assert.match(source, /poiProp \? "poi-has-scenery-art"/);
  assert.match(mapRendering, /wearing-good-question-glasses/);
  assert.match(css, /dungeon-landmarks-a\.webp/);
  assert.match(css, /dungeon-landmarks-b\.webp/);
  assert.match(css, /dungeon-landmarks-c\.webp/);
  assert.match(css, /dungeon-landmarks-d\.webp/);
  assert.match(css, /dungeon-landmarks-e\.webp/);
  assert.match(css, /village-furniture-atlas\.webp/);
  assert.match(css, /\.map-scenery-prop[\s\S]*?pointer-events: none/);
  assert.match(source, /const dungeonSceneryPropsByTile = indexSceneryProps\(dungeonSceneryProps, key\)/);
  assert.match(source, /const villageSceneryPropsByTile = indexSceneryProps\(VILLAGE_SCENERY_PROPS, key\)/);
  assert.doesNotMatch(source, /dungeonSceneryProps\.filter/);
  assert.doesNotMatch(source, /villageSceneryProps\.filter/);
});

test("CC111 lures the party onto the final message square", async () => {
  const [source, poiRegistry, css] = await Promise.all([
    readGameSource(),
    readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /id: "ten-thousand-steps-message", name: "Dungeon Message", x: 28, y: 110[\s\S]*text: "Get your 10k steps\."/);
  assert.match(poiRegistry, /"ten-thousand-steps-message"[\s\S]*visibility: "always", action: "move-onto"/);
  assert.match(css, /\.poi-token\.poi-id-ten-thousand-steps-message/);
});

test("authored monsters use production sprite sheets", async () => {
  const source = `${await readGameSource()}\n${await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8")}`;
  for (const role of ["Goblin", "Dire Wolf", "Bugbear", "Grell", "Flesh Golem", "Manticore", "Living Shroud", "Gelatinous Cube", "Air Elemental", "Grick Alpha", "Ettin", "Large Mimic"])
    assert.ok(source.includes(role));
  assert.match(source, /MONSTER_SPRITE_SHEETS/);
  assert.match(source, /monster-goblin-sprites\.png/);
  assert.match(source, /monster-living-shroud-sprites\.png/);
  assert.match(source, /monster-gelatinous-cube-sprites\.png/);
  assert.match(source, /monster-grick-alpha-sprites\.png/);
});

test("24b merges Nimraith's puppet punishment with the dead mage clues and item dialogue", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const scenes = await readFile(new URL("../app/scene-content.ts", import.meta.url), "utf8");
  assert.match(source, /socialScene\.kind === "dead-mage"[\s\S]*NIMRAITH_QUESTIONS/);
  assert.match(source, /Nimraith's Academic Suspension/);
  assert.match(scenes, /trans vampires in the hidden velvet club keep the Stone-box Key/);
  assert.match(scenes, /Ball Cap of Bad Ideas/);
  assert.match(scenes, /Wife-Beater of Questionable Resilience/);
  assert.match(scenes, /id: "priority"[\s\S]*shortest useful version\." \}/);
  assert.match(scenes, /id: "classroom"[\s\S]*second lets Professor Grin conduct the practical\." \}/);
  assert.match(source, /priorQuestions \+ 1 >= 5/);
  assert.doesNotMatch(source, /const dismissNimraith/);
  assert.match(source, /The fifth answer leaves his mouth; the strings snap upward and carry him away/);
  const forge = await readFile(new URL("../app/dialogue-forge-catalog.ts", import.meta.url), "utf8");
  assert.match(forge, /sourceInteractionId: "dead-mage"[\s\S]*NIMRAITH_QUESTIONS/);
  assert.doesNotMatch(source, /speakSocialLine\(prompt, heroId\)/);
  assert.doesNotMatch(rooms, /"23a": \{/);
  assert.match(rooms, /"24b": \{ title: "Nimraith's Academic Suspension"/);
  assert.match(rooms, /"24a": \{ title: "Dweomercore Remedial Classroom"/);
  assert.match(rooms, /"23c": \{ title: "The Last Camp"/);
  assert.match(source, /const schoolArtZone = \{ left: 3, top: 74, width: 4, height: 5 \}/);
  assert.match(source, /const schoolFloorZone = \{ left: 3, top: 74, width: 4, height: 5 \}/);
  assert.doesNotMatch(source, /schoolRoomTiles/);
  assert.match(source, /dungeon-art-school-nightmare/);
  assert.match(source, /"23c": \["failed-expedition-camp"\]/);
});

test("the Ball Cap can bond with the black goo statue and grant stealth", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const registry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  const items = await readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8");
  assert.match(registry, /bond-black-statue[\s\S]*Bond With It — Ball Cap/);
  assert.match(registry, /case "bond-black-statue": return context\.hasBallCap/);
  assert.match(source, /case "bond-black-statue"[\s\S]*grantDungeonLoot\(consciousActive\.id, \["Emo Outfit"\]\)/);
  assert.match(source, /stealthBonus: Math\.max\(10[\s\S]*Emo Bonding grants \+10 Stealth/);
  assert.match(items, /"Emo Outfit"[\s\S]*\+10 Stealth[\s\S]*slot: "body"[\s\S]*visualMode: "sprite-filter"/);
  assert.match(css, /walker-sprite\.emo-outfit-equipped/);
});

test("wolf-touched heroes translate Dire Wolves and Werewolves", async () => {
  const source = await readGameSource();
  assert.match(source, /inspected\.role === "Dire Wolf" \|\| inspected\.role === "Werewolf"/);
  assert.match(source, /heroHasItem\(unit\.id, "Werewolf Lycanthropy"\)/);
  assert.match(source, /The little curse inside you recognizes its elder/);
  assert.match(source, /<b>\{wolfTranslation\.interpreterName\} understands:<\/b>/);
  assert.match(source, /The moon-bitten one smells like us/);
});

test("the functional school runs a pass-or-fight quiz with a hidden student warning", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const scenes = await readFile(new URL("../app/scene-content.ts", import.meta.url), "utf8");

  assert.match(scenes, /const SCHOOL_QUIZ_QUESTIONS/);
  assert.match(source, /Dweomercore Remedial Diploma/);
  assert.match(source, /schoolQuizMistakes >= 1[\s\S]*triggerSchoolNightmare/);
  assert.match(source, /Incorrect\. Entirely salvageable\./);
  assert.match(source, /DIPLOMA AWARDED[\s\S]*Violence remains an accredited learning outcome/);
  assert.match(source, /Class dismissed\. Miraculously\./);
  assert.match(source, /completeEncounter\("24a", "Dweomercore Remedial Classroom", "peace", "retain"\)/);
  assert.match(source, /school-nightmare[\s\S]*Nightmare Clown/);
  assert.match(source, /Glasses: Professor Vale expects this answer/);
  assert.match(scenes, /first mistake[\s\S]*second lets Professor Grin/);
  assert.match(css, /\.dungeon-board \.grid \{[\s\S]*dweomercore-classroom-4x5-clean\.webp/);
  assert.doesNotMatch(css, /cell\[data-coordinate="H76"\]::before/);
});

test("Vale wrong answers cannot strand the dialogue controller", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const controller = await readFile(new URL("../app/use-school-dialogue-controller.ts", import.meta.url), "utf8");
  const firstMiss = source.slice(source.indexOf("const answerSchoolQuiz"), source.indexOf("const scriptedEncounter"));
  const nightmare = source.slice(source.indexOf("const triggerSchoolNightmare"), source.indexOf("const answerSchoolQuiz"));
  assert.match(firstMiss, /showProfessorGrinGlimpse\("Incorrect\. Entirely salvageable\.", question\.prompt\)/);
  assert.match(controller, /speaker: "Professor Vale" \| "Professor Grin" = "Professor Grin"[\s\S]*1400/);
  assert.match(controller, /questionProfessorValeCurriculum[\s\S]*setStep\(0\)[\s\S]*setMistakes\(1\)[\s\S]*SCHOOL_QUIZ_QUESTIONS\[0\]\.prompt/);
  assert.doesNotMatch(controller, /speakSocialLine/);
  assert.doesNotMatch(firstMiss, /showDialogueBubble/);
  assert.match(nightmare, /No\. No more guessing\. Let us start the class properly\./);
  assert.match(nightmare, /\[true, false, true, false, true\][\s\S]*setSchoolTransformationFlash/);
  assert.match(nightmare, /schoolNightmareCompletionTimerRef\.current = setTimeout[\s\S]*gameTransitions\.startCombat\(\)[\s\S]*2780/);
  assert.doesNotMatch(nightmare, /showDialogueBubble/);
  assert.match(source, /professorGrinVisible \|\| socialScene\.speaker === "Professor Grin" \? "\/professor-grin\.png"/);
  assert.match(source, /Something underneath Vale’s smile looks back/);
  assert.match(source, /“Start the class\.”/);
  assert.match(source, /questionProfessorValeCurriculum}>“What have you taught us\?”/);
  assert.match(source, /Answer all three correctly to pass the class\./);
  assert.doesNotMatch(source, /A second mistake begins the practical exam/);
  assert.match(css, /active-unit \.walker-sprite:not\(\.emo-outfit-equipped\)/);
});

test("room 34 is a food-filled dwarven pantry", async () => {
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const visuals = await readFile(new URL("../app/visual-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const pantryArt = await readFile(new URL("../public/room-34-pantry-goods.png", import.meta.url));
  const flourSack = await readFile(new URL("../public/pantry-flour-sack.png", import.meta.url));
  assert.match(rooms, /"34": \{ title: "Dwarven Pantry"[\s\S]*Produce crates, grain sacks, bread, cheese, and small provision barrels/);
  assert.match(css, /room-34-pantry-room-v2\.png/);
  const source = await readGameSource();
  const items = await readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8");
  assert.match(source, /id: "pantry-bag-of-flour", name: "Bag of Flour"[\s\S]*pantryTeleportTrap\.feastPoint/);
  assert.match(source, /drop\.id === "pantry-bag-of-flour"[\s\S]*pantry-flour-collected/);
  assert.match(source, /restoredDropsWithFlour[\s\S]*pantry-flour-collected[\s\S]*Bag of Flour/);
  assert.match(source, /drop\.name === "Bag of Flour" \? ""/);
  assert.match(css, /flour-bag-token[\s\S]*pantry-flour-sack-pixel-v2\.png/);
  assert.doesNotMatch(source, /drop\.name === "Bag of Flour" \? "FLOUR"/);
  assert.match(items, /"Bag of Flour"[\s\S]*Gromm needs it/);
  assert.doesNotMatch(visuals, /room-34-back-wall-feast/);
  assert.ok(pantryArt.length > 300_000);
  assert.ok(flourSack.length > 8_000);
});

test("playtest-reported scene handoffs, bridge dialogue, classroom bounds, and manticore stage stay repaired", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  assert.match(source, /nextRoute === "deeper_forest"\) startRitualScene\(level\)/);
  assert.match(source, /nextRoute === "return_to_town"\) startVillageScene\(level\)/);
  assert.doesNotMatch(source, />Keep exploring the clearing</);
  assert.match(source, /\{bubble\?\.persistent \? \(/);
  assert.match(source, /: bubble && !socialScene \? \(/);
  assert.match(source, /\{socialScene && !bubble\?\.persistent && !victory && !defeat && \(/);
  assert.match(source, /dungeonRoomLabels\.get\(key\(x, y\)\) !== "24b"/);
  assert.match(landmarks, /classroomDoorway:[\s\S]*point: \{ x: 6, y: 75 \}[\s\S]*hallPoint: \{ x: 7, y: 75 \}/);
  assert.match(source, /const schoolDoorwayY = DUNGEON_LANDMARKS\.classroomDoorway\.point\.y/);
  assert.match(source, /const schoolEntryPoint = DUNGEON_LANDMARKS\.classroomDoorway\.point/);
  assert.match(source, /label === "24a"[\s\S]*\? schoolEntryPoint/);
  assert.match(source, /school-class-started/);
  assert.match(source, /autoEnteredSchool/);
  assert.match(source, /reaches the classroom doorway at H76\. The company files slowly through G76/);
  assert.match(source, /animateSceneWalk\(unitId, \[\.\.\.hallwayPath, roomDoor, \.\.\.deskPath\], index \* 160, 340\)/);
  assert.match(source, /setAmbientMessage\("CLASS BELL RINGS"\)/);
  assert.match(source, /showDialogueBubble\(teacher\.id, "Settle down, students\."/);
  assert.match(source, /label === "24a"[\s\S]*inSchoolFloorZone\(position\.x, position\.y\)/);
  assert.match(source, /playerView\.visibleNow\.forEach\(\(visible, index\)/);
  assert.match(source, /crossesSchoolWall/);
  assert.match(source, /classroom-east-wall/);
  assert.match(source, /classroomEastWall \? "dungeon-edge-e"/);
  assert.doesNotMatch(source, /"dungeon-edge-e classroom-east-wall"/);
  assert.match(source, /currentDungeonWallCrossings/);
  assert.match(source, /id: "dead-mage"[\s\S]*x: 8, y: 76/);
  assert.match(source, /classroom-doorway-room/);
  assert.match(css, /dweomercore-classroom-4x5-clean\.webp/);
  assert.match(css, /\.classroom-doorway-room::after/);
  assert.match(source, /Professor Grin is hostile\. Attack selected/);
  assert.match(source, /clearSequence\(\);[\s\S]*setInspect\(null\);[\s\S]*school-nightmare/);
  assert.match(source, /manticoreStageTile \? "manticore-judges-stage"/);
  assert.match(css, /\.dungeon-board \.grid \{[\s\S]*manticore-stage-5x5\.webp/);
  assert.match(css, /\.choice-dialogue-panel[\s\S]*width: min\(860px/);
  assert.match(css, /\.portrait-dialogue-panel \{[\s\S]*left: 50%;[\s\S]*bottom: clamp/);
});

test("playtest can reset the whole map without ambient creatures interrupting movement", async () => {
  const source = await readGameSource();

  assert.match(source, /Reset Map/);
  assert.match(source, /onClick=\{\(\) => startDungeonScene\(true\)\}/);
  assert.match(source, /playtest && campaignScene === 7 \? units : \[\]/);
  assert.match(source, /\.\.\.existing,[\s\S]*hp: existing\.maxHp,[\s\S]*downed: false/);
  assert.match(source, /\.\.\.\(items\[hero\.id\] \|\| \[\]\)[\s\S]*"Ration"/);
  assert.doesNotMatch(source, /playtest \? \["Ration"\]/);
  assert.match(source, /Character inventory and progression are preserved/);
  assert.doesNotMatch(source, /scurryingRat|scurrying-rat|rat-dart/);
});

test("destructible doors and windows are directly targetable and still block crossing", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const attackBarrierTarget = \(barrier: Barrier\)/);
  assert.match(source, /onClick=\{barrier\?\.hp \? \(event\) => \{[\s\S]*attackBarrierTarget\(barrier\)/);
  assert.match(source, /buildVillageSightCrossings/);
  assert.match(source, /barrier\.hp > 0[\s\S]*barrier\.edgeKey === edgeKey/);
  assert.match(css, /village-edge\.interactive-barrier[\s\S]*pointer-events: auto/);
});

test("playtest teleport stays active and never routes movement", async () => {
  const source = await readGameSource();
  const branch = source.match(/if \(mapPlaytest && teleportMode\) \{[\s\S]*?\n    \}/)?.[0] || "";
  assert.match(branch, /setUnits\(\(current\) =>/);
  assert.doesNotMatch(branch, /moveAlongRoute/);
  assert.doesNotMatch(branch, /setTeleportMode\(false\)/);
  assert.match(source, /Resume Normal Movement/);
  assert.match(branch, /Teleport remains active/);
  assert.match(branch, /\.filter\(\(point\) => !currentBlocked\.has[\s\S]*!units\.some/);
  assert.match(branch, /const landing = Array\.from/);
});

test("locked dialogue choices are hidden rather than shown disabled", async () => {
  const source = await readGameSource();
  assert.match(source, /scriptedEncounter\?\.choices\.filter\(encounterRequirementMet\)\.map/);
  assert.doesNotMatch(source, /disabled=\{!available\}/);
});

test("Level 1 uses one continuous painted floor beneath visible themed walls", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.dungeon-board \.grid \{[\s\S]*dungeon-floor-cavern\.webp/);
  assert.match(css, /terrain-dungeon-floor:not\(\.fogged\) \{[\s\S]*overflow: visible/);
  assert.match(css, /dungeon-structure-kit[\s\S]*z-index: 1/);
  assert.match(css, /dungeon-kit-undertaker/);
  assert.match(css, /dungeon-kit-cavern/);
  assert.match(css, /dungeon-kit-arcane/);
});

test("Rooms 6a through 6e form a gated secret-club wing", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const registry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  const map = JSON.parse(await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8"));

  assert.match(source, /const undertakerSecretDoor = \{ x: 14, y: 46 \}/);
  assert.match(rooms, /"6c": \{ radius: 0, triggerTiles: \[\{ x: 14, y: 46 \}\], requiresFlags: \["undertaker-secret-door-open"\]/);
  assert.doesNotMatch(rooms, /"6d":/);
  assert.match(rooms, /"6e": \{ requiresFlags: \["undertaker-secret-door-open"\]/);
  assert.match(source, /name: "The Three Lords"/);
  assert.match(registry, /three-lords-wall-relief\.png/);
  assert.match(source, /Turn the Silent Lord/);
  assert.match(source, /undertaker-statue-solved", "undertaker-secret-door-open/);
  assert.match(source, /setRevealedTiles\(\(tiles\) => \[\.\.\.new Set\(\[\.\.\.tiles, \.\.\.undertakerClubTiles, key\(14, 46\), key\(15, 46\)\]\)\]\)/);
  assert.match(source, /if \(label === "6c"\) \{ revealClubHostsAtSecretDoor\(firedMapEvents\.includes\("undertaker-alerted"\)\); return; \}/);
  assert.match(source, /routeTo\(active, x, y, active\.role === "Club Hostess"\)/);
  assert.match(source, /if \(attackRange > 1\)[\s\S]*setProjectile/);
  assert.match(await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8"), /"Club Hostess": monster\("Club Hostess"[\s\S]{0,260}range:5[\s\S]{0,180}ai:"skirmisher"/);
  assert.match(source, /Loud rave music spills into the hall/);
  assert.match(source, /name: "Loose Power Cable"/);
  assert.match(encounters, /You trip over the power cable\. Heels, chains, and furious shouting thunder toward the hidden exit\./);
  assert.match(source, /ceramic-alarm-sounded[\s\S]*undertaker-secret-door-open[\s\S]*undertaker-alerted/);
  assert.match(source, /if \(!effect\) \{[\s\S]*encounterChoiceBusyRef\.current = false/);
  assert.match(source, /Resume Club Conversation/);
  assert.match(source, /"room-encounter-spawned-6c"/);
  assert.match(source, /current\.some\(\(notice\) => notice\.kind === "halaster" && notice\.text === text\)/);
  assert.match(rooms, /"6c": \["Countess Velvet", "Lady Fangirl", "Mistress Maybe", "DJ Bitey"\]/);
  assert.doesNotMatch(encounters, /id: "hat-vip"|id: "glasses-boundaries"/);
  assert.match(encounters, /id: "spellcaster-inspection"[\s\S]*hero-archetype[\s\S]*harria-golem-inspection-bluff/);
  assert.match(encounters, /This hand remembers bread[\s\S]*This chest remembers singing/);
  assert.match(encounters, /Want first\. Before pieces/);
  assert.match(encounters, /kind: "walk-away"[\s\S]*destination: \{ x: 10, y: 28 \}[\s\S]*Harria stomps after the departing golem[\s\S]*Get back here![\s\S]*kind: "dismiss-group"/);
  assert.match(source, /key: "undertaker-club-combat"[\s\S]*title: "Killed the Vibe"/);
  assert.match(source, /name: reward\.label === "6c" \? "Velvet Lockbox"/);
  assert.match(source, /Stone-box Key and Dwarven Signet Ring/);
  for (const y of [50, 51, 52]) assert.equal(map.tiles[y * map.width + 18].kind, "dungeon");
  assert.match(source, /const undertakerClubArtZone = \{ left: 8, top: 41, width: 6, height: 9 \}/);
  assert.match(source, /key\(12, 50\)/);
  assert.match(rooms, /"6a"[\s\S]*Undertaker Coin Purse/);
  assert.match(rooms, /"6e": \{ title: "Secret Door"/);
});

test("the secret-club cable is one entrance alarm and never queues Halaster through the tour", async () => {
  const source = await readGameSource();
  assert.match(source, /ceramicAlarm && \([\s\S]*ceramic-alarm-sounded[\s\S]*resolvedPoi\.includes\("ceramic-alarm"\)/);
  assert.doesNotMatch(source, /ceramic-alarm-east/);
  assert.match(source, /if \(ceramicAlarm\) showCombatBark\(hero\.id, "That was an alarm\.", 2200\);\s*else mockTrapVictim/);
});

test("campaign state repair and custom Level 1 scenes live outside the board component", async () => {
  const source = await readGameSource();
  const audit = await readFile(new URL("../app/campaign-state-audit.ts", import.meta.url), "utf8");
  const completion = await readFile(new URL("../app/encounter-completion.ts", import.meta.url), "utf8");
  const scenes = await readFile(new URL("../app/scene-content.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(source, /repairCampaignState<Unit>/);
  assert.match(source, /completeEncounter\(scene\.roomLabel, scene\.title, "peace", effect\.retain \? "retain" : "remove"\)/);
  assert.match(source, /completeEncounter\("6c", "The Extremely Secret Club", "special", completion\.actorDisposition\)/);
  assert.match(audit, /partial-poi-resolution/);
  for (const room of ["5", "16", "19c"])
    assert.match(audit, new RegExp(`"${room}":`));
  assert.match(completion, /encounter-outcome:/);
  assert.match(encounters, /SECRET_CLUB_TOUR/);
  assert.match(source, /setEncounterSequenceLabel\("Finish the Club Evacuation"\)[\s\S]*showDialogueBubble\("dungeon-6c-0"[\s\S]*showDialogueBubble\("dungeon-6c-3"/);
  assert.match(source, /setEncounterSequenceLabel\("Meet the Club Hosts"\)[\s\S]*showDialogueBubble\([\s\S]*entryBubbles\[0\]/);
  assert.match(source, /showDialogueBubble\(hostId, station\.line[\s\S]*setAmbientMessage\(station\.aside\)[\s\S]*showDialogueBubble\(heroId, station\.reply/);
  assert.match(encounters, /SECRET_CLUB_TOUR_TIMING/);
  assert.match(scenes, /NIMRAITH_QUESTIONS/);
  assert.doesNotMatch(source, /Station one: the X-frame/);
});

test("dungeon rewards are visible pickups with useful weapon actions", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");

  assert.match(source, /id: `room-loot-\$\{label\}-\$\{index\}`/);
  assert.match(source, /grantDungeonLoot\(active\.id, \[drop\.name\]\)/);
  assert.match(source, /"Light Crossbow"/);
  assert.doesNotMatch(rooms, /"9b":/);
  assert.match(source, /"Hurl Handaxe"[\s\S]*unlimited: true/);
  assert.match(source, /"Staff Trip"[\s\S]*unlimited: true/);
  assert.doesNotMatch(source, /id: "heart-box"/);
  assert.match(source, /id: DUNGEON_LANDMARKS\.heartAcid\.id[\s\S]*DUNGEON_LANDMARKS\.heartAcid\.mountPoint/);
  assert.match(source, /Insert Stone-box Key/);
  assert.match(source, /KEY ACCEPTED · STONE BOX OPEN · POTION OF SPEED RELEASED/);
  assert.match(source, /id: "heart-speed-potion", name: "Potion of Speed"/);
  assert.match(source, /"Potion of Speed"[\s\S]*stats: \{ move: 1 \}/);
  assert.match(source, /unit\.move \+= dungeonBonus\.move \|\| 0/);
  assert.doesNotMatch(source, /grantDungeonLoot\(active\.id, \["Healing Potion"\]\)[\s\S]{0,500}heart-speed-potion/);
  assert.doesNotMatch(rooms, /"14c":/);
  assert.doesNotMatch(source, /dungeonRoomPoints\.get\("14c"\)/);
  assert.match(source, /contents\?: string\[\]/);
  assert.match(source, /room-loot-\$\{label\}-chest/);
  assert.match(source, /claimChestItem/);
});

test("Level 1 room cleanup keeps encounter art honest and monsters inside authored rooms", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /id: "dretch-relief"/);
  assert.match(source, /id: "western-secret-panel-14-61"/);
  assert.match(source, /const westernSecretDoor = \{ x: 14, y: 61 \}/);
  assert.match(source, /const undertakerAlarmTiles = \[\{ x: 14, y: 50 \}\]/);
  assert.match(source, /pendingRoomEntries[\s\S]*pendingDungeonRoomEntryAt\(step, movementEventFlags\)[\s\S]*firstRoomEntryIndex/);
  assert.match(source, /firstStopIndex >= 0 \? route\.path\.slice\(0, firstStopIndex \+ 1\)/);
  assert.match(source, /setMovementSpent\(effectiveMovement\(active\) \* \(dashActive \? 2 : 1\)\)/);
  assert.match(source, /"16": \[\{ x: 21, y: 28 \}/);
  assert.doesNotMatch(source, /"28b": \[\{ x: 22, y: 69 \}/);
  assert.match(source, /for \(const candidate of dungeonEncounterSpawns\[label\]/);
  assert.match(source, /candidates\.length < roomMonsters\.length/);
  assert.match(source, /room-encounter-spawned-\$\{label\}/);
  assert.doesNotMatch(rooms, /"23a": \{/);
  assert.doesNotMatch(rooms, /"28b"[^\n]*monsters:/);
  assert.match(css, /\.token\.manticore-large-token/);
  assert.match(source, /u\.role === "Manticore" \? "manticore-large-token"/);
  assert.doesNotMatch(source, /unit\.role === "Manticore"[\s\S]*?\[\{ x, y \}, \{ x: x \+ 1, y \}\]/);
  assert.match(css, /\.token\.manticore-large-token \{[\s\S]*width: 100%[\s\S]*height: 100%/);
  assert.doesNotMatch(css, /\.dungeon-board \.cell:has\(\.manticore-large-token\)/);
  assert.match(source, /unit\.role === "Ettin" && unit\.encounterGroup === "39a"[\s\S]*\{ x: x \+ 1, y: y \+ 1 \}/);
  assert.match(source, /const nextFootprint = unitFootprintAt\(target, nx, ny\)/);
  assert.match(source, /"39a": \[\{ x: 21, y: 100 \}\]/);
  assert.match(css, /\.token\.two-headed-boss-token \{[\s\S]*width: 200%[\s\S]*height: 200%/);
  assert.match(css, /\.manticore-large-token \.creature-sprite,[\s\S]*\.manticore-large-token \.walker-sprite[\s\S]*width: 100%/);
  assert.doesNotMatch(source, /\{ label: "16", hostile: null \}/);
  assert.match(source, /label !== "16"/);
  assert.match(source, /name: reward\.label === "6c" \? "Velvet Lockbox" : "Treasure Chest", contents: \[\.\.\.loot\]/);
  assert.match(css, /\.dungeon-chest-token/);
});

test("useful Level 1 landmarks have visible mechanics and Halleth leaves after guiding", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const poiRegistry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8");
  assert.match(source, /"Petrified Crown"[\s\S]*stats: \{ defense: 1, investigation: 1 \}/);
  for (const id of ["heart-acid", "dwarven-spigot", "bridge-waystone", "bridge-supply-cache", "forest-ruin-marker"])
    assert.match(source, new RegExp(`"${id}"[\\s\\S]*?visibility: "always"`));
  assert.match(css, /\.poi-id-heart-acid::before/);
  assert.match(css, /\.poi-id-heart-acid\.resolved::before[\s\S]*opacity: 0/);
  assert.match(css, /\.dropped-item-token\.speed-potion-token/);
  assert.doesNotMatch(source, /poi!\.id === "heart-acid" && resolvedPoi\.includes\(poi!\.id\)/);
  assert.match(css, /\.poi-id-dwarven-spigot::before/);
  assert.match(source, /Halleth's Guidance/);
  assert.doesNotMatch(source, /I remember every (?:move|turn) that put me down here/);
  assert.doesNotMatch(source, /A battered hermit looks up through the locked iron grate/);
  assert.match(source, /halleth-rescued/);
  assert.match(source, /halleth-guided-route/);
  assert.match(source, /className=\{`halleth-pit-visual[\s\S]*opened/);
  assert.match(landmarks, /HALLETH_PIT_POINT = \{ x: 20, y: 86 \}[\s\S]*hallethPit:[\s\S]*point: HALLETH_PIT_POINT/);
  assert.match(poiRegistry, /break-halleth-bars[\s\S]*pick-halleth-lock/);
  assert.match(source, /actionId === "pick-halleth-lock"[\s\S]*\/rogue\/i/);
  assert.match(source, /actionId === "break-halleth-bars"[\s\S]*consciousActive\.x === poi\.x[\s\S]*cannot force the grate from inside the pit/);
  assert.match(source, /room-34-teleport-triggered[\s\S]*reaches the trapped room 34 doorway at HH67[\s\S]*Halleth's opened pit at U87[\s\S]*next hero can enter normally/);
  assert.match(source, /destinationReveal[\s\S]*setRevealedTiles[\s\S]*board\.scrollLeft[\s\S]*board\.scrollTop/);
  assert.doesNotMatch(css, /\.room-34-teleport-rune/);
  assert.doesNotMatch(source, /className="room-34-teleport-rune"/);
  assert.doesNotMatch(map, /"label": "27"/);
  assert.match(source, /setRevealedTiles\(\(tiles\) => \[\.\.\.new Set\(\[\.\.\.tiles, \.\.\.revealedRoute/);
  assert.match(source, /makeUnit\("halleth", "Halleth", "Bard-Cartographer"/);
  assert.match(source, /Halleth, Bard of the Hole/);
  assert.match(source, /Master Splinter raised his sons[\s\S]*Oh\. Audience\. Requests cost extra/);
  assert.match(source, /label: "Turtles\?"[\s\S]*secret ooze[\s\S]*Gelatinous Cube/);
  assert.match(source, /Waffle House hash browns/);
  assert.match(source, /if I stop playing, I can hear what is moving underneath me/);
  assert.match(source, /halleth-ooze-song-heard/);
  assert.match(source, /filter\(\(unit\) => unit\.id !== "halleth"\)/);
  assert.match(source, /Halleth\. Bard, cartographer, survivor of one terrible venue/);
  assert.match(source, /Copper Stormforge\. Midna Tauberth\. Rex the Hammer\./);
  assert.match(source, /target\.id === "halleth"[\s\S]*setInspectPoi\("halleth-pit"\)/);
  assert.match(source, /target\.id === "halleth"[\s\S]*HALLETH_DIALOGUE_FLAGS\.some[\s\S]*openScriptedEncounter\([\s\S]*"halleth-bard"[\s\S]*Any other requests while I am still trapped down here\?/);
  assert.match(source, /alreadyRescued[\s\S]*!firedMapEvents\.includes\("halleth-bard-met"\)[\s\S]*openScriptedEncounter\("halleth-bard"\)/);
  assert.doesNotMatch(source, /room-37[\s\S]*attackDist\(unit, halleth\) <= 2[\s\S]*openScriptedEncounter\("halleth-bard"\)/);
  assert.match(rooms, /"37": \{ radius: 0, triggerTiles: \[\{ x: 19, y: 85 \}, \{ x: 21, y: 85 \}, \{ x: 19, y: 92 \}, \{ x: 20, y: 92 \}\][^\n]*encounter: "halleth-bard"/);
  assert.match(source, /point\.id === "halleth-pit"[\s\S]*point\.id\.startsWith\("hall-portrait-"\)/);
  assert.match(source, /if \(point\.text\) showDialogueBubble\(finder\.id, finder\.role === "Ranger"[\s\S]*rangerTrackCallout\(point\)[\s\S]*point\.text\)/);
  assert.doesNotMatch(source, /scheduleCutscene\(\(\) => openScriptedEncounter\("halleth-bard"\), 420\)/);
  assert.match(source, /pendingRoomDialogueRef\.current = room\.entry\.encounter/);
  assert.match(source, /const roomId = roomEntryPresentation\?\.roomId[\s\S]*pendingRoomDialogueRef\.current \|\| \(roomId && !CUSTOM_ROOM_ENTRY_HANDOFFS\.has\(roomId\)[\s\S]*ROOM_BLUEPRINTS\[roomId\]\?\.entry\.encounter/);
  assert.match(source, /if \(pendingDialogue\) openScriptedEncounter\(pendingDialogue\)/);
  assert.doesNotMatch(source, /scheduleCutscene\(\(\) => openScriptedEncounter\(pendingDialogue\)/);
  assert.match(source, /CUSTOM_ROOM_ENTRY_HANDOFFS = new Set\(\["2b", "6c", "16", "24a", "39a"\]\)/);
  assert.match(source, /chapterIntro \|\| roomEntryPresentation\) return/);
  assert.match(source, /roomEntryPresentation \|\| encounterChoiceBusyRef\.current/);
  assert.match(source, /scriptedEncounterNeedsRecovery\(room\.entry\.encounter, flags\)/);
  assert.match(source, /two-headed-king-engaged[\s\S]*The interrupted throne-room challenge resumes/);
});

test("movement cannot cut corners while sight continues past a single wall edge", async () => {
  const source = await readGameSource();
  assert.match(source, /const diagonalCornerBlocked =/);
  assert.match(source, /diagonalCornerBlocked\(cx, cy, nx, ny, blockedTiles\)/);
  assert.match(source, /diagonalCornerBlocked\(from\.x, from\.y, to\.x, to\.y, currentBlocked\)/);
  assert.match(source, /crossesDungeonWallEdge\([\s\S]*blockedCrossings/);
  assert.match(source, /playerView\.hasLineOfSight\(a, b, allowBlockedTarget\)/);
  assert.match(source, /playerView\.hasLineOfSight\(position, point, true\)/);
});

test("Area 1 uses default walls while the O62 poster uses the Hall of Heroes mount system", async () => {
  const source = await readGameSource();
  const registry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  const wallMounts = await readFile(new URL("../app/wall-mount-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const map = JSON.parse(await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8"));
  assert.ok(map.edges.some((edge) => edge.x === 14 && edge.y === 61 && edge.side === "n" && edge.kind === "secret-door"));
  assert.match(source, /dungeonSecretDoorEdges = \(undermountainLevel1\.edges \|\| \[\]\)/);
  assert.match(source, /crossesClosedDungeonSecretDoor/);
  assert.match(source, /closedDungeonSecretDoors\.crossings/);
  assert.match(source, /renderByPublicTile\.set/);
  assert.match(source, /secret-door-click-target/);
  assert.match(css, /\.dungeon-secret-door-trigger \.secret-door-click-target[\s\S]*pointer-events: auto/);
  assert.doesNotMatch(css, /poster-wall-face/);
  assert.doesNotMatch(css, /secret-wall-decoration\.poster/);
  assert.match(wallMounts, /pinup-wall-left[\s\S]*panelTiles: 1[\s\S]*panelOnly: true[\s\S]*suppressWallEdge: true/);
  assert.match(wallMounts, /pinup-wall-center[\s\S]*pinupPoster\.id[\s\S]*frame: "bare"[\s\S]*panelTiles: 1[\s\S]*suppressWallEdge: true[\s\S]*secretDoorEdge/);
  assert.match(wallMounts, /pinup-wall-right[\s\S]*panelTiles: 1[\s\S]*panelOnly: true[\s\S]*suppressWallEdge: true/);
  assert.doesNotMatch(wallMounts, /area-one-/);
  assert.match(source, /DUNGEON_WALL_MOUNTS_BY_TILE\.get\(key\(x, y\)\)/);
  assert.match(source, /visibleWallMountsHere = wallMountsHere\.filter[\s\S]*playerView\.hasLineOfSight\(unit, mount\.host, true\)[\s\S]*mount\.side === "n"[\s\S]*mount\.side === "s"[\s\S]*mount\.side === "e"/);
  assert.match(source, /tileRevealed && visibleWallMountsHere\.map/);
  assert.match(source, /terrainKind === "dungeon-floor" && terrainEdgeClasses && \(/);
  assert.doesNotMatch(source, /terrainEdgeClasses && dungeonTheme !== "entry"/);
  assert.doesNotMatch(css, /terrain-dungeon-floor\.dungeon-edge-[nesw] \{ border-(?:top|right|bottom|left):/);
  assert.doesNotMatch(css, /dungeon-theme-entry\.dungeon-edge-[nesw]/);
  assert.doesNotMatch(source, /staticDungeonPropsHere\.filter/);
  assert.match(source, /elevatedSceneryOverlays\.map/);
  assert.match(source, /elevatedPoiOverlays\.map/);
  const mapRendering = await readFile(new URL("../app/map-rendering.ts", import.meta.url), "utf8");
  assert.match(mapRendering, /const overlaySceneryProps = dungeonSceneryProps/);
  assert.match(mapRendering, /selectDungeonObjectOverlays/);
  assert.match(css, /\.dungeon-object-overlay \{[\s\S]*z-index: 4;[\s\S]*pointer-events: none/);
  assert.match(css, /terrain-dungeon-floor:not\(\.fogged\) \{[\s\S]*z-index: auto !important;[\s\S]*isolation: auto !important/);
  assert.doesNotMatch(css, /cell:has\(\.poi-id-question-statue\)/);
  assert.doesNotMatch(css, /cell:has\(\.prop-id-orientation-projector\)/);
  assert.match(source, /wall-mounted-frame frame-\$\{wallMount\.frame\}/);
  assert.match(source, /!wallMount\.panelOnly && wallMount\.poiId && wallMount\.frame/);
  assert.match(source, /!wallMountBySecretDoorEdge\.has\(dungeonEdgeKey\(secretDoorRender\.edge\)\)/);
  assert.match(source, /wall-mounted-panel/);
  assert.match(css, /\.wall-mounted-frame[\s\S]*border: 3px ridge #c69a44/);
  assert.match(css, /\.wall-mounted-frame\.frame-bare \{[\s\S]*border: 0;[\s\S]*background: transparent;[\s\S]*box-shadow: none/);
  assert.match(css, /\.wall-mounted-panel[\s\S]*dungeon-floor-cavern\.webp/);
  assert.match(css, /\.wall-mounted-panel[\s\S]{0,500}box-shadow: none/);
  assert.doesNotMatch(css, /\.wall-mounted-panel[\s\S]{0,700}border-bottom|\.wall-mounted-panel::after/);
  assert.doesNotMatch(css, /poster-secret-door-trigger|poster-wall-face|wall-mounted-panel::after/);
  assert.match(source, /WESTERN_SECRET_CONCEAL_KEYS = new Set\(\[key\(14, 61\), key\(14, 62\)\]\)/);
  assert.match(source, /secretHallConcealed[\s\S]*!firedMapEvents\.includes\(westernSecretDoorEvent\)/);
  assert.doesNotMatch(css, /secret-door-click-target::before/);
  assert.match(source, /event\.stopPropagation\(\);[\s\S]*if \(poiId\) setInspectPoi\(poiId\)/);
  assert.match(registry, /definition\.mapRepresentation === "structural"/);
  assert.doesNotMatch(source, /undertaker-poster-prop/);
  assert.doesNotMatch(source, /posterEntrance/);
  assert.match(source, /id: "open-poster", label: "Fist the Poster"/);
  assert.doesNotMatch(source, /Fist the Poster — Ball Cap of Bad Ideas/);
  assert.doesNotMatch(css, /cell:has\(\.poster-secret-door-trigger\)/);
  assert.match(source, /western-secret-panel-14-61-open/);
  assert.match(source, /const pukeTunnelTiles = \[61, 62, 63, 64, 65, 66, 67\]/);
  assert.doesNotMatch(source, /westernSecretPassageTiles/);
  assert.doesNotMatch(source, /westernSecretPassageHidden/);
  assert.doesNotMatch(source, /poi-secret-wall-hotspot/);
});

test("Level Forge exports v6 literal-foot vector maps and provides a real Dust 2 movement preview", async () => {
  const editor = await readFile(new URL("../app/MapEditor.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const playtest = await readFile(new URL("../app/map-editor-playtest.ts", import.meta.url), "utf8");
  assert.match(editor, /kind:"wall"\|"door"\|"secret-door"/);
  assert.match(editor, /"secret-door-line"/);
  assert.match(editor, /version:6/);
  assert.match(editor, /elevationFt/);
  assert.match(editor, /Exact elevation/);
  assert.match(editor, /barriers\?:FreeBarrier\[\]/);
  assert.match(editor, /"free-wall-line"/);
  assert.match(editor, /"free-terrain-line"/);
  assert.match(editor, /Terrain cover/);
  assert.match(editor, /"free-door-line"/);
  assert.match(editor, /"free-secret-door-line"/);
  assert.match(editor, /"erase-free-line"/);
  assert.match(editor, /pointToBarrierDistance/);
  assert.match(editor, /findEditorPlaytestRoute/);
  assert.match(editor, /Load Dust 2/);
  assert.match(editor, /Free Climb \{freeClimb\?"ON":"OFF"\}/);
  assert.match(editor, /Walls \{showBarrierLayer\?"ON":"OFF"\}/);
  assert.match(editor, /Elevation \{showElevationLayer\?"ON":"OFF"\}/);
  assert.match(editor, /backgroundImage:reference\?/);
  assert.match(editor, /has-reference-image/);
  assert.match(editor, /Sight Probe \{sightProbe\?"ON":"OFF"\}/);
  assert.match(editor, /createEditorPlaytestVisionKernel/);
  assert.match(editor, /editorVisionKernel\.blocksSight/);
  assert.match(editor, /MapEditorVisionOverlay layer=\{playtestVision\}/);
  assert.match(css, /\.editor-edge\.edge-secret-door/);
  assert.match(css, /\.preview-mode \.editor-edge\.edge-secret-door[\s\S]*background: #d8c9a4/);
  assert.match(css, /\.free-barrier-layer/);
  assert.match(css, /\.editor-test-token/);
  assert.match(css, /\.editor-test-route/);
  assert.match(css, /has-reference-image[\s\S]*background: #090a0826/);
  assert.match(css, /\.editor-sight-ray/);
  assert.match(playtest, /dx && dy && \(tiles\[current\.y \* width \+ next\.x\]\?\.blocked/);
  assert.match(playtest, /barrierBlocksMovementLine\([\s\S]*defaultBarrierRange/);
  assert.match(playtest, /canStepElevation/);
  const page = await readGameSource();
  assert.match(page, /dust2DropFeet\(moved, step\)/);
  assert.match(page, /rollFallDamage\(dropFt,[\s\S]*athleticSafeFallFeet\(moved\)/);
  assert.match(page, /pushResult\(active, hoveredTarget, aimedSkill\.knockback, false\)/, "knockback previews must never consume the real damage RNG");
  assert.match(page, /damageAfterProtection\(target, rollFallDamage[\s\S]*"bludgeoning"\)/);
});

test("large maps calculate movement once and do not rerender on ordinary hover", async () => {
  const source = await readGameSource();
  assert.match(source, /const movementCostByState = active && movementBudget >= 0[\s\S]*buildMovementCostField/);
  assert.match(source, /const movementCostByTile = dust2MapActive \? collapseDust2MovementCosts\(movementCostByState\) : movementCostByState/);
  assert.match(source, /const moveCost = \(goalX: number, goalY: number\) => movementCostByTile\.get/);
  assert.match(source, /onMouseEnter=\{wantsTileHover \?/);
  assert.match(source, /const poiByTile = new Map/);
  assert.match(source, /const chargedIntentByTile = new Map/);
});

test("playtest teleport revives and repositions the selected hero", async () => {
  const source = await readGameSource();
  assert.match(source, /mapPlaytest && teleportMode[\s\S]*unit\.id === teleportHeroId && unit\.team === "hero" && !unit\.npc/);
  assert.match(source, /hp: Math\.max\(1, unit\.hp\), downed: false/);
  assert.match(source, /units\.filter\(\(unit\) => unit\.team === "hero" && !unit\.npc\)\.map/);
  assert.doesNotMatch(source, /Choose a conscious hero before teleporting/);
});

test("Disguise Kit offers monster forms and only named detectors see through them", async () => {
  const source = await readGameSource();
  assert.match(source, /DISGUISE_FORMS = \["Goblin", "Bugbear", "Undertaker", "Wererat"\]/);
  assert.match(source, /DISGUISE_DETECTOR_ROLES = new Set\(\["Ettin", "Manticore"\]\)/);
  assert.match(source, /canEnemySeeHero/);
  assert.match(source, /Disguise as \$\{form\}/);
  assert.match(source, /DISGUISE_SPRITE_SHEETS[\s\S]*Goblin: "\/monster-goblin-sprites\.png"[\s\S]*Bugbear: "\/monster-bugbear-sprites\.png"[\s\S]*Undertaker: "\/monster-bandit-sprites\.png"[\s\S]*Wererat: "\/monster-wererat-sprites\.png"/);
  assert.match(source, /const disguise = heroDisguises\[unit\.id\][\s\S]*if \(disguise\) return DISGUISE_SPRITE_SHEETS\[disguise\]/);
  assert.doesNotMatch(source, /className="status-icon disguise-status"/);
  assert.match(source, /monster disguise is exposed by the attack/);
});

test("purposeless dungeon loot is purged and the mimic spear is the creature", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const pois = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  assert.match(source, /PURPOSELESS_DUNGEON_LOOT/);
  for (const item of ["Silver Necklace", "Traveler's Flute", "Manticore Hoard", "Burglar's Pack", "Minotaur's Treasure", "Golden Spear", "Rescue Supplies"])
    assert.match(source, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(rooms, /loot: \["Golden Spear"\]/);
  assert.doesNotMatch(rooms, /the spear is part of the creature|golden spear twitches/i);
  assert.match(source, /const goldenSpearMimicPoint = \{ x: 26, y: 81 \}; \/\/ AA82/);
  assert.match(rooms, /"40": \[\{ x: 26, y: 81 \}\]/);
  assert.match(rooms, /"40": \{ requiresFlags: \["mimic-triggered"\] \}/);
  assert.match(source, /id: "golden-spear-mimic"[\s\S]*\.\.\.goldenSpearMimicPoint/);
  assert.match(source, /label === "40"[\s\S]*\? goldenSpearMimicPoint/);
  assert.match(pois, /"golden-spear-mimic"[^\n]*visibility: "always"/);
  assert.doesNotMatch(css, /cell:has\(\.poi-id-golden-spear-mimic\)/);
  assert.doesNotMatch(source, /Thieves’ Toll Ledger/);
  assert.doesNotMatch(source, /STOLEN SUPPLIES|scratched off|stolen supply/i);
});

test("the obsolete South Dormitory chest is removed from new and existing runs", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");

  assert.match(source, /OBSOLETE_DUNGEON_DROP_IDS = new Set\(\[[^\]]*"room-loot-34-chest"[^\]]*"western-pillar-gold-cache"/);
  assert.doesNotMatch(rooms, /"34":[^\n]*loot:/);
});

test("enemy packs pursue separately and the king arrives only after the exploration objective", async () => {
  const source = await readGameSource();
  assert.match(source, /const route = routeTo\(active, x, y, active\.role === "Club Hostess"\)/);
  assert.match(source, /firedMapEvents\.includes\(`room-encounter-spawned-\$\{label\}`\)/);
  assert.doesNotMatch(source, /id: "western-pillar-gold-cache"/);
  assert.match(source, /boss-hunt-started/);
  assert.match(source, /s\.dungeonExplorationPercent >= 90 && s\.activeDungeonThreats === 0/);
  assert.match(source, /two-headed-king-arrived/);
  assert.match(source, /room-encounter-spawned-39a/);
  assert.match(source, /A roar rolls through every cleared hall/);
});

test("melee enemies never circle the map merely to reach a rear attack", async () => {
  const source = await readGameSource();
  assert.match(source, /const routeDifference = a\.cost - b\.cost;[\s\S]*Math\.abs\(routeDifference\) > 1[\s\S]*return routeDifference;[\s\S]*rearPositionScore/);
  assert.match(source, /return rearDifference \|\| routeDifference/);
  assert.doesNotMatch(source, /return rearDifference \|\| a\.cost - b\.cost/);
});

test("the Two-Headed King announces his arrival but waits for a hero to enter the room", async () => {
  const source = await readGameSource();

  assert.match(source, /two-headed-king-arrived[\s\S]*setUnits\(\(current\) => \[\.\.\.current, king\]\)[\s\S]*setAiBusy\(false\)/);
  assert.doesNotMatch(source, /setUnits\(\(current\) => \[\.\.\.current, king\]\);\s*setEnemyTypes\(\["Ettin"\]\);\s*setEncounterMode\("combat"\)/);
  assert.match(source, /bossEngagementDoorwayTiles = \[[\s\S]*x: 19, y: 97[\s\S]*x: 21, y: 97[\s\S]*x: 22, y: 97/);
  assert.match(source, /kingEngageable:[\s\S]*bossEngagementDoorwayKeys\.has\(key\(unit\.x, unit\.y\)\)/);
  assert.match(source, /firstBossDoorwayIndex[\s\S]*bossEngagementDoorwayKeys\.has/);
  assert.match(source, /const approachingHero[\s\S]*bossEngagementDoorwayKeys\.has\(key\(unit\.x, unit\.y\)\)/);
  assert.match(source, /two-headed-king-engaged[\s\S]*showDialogueBubble\(twoHeadedKing\.id[\s\S]*FINAL PRACTICAL[\s\S]*gameTransitions\.startCombat\(\)/);
});

test("the Two-Headed King waits on a real throne instead of a boss placeholder icon", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  assert.match(rooms, /"39a": \[\{ x: 21, y: 100 \}\]/);
  assert.match(source, /bossThronePoint = \{ x: 21, y: 102 \}/);
  assert.match(rooms, /A colossal empty throne faces the hall/);
  assert.match(source, /boss-throne-scenery/);
  assert.match(source, /"king-standing" : "king-seated"/);
  assert.doesNotMatch(source, /<span>♛<\/span>/);
  assert.match(css, /\.boss-throne-scenery[\s\S]*url\("\/king-throne\.png"\)/);
  assert.match(css, /\.boss-throne-scenery \{[\s\S]*left: -60%;[\s\S]*top: 0;[\s\S]*transform: rotate\(180deg\)/);
  assert.doesNotMatch(css, /\.boss-throne-scenery \{[\s\S]{0,180}left: -10%/);
  assert.doesNotMatch(css, /\.boss-throne-scenery \{[\s\S]{0,220}translate:/);
  assert.match(css, /king-rise-from-throne/);
});

test("the obsolete western stair annex and breach are gone", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(source, /bossBreachTiles|westernBossChamberTileKeys/);
  assert.doesNotMatch(source, /Crown Battery|crown-battery|redirectCrownBattery|Spell Crown|War Crown/);
  assert.doesNotMatch(css, /boss-breach-sealed|boss-breach-open/);
  assert.doesNotMatch(css, /crown-battery/);
});

test("Level 1 virtualizes its huge grid and safely persists timed encounters", async () => {
  const source = await readGameSource();
  const mapRendering = await readFile(new URL("../app/map-rendering.ts", import.meta.url), "utf8");
  assert.match(mapRendering, /const indices: number\[\] = \[\]/);
  assert.match(mapRendering, /for \(let y = viewport\.top; y <= viewport\.bottom; y\+\+\)/);
  assert.match(source, /gridColumnStart: x \+ 1/);
  assert.match(source, /const clearTransientTimers = \(\) =>/);
  assert.match(source, /cutsceneTimersRef\.current\.forEach\(\(timer\) => clearTimeout\(timer\)\)/);
  assert.match(source, /repairCampaignState<Unit>/);
  assert.match(source, /resolvedEncounterGroups\(restoredFlags\)/);
  assert.match(source, /wanderingGuardian,/);
  assert.match(source, /setWanderingGuardian\(s\.wanderingGuardian \|\| null\)/);
});

test("the secret-club entrance is a real wall edge with a wall-mounted control", async () => {
  const source = await readGameSource();
  const registry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const map = JSON.parse(await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8"));
  assert.ok(map.edges.some((edge) => edge.x === 14 && edge.y === 46 && edge.side === "e" && edge.kind === "secret-door"));
  assert.match(source, /const undertakerSecretDoor = \{ x: 14, y: 46 \}/);
  assert.match(source, /id: "three-lords-statues"[\s\S]*\.\.\.undertakerSecretDoor/);
  assert.match(source, /dungeonSecretDoorPoiByEdge[\s\S]*three-lords-statues/);
  assert.match(source, /oppositeDungeonEdgeSide/);
  assert.match(source, /structure-edge-\$\{secretDoorRender\.side\}/);
  assert.match(registry, /definition\.mapRepresentation === "structural"/);
  assert.match(source, /title=\{threeLordsEntrance \? "The Three Lords relief" : "Ordinary wall panel"\}/);
  assert.match(source, /three-lords-wall-relief/);
  assert.match(css, /\.secret-wall-decoration\.three-lords\.wall-side-w \{ left: -22px;[\s\S]*rotate\(-90deg\)/);
  assert.doesNotMatch(source, /dungeon-secret-door-token/);
  assert.match(css, /\.dungeon-secret-door-trigger/);
  assert.doesNotMatch(css, /\.dungeon-secret-door-token/);
});

test("the troll bargain, Harria payment, and dwarven spigot are connected", async () => {
  const source = await readGameSource();
  const engine = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");

  assert.match(engine, /kind: "troll"[\s\S]*party-item", item: "Fresh Meat"/);
  assert.match(engine, /kind: "undertakers-harria"[\s\S]*party-item", item: "Undertaker Coin Purse"/);
  assert.match(source, /Drink Healing Water — Full Party Heal/);
  assert.match(source, /Fill the Copper Tankard — Gain 1 Healing Potion/);
  assert.match(source, /firedMapEvents\.includes\("dwarven-party-healed"\)[\s\S]*partyItemOwner\("Copper Tankard"\)/);
  assert.match(source, /One final measure remains for the copper tankard/);
  assert.match(source, /setResolvedPoi\(\(ids\)[\s\S]*The spigot coughs and runs dry/);
});

test("peaceful authored routes match combat XP and every club reward pays off", async () => {
  const [source, encounters, items] = await Promise.all([
    readGameSource(),
    readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8"),
  ]);
  assert.match(source, /completion\.awardPeaceXp[\s\S]*awardPeaceXp\("6c"\)[\s\S]*completeEncounter\("6c", "The Extremely Secret Club", "special", completion\.actorDisposition\)/);
  assert.match(source, /awardPeaceXp\("24a"\); completeEncounter\("24a", "Dweomercore Remedial Classroom"/);
  assert.match(encounters, /id: "give-gromm-flour"[\s\S]*party-item", item: "Bag of Flour"[\s\S]*consume-party-item[\s\S]*trap-flour-ghost[\s\S]*award-peace-xp[\s\S]*retain: true/);
  assert.match(items, /Magic Circle Recipe[\s\S]*spirit-circle solutions/);
});

test("the dungeon uses one continuous floor plane and inert void outside its walls", async () => {
  const [source, runtime, css] = await Promise.all([
    readGameSource(),
    readFile(new URL("../app/map-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(runtime, /dungeonOpen\.has\(key\(x, y\)\) \? "dungeon-floor" : "void"/);
  assert.match(source, /disabled=\{dungeonMode && \(!tileRevealed \|\| !dungeonOpen\.has\(key\(x, y\)\)\)\}/);
  assert.match(css, /\.dungeon-board \.grid \{[\s\S]*dungeon-floor-cavern\.webp/);
  assert.match(css, /\.dungeon-board \.cell\.terrain-dungeon-floor:not\(\.fogged\)[\s\S]*background-image: none !important/);
  assert.match(css, /\.dungeon-board \.cell\.terrain-void[\s\S]*pointer-events: none/);
  assert.match(css, /\.dungeon-board \.cell \{ appearance: none; margin: 0; padding: 0; \}/);
  assert.match(css, /terrain-dungeon-floor\.reachable\.max-reach:not\(\.fogged\)[\s\S]*box-shadow: none/);
  assert.match(source, /debugArt && debugLayers\.has\("art"\)\)\) && \(/);
  assert.doesNotMatch(source, /dungeonPlaytest && \(debugRoomMarker \|\| debugSpawn \|\| debugTrigger \|\| debugArt\)/);
  assert.doesNotMatch(source, /--dungeon-floor-position-[xy]/);
});

test("authored dialogue uses one portrait panel and Harria catches both room entrances", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const panel = await readFile(new URL("../app/dialogue-panel.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /import DialoguePanel from "\.\/dialogue-panel"/);
  assert.match(source, /sceneTitle=\{socialScene\.title\}/);
  assert.match(source, /sceneTitle="Bridge · The Wayfarer"/);
  assert.match(panel, /One presentation surface for authored dialogue and social choices/);
  assert.match(css, /\.choice-dialogue-panel/);
  assert.match(rooms, /triggerTiles: \[\{ x: 10, y: 31 \}, \{ x: 10, y: 32 \}, \{ x: 12, y: 33 \}, \{ x: 12, y: 34 \}\]/);
});

test("Room 28 is reachable from its watch post and contains the eye prophecy and baited spike pit", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const map = JSON.parse(await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8"));
  assert.equal(map.tiles[72 * map.width + 21]?.kind, "dungeon");
  assert.equal(map.tiles[70 * map.width + 22]?.kind, "dungeon");
  assert.equal(map.tiles[70 * map.width + 23]?.label, "28b");
  assert.match(source, /id: "eye-obelisk-projector"[\s\S]*\.\.\.eyeObeliskPoint/);
  assert.match(source, /id: "eye-obelisk-projector"[\s\S]*scale: 0\.88/);
  assert.doesNotMatch(css, /cell:has\(\.eye-princess-hologram\)/);
  assert.match(source, /const eyeObeliskPoint = \{ x: 22, y: 68 \}/);
  assert.match(source, /const eyeHologramPoint = \{ x: 22, y: 69 \}/);
  assert.match(source, /const eyeHologramTrigger = \{ x: 22, y: 70 \}/);
  assert.match(source, /eye-hologram-awakened/);
  assert.match(source, /Help us, adventurers\. You’re our only hope\./);
  assert.doesNotMatch(source, /Touch the Obelisk/);
  assert.match(source, /title: "Blue Princess Hologram — replay message"[\s\S]*mapHologram\.kind === "princess"\) replayEyeHologram\(\)/);
  assert.match(source, /id: "spiked-pit-28d"[\s\S]*kind: "trap"/);
  assert.doesNotMatch(source, /LOOK UP|look-up-wall-28d/);
  assert.match(source, /trap\.id === SPIKE_PIT_PRESENTATION\.id[\s\S]*unit\.hp - SPIKE_PIT_PRESENTATION\.damage/);
  assert.match(source, /HALASTER: HA! HA! HA!/);
  assert.match(source, /if \(text === "The warning was accurate\. Your timing was the problem\."\) return/);
  assert.match(source, /const blueLightsaberPoint = \{ x: 23, y: 70 \}; \/\/ X71, Room 28b alcove/);
  assert.match(source, /id: "room-loot-28b-0", name: "Blue Lightsaber", \.\.\.blueLightsaberPoint/);
  assert.match(source, /drop\.name === "Blue Lightsaber" \? "blue-lightsaber-token"/);
  assert.match(source, /drop\.name !== "Blue Lightsaber" && \([\s\S]*<small>/);
  assert.match(css, /\.dropped-item-token\.blue-lightsaber-token[\s\S]*unignited-lightsaber-hilt\.png/);
  assert.doesNotMatch(css, /blue-lightsaber\.png|blue-lightsaber-hum/);
  const items = await readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8");
  assert.match(items, /"Blue Lightsaber"[\s\S]*skill\("Plasma Slash", 1, 24, 8/);
  assert.match(source, /const \{ label, room, point \} = entry;[\s\S]*room\.entry\.presentation \|\| "modal"[\s\S]*presentRoomEntry\(label, room\.title, room\.description, point\)/);
  assert.match(css, /@keyframes spike-floor-shockwave/);
  assert.match(source, /point\.id === "spiked-pit-28d"[\s\S]*SPIKE_PIT_PRESENTATION\.triggeredFlag/);
  assert.doesNotMatch(source, /spike-warning-wall-marker|spikedPitWarningWall/);
  assert.match(source, /spikedPit28d[\s\S]*return \{ x: room\.x, y: room\.y - 1 \}; \/\/ W76/);
  assert.match(source, /spikedPitLure28d[\s\S]*return \{ x: room\.x, y: room\.y \}; \/\/ W77/);
  assert.match(source, /id: "spike-pit-lure-28d", name: "Shiny Floor Lure"[\s\S]*A tiny glint at the dead end/);
  assert.match(source, /className="golden-magnifying-glass"[\s\S]*⌕/);
  assert.doesNotMatch(source, /className="nickel-lure"|5¢/);
  assert.doesNotMatch(css, /\.nickel-lure/);
  assert.match(css, /\.poi-token\.poi-id-spike-pit-lure-28d[\s\S]*#ffe17a/);
  assert.doesNotMatch(css, /spike-pit-wall-warning-v2\.png/);
  assert.doesNotMatch(source, /touchLookUpMarking/);
  assert.doesNotMatch(source, /setInspectPoi\(marking\.id\)/);
  assert.match(source, /definition\.action === "move-onto"[\s\S]*poi\.kind === "clue"[\s\S]*setInspectPoi\(poi\.id\)[\s\S]*phase === "move" && reachable\(x, y\)[\s\S]*tileClick\(x, y\)/);
  assert.match(rooms, /"28d": \{ title: "The Hinged Floor"/);
});

test("the Hall of Heroes uses four comic portraits and a psychic mirror", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const wallMounts = await readFile(new URL("../app/wall-mount-registry.ts", import.meta.url), "utf8");
  const poiRegistry = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  assert.match(rooms, /"12": \{ title: "Hall of Heroes"[\s\S]*Four elaborate portraits and a dark mirror line one wall/);
  assert.doesNotMatch(rooms, /K25 through O25/);
  assert.doesNotMatch(rooms, /THE DUMBEST DELVER IN THE DUNGEON/);
  assert.match(source, /id: "hall-portrait-1"[\s\S]*x: 10, y: 24/);
  assert.match(source, /id: "hall-portrait-4"[\s\S]*x: 13, y: 24/);
  assert.match(source, /id: "hall-portrait-mirror"[\s\S]*x: 14, y: 24/);
  assert.match(source, /THE DUMBEST DELVER IN THE DUNGEON: \$\{consciousActive\.name\}/);
  assert.match(source, /hp: Math\.max\(1, unit\.hp - 1\)/);
  assert.doesNotMatch(rooms, /"12": \["hall-of-failures-plaques"\]/);
  assert.doesNotMatch(source, /poi!\.id\.slice\(-1\)/);
  assert.match(source, /DUNGEON_WALL_MOUNTS_BY_TILE\.get\(key\(x, y\)\)/);
  assert.match(source, /wall-mounted-frame/);
  assert.match(source, /wall-mounted-panel/);
  assert.match(source, /<img src=\{wallMount\.image\}[\s\S]*loading="eager"/);
  assert.doesNotMatch(source, /<Image src=\{wallMount\.image\}/);
  assert.match(css, /\.wall-mount-anchor\.wall-side-n \{ --wall-side-y: -52px; \}/);
  assert.match(source, /mount\.suppressWallEdge && edgeClass === `dungeon-edge-\$\{mount\.side\}`/);
  assert.match(wallMounts, /hall-portrait-1[\s\S]*side: "n"[\s\S]*frame: "portrait"[\s\S]*panelTiles: 5[\s\S]*suppressWallEdge: true/);
  assert.match(wallMounts, /hall-portrait-mirror[\s\S]*frame: "mirror"/);
  assert.doesNotMatch(css, /\.wall-mounted-panel[\s\S]{0,700}border-bottom|\.wall-mounted-panel::after/);
  assert.match(css, /\.dungeon-wall-art-panel[\s\S]*dungeon-floor-cavern\.webp/);
  assert.doesNotMatch(css, /\.dungeon-wall-art-panel \{[\s\S]{0,500}repeating-linear-gradient/);
  assert.match(source, /mapRepresentation !== "structural"/);
  assert.match(source, /point\.id\.startsWith\("hall-portrait-"\)/);
  assert.match(poiRegistry, /mapRepresentation: "structural"/);
  for (const image of ["hall-orvin-mimic-inspector.webp", "hall-yara-ready.webp", "hall-pell-precise.webp", "hall-torvik-torch-snuffer.webp"])
    assert.match(wallMounts, new RegExp(image.replace(".", "\\.")));
});

test("Room 23c is a spectral social encounter instead of three corpse buttons", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /"7a": \["retreat-bedrolls"\]/);
  assert.doesNotMatch(source, /"retreat-bedrolls": \{ atlas: "dungeon-c", slot: 2/);
  assert.match(source, /"23c": \["failed-expedition-camp"\]/);
  assert.match(source, /"failed-expedition-camp": \{ atlas: "dungeon-a", slot: 1/);
  assert.doesNotMatch(source, /"failed-expedition-camp": \{ atlas: "dungeon-c", slot: 2/);
  assert.match(source, /last-camp-body-1[\s\S]*last-camp-body-2[\s\S]*last-camp-body-3/);
  assert.match(source, /last-camp-solved/);
  assert.match(source, /"23c": "spectral-camp"/);
  assert.match(source, /"23c": \[\{ x: 9, y: 70 \}, \{ x: 9, y: 71 \}, \{ x: 8, y: 72 \}\]/);
  assert.doesNotMatch(source, /"23c": \[\{ x: 8, y: 70 \}/);
  assert.match(rooms, /"23c": \{ radius: 0, triggerTiles: \[\{ x: 8, y: 70 \}\], encounter: "spectral-camp" \}/);
  assert.match(source, /pendingDungeonRoomId && ROOM_BLUEPRINTS\[pendingDungeonRoomId\]/);
  assert.match(source, /spawnConversationUnits\(label, point, actorNames, finalSpawns\)[\s\S]*openScriptedEncounter\(room\.entry\.encounter\)/);
  assert.match(source, /Brell, Expedition Leader[\s\S]*Marda, Celebrant[\s\S]*Osric, Cartographer/);
  assert.match(source, /Accept the toast[\s\S]*Refuse the toast/);
  assert.match(source, /King's throne is the way down/);
  for (const item of ["Ball Cap of Bad Ideas", "Wife-Beater of Questionable Resilience", "Dweomercore Remedial Diploma", "Glasses of Good Questions"])
    assert.match(source, new RegExp(`itemCallbacks:[\\s\\S]*${item}`));
  assert.match(source, /Long enough\. What year do you think it is\?/);
  assert.doesNotMatch(source, /last-camp-complacency|Orientation Notes/);
  assert.match(source, /spectral-camper-token/);
  assert.doesNotMatch(source, /action: "inspect-camp-clue"/);
});

test("Level 1 preserves strange clues without revealing a sentient dungeon", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const audit = await readFile(new URL("../app/campaign-state-audit.ts", import.meta.url), "utf8");

  assert.match(rooms, /"19c": \["Gromm, Paranoid Survivor"\]/);
  assert.match(encounters, /church with a bakery in the basement/);
  assert.match(encounters, /flour-ghost-trapped/);
  assert.match(encounters, /dungeon-edited-flour-ward/);
  assert.match(encounters, /There is no command seal\. No binding\./);
  assert.match(encounters, /This hand remembers bread/);
  assert.match(encounters, /Want first\. Before pieces\./);
  assert.match(encounters, /golem-strange-memory/);
  assert.match(encounters, /The firewood has not burned down\./);
  assert.match(encounters, /last-camp-throne-revelation/);
  assert.doesNotMatch(source, /Stop answering the walls/);
  assert.doesNotMatch(source, /sentient-dungeon-confirmed|halaster-noticed-sentience/);
  assert.doesNotMatch(encounters, /map is adding this conversation|wrote .* by itself|It just underlined it/);
  assert.doesNotMatch(encounters, /walls tell it|The room said you would say that/);
  assert.doesNotMatch(`${source}\n${audit}`, /flour-ghost-released/);
});

test("Level 1 regression checkpoints cover the critical route branches", async () => {
  const source = await readGameSource();
  const regression = await readFile(new URL("../app/level-one-regression.ts", import.meta.url), "utf8");
  for (const checkpoint of ["forest-guard", "village-saved", "village-abandoned", "bridge-peace", "bridge-failed-bluff", "bridge-cache", "bugbears", "grell", "three-lords", "secret-club", "harria", "manticore", "troll", "gromm-safe", "gromm-bad", "last-camp", "vale-pass", "vale-wrong", "vale-combat", "flyndol", "kelim-rescue", "kelim-death", "guardian", "flood", "secret-grate", "bomb-reset", "bomb-disable", "pit-rogue", "pit-fall", "halleth", "goblins-peace", "goblins-combat", "avada-shirt", "avada-party", "boss-defeat", "throne-recap"])
    assert.match(regression, new RegExp(`id: "${checkpoint}"`));
  for (const flag of ["bridge-bandits-cleared", "undertaker-secret-door-open", "spiked-pit-28d-triggered", "halleth-rescued", "level-one-complete"])
    assert.match(source, new RegExp(flag));
  assert.match(regression, /LEVEL_ONE_DEFERRED_WRITING: readonly string\[\] = \[\]/);
  assert.doesNotMatch(regression, /bridge-toll-waived|bridge-toll-hostile|spiked-pit-triggered|manticore-show-complete/);
  assert.doesNotMatch(source, /LOOK UP|look-up-wall-28d/);
});

test("defeated units never block movement routes or destination tiles", async () => {
  const source = await readGameSource();
  assert.match(source, /const isGoal = dust2MapActive \? dust2SamePosition\(to, goal\)[\s\S]*occupant && !occupant\.downed &&[\s\S]*\(isGoal \|\| occupant\.team !== mover\.team \|\| !allowAllies\)/);
  assert.match(source, /const downedTarget = units\.find/);
});

test("peaceful encounter dismissals release stale enemy AI locks without level-up interruptions", async () => {
  const source = await readGameSource();
  assert.match(source, /effect\.kind === "dismiss-group"[\s\S]*scheduleCutscene\(finishDismissal, effect\.delay\)/);
  assert.match(source, /completeEncounter[\s\S]*setAiBusy\(false\)/);
  assert.doesNotMatch(source, /setDungeonLevelChoices/);
});

test("large dungeon encounters use bounded AI routing and release scene handoffs", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  assert.match(source, /attackCandidates[\s\S]*?slice\(0, 32\)/);
  assert.doesNotMatch(source, /for \(let y = 0; y < boardRows; y\+\+\)[\s\S]*?remaining: dist/);
  assert.match(source, /encounterSequenceLabel,[\s\S]*?victory,[\s\S]*?defeat/);
  assert.match(source, /Saves contain durable battle state, never transient animation\/AI locks/);
  assert.match(rooms, /"33": \{ title: "Drowned Barracks"/);
});

test("Level 1 adds the W64 spear trap, AH63 floodgate, HH67 teleport feast, R78 cabinet, and M81 mining pick", async () => {
  const source = await readGameSource();
  const map = await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8");
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  assert.match(source, /watch-hall-spear-trap[\s\S]*x: 22, y: 63/);
  assert.match(source, /trigger: \{ x: 34, y: 62 \}[^\n]*AI63/);
  assert.match(source, /barrier: \{ id: "room-33-floodgate", name: "sealed floodgate", x: 33, y: 62, hp: 40, maxHp: 40, kind: "door" \}/);
  assert.match(source, /room-33-flood-level-[\s\S]*floodDamage/);
  assert.doesNotMatch(source, /id: "pantry-supplies"/);
  assert.match(landmarks, /point: \{ x: 33, y: 66 \}[^\n]*HH67/);
  assert.match(landmarks, /destination: HALLETH_PIT_POINT[^\n]*U87/);
  assert.match(landmarks, /feastPoint: \{ x: 34, y: 66 \}[^\n]*II67/);
  assert.match(source, /dwarven-cave-in[\s\S]*x: 17, y: 77/);
  assert.match(source, /"25a": \{ title: "Dead Goblin"[\s\S]*loot: \["Dwarven Mining Pick"\]/);
  assert.doesNotMatch(source, /"25b": \{/);
  assert.match(source, /Hooking Strike[\s\S]*stunChance: 25/);
  assert.doesNotMatch(map, /"label": "26d"/);
});

test("the puke ring opens a safe grate route into the dormant flood room", async () => {
  const [source, mapRuntime, poiRegistry, css] = await Promise.all([
    readGameSource(),
    readFile(new URL("../app/map-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(mapRuntime, /sewerFloodSecretPassage[\s\S]*sewer: \{ x: 16, y: 69 \}[\s\S]*flood: \{ x: 35, y: 63 \}/);
  assert.match(poiRegistry, /crawl-sewer-to-flood[\s\S]*context\.adjacent && context\.hasPukeRing/);
  assert.match(source, /room-33-secret-arrival-safe[\s\S]*firedMapEvents\.includes\("room-33-secret-arrival-safe"\)/);
  assert.match(css, /secret-sewer-grate\.webp/);
});

test("the broom message is one floor square with a typography-only inspection panel", async () => {
  const [source, poiRegistry, css] = await Promise.all([
    readGameSource(),
    readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /floor-message-art" aria-label="Broom closet ahead">[\s\S]*<b>BROOM<\/b><b>CLOSET<\/b><b>AHEAD<\/b>/);
  assert.doesNotMatch(poiRegistry, /broom-closet-ahead-floor-message\.webp/);
  assert.match(css, /\.poi-token\.poi-id-broom-closet-message \{ inset: 3px; overflow: hidden/);
  assert.match(css, /\.poi-token\.poi-id-broom-closet-message > \.floor-message-art/);
  assert.match(css, /\.floor-message-inspection-text/);
});

test("M60 and M61 stop the deserter walk-in while J64 runs the self-resetting proximity bomb", async () => {
  const source = await readGameSource();
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /triggerTiles: \[\{ x: 12, y: 59 \}, \{ x: 12, y: 60 \}\]/);
  assert.match(source, /enteredRoomId[\s\S]*setPendingDungeonRoomId\(enteredRoomId\)/);
  assert.match(source, /room\.arrival[\s\S]*setChapterIntro\(true\)[\s\S]*openScriptedEncounter\(room\.entry\.encounter/);
  assert.match(source, /spawnConversationUnits\(label, point, actorNames, room\.arrival\.starts\)/);
  assert.match(source, /animateSceneWalk[\s\S]*room\.arrival\?\.stepMs/);
  assert.match(landmarks, /proximityBomb:[\s\S]*point: \{ x: 9, y: 63 \}[\s\S]*armRadius: 1[\s\S]*blastRadius: 2/);
  assert.match(source, /proximityBombPoint = DUNGEON_LANDMARKS\.proximityBomb\.point/);
  assert.match(css, /\.poi-token\.poi-id-proximity-bomb[\s\S]*height: 100%/);
  assert.match(source, /route\.path\.findIndex\(inProximityBombRoom\)/);
  assert.match(source, /LEAVING J64 BOMB ROOM: DETONATION/);
  assert.match(source, /unit\.team === "hero"[\s\S]*inProximityBombRoom\(unit\)[\s\S]*blastDamage/);
  assert.match(source, /itemsGrantHazardImmunity\(dungeonItems\[unit\.id\], "proximity-nuke"\)[\s\S]*Wife-Beater absorbs the blast/);
  assert.match(source, /proximityBombAnimation === "exploding"[\s\S]*proximity-bomb-room-explosion[\s\S]*proximityBomb\.room\.left[\s\S]*proximityBomb\.room\.bottom/);
  assert.match(css, /\.proximity-bomb-room-explosion[\s\S]*nuke-explosion-atlas\.png[\s\S]*nuke-room-cloud/);
  assert.doesNotMatch(source, /proximityBombBlastTile|proximity-bomb-room-blast/);
  assert.match(source, /A SMALL NUKE DROPS ONTO THE PLATFORM[\s\S]*THE SMALL NUKE DETONATES · THE PLATFORM REMAINS/);
  assert.match(source, /proximity-bomb-base[\s\S]*proximity-bomb-nuke[\s\S]*proximity-bomb-cloud/);
  assert.match(css, /j64-bomb-dormant.png[\s\S]*j64-proximity-bomb.png[\s\S]*nuke-explosion-atlas.png[\s\S]*small-nuke-drop/);
  assert.match(css, /proximity-bomb-nuke[\s\S]*hue-rotate\(78deg\)[\s\S]*#58ff72[\s\S]*small-nuke-pulse/);
  assert.match(source, /id: "proximity-bomb"[\s\S]*visibility: "always"/);
  assert.match(source, /setSocialScene\(null\);\s*setPendingDungeonRoomId\(null\);\s*setNoticeQueue\(\[\]\);\s*roomTriggerPosition\.current = "";\s*setSchoolQuizStep\(null\)/);
  assert.match(source, /setFiredMapEvents\(\["room-1"\]\)/);
  assert.match(source, /halaster-entry-warning[\s\S]*DELVER_ORIENTATION_MESSAGE/);
  assert.match(source, /enteredGuardianTrigger[\s\S]*movedUnit\.x === shieldGuardianTrigger\.x[\s\S]*setWanderingGuardian\(\{ path: guardianPath, step: 0, pass \}\)/);
  assert.match(source, /wandering-guardian-pass-\$\{pass\}-complete/);
});

test("Level 1 playtest uses Walker alone with the complete pre-dungeon test loadout", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const items = await readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8");
  const scenes = await readFile(new URL("../app/scene-content.ts", import.meta.url), "utf8");
  assert.match(source, /const dungeonHeroIds = playtest\s*\? \["Barbarian-0"\]/);
  assert.match(source, /hero\.name = "Walker"/);
  assert.match(source, /playtestKillingCurse[\s\S]*skill\.name === "Sanctuary"[\s\S]*skill\.name === "Fireball"/);
  assert.match(source, /playtest \? \["Ball Cap of Bad Ideas", "5 gp", "Werewolf Lycanthropy"\]/);
  assert.match(source, /"Barbarian-0": Math\.max\(2, current\["Barbarian-0"\] \|\| 0\)/);
  assert.match(source, /infinitePlaytestMovement[\s\S]*\? 9999/);
  assert.match(source, /Numpad8:[\s\S]*Numpad2:[\s\S]*Numpad7:[\s\S]*Numpad3:/);
  assert.doesNotMatch(source, />\s*Auto Explore\s*</);
  assert.match(source, />\s*Run Level 1 Regression\s*</);
  assert.match(source, /Stage Nearby moves the selected playtest hero/);
  assert.match(source, /stageLevelOneRegressionCheckpoint/);
  assert.match(source, /const blueLightsaberPoint = \{ x: 23, y: 70 \}/);
  assert.match(source, /heroEquipmentVisuals\(u\.id\)[\s\S]*visualMode === "overlay"/);
  assert.match(items, /equipment: \{ slot: "weapon", visualClass: "blue-lightsaber-equipped", visualMode: "sprite-variant", label: "Blue Lightsaber" \}/);
  assert.match(items, /Wife-Beater of Questionable Resilience[\s\S]*slot: "body"[\s\S]*visualMode: "sprite-variant"/);
  assert.match(items, /Wife-Beater of Questionable Resilience[\s\S]*hazardImmunities: \["proximity-nuke"\]/);
  assert.match(scenes, /That is no ordinary Wife-Beater\. That thing could survive a nuke\./);
  assert.doesNotMatch(scenes, /force-box|Can we just force the box/);
  assert.match(scenes, /prompt: "How do we cheat\?"[\s\S]*The easiest way is to grab a pair of Glasses of Good Questions\.\.\.[\s\S]*item: "Ball Cap of Bad Ideas"/);
  assert.match(items, /Ball Cap of Bad Ideas[\s\S]*slot: "head"[\s\S]*visualMode: "sprite-variant"/);
  const equipment = await readFile(new URL("../app/equipment-visuals.ts", import.meta.url), "utf8");
  assert.match(equipment, /equipmentVariantSuffix/);
  assert.match(equipment, /ballcap[\s\S]*wifebeater[\s\S]*lightsaber/);
  assert.match(equipment, /`\/\$\{prefix\}-\$\{suffix\}-sprites\.png`/);
  assert.doesNotMatch(css, /wifebeater-equipment-overlay\.png|ballcap-equipment-overlay\.png/);
  assert.doesNotMatch(css, /\.equipped-item-visual\.blue-lightsaber-equipped/);
  assert.match(css, /\.dropped-item-token\.blue-lightsaber-token \{\s*inset: 8px/);
  assert.match(source, />Playtest Level 1</);
});

test("trap persistence and visuals share one normalized state contract", async () => {
  const source = await readGameSource();
  const audit = await readFile(new URL("../app/campaign-state-audit.ts", import.meta.url), "utf8");
  const trapState = await readFile(new URL("../app/trap-state.ts", import.meta.url), "utf8");
  assert.match(audit, /normalizeTrapPersistence/);
  assert.match(source, /setDiscoveredPoi\(repairedState\.discoveredPoi\)/);
  assert.match(source, /room-33-flood-active[\s\S]*floodRoomHazard\.barrier/);
  assert.match(source, /trapVisualState\(\{[\s\S]*flags: firedMapEventSet/);
  assert.match(trapState, /if \(resolved\.has\("proximity-bomb"\)\) normalizedFlags\.delete\("proximity-bomb-armed"\)/);
  assert.match(trapState, /spiked-pit-28d-triggered/);
});

test("village waves use explicit ready and arrived handoffs", async () => {
  const source = await readGameSource();
  assert.match(source, /"village-wave1-ready"/);
  assert.match(source, /"village-wave2-starting"/);
  assert.match(source, /"village-wave2-arrived"/);
  assert.match(source, /setVillageWaveBreakUntil\(round \+ 2\)/);
  assert.match(source, /Poor Jim\./);
  assert.match(source, /villageWave === 2 && firedMapEvents\.includes\("village-wave2-arrived"\)/);
  assert.match(source, /if \(!preferredBarrier && !dust2MapActive && !clearLine\(\{ x, y \}, objective\)\) continue/);
  assert.match(source, /clearLine\(landing, objective\)/);
  assert.match(source, /const villageBreached = villageBattle && barriers\.some\(\(barrier\) => barrier\.hp <= 0\)/);
  assert.match(source, /villageBreached && livingVillagers\.length \? livingVillagers : ordinaryHeroTargets/);
  assert.match(source, /livingVillagers = units\.filter\(\(u\) => u\.role === "Villager" && u\.npc && !u\.downed\)/);
  assert.match(source, /villageBattle && !villageBreached && intactEntrances\.length/);
  assert.match(source, /openEntrance[\s\S]*villageBreachInterior\(openEntrance\.edgeKey\)/);
  assert.match(source, /breachRoute[\s\S]*routeTo\(active, breachPoint\.x, breachPoint\.y, active\.role === "Club Hostess"\)/);
});

test("bridge scene walks in, snares, and requires the north exit", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const engine = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const landmarks = await readFile(new URL("../app/map-landmarks.ts", import.meta.url), "utf8");
  assert.match(source, /wayfarer\.y = 1/);
  assert.match(source, /scenePath\(wayfarer, \{ x: 4, y: 5 \}, bridgeBlocked/);
  assert.match(source, /The blue-hatted Wayfarer walks slowly down the left side of the bridge/);
  assert.match(source, /showDialogueBubble\(wayfarer\.id, "Congratulations on saving the village\. There's makings of a hero in you\. Take this\."[\s\S]*setWayfarerReady\(true\)/);
  assert.match(source, /showDialogueBubble\(wayfarer\.id, "I can hear the screams of the villagers\. Why didn't you save them\?"/);
  assert.match(source, /showDialogueBubble\("bridge-bandit-0", "Bridge toll\. Coin first, crossing second\. No coin means steel\."/);
  assert.match(source, /const teleportThenOfferBoon = \(\) =>/);
  assert.match(source, /playTeleportAway\(wayfarer\.id, finishWayfarerBoon\)/);
  assert.match(source, /is catapulted onto the enemy side of the bridge/);
  assert.match(source, /guardWalkEnds[\s\S]*?, 420\)/);
  assert.match(css, /@keyframes wayfarer-launch/);
  assert.match(source, /x: 4, y: 3, facing: "n"/);
  assert.match(source, /trap\.id === "bridge-snare"[\s\S]*conditionImmunities\?\.includes\("stunned"\)/);
  assert.match(landmarks, /waystone:[\s\S]*id: "bridge-waystone"[\s\S]*point: \{ x: 6, y: 6 \}/);
  assert.match(source, /bridge-projector-sign/);
  assert.match(css, /bridge-projector-machine[\s\S]*arcane-projector-original-clean-v2\.png/);
  assert.match(css, /bridge-projector-sign[\s\S]*toll-warning-sign-chainless-v2\.png/);
  assert.doesNotMatch(css, /broken-projector-flicker/);
  assert.match(landmarks, /supplyCache:[\s\S]*id: "bridge-supply-cache"[\s\S]*point: \{ x: 6, y: 0 \}/);
  assert.doesNotMatch(source, /id: "bridge-toll-ledger"/);
  assert.doesNotMatch(source, /Mark the Wire Trap/);
  assert.match(source, /point\.kind === "trap"[\s\S]*hero\.role === "Rogue" && attackDist\(hero, point\) <= 2/);
  assert.match(source, /label: "Open Cache"/);
  assert.doesNotMatch(source, /Open Cache — Gain 1 Healing Potion/);
  assert.match(source, /The toll collectors advance while the company holds the south bank/);
  assert.match(source, /campaignScene === 6[\s\S]*BRIDGE_LANDMARKS\.exit\.point/);
  assert.match(landmarks, /exit:[\s\S]*point: \{ x: 4, y: 0 \}[\s\S]*North Bridge Exit/);
  assert.match(source, /setSocialScene\(\{[\s\S]*?kind: "bridge-bandits"/);
  assert.match(source, /campaignScene === 6[\s\S]*?\{ \.\.\.BRIDGE_LANDMARKS\.exit\.point, label: BRIDGE_LANDMARKS\.exit\.visual\.states\.default \}/);
  assert.doesNotMatch(source, /exit-ground-marker/);
  assert.match(source, /bridge-wayfarer-departed/);
  assert.match(source, /bridge-guards-approaching/);
  assert.match(source, /bridge-toll-open/);
  assert.match(source, /bridgeSequenceGateRef\.current\.has\("guards-approach"\)/);
  assert.match(source, /preserveBridgeBattlefield[\s\S]*setStage\("battle"\)[\s\S]*setMapVariant\("bridge"\)[\s\S]*setExitReached\(false\)/);
  assert.match(source, /setUnits\(\(current\) => \[[\s\S]*current\.filter\(\(unit\) => unit\.team === "hero" && !unit\.npc\)/);
  assert.match(source, /<span>“Thank you\.”<\/span>[\s\S]*MONTY[\s\S]*<span>“Blue\. No—yellow!”<\/span>/);
  assert.doesNotMatch(source, /montyPython && !hatHolder/);
  assert.match(css, /\.poi-token\.poi-id-bridge-supply-cache \{[\s\S]*inset: 0/);
  assert.match(engine, /kind: "bridge-bandits"[\s\S]*The wizard over there said he'd cover our fare/);
  assert.match(engine, /The wizard over there said he'd cover our fare\.[\s\S]*Nice reward for a hero\./);
  assert.doesNotMatch(engine, /No\. Absolutely not\. Bridge is yours\./);
});

test("the revised prologue keeps dialogue on the map and rewards visible", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(source, /Hmm\.\.\. looks like fresh wolf tracks\.\.\. and something\.\.\. bigger\?/);
  assert.match(source, /Five old gold coins glint beneath the rubble\./);
  assert.match(source, /showDialogueBubble\(consciousActive\.id, "Bar money\."\)/);
  assert.match(source, /"Sniff\.\.\."[\s\S]*"Smells like fresh meat\."[\s\S]*"Gross, did a troll cook this\?"/);
  assert.doesNotMatch(source, /startPoisonBaitScene[\s\S]*showDialogueBubble\(heroes\[0\]\.id, "Gross, did a troll cook this\?"\)/);
  assert.doesNotMatch(source, /That was some bad meat\./);
  assert.match(source, /We've barricaded ourselves in here! Protect us! They already got Jim!/);
  assert.match(source, /village-healing-potion-/);
  assert.match(source, /const giftSpots = \[[\s\S]*\{ x: 9, y: 6 \}[\s\S]*\{ x: 12, y: 6 \}/);
  assert.match(css, /healing-potion-pickup\.png/);
  assert.match(source, /Its brass eye has been torn out\.[\s\S]*PAY TOLL AHEAD\.\.\. OR ELSE\./);
  assert.match(css, /arcane-projector-original-clean-v2\.png/);
  assert.match(css, /toll-warning-sign-chainless-v2\.png/);
  assert.doesNotMatch(source, /const exitSign/);
  assert.doesNotMatch(source, /exit-ground-marker/);
  assert.doesNotMatch(css, /\.exit-token\.exit-ground-marker/);
  assert.doesNotMatch(css, /exit-arrow-signpost\.png/);
  assert.match(source, /teleport-away-effect/);
  assert.match(css, /teleport-away-sprite-sheet\.png/);
  assert.match(css, /teleport-away-sprite 1\.55s/);
  assert.match(encounters, /label: "I'm not going to pay\."/);
  assert.match(encounters, /label: "Child support is getting expensive in the kingdom\."/);
  assert.doesNotMatch(source, /THE ROAD DESCENDS/);
});

test("bridge archers hold useful firing distance instead of chasing rear squares", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /active\.role === "Bandit Archer" && effectiveRange > 1[\s\S]*preferredDistance = Math\.min\(6, effectiveRange\)/);
  assert.match(source, /rangeDifference \|\| a\.cost - b\.cost/);
  assert.match(source, /const bridgeArcherHolding[\s\S]*attackDist\(active, target\) >= 3/);
  assert.match(source, /bridgeArcherHolding[\s\S]*path: \[\] as \{ x: number; y: number \}\[\]/);
  assert.doesNotMatch(source, /const walkingFormation = \[\[4, 4\]/);
  assert.match(source, /bridge-projector-sign/);
  assert.match(source, /dungeon-chest-token bridge-default-chest/);
  assert.match(css, /\.bridge-projector-sign/);
  assert.match(css, /\.dungeon-chest-token/);
});

test("the O62 poster reveals the damaging Certain Death crawl and O47 keeps the club panel", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const map = JSON.parse(await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8"));
  assert.match(source, /const revealClubHostsAtSecretDoor/);
  assert.match(source, /The Extremely Alert Club/);
  assert.match(source, /setRevealedTiles\(\(tiles\) => \[\.\.\.new Set\(\[\.\.\.tiles, \.\.\.undertakerClubTiles, key\(14, 46\), key\(15, 46\)\]\)\]\)/);
  assert.match(source, /scheduleCutscene\(\(\) => revealClubHostsAtSecretDoor\(true\), 350\)/);
  assert.match(source, /const hallwaySpots = \[\{ x: 15, y: 46 \}/);
  assert.match(source, /Finish the Club Evacuation/);
  assert.match(source, /WHO PULLED THE ALARM\?/);
  assert.match(source, /westernSecretDoorEvent[\s\S]*pukeTunnelAreaTileKeys/);
  assert.match(source, /const pukeTunnelReward = \{ x: 14, y: 68 \}/);
  assert.match(source, /pukeTunnelAreaTileKeys/);
  assert.match(source, /poster-inspection-art/);
  assert.match(source, /pukeTunnelAreaTileKeys[\s\S]*Ring of Puke Immunity/);
  assert.match(source, /puke-immunity-ring[\s\S]*Ring of Puke Immunity/);
  assert.match(source, /const sewerSceneZone = \{ left: 14, top: 63, width: 3, height: 7 \}/);
  assert.match(css, /certain-death-sewer-scene-v6\.png/);
  assert.match(css, /background-position: 720px 3276px/);
  assert.equal(map.tiles[46 * map.width + 14].kind, "dungeon");
  assert.doesNotMatch(source, /key\(undertakerSecretDoor\.x, undertakerSecretDoor\.y\)\],/);
  assert.match(source, /pukeTunnelAreaTileKeys\.has\(key\(step\.x, step\.y\)\)/);
  assert.match(css, /\.dungeon-board \.grid \{[\s\S]*certain-death-sewer-scene-v6\.png[\s\S]*background-position: 720px 3276px[\s\S]*background-size: 173px 364px/);
  assert.doesNotMatch(source, /id: "puke-tunnel-reward-chest"/);
  assert.match(source, /enqueueNarration\([\s\S]*The Certain Death Crawl/);
  assert.doesNotMatch(source, /"ceramic-alarm-sounded",\s*"undertaker-secret-door-open",\s*"undertaker-hostile-6c"/);
});

test("the cube visibly engulfs heroes and 39a is a gated boss", async () => {
  const source = await readGameSource();
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  assert.match(source, /const BOSS_SPELL_RANGE = 6/);
  assert.match(source, /attackDist\(active, unit\) <= BOSS_SPELL_RANGE/);
  assert.match(css, /boss-spell-field/);
  assert.match(source, /engulfed = u\?\.role === "Gelatinous Cube"/);
  assert.match(source, /className="engulfed-victim"/);
  assert.match(actors, /Ettin:[\s\S]*name:"The Two-Headed King"/);
  assert.doesNotMatch(source, /enemy\.name = "The Two-Headed King"/);
  assert.match(source, /BRUISER HEAD: CROWN-SLAM!/);
  assert.match(source, /bossHead: "spellcaster"/);
  assert.match(source, /bossHead: "bruiser"/);
  assert.match(source, /armChargedSpell\(active, "Crown Beam"/);
  assert.match(source, /SPELL HEAD: HOLD STILL!/);
  assert.match(source, /two-headed-king-enraged/);
  assert.match(source, /BOTH HEADS AGREE—CRUSH THEM!/);
  assert.match(source, /const advanceEnemyToward/);
  assert.match(source, /boss-39a-advanced/);
  assert.match(source, /The Two-Headed King lumbers/);
  assert.match(css, /two-headed-boss-arena/);
  assert.match(css, /boss-shockwave/);
  assert.match(rooms, /"32a": \{ title: "Steam Hall"/);
  assert.match(rooms, /"39a"[\s\S]*monsters: \["Ettin"\]/);
});

test("charged spells telegraph one round before Solar Beam, Tailstorm, and Crown Beam fire", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /type ChargedSpell/);
  assert.match(source, /"Solar Beam"[\s\S]*chargeRounds: 1[\s\S]*damageType: "radiant"/);
  assert.match(source, /armChargedSpell\(active, "Tailstorm"/);
  assert.match(source, /releaseChargedSpell\(readyCharge\)/);
  assert.match(source, /readyChargedSpellFor\(chargedSpells, active, round\)/);
  assert.match(source, /scheduleChargedTurnCompletion\(\)/);
  assert.doesNotMatch(source, /releaseChargedSpell\(readyCharge\);\s*setChosen\(null\);\s*setPhase\("facing"\);\s*\}/);
  assert.match(source, /`\$\{unit\.unitId \|\| unit\.id\}:\$\{unit\.bossHead \|\| "unit"\}`/);
  assert.match(source, /wife-beater-killing-curse/);
  assert.match(source, /You're gonna get it now\./);
  assert.match(source, /rageRounds: 5/);
  assert.match(source, /Legendary Box earned: The Boy Who Lived/);
  assert.match(source, /The Hat Made Me Do It/);
  assert.match(source, /ENEMY_TACTICS/);
  assert.match(source, /tactic === "flanker"/);
  assert.match(source, /tactic === "controller"/);
  assert.match(source, /TACTIC ·/);
  assert.match(source, /consequenceEcho/);
  assert.match(source, /CHARGED ATTACKS/);
  assert.match(css, /\.cell\.charged-intent\.enemy-intent/);
  assert.match(css, /\.cell\.charged-intent\.friendly-intent/);
});

test("the Two-Headed King keeps canonical identity and replays its opening curse", async () => {
  const source = await readGameSource();
  assert.match(source, /name: "The Two-Headed King — Spell Head"/);
  assert.match(source, /name: "The Two-Headed King — Bruiser Head"/);
  assert.doesNotMatch(source, /name: `\$\{u\.name\} — (?:Spell|Bruiser) Head`/);
  assert.match(source, /name: unit\.name, initiative: unit\.initiative, bossHead: unit\.bossHead/);
  assert.match(source, /name: "The Two-Headed King", initiative: 8, bossHead: undefined/);
  assert.match(source, /events\.filter\(\(event\) => event !== "wife-beater-killing-curse"\)[\s\S]*"two-headed-king-engaged"/);
  assert.match(source, /SPELL HEAD: AVADA KEDAVRA!/);
  assert.match(source, /const target = wearer \|\| units\.filter[\s\S]*attackDist\(twoHeadedKing, a\)/);
  assert.match(source, /hp: wearer \? 1 : 0, downed: !wearer/);
  assert.match(source, /if \(!wearer\) return;[\s\S]*The Boy Who Lived/);
});

test("scene seams reset turn resources and the poison plan earns the first Hat dialogue achievement", async () => {
  const source = await readGameSource();
  assert.match(source, /Leftover movement[\s\S]*setMovementSpent\(0\)[\s\S]*setDashActive\(false\)[\s\S]*\[campaignScene, encounterMode\]/);
  assert.match(source, /awardBallCapDialogue\(guardSpeakerId\);[\s\S]*completeCampaignScene\("poison", "poison_bait"\)/);
});

test("the Manticore Den runs a three-question show that determines which team acts first", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const engine = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(source, /"16": \[\{ x: 21, y: 28 \}, \{ x: 23, y: 28 \}, \{ x: 22, y: 26 \}\]/);
  assert.match(source, /setInspectPoi\(null\);[\s\S]*setOverlapSelection\(null\);[\s\S]*setChosen\(\{ kind: "attack" \}\)/);
  assert.match(source, /manticoreStageZone = \{ left: 20, top: 20, width: 5, height: 5 \}/);
  assert.match(source, /manticoreWalkInTiles = \[25, 26, 27\]/);
  assert.match(source, /manticoreContestantSpots = \[[\s\S]*\{ x: 21, y: 22 \}[\s\S]*\{ x: 23, y: 22 \}/);
  assert.match(source, /manticoreContestantSpots = \[[\s\S]*\{ x: 21, y: 23 \}[\s\S]*\{ x: 23, y: 23 \}/);
  assert.match(source, /schoolStudentDesks = \[[\s\S]*\{ x: 3, y: 77 \}[\s\S]*\{ x: 6, y: 77 \}/);
  assert.match(source, /const classroomOrder = \[active\.id,[\s\S]*const walkDurations = classroomOrder\.map/);
  assert.match(source, /The attack was not spent/);
  assert.match(css, /\.inspect \{[\s\S]*background: transparent;[\s\S]*pointer-events: none/);
  assert.match(rooms, /"16": \{ radius: 0, triggerTiles: \[\{ x: 20, y: 25 \}, \{ x: 20, y: 26 \}, \{ x: 20, y: 27 \}\], encounter: "manticore-show" \}/);
  assert.match(source, /encounterBaseUnits = label === "16"[\s\S]*manticoreContestantSpots/);
  assert.match(css, /manticore-stage-5x5\.webp/);
  assert.doesNotMatch(css, /\.manticore-contestant-marker/);
  assert.match(source, /enemy\.team = "neutral";[\s\S]*enemy\.npc = true/);
  assert.match(source, /openScriptedEncounter\("manticore-show"\)/);
  assert.match(source, /socialScene\?\.kind !== "manticore-show"[\s\S]*manticoreStageFocus\.x[\s\S]*board\.scrollLeft[\s\S]*updateDungeonViewport/);
  assert.match(source, /manticoreStageFocus = \{ x: 22, y: 22 \}/);
  assert.match(engine, /"manticore-show"[\s\S]*Welcome to the Show/);
  assert.match(source, /MANTICORE_SHOW_QUESTIONS/);
  assert.match(source, /startManticoreShow[\s\S]*setRevealedTiles[\s\S]*SHOWTIME: ALL THREE MANTICORES TAKE THE STAGE/);
  assert.match(source, /nextQuestion\.prompt/);
  assert.match(source, /Question \{manticoreShow\.round\} of 3/);
  assert.match(source, /const heroesFirst = score >= 2/);
  assert.match(source, /unit\.encounterGroup === "16"[\s\S]*initiativeRoll:[\s\S]*50/);
  assert.match(source, /unit\.team === "hero"[\s\S]*initiativeRoll:[\s\S]*50/);
  assert.doesNotMatch(engine, /manticore-den-cleared/);
  assert.match(source, /const MANTICORE_TAILSTORM_RANGE = 6/);
  assert.match(source, /attackDist\(active, unit\) <= MANTICORE_TAILSTORM_RANGE/);
  assert.match(source, /clearLine\(active, unit\)/);
  assert.match(source, /const actorDefinition = getActorDefinition\(name\)/);
  assert.match(source, /Manticore: monster\("Manticore"[\s\S]*footprint:\{width:2,height:1\}/);
  assert.match(source, /manticoreShowActive[\s\S]*manticore-show-spotlight/);
  assert.match(css, /\.token\.manticore-show-spotlight[\s\S]*manticore-show-sweep/);
  assert.match(source, /manticoreShow,[\s\S]*localStorage\.setItem/);
  assert.match(source, /setManticoreShow\(s\.manticoreShow/);
  assert.match(source, /title: "The Show Must Go On"/);
  assert.match(source, /boxName: "Encore Box"/);
  assert.match(source, /manticore-show-must-go-on-awarded/);
  assert.doesNotMatch(rooms, /"16"[^\n]*loot:/);
  assert.match(source, /OBSOLETE_DUNGEON_DROP_IDS = new Set\(\[[^\]]*"room-loot-16-chest"/);
  assert.match(source, /OBSOLETE_DUNGEON_DROP_IDS\.has\(item\.id\)/);
});

test("the western secret hall announces itself and 19c contains a paranoid survivor", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const engine = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  assert.match(source, /Blood along the walls spells out CERTAIN DEATH\. Oh well, I'm sure that's for some other weaker adventurers\./);
  assert.match(source, /const westernSecretDoor = \{ x: 14, y: 61 \}/);
  assert.match(source, /const pukeTunnelReward = \{ x: 14, y: 68 \}/);
  assert.match(rooms, /"19c": "paranoid-dwarf"/);
  assert.match(source, /openScriptedEncounter\(room\.entry\.encounter\)/);
  assert.match(rooms, /"19c"[\s\S]*Something moves beneath it/);
  assert.doesNotMatch(rooms, /A living dwarf crouches beneath/);
  assert.doesNotMatch(source, /roomProp\("dead-dwarf-door"/);
  assert.match(engine, /"paranoid-dwarf"[\s\S]*Gromm and the Flour/);
  assert.match(engine, /offer-flour-help[\s\S]*gromm-requested-flour[\s\S]*reopen-encounter[\s\S]*one more bag of flour/);
  assert.match(engine, /give-gromm-flour[\s\S]*consume-party-item[\s\S]*trap-flour-ghost[\s\S]*retain: true/);
  assert.doesNotMatch(engine, /Salt first, flour second/);
  assert.match(source, /effect\.kind === "reopen-encounter"[\s\S]*setSocialScene\(\{ \.\.\.scene, text: effect\.text, speaker:/);
  assert.match(engine, /ball-cap-door[\s\S]*Ball Cap of Bad Ideas[\s\S]*Why would you draw a door[\s\S]*empower-flour-ghost/);
  assert.match(engine, /glasses-church-bakery[\s\S]*church with a bakery in the basement[\s\S]*Magic Circle Recipe/);
  assert.match(source, /kind === "paranoid-dwarf"[\s\S]*Is this flour\?/);
  assert.match(source, /gromm-requested-flour[\s\S]*I need one more bag of flour[\s\S]*gromm-introduction-seen/);
  assert.match(source, /Flour-Bound Ghost[\s\S]*flour-ghost-trapped/);
  assert.match(source, /The Starved Ghost[\s\S]*gameTransitions\.startCombat/);
  assert.match(source, /ghost\.x = point\.x; ghost\.y = point\.y[\s\S]*THE STARVED GHOST RISES INSIDE THE FLOUR CIRCLE/);
  assert.match(source, /THE STARVED GHOST CROSSES THE ROOM TOWARD GROMM[\s\S]*animateSceneWalk\(ghost\.id, route, 0, 320\)/);
  assert.match(source, /THE STARVED GHOST SEIZES GROMM[\s\S]*THE STARVED GHOST SWALLOWS GROMM WHOLE[\s\S]*THE STARVED GHOST TURNS TO YOU/);
  assert.match(source, /runEncounterSequence\("Finish the Ghost's Attack"[\s\S]*gameTransitions\.startCombat\(\)/);
  assert.match(source, /flour-circle-ground[\s\S]*ghost-trapped[\s\S]*ghost-empowered/);
  assert.match(source, /flour-bound-ghost-token[\s\S]*empowered-flour-ghost-token/);
  assert.match(source, /phasingFlourGhost[\s\S]*takes the straight path through stone/);
  assert.match(source, /ghost\.move = 8[\s\S]*ghost\.range = 1/);
  assert.match(css, /starved-ghost-sprite-haunt[\s\S]*scale\(3\.25\)/);
  assert.match(css, /flour-ghost-ward-circle-v2\.webp/);
  assert.doesNotMatch(css, /cell:has\(\.flour-circle-ground\)/);
  assert.doesNotMatch(css, /➜  ☺  🚪/);
});

test("Room 19c triggers at its AA49 doorway and Fireball renders as one correctly anchored board zone", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(rooms, /"19c": \{ radius: 0, triggerTiles: \[\{ x: 26, y: 48 \}\], encounter: "paranoid-dwarf" \}/);
  assert.doesNotMatch(rooms, /"19c"[^\n]*x: 26, y: 50/);
  assert.match(source, /const burningTileSet = new Set/);
  assert.match(source, /const burningOrigin = burningZone\?\.tiles\.length/);
  assert.match(source, /className="fireball-ground-slice"[\s\S]*--fireball-slice-x[\s\S]*--fireball-slice-y/);
  assert.match(source, /setBurningZone\(\{ tiles, triggerRound: round, sourceId: active\.id \}\)/);
  assert.match(source, /burningZone\.triggerRound <= round[\s\S]*setBurningZone\(null\)/);
  assert.doesNotMatch(source, /isBurning && <span className="burning-ground-overlay"/);
  assert.match(css, /\.fireball-ground-slice[\s\S]*z-index: 4[\s\S]*fireball-orb-pixel\.webp[\s\S]*156px 156px/);
  assert.doesNotMatch(css, /\.fireball-zone-overlay/);
  assert.doesNotMatch(css, /@keyframes fireball-vfx/);
  assert.doesNotMatch(css, /\.fireball-zone-overlay \{[\s\S]{0,350}(radial-gradient|box-shadow|border:)/);
});

test("scripted conversations cannot be abandoned unless the scene explicitly supports leaving", async () => {
  const source = await readGameSource();
  const dialogueModel = await readFile(new URL("../app/dialogue-model.ts", import.meta.url), "utf8");
  assert.match(dialogueModel, /const DISMISSIBLE_SOCIAL_KINDS = new Set<SocialScene\["kind"\]>\(\["dead-mage", "schoolteacher"\]\)/);
  assert.match(source, /if \(!socialScene \|\| !DISMISSIBLE_SOCIAL_KINDS\.has\(socialScene\.kind\)\) return/);
  assert.doesNotMatch(source, />Leave conversation<\/button>/);
});

test("hostile actions provoke every neutral NPC in the same encounter group", async () => {
  const source = await readGameSource();
  assert.match(source, /const provokedEncounterGroups = new Set/);
  assert.match(source, /unit\.encounterGroup && provokedEncounterGroups\.has\(unit\.encounterGroup\)/);
  assert.match(source, /markEncounterGroupsHostile\(provokedEncounterGroups\)/);
  assert.match(source, /"6c": "undertaker-hostile-6c"/);
});

test("the Certain Death warning is narration only with no wall marker", async () => {
  const source = await readGameSource();
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /death-warning/);
  assert.doesNotMatch(css, /death-warning-carving/);
  assert.match(source, /Blood along the walls spells out CERTAIN DEATH/);
});

test("Level 1 polish includes sound, openable achievement boxes, durable dialogue, and completion summary", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sounds = await readFile(new URL("../app/sound-engine.ts", import.meta.url), "utf8");
  assert.match(sounds, /type SoundCue/);
  assert.match(sounds, /const RECORDED_CUES/);
  assert.match(sounds, /\/audio\/kenney\/attack-1\.ogg/);
  assert.match(sounds, /new Audio\(variants\[cursor % variants\.length\]\)/);
  assert.match(sounds, /cue !== "howl" && playRecordedCue\(cue\)/);
  assert.match(source, /Sound \{soundEnabled \? "ON" : "OFF"\}/);
  assert.match(source, /shattered-crown-sound/);
  assert.match(source, /key: "undertaker-club-tour"/);
  assert.match(source, /key: "fresh-meat-troll"/);
  assert.match(source, /key: "level-one-complete"/);
  assert.match(source, /const openAchievementBox/);
  assert.match(source, /award\.id\.startsWith\("king-slayer:"\)[\s\S]*"Circlet of Blasting"/);
  assert.doesNotMatch(source, /Open boxes here between encounters/);
  assert.doesNotMatch(source, /Boxes \{achievements\.length\}/);
  assert.match(source, /setAchievements\(\(current\) => current\.filter\(\(entry\) => entry\.id !== awardId\)\)/);
  assert.match(source, /claimedAchievementIds/);
  assert.match(source, /"Potion of Speed"[\s\S]*stats: \{ move: 1 \}/);
  assert.doesNotMatch(rooms, /"39a":[^\n]*loot: \["Circlet of Blasting"\]/);
  assert.match(source, /guardSpeakerId,[\s\S]*wayfarerSpeakerId,[\s\S]*socialScene/);
  assert.match(source, /guardianTriggerAt: guardianTriggerRoom\.current/);
  assert.doesNotMatch(source, /positionSignature === roomTriggerPosition\.current/);
  assert.match(source, /THE TWO-HEADED KING FALLS/);
  assert.match(source, /THE FLOOR REMEMBERS/);
  assert.match(source, /DELVER ORIENTATION COMPLETE/);
  assert.match(source, /NEW HALL NOMINATION/);
  assert.match(source, /REWARD BOXES/);
  assert.match(source, /unopenedAchievementBoxes\.length[\s\S]*Continue to Level 2/);
  assert.match(source, /levelOneComplete = campaign[\s\S]*firedMapEvents\.includes\("level-one-complete"\)/);
  assert.match(source, /victory \|\| levelOneComplete/);
  assert.match(source, /const startLevelTwo = \(\) =>[\s\S]*setCampaignScene\(9\)[\s\S]*setEncounterMode\("exploration"\)/);
  assert.match(source, /levelTwoTerrainMap[\s\S]*"black-room"/);
  assert.match(source, /noticeQueue\[0\]\?\.kind === "achievement"/);
  assert.match(source, /noticeQueue\[0\]\?\.kind === "halaster"/);
  assert.match(source, /const dismissNotice = \(\) => setNoticeQueue\(\(current\) => \{/);
  assert.doesNotMatch(source, /setAchievementToast|null\), 6500/);
  assert.doesNotMatch(source, /setHalasterMock/);
  assert.doesNotMatch(source, /roomProp\("headless-cobra-statue"/);
  assert.match(rooms, /"25a": \{ title: "Dead Goblin"[\s\S]*Dwarven Mining Pick/);
  assert.doesNotMatch(rooms, /"25b": \{/);
  assert.match(css, /\.level-complete-summary/);
  assert.match(css, /\.result\.level-one-completion-result[\s\S]*position: fixed[\s\S]*z-index: 240/);
  assert.match(css, /\.level-two-black-room/);
  assert.match(css, /\.character-recap/);
  assert.match(css, /\/princess-hologram\.png/);
  assert.match(css, /triggered-spike-floor-tile-v2\.png/);
  assert.match(css, /@keyframes spike-floor-snap-in/);
});

test("Delver Orientation uses a separate Halaster hologram at T59 beside its U59 projector", async () => {
  const source = await readGameSource();
  const visuals = await readFile(new URL("../app/visual-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const map = await readFile(new URL("../app/undermountain-level-1.json", import.meta.url), "utf8");
  assert.match(visuals, /ORIENTATION_PROJECTOR_POINT = \{ x: 20, y: 58 \}/);
  assert.match(visuals, /ORIENTATION_HOLOGRAM_POINT = \{ x: 19, y: 58 \}/);
  assert.doesNotMatch(source, /next\.add\(key\(ORIENTATION_HOLOGRAM_POINT\.x, ORIENTATION_HOLOGRAM_POINT\.y\)\)|next\.add\(key\(20, 58\)\)/);
  assert.match(source, /orientationHologramHere = dungeonMode && x === ORIENTATION_HOLOGRAM_POINT\.x && y === ORIENTATION_HOLOGRAM_POINT\.y/);
  assert.match(source, /mapHologram = eyeHologramHere[\s\S]*kind: "princess"[\s\S]*orientationHologramHere[\s\S]*kind: "halaster"/);
  assert.match(source, /data-map-hologram=\{mapHologram\.kind\}/);
  assert.match(source, /className=\{`eye-princess-hologram \$\{mapHologram\.speaking/);
  assert.match(source, /className=\{`eye-princess-hologram-figure \$\{mapHologram\.kind === "halaster" \? "halaster-hologram-figure"/);
  assert.match(source, /noticeQueue\[0\]\.text !== DELVER_ORIENTATION_MESSAGE/);
  assert.match(css, /\.eye-princess-hologram-figure\.halaster-hologram-figure[\s\S]*background: url\("\/halaster-hologram-visible\.png"\)[\s\S]*!important/);
  assert.match(css, /\.eye-princess-hologram:has\(\.halaster-hologram-figure\)::before[\s\S]*clip-path:[\s\S]*halaster-projector-beam/);
  assert.match(css, /\.eye-princess-hologram:has\(\.halaster-hologram-figure\) > em[\s\S]*bottom: 66px[\s\S]*width: 230px/);
  assert.doesNotMatch(source, /halaster-map-figure|halaster-map-speech/);
  assert.doesNotMatch(source, /halaster-icon[^a-z]|>🧙</);
  assert.doesNotMatch(source, /orientation-map-overlay/);
  assert.doesNotMatch(source, /aria-hidden="true">H<\/i>/);
  assert.doesNotMatch(rooms, /"14c":/);
  assert.doesNotMatch(map, /"label": "14c"/);
  assert.match(source, /id: DUNGEON_LANDMARKS\.heartAcid\.id[\s\S]*DUNGEON_LANDMARKS\.heartAcid\.mountPoint/);
});

test("the public release has recovery UI and share metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const errorBoundary = await readFile(new URL("../app/error.tsx", import.meta.url), "utf8");
  assert.match(layout, /metadataBase: new URL\("https:\/\/shattered-crown-tactics\.firekeeping\.chatgpt\.site"\)/);
  assert.match(layout, /openGraph:[\s\S]*\/og\.png[\s\S]*twitter:/);
  assert.doesNotMatch(layout, /codex-preview/);
  assert.match(errorBoundary, /Retry Current Scene/);
  assert.match(errorBoundary, /Reload Saved Campaign/);
  assert.match(errorBoundary, /campaign save is still intact/);
});

test("shared playability systems standardize room entry, encounters, interactions, debug overlays, and previews", async () => {
  const source = await readGameSource();
  const objectiveTracker = await readFile(new URL("../app/objective-tracker.tsx", import.meta.url), "utf8");
  const systems = await readFile(new URL("../app/playability-systems.ts", import.meta.url), "utf8");
  const roomEntryModal = await readFile(new URL("../app/room-entry-modal.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(systems, /type EncounterLifecycle = "dormant" \| "introduced" \| "choice" \| "combat" \| "resolved" \| "rewarded"/);
  assert.match(systems, /DEBUG_LAYERS[\s\S]*collision[\s\S]*triggers[\s\S]*rooms[\s\S]*spawns[\s\S]*art/);
  assert.match(systems, /turnResourceSummary/);
  assert.match(systems, /hitPreviewLabel/);
  assert.match(source, /roomPresentation === "modal"[\s\S]*presentRoomEntry\(label, room\.title, room\.description, point\)/);
  assert.match(source, /const snapToCharacter = \(\) =>[\s\S]*board\.scrollTo\(\{ \.\.\.focus\.scroll, behavior: "smooth" \}\)/);
  assert.match(source, /className="map-zoom-controls"/);
  assert.match(source, /\[mapZoom, setMapZoom\] = useState\(1\.5\)/);
  assert.match(source, /Math\.min\(2\.25, Number\(\(zoom \+ 0\.25\)/);
  assert.match(source, /suppressBoardClicksUntilRef\.current = Number\.POSITIVE_INFINITY/);
  assert.match(source, /const dismissRoomEntry = \(\) =>[\s\S]*setRoomEntryPresentation\(null\)/);
  assert.match(source, /roomEntryPresentation,[\s\S]*localStorage\.setItem\(CAMPAIGN_SAVE_KEY/);
  assert.match(source, /setRoomEntryPresentation\(s\.roomEntryPresentation \|\| null\)/);
  assert.match(source, /<RoomEntryModal entry=\{roomEntryPresentation\} onDismiss=\{dismissRoomEntry\}/);
  assert.match(roomEntryModal, /className="room-entry-overlay"[\s\S]*aria-modal="true"[\s\S]*onClick=\{onDismiss\}>Continue/);
  assert.doesNotMatch(source, /setRoomEntryPresentation\(\(current\) => current\?\.roomId === roomId \? null : current\), 1420/);
  assert.doesNotMatch(source, /interaction-focus|NEARBY/);
  assert.doesNotMatch(systems, /InteractionFocusItem/);
  assert.match(source, /<ObjectiveTracker/);
  assert.match(objectiveTracker, /className=\{`objective-tracker/);
  assert.match(source, /pukeTunnelAreaTileKeys[\s\S]*SEWAGE: 1 DAMAGE PER STEP/);
  assert.match(source, /OPPORTUNITY ATTACK/);
  assert.match(source, /hitPreviewLabel\(hit\(active, hoveredTarget/);
  assert.match(css, /\.debug-layer-controls/);
  assert.match(css, /\.room-entry-presentation/);
  assert.match(css, /\.room-entry-overlay[\s\S]*position: fixed; inset: 0[\s\S]*pointer-events: auto/);
  assert.match(css, /\.turn-resource-strip/);
  assert.match(css, /\.target-preview \{ position: absolute;/);
});

test("X71 consolidates the magic sword while treasure and J64 use authored sprite states", async () => {
  const source = await readGameSource();
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const items = await readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8");
  const visuals = await readFile(new URL("../app/visual-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const dialogueReview = await readFile(new URL("../docs/dialogue-review.md", import.meta.url), "utf8");
  const x71Bathrobe = await readFile(new URL("../public/x71-bathrobe.png", import.meta.url));
  const x71Hilt = await readFile(new URL("../public/unignited-lightsaber-hilt.png", import.meta.url));
  const requiredSprites = [
    "treasure-chest-closed.png",
    "treasure-chest-open.png",
    "j64-relic-swap-atlas.webp",
    "fireball-bomb-vfx-atlas.webp",
    "nuke-explosion-atlas.png",
    "dwarven-cave-in-v1.webp",
    "halleth-hermit-sprites.webp",
  ];
  const spriteBytes = await Promise.all(requiredSprites.map((file) =>
    readFile(new URL(`../public/${file}`, import.meta.url))));

  assert.doesNotMatch(rooms, /Empty Guard Post|"4": \{/);
  assert.match(rooms, /"2a": \{ title: "Western Hall", description: "A bare corridor bends west between several branching passages\."/);
  assert.match(rooms, /const SILENT_ROOM_ENTRIES = new Set\(\["2a", "6e", "7a", "8a", "26a", "26b", "29", "31", "38", "40"\]\)/);
  assert.match(rooms, /const AMBIENT_ROOM_ENTRIES = new Set\(\["6a", "7b", "11", "12", "14b", "15", "19a", "19b", "24b", "25a", "28b", "28d", "32a", "32b", "34"\]\)/);
  assert.doesNotMatch(rooms, /The chamber from AH62 through AJ64|reaches AI63|at X71|at M75|the spear is part of the creature|looks hungry enough to bargain/);
  assert.doesNotMatch(rooms, /loot: \["Glowing Longsword"\]/);
  assert.match(rooms, /"28b": \["discarded-bathrobe"\]/);
  assert.doesNotMatch(rooms, /"28b": \["sword-in-armor"\]/);
  assert.match(visuals, /id === "discarded-bathrobe" && room\.id === "28b"[\s\S]*x: 23,[\s\S]*y: 70,[\s\S]*asset: "\/x71-bathrobe\.png"[\s\S]*width: 58,[\s\S]*height: 39/);
  assert.ok(x71Bathrobe.length > 100_000);
  assert.ok(x71Hilt.length > 20_000);
  assert.match(items, /"Blue Lightsaber"[\s\S]*baseDamage: 7[\s\S]*damageType: "radiant"/);
  assert.doesNotMatch(items, /"Glowing Longsword": \{/);
  assert.match(source, /item === "Glowing Longsword" \? "Blue Lightsaber" : item/);
  assert.match(source, /data-chest-state=\{drop\.contents \? \(openChestId === drop\.id \? "open" : "closed"\)/);
  assert.match(source, /setProximityBombAnimation\("exploding"\)[\s\S]*setProximityBombAnimation\("resetting"\)[\s\S]*setProximityBombAnimation\("idle"\)/);
  assert.match(css, /treasure-chest-closed\.png[\s\S]*treasure-chest-open\.png/);
  assert.match(css, /proximity-bomb-armed[\s\S]*background-size: 200% 100%/);
  assert.match(css, /proximity-bomb-room-explosion[\s\S]*nuke-explosion-atlas\.png/);
  assert.doesNotMatch(css, /j64-bomb-armed\.png|j64-bomb-explosion\.png|j64-bomb-resetting\.png/);
  assert.ok(spriteBytes.every((bytes) => bytes.length > 20_000));
  assert.match(dialogueReview, /T59\/U59 — Delver Orientation/);
  assert.match(dialogueReview, /V99 throne — Level 1 completion/);
});

test("the AA82 mimic enters one complete combat lifecycle without a missing actor path", async () => {
  const source = await readGameSource();
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  assert.match(actors, /"Large Mimic": monster\("Large Mimic"[\s\S]*monster-large-mimic-sprites\.png/);
  assert.doesNotMatch(source, /const monsters:/);
  assert.match(source, /spawnActor\(actorDefinition\.id/);
  assert.match(source, /definition\.action === "trigger-mimic"[\s\S]*const interactingHero = active\?\.team === "hero"/);
  assert.match(source, /setFiredMapEvents\(\(events\) => \[\.\.\.new Set\(\[\.\.\.events, "mimic-triggered"\]\)\]\);[\s\S]*setPendingDungeonRoomId\("40"\)/);
  assert.match(source, /const dungeonRoomPoint = \(label: string\) => label === "40"[\s\S]*goldenSpearMimicPoint/);
  assert.match(source, /"40": \{ requiresFlags: \["mimic-triggered"\] \}/);
  assert.match(source, /"40": \[\{ x: 26, y: 81 \}\]/);
});

test("Walker dual wields and the black dragon uses the CR 2 wyrmling block", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  const equipment = await readFile(new URL("../app/equipment-runtime.ts", import.meta.url), "utf8");
  assert.match(page, /walkerDefaultOffhand[\s\S]*active\?\.name === "Walker"[\s\S]*canTwinStrike/);
  assert.match(equipment, /equippedWeapon && !itemWeapon\) return null/);
  const dragon = actors.match(/"Black Dragon": monster\("Black Dragon", \{([\s\S]*?)\}\),\n/)?.[1] || "";
  assert.match(dragon, /cr:2/);
  assert.match(dragon, /hp:33/);
  assert.match(dragon, /ac:17/);
  assert.match(dragon, /attackBonus:4/);
  assert.match(dragon, /immunities:\["acid"\]/);
  assert.match(page, /active\.role === "Black Dragon"[\s\S]*wyrmling-acid-breath[\s\S]*breath\.saveAbility[\s\S]*rend\.attackCount/);
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  assert.match(rooms, /"17b": \{ radius: 0, triggerTiles: \[\{ x: 21, y: 39 \}\]/);
  assert.match(rooms, /"17b": \[\{ x: 20, y: 48 \}\]/);
  assert.doesNotMatch(rooms, /"17b"[^\n]*Living Shroud/);
  assert.doesNotMatch(rooms, /"17b": \["black-idol"\]/);
  assert.match(page, /black-dragon-sleeping[\s\S]*attackDist\(unit, dragon\) <= 2[\s\S]*black-dragon-awake/);
});

test("legacy monster saves self-repair before boss AI runs", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../app/monster-runtime.ts", import.meta.url), "utf8");

  assert.match(runtime, /normalizeMonsterRuntime[\s\S]*definition\.statBlock\.attacks\.map[\s\S]*monsterAttackSkill[\s\S]*maxHp = definition\.statBlock\.hitPoints/);
  assert.match(page, /repairedState\.units\.map[\s\S]*normalizeMonsterRuntime/);
  assert.match(page, /normalizeMonsterRuntime\(active\)[\s\S]*monsterRuntimeChanged/);
  assert.match(page, /if \(!rend\)[\s\S]*normalizeMonsterRuntime\(unit\)[\s\S]*return/);
});

test("inventory exposes functional equipment slots", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /equipment-slots[\s\S]*Main hand[\s\S]*Off hand[\s\S]*Armor[\s\S]*Accessory 1[\s\S]*Quick item 1/);
  assert.match(page, /delete slots\[slot\]/);
  assert.match(css, /\.equipment-slots[\s\S]*\.equipment-slot/);
});

test("the complete 2014 class roster includes four new playable sprite-backed classes", async () => {
  const runtime = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const visuals = await readFile(new URL("../app/equipment-visuals.ts", import.meta.url), "utf8");
  for (const [role, prefix] of [["Monk", "tenzin"], ["Paladin", "garran"], ["Ranger", "ash"], ["Warlock", "vesper"]]) {
    assert.match(runtime, new RegExp(`${role}: dndProfile`));
    assert.match(runtime, new RegExp(`${role}: \\[`));
    assert.match(visuals, new RegExp(`${role}: "${prefix}"`));
    const sprite = await readFile(new URL(`../public/${prefix}-sprites.png`, import.meta.url));
    assert.ok(sprite.length > 100_000, `${role} should have a production combat strip`);
  }
  for (const ability of ["Stunning Strike", "Divine Smite", "Hunter's Mark", "Eldritch Blast"])
    assert.ok(runtime.includes(ability), `${ability} should be authored`);
});

test("approved new-class pools replace placeholders and Rangers automatically reveal tracks", async () => {
  const runtime = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(runtime, /Leap of the Clouds[\s\S]*Wholeness of Body/);
  assert.match(runtime, /Branding Smite[\s\S]*additional radiant damage/);
  assert.doesNotMatch(runtime, /Pass Without Trace|Hunger of the Pact/);
  assert.match(runtime, /Spike Growth[\s\S]*Fog Cloud[\s\S]*Animal Companion|Spike Growth[\s\S]*Fog Cloud/);
  assert.match(runtime, /Arms of Hadar[\s\S]*Hunger of Hadar[\s\S]*Vampiric Touch/);
  assert.match(page, /isAnimalTracks\(point\)[\s\S]*attackDist\(hero, point\) <= 1/);
});

test("enemy abilities share one AI selector and XP sources cannot pay twice", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const ai = await readFile(new URL("../app/enemy-ai.ts", import.meta.url), "utf8");
  assert.match(ai, /availableEnemyAbilities[\s\S]*enemyThreatRange[\s\S]*chooseEnemyAbility/);
  assert.match(page, /enemyThreatRange\(active\.range, active\.skills\)[\s\S]*rechargeMonsterSkills\(moved\.skills[\s\S]*chooseEnemyAbility\(refreshedSkills/);
  assert.match(page, /enemySkill && !enemySkill\.unlimited[\s\S]*charges: Math\.max\(0, skill\.charges - 1\)/);
  assert.match(page, /awardedXpSourcesRef[\s\S]*if \(sourceId\)[\s\S]*awardedXpSourcesRef\.current\.has\(sourceId\)/);
  assert.match(page, /awardDungeonXp\(target\.xpReward \|\| xpForCr\(target\.cr\), active\.id, target\.id\)/);
});

test("monster registry combat supports stat blocks, multiattack, recharge, senses, traits, and validation", async () => {
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../app/monster-runtime.ts", import.meta.url), "utf8");
  const inspector = await readFile(new URL("../app/unit-inspector-overlay.tsx", import.meta.url), "utf8");
  const validator = await readFile(new URL("../app/content-validator.ts", import.meta.url), "utf8");
  assert.match(actors, /attacks:2[\s\S]*additionalDamage:[\s\S]*recharge:\{min:5,max:6\}/);
  assert.match(runtime, /rechargeMonsterSkills[\s\S]*monsterIgnoresTerrain[\s\S]*monsterCanPerceive/);
  assert.match(inspector, /monsterStatBlockFor[\s\S]*Condition immunities[\s\S]*Recharge/);
  assert.match(validator, /explicit attack bonus or saving throw[\s\S]*percentage accuracy[\s\S]*no gameplay handler/);
});

test("the completed monster overhaul authors every record and exposes lifecycle and balance systems", async () => {
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  const conditions = await readFile(new URL("../app/condition-runtime.ts", import.meta.url), "utf8");
  const balance = await readFile(new URL("../app/encounter-balance.ts", import.meta.url), "utf8");
  const types = await readFile(new URL("../app/game-types.ts", import.meta.url), "utf8");
  const visuals = await readFile(new URL("../app/equipment-visuals.ts", import.meta.url), "utf8");
  assert.doesNotMatch(actors, /name: "Basic Attack"/);
  assert.match(actors, /authoredAttackConditions[\s\S]*repeatSave:true[\s\S]*authoredSenses[\s\S]*authoredLanguages[\s\S]*authoredTraits[\s\S]*authoredSpeeds/);
  assert.match(conditions, /advanceConditionDurations[\s\S]*saveTiming === "end-of-turn"[\s\S]*conditionDurationLabel/);
  assert.match(balance, /auditEncounterBalance[\s\S]*adjustedXp[\s\S]*expectedRoundDamage[\s\S]*equivalentPeacefulXp/);
  assert.match(types, /combatProfile\?:[\s\S]*kind: "hero"[\s\S]*kind: "monster"/);
  assert.match(visuals, /movementMode[\s\S]*movement-/);
});

test("the late Level 1 polish pass keeps its interactions contextual and recoverable", async () => {
  const source = await readGameSource();
  const poi = await readFile(new URL("../app/poi-registry.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sounds = await readFile(new URL("../app/sound-engine.ts", import.meta.url), "utf8");
  const equipment = await readFile(new URL("../app/equipment-visuals.ts", import.meta.url), "utf8");

  assert.match(poi, /swap-relic-with-sand[\s\S]*context\.activeId === "custom-hero" \|\| \/rogue\/i/);
  assert.doesNotMatch(poi, /A Rogue automatically marked this hidden trap/);
  assert.match(source, /"Stolen Proximity Bomb"[\s\S]*Drop Proximity Bomb/);
  assert.match(source, /skill\.name === "Drop Proximity Bomb"[\s\S]*setPhase\("move"\)/);
  assert.match(source, /shouldDetonatePortableBomb[\s\S]*portable-bomb-explosion/);
  assert.match(css, /portable-proximity-bomb-token[\s\S]*j64-proximity-bomb\.png/);
  assert.match(source, /broom-closet-message[\s\S]*x: 8, y: 91[\s\S]*Broom closet ahead/);
  assert.match(source, /clear-dwarven-cave-in[\s\S]*Dwarven Mining Pick[\s\S]*dwarven-cave-in-clearing/);
  assert.match(css, /dwarven-cave-in-v1\.webp[\s\S]*cave-in-cleared/);
  assert.match(equipment, /Halleth[\s\S]*halleth-hermit-sprites\.webp/);
  assert.match(source, /halleth-bars-open[\s\S]*halleth-bars-reset[\s\S]*x: 20, y: 92/);
  assert.match(source, /setFiredMapEvents\(\(events\) => \[\.\.\.new Set\(\[\.\.\.events, "level-one-complete"\]\)\]\)/);
  assert.match(source, /encounterMode !== "combat"[\s\S]*two-headed-king-engaged[\s\S]*wife-beater-killing-curse/);
  assert.match(sounds, /"howl"[\s\S]*frequency\.exponentialRampToValueAtTime\(325/);
  assert.match(source, /playSound\("howl"\)[\s\S]*I can hear the howls getting closer/);
});

test("recorded sound cue files are present and the comedic howl stays procedural", async () => {
  const sounds = await readFile(new URL("../app/sound-engine.ts", import.meta.url), "utf8");
  const recordedCues = ["attack", "impact", "charge", "spell", "trap", "achievement", "door", "boss", "victory"];
  for (const cue of recordedCues) {
    for (let variant = 1; variant <= 3; variant += 1) {
      const bytes = await readFile(new URL(`../public/audio/kenney/${cue}-${variant}.ogg`, import.meta.url));
      assert.ok(bytes.length > 4_000, `${cue}-${variant}.ogg should contain recorded audio`);
    }
  }
  assert.doesNotMatch(sounds, /\/audio\/kenney\/howl-/);
  assert.match(sounds, /cue !== "howl"/);
  assert.match(sounds, /oscillator\.frequency\.setValueAtTime\(185/);
});

test("the second projector speaks with its own gentle princess voice profile", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const voices = await readFile(new URL("../app/voice-engine.ts", import.meta.url), "utf8");

  assert.match(page, /replayEyeHologram[\s\S]*playVoiceLine\("princess-hologram", soundEnabled\)/);
  assert.match(voices, /"princess-hologram"[\s\S]*rate: 0\.88[\s\S]*pitch: 1\.18[\s\S]*Microsoft Zira[\s\S]*Google UK English Female/);
  assert.match(voices, /"halaster-orientation"[\s\S]*fallbackVoiceHints: \["male"/);
});

test("Room 41 is a nonlethal first-level fight club with soap as its prize", async () => {
  const source = await readGameSource();
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../app/fight-club-runtime.ts", import.meta.url), "utf8");
  const rooms = await readFile(new URL("../app/dungeon-content.ts", import.meta.url), "utf8");
  const encounters = await readFile(new URL("../app/encounter-engine.ts", import.meta.url), "utf8");
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  const items = await readFile(new URL("../app/item-registry.ts", import.meta.url), "utf8");
  const tyler = await readFile(new URL("../public/fight-club-tyler-sprites.png", import.meta.url));
  const narrator = await readFile(new URL("../public/fight-club-narrator-sprites.png", import.meta.url));

  assert.match(rooms, /"41": \{ title: "The First Rule"[\s\S]*monsters: \["Tyler Durden", "The Narrator"[\s\S]*loot: \["Bar of Soap"\]/);
  assert.match(encounters, /kind: "fight-club"[\s\S]*If it's your first level\.\.\. you have to fight/);
  assert.match(actors, /"Tyler Durden"[\s\S]*fight-club-tyler-sprites\.png[\s\S]*"The Narrator"[\s\S]*fight-club-narrator-sprites\.png/);
  assert.match(source, /FIGHT_CLUB_ROOM = "41"[\s\S]*Math\.max\(isFightClubFighter\(unit\) \? 1 : 0/);
  assert.match(runtime, /concedingFighter[\s\S]*unit\.hp <= 1/);
  assert.match(page, /grantDungeonLoot\(recipient\.id, \["Bar of Soap"\]\)/);
  assert.match(source, /encounterGroup: undefined, team: "neutral" as Team, npc: true, downed: false/);
  assert.match(items, /"Bar of Soap"[\s\S]*Reusable[\s\S]*remove poison and bleeding/);
  assert.ok(tyler.length > 40_000);
  assert.ok(narrator.length > 40_000);
});

test("Professor Vale's image returns when Professor Grin is defeated", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const school = await readFile(new URL("../app/school-runtime.ts", import.meta.url), "utf8");

  assert.match(school, /name: "Professor Vale"[\s\S]*team: "neutral"[\s\S]*downed: false, hp: 1/);
  assert.match(source, /professorGrinVisible = schoolTransformationFlash \|\| units\.some[\s\S]*unit\.name === "Professor Grin"/);
  assert.match(source, /professorGrinVisible \? "\/professor-grin\.png" : "\/professor-vale\.png"/);
  assert.doesNotMatch(source, /persistentDialogueSpeaker\?\.id === SCHOOL_TEACHER_ID\s*\? \(firedMapEvents\.includes\("school-nightmare"\)/);
});

test("the dungeon can snap back to the active character without the obsolete map uploader", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /const snapToCharacter = \(\) =>[\s\S]*board\.scrollTo\([\s\S]*behavior: "smooth"/);
  assert.match(source, /className="find-character"[\s\S]*◎ Find Character/);
  assert.match(css, /map-zoom-controls \.find-character/);
  assert.doesNotMatch(source, /Load Map Image|setMapImage|mapImage/);
  assert.doesNotMatch(css, /map-loader/);
});

test("level-one abilities have authored VFX and current names", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const asset of ["rage", "moon-mend", "wildfire", "second-wind", "fire-bolt", "shield"]) {
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 1_000, `${asset} should have an authored VFX asset`);
  }
  assert.match(characters, /"Sneak Attack"[\s\S]*Deals extra damage when attacking from behind/);
  assert.match(characters, /"Fire Bolt"[\s\S]*One concentrated ranged fire bolt/);
  assert.doesNotMatch(characters, /s\("Ember Volley"|s\(\s*"Backstab"/);
  assert.match(effects, /"Bardic Inspiration"[\s\S]*"Healing Verse"[\s\S]*"Mending Light"[\s\S]*"Radiant Bolt"[\s\S]*"Moon Mend"[\s\S]*Wildfire[\s\S]*"Second Wind"[\s\S]*"Sneak Attack"[\s\S]*"Fire Bolt"[\s\S]*Shield/);
  assert.match(page, /wardTriggered[\s\S]*setAbilityVfx|setAbilityVfx\(\{ name: "Shield"[\s\S]*wardTriggered/);
  assert.match(css, /rage-ability-vfx[\s\S]*vfx-rage\.webp/);
});

test("Rangers highlight visible tracks but identify them only after approach", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const tracks = await readFile(new URL("../app/ranger-tracks.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /black-dragon-tracks[\s\S]*x: 21, y: 43/);
  assert.match(page, /unit\.role === "Ranger"[\s\S]*attackDist\(unit, poi\) <= RANGER_TRACK_SIGHT/);
  assert.match(page, /rangerTrackVisible \|\| shouldRenderPoi/);
  assert.match(page, /isAnimalTracks\(point\)[\s\S]*attackDist\(hero, point\) <= 1/);
  assert.match(page, /class-feature-highlight[\s\S]*TRACK SENSE[\s\S]*RANGER_TRACK_FEATURE/);
  assert.match(tracks, /ANIMAL_TRACKS_LABEL = "Animal Tracks"[\s\S]*RANGER_TRACK_SIGHT = 10[\s\S]*Dragon tracks\.\.\. why would there be dragon tracks here\?/);
  assert.match(page, /animal-tracks-icon[\s\S]*🐾︎/);
  assert.match(css, /animal-tracks-icon[\s\S]*ranger-track-visible[\s\S]*ranger-track-pulse/);
});

test("the VFX gallery provides every ability and a targetable sandbag", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const maps = await readFile(new URL("../app/map-runtime.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sandbag = await readFile(new URL("../public/vfx-sandbag.webp", import.meta.url));
  assert.doesNotMatch(page, /<button onClick=\{startVfxGallery\}>/);
  assert.match(page, /trainingMap === "gallery"[\s\S]*galleryAbilityLibrary\.map[\s\S]*unlimited: true/);
  assert.match(page, /galleryAbilityLibrary[\s\S]*role\.localeCompare\(b\.role\)[\s\S]*skill\.name\.localeCompare/);
  assert.match(page, /vfxGalleryMode[\s\S]*phase !== "action"[\s\S]*setPhase\("action"\)/);
  assert.match(page, /vfx-gallery-actions[\s\S]*gallery-ability-heading/);
  assert.match(css, /vfx-gallery-actions[\s\S]*overflow-y: auto[\s\S]*gallery-ability-heading[\s\S]*position: sticky/);
  assert.match(page, /"vfx-gallery-sandbag"[\s\S]*"Training Dummy"[\s\S]*hp: 99999[\s\S]*move: 0/);
  assert.match(maps, /id: "gallery"[\s\S]*name: "VFX Gallery"[\s\S]*selectable sandbag/);
  assert.match(page, /trainingMap === "gallery" \? buildUnits\(false\) : setStage\("deploy"\)/);
  assert.match(page, /dummy\.npc = true/);
  assert.match(page, /u\.role === "Training Dummy"[\s\S]*vfx-sandbag-sprite/);
  assert.match(css, /vfx-gallery-board[\s\S]*background: #fff !important[\s\S]*vfx-sandbag\.webp/);
  assert.ok(sandbag.length > 1_000);
});

test("monster visuals keep body attacks on actor sheets and detached effects in the renderer", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  const animations = await readFile(new URL("../app/actor-animation.ts", import.meta.url), "utf8");
  const actors = await readFile(new URL("../app/actor-registry.ts", import.meta.url), "utf8");
  for (const name of ["Tentacles", "Adhesive Pseudopod", "Pounce", "Rending Tentacles", "Predator's Leap", "Rending Claws", "Slam", "Beak and Tentacles", "Silvered Blade"])
    assert.match(animations, new RegExp(`(?:\"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\"|${name})\\s*:\\s*(?:body|signature)\\(`), `${name} should use the monster's own action frame`);
  for (const name of ["Acid Breath", "Engulf", "Tailstorm", "Whirlwind Slam", "Regeneration", "Lightning Absorption", "Tail Spike", "Living Shroud Strike"])
    assert.ok(page.includes(`\"${name}\"`) && effects.includes(`\"${name}\"`), `${name} should retain its detached or battlefield effect`);
  assert.match(page, /monsterActionEffect\(moved\.role, enemySkill\.name\)/);
  assert.match(page, /nextMonsterVfxSkills[\s\S]*lightningAbsorptionVfx[\s\S]*VFX Tester/);
  assert.match(actors, /"Flesh Golem": \[\{ id:"lightning-absorption"/);
  assert.match(page, /skill\.damageType === "lightning" && target\.role === "Flesh Golem"[\s\S]*absorbs the lightning and repairs itself/);
});

test("the next level-one player VFX batch is wired to real abilities", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  for (const name of ["Flurry of Blows", "Open Palm", "Patient Defense", "Divine Smite", "Lay on Hands", "Hunter's Mark", "Ensnaring Strike", "Eldritch Blast", "Hex", "Armor of Agathys"])
    assert.ok(characters.includes(`\"${name}\"`) && effects.includes(`\"${name}\"`) && page.includes("galleryAbilityLibrary"), `${name} should be gallery-playable and rendered`);
  for (const asset of ["flurry-of-blows", "open-palm", "patient-defense", "divine-smite", "lay-on-hands", "hunters-mark", "ensnaring-strike", "eldritch-blast", "hex", "armor-of-agathys"]) {
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 1_000, `${asset} should have an authored VFX asset`);
  }
});

test("the remaining starting player abilities have authored VFX", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  for (const name of ["Sweeping Kick", "Shielding Smite", "Thunderous Smite", "Hail of Thorns", "Field Remedy", "Hellish Rebuke", "Arms of Hadar", "Throwing Knife", "Reckless Blow", "Battle Rush"])
    assert.ok(characters.includes(`\"${name}\"`) && effects.includes(`\"${name}\"`) && page.includes("galleryAbilityLibrary"), `${name} should be gallery-playable and rendered`);
  for (const asset of ["sweeping-kick", "shielding-smite", "thunderous-smite", "hail-of-thorns", "field-remedy", "hellish-rebuke", "arms-of-hadar", "throwing-knife", "reckless-blow", "battle-rush"]) {
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 1_000, `${asset} should have an authored VFX asset`);
  }
  assert.match(page, /skill\.name === "Hellish Rebuke" \? false : skill\.automatic/);
  assert.match(effects, /AREA_ABILITY_EFFECTS = new Set\(\["Hail of Thorns", "Arms of Hadar"/);
});

test("gallery review fixes render every registered action and place persistent walls and marks", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const effects = await readFile(new URL("../app/ability-vfx-registry.ts", import.meta.url), "utf8");
  for (const name of ["Restoring Chorus", "Greater Mend", "Sacred Hammer", "Sanctuary", "Searing Light", "Gale Burst", "Life Bloom", "Moon Mend", "Stone Fang", "Counterstance", "Indomitable", "Second Wind", "Patient Defense", "Wholeness of Body", "Lay on Hands", "Turn the Unholy", "Volley"])
    assert.ok(effects.includes(`\"${name}\"`), `${name} must retain an authored effect`);
  assert.match(page, /sk && hasAbilityVfx\(sk\.name\)/);
  assert.match(page, /skillIndex: number[\s\S]*choose the other end of the wall[\s\S]*segmentPlacement\(wallStart, end/);
  assert.match(page, /hasEffect\(u, "marked-target"\)[\s\S]*hunters-mark-effect/);
  assert.match(page, /selectedSkill\.name !== "Leap of the Clouds"/);
  assert.doesNotMatch(effects, /LINE_ABILITY_EFFECTS[^;]*Restoring Chorus/);
});

test("reviewed rogue and warlock effects keep their authored orientation and persistent state", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const effects = await readFile(new URL("../app/ability-vfx-registry.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(effects, /"Sneak Attack": "sneak-attack-v2\.png"/);
  assert.match(effects, /ANIMATED_ABILITY_EFFECTS[^;]*"Sneak Attack"/);
  assert.match(styles, /ability-vfx-fan-of-knives[\s\S]*--ability-vfx-angle/);
  assert.match(styles, /ability-vfx-throwing-knife \{ height:54px/);
  assert.match(page, /Armor of Agathys[\s\S]*\+8 TEMP HP[\s\S]*INVISIBLE/);
  assert.match(page, /armor-of-agathys-effect[\s\S]*hellish-rebuke-effect/);
  assert.match(page, /range: vfxGalleryMode \? Math\.max\(boardCols, boardRows\) : effectiveSkillRange\(active, selectedSkill\)/);
});

test("only the VFX gallery and explicit map-wide skills bypass normal targeting rules", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /sk\?\.unlimited \|\| attackDist/);
  assert.doesNotMatch(page, /skill\?\.unlimited \|\| attackDist/);
  assert.match(page, /vfxGalleryMode \|\| sk\?\.mapWide \|\| attackDist\(active, target\) <= \(sk \? effectiveSkillRange/);
  assert.match(page, /vfxGalleryMode \|\| sk\?\.mapWide \|\| clearLine\(active, target\)/);
  assert.match(page, /range: vfxGalleryMode \? Math\.max\(boardCols, boardRows\)/);
});

test("persistent obscuring fields preserve the map silhouette and gallery rebuke is labeled as a preview", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /ability-zone-fog-cloud[^{]*\.ability-zone-surface[^}]*opacity:\.52/);
  assert.match(styles, /ability-zone-darkness[^{]*\.ability-zone-surface\.has-zone-art[^}]*opacity:\.64/);
  assert.match(styles, /ability-zone-hunger-of-hadar[^{]*\.ability-zone-surface\.has-zone-art[^}]*opacity:\.68/);
  assert.match(styles, /ability-vfx-area \{[\s\S]*background-size: 88% 88%/);
  assert.match(page, /Hellish Rebuke[\s\S]*Automatic in combat\. Select the sandbag only to force a gallery preview/);
});

test("the first level-three player VFX batch is wired without redundant Monk movement", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  for (const name of ["Leap of the Clouds", "Stunning Strike", "Branding Smite", "Turn the Unholy", "Lesser Restoration", "Fog Cloud", "Goodberry", "Longstrider", "Misty Step", "Shatter"])
    assert.ok(characters.includes(`\"${name}\"`) && effects.includes(`\"${name}\"`), `${name} should be gallery-playable and rendered`);
  for (const asset of ["leap-of-the-clouds", "stunning-strike", "branding-smite", "turn-the-unholy", "lesser-restoration", "fog-cloud", "goodberry", "longstrider", "misty-step", "shatter"]) {
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 1_000, `${asset} should have an authored VFX asset`);
  }
  assert.doesNotMatch(characters, /s\("Step of the Wind"/);
  assert.match(characters, /RETIRED_ABILITIES = new Set\(\["Step of the Wind"\]\)[\s\S]*\.filter\(\(skill\) => !RETIRED_ABILITIES\.has\(skill\.name\)\)/);
  assert.match(characters, /s\("Leap of the Clouds"[\s\S]*movement: "teleport"/);
  assert.match(characters, /s\("Misty Step"[\s\S]*movement: "teleport"/);
  assert.match(page, /selectedSkill\?\.movement === "teleport"[\s\S]*setAbilityVfx\(\{ name: selectedSkill\.name/);
  assert.match(effects, /AREA_ABILITY_EFFECTS[\s\S]*"Fog Cloud"[\s\S]*"Shatter"/);
});

test("Toll the Dead is a verified shared cantrip with wounded-target scaling", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  const asset = await readFile(new URL("../public/vfx-toll-the-dead.webp", import.meta.url));
  assert.equal((characters.match(/s\("Toll the Dead"/g) || []).length, 3);
  assert.match(characters, /Cleric:[\s\S]*s\("Toll the Dead"[\s\S]*Wizard:[\s\S]*s\("Toll the Dead"[\s\S]*Warlock:[\s\S]*s\("Toll the Dead"/);
  assert.match(characters, /"Toll the Dead"[\s\S]*saveAbility: "wisdom"[\s\S]*damageType: "necrotic"/);
  assert.match(page, /sk\?\.name === "Toll the Dead"[\s\S]*abilitySavingThrow\(active, target, "wisdom"\)[\s\S]*target\.hp < target\.maxHp \? 7 : sk\.power/);
  assert.match(effects, /"Toll the Dead": "toll-the-dead"/);
  assert.ok(asset.length > 1_000);
});

test("the second level-three VFX batch uses approved selectable abilities", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const effects = (await Promise.all(["ability-effects.tsx", "ability-vfx-registry.ts"].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")))).join("\n");
  const names = ["Unbroken", "Crushing Blow", "Reckless Cleave", "Pinning Strike", "Counterstance", "Fan of Knives", "Wholeness of Body", "Blinding Smite", "Hold Person", "Zephyr Strike"];
  for (const name of names) assert.ok(characters.includes(`\"${name}\"`) && effects.includes(`\"${name}\"`), `${name} should be selectable and rendered`);
  for (const asset of ["unbroken", "crushing-blow", "reckless-cleave", "pinning-strike", "counterstance", "fan-of-knives", "wholeness-of-body", "blinding-smite", "hold-person", "zephyr-strike"]) {
    const bytes = await readFile(new URL(`../public/vfx-${asset}.webp`, import.meta.url));
    assert.ok(bytes.length > 1_000, `${asset} should have an authored transparent VFX asset`);
  }
  assert.doesNotMatch(characters, /s\("Hurling Axe"|s\("Weapon Throw"|s\("Pommel Strike"|s\(\s*"Cheap Shot"/);
  assert.match(characters, /"Hurling Axe": "Crushing Blow"[\s\S]*"Weapon Throw": "Pinning Strike"[\s\S]*"Pommel Strike": "Counterstance"[\s\S]*"Cheap Shot": "Fan of Knives"/);
  assert.match(page, /sk\?\.name === "Hold Person"[\s\S]*abilitySavingThrow\(active, target, "wisdom"\)[\s\S]*applyCondition\(unit, "restrained"/);
  assert.match(page, /sk\.name === "Wholeness of Body"[\s\S]*cleanseConditions\(next, \["poisoned", "bleeding"\]\)/);
  assert.match(effects, /AREA_ABILITY_EFFECTS[\s\S]*"Fan of Knives"[\s\S]*"Reckless Cleave"/);
});

test("ability VFX linger and Ensnaring Strike resolves its Strength save", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const characters = await readFile(new URL("../app/character-runtime.ts", import.meta.url), "utf8");
  const mechanics = await readFile(new URL("../app/ability-runtime.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /ability-vfx-line-cast 1\.6s[\s\S]*ability-vfx-point-cast 1\.6s[\s\S]*ability-vfx-area-cast 1\.8s/);
  assert.match(css, /ability-vfx-point\.monster-vfx-pounce \{ width: 68px; height: 68px/);
  assert.match(characters, /"Ensnaring Strike"[\s\S]*condition: "restrained"[\s\S]*saveAbility: "strength"[\s\S]*repeatSave: true/);
  assert.match(mechanics, /"Ensnaring Strike"[\s\S]*save: \{ ability: "strength"[\s\S]*condition: "restrained"[\s\S]*repeatSave: true/);
  assert.match(page, /conditionChecks[\s\S]*abilitySavingThrow\(active, victim, condition\.saveAbility[\s\S]*for \(const condition of outcome\.conditions\) next = applyCondition/);
});
