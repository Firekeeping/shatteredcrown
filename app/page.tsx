"use client";
import { Fragment, useEffect, useEffectEvent, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image"; import MapEditor from "./MapEditor"; import DialogueEditor from "./DialogueEditor"; import villageDefenseMap from "./village-defense-map.json";
import { ROOM_BLUEPRINTS } from "./dungeon-content";
import { ACTOR_REGISTRY, getActorDefinition, MONSTER_SPRITE_SHEETS } from "./actor-registry";
import { actorActionAnimation, monsterActionEffect, spritePoseDuration, type SpritePose } from "./actor-animation";
import { abilityZoneSliceStyle } from "./ability-zone-visuals"; import SegmentSpellOverlay from "./segment-spell-overlay";
import { HALLETH_DIALOGUE_FLAGS, HOSTILE_FLAG_BY_ENCOUNTER_GROUP, MANTICORE_SHOW_QUESTIONS, SCRIPTED_DUNGEON_ENCOUNTERS, SECRET_CLUB_EXIT, SECRET_CLUB_HOST_POSITIONS, SECRET_CLUB_TOUR_TIMING, requirementLabel, scriptedEncounterNeedsRecovery, type EncounterChoice, type EncounterEffect, type ScriptedEncounterKind } from "./encounter-engine";
import { OBSOLETE_DUNGEON_DROP_IDS, PURPOSELESS_DUNGEON_LOOT, achievementBoxReward, describeItem, getItemDefinition, itemsGrantHazardImmunity, type EquipmentSlot } from "./item-registry";
import { getPoiDefinition, getPoiPanelModel, isPoiActivationKey, shouldRenderPoi, type PoiPanelActionId } from "./poi-registry";
import { useGameSequenceController } from "./use-game-sequence-controller"; import { KELIM_ESCAPE_PATH, KELIM_SIGHTING_TRIGGER, kelimCorpseFlag, kelimCorpsePointFromFlags, pendingKelimPredator, useKelimClosetBark } from "./use-kelim-closet-bark";
import { resetButtonLabel } from "./reset-policy"; import { KELIM_CLOSET_POINT, ORIENTATION_HOLOGRAM_POINT } from "./visual-registry"; import { wallMountBySecretDoorEdge, wallMountsByHostTile } from "./wall-mount-registry";
import { DUNGEON_MAP_TRIGGERS, readyMapTriggers, roomEntryEnabled, type MapTriggerEffect } from "./map-trigger-engine";
import { GAME_RUNTIME, tileKey } from "./game-runtime";
import { assertValidGameContent, validateGameContent } from "./content-validator";
import { useDeferredEffect } from "./use-deferred-effect";
import { MultiplayerDock, useMultiplayerSession } from "./use-multiplayer-session"; import { isGuestReplicaActive } from "./multiplayer-runtime";
import { isSpellcasterHero, restoreProfessorVale, schoolCombatGraduate } from "./school-runtime";
import { useSchoolDialogueController } from "./use-school-dialogue-controller";
import { isKelimSpellbookSkill, KELIM_SHORTCUT_SKILL } from "./kelim-spellbook";
import { attackDistance as attackDist, buildMovementCostField, findWeightedRoute, gridDistance as dist, chargedCasterKey, readyChargedSpellFor, isRearAttack, isLineAim, kelimTeleportIssue, monsterOpportunityAttackProfile, normalizeMovementCost, rearPositionScore, shouldDetonatePortableBomb, skillAreaTiles, unitFootprintAt, unitOccupiesTile } from "./combat-engine";
import { ABILITY_LABELS, armorClassOf, attackBonusOf, criticalDamage, d20HitChance, damageAfterProtection, initiativeModifierOf, proficiencyBonus, resolveD20Attack, resolveSavingThrow, skillCheckBonus, spellSaveDc } from "./dnd-rules";
import { advanceConditionDurations, applyCondition, conditionAttackAdvantage, conditionAttackDisadvantage, conditionForcesAdjacentCritical, conditionGrantsIncomingAdvantage, conditionGrantsIncomingDisadvantage, conditionLimitsVision, conditionPreventsSpeech, effectiveMovement, hasCondition, removeCondition, resolveOngoingConditions, unitCannotAct } from "./condition-runtime";
import { abilityStrikeProfile, advanceTimedEffects, advanceZones, applyGrantedEffect, cannotMakeOpportunityAttack, cleanseConditions, consumeFlameArrowAttack, effectArmorClassBonus, favoredEnemyBonus, flameArrowShotsRemaining, FLAME_ARROWS_ATTACKS, FLAME_ARROWS_DAMAGE, hasEffect, isMagicalAbility, mechanicFor, removeEffect, zoneContains, type AbilityZone } from "./ability-runtime";
import { monsterCanPerceive, monsterIgnoresTerrain, monsterMovementModes, monsterTraitEffects, normalizeMonsterRuntime, rechargeMonsterSkills } from "./monster-runtime";
import { canEnemySeeHero as enemyCanSeeHero, chooseEnemyAbility, enemyThreatRange, rankEnemyTargets } from "./enemy-ai";
import { useGameStateTransitions } from "./use-game-state-transitions";
import AbilityEffects, { PassiveAbilityBadges } from "./ability-effects";
import { hasAbilityVfx } from "./ability-vfx-registry";
import { readyEncounterDirectives } from "./encounter-director";
import { auditEncounterBalance } from "./encounter-balance";
import { choiceTag, DISMISSIBLE_SOCIAL_KINDS, VILLAGER_QUOTES } from "./dialogue-model";
import { resolveSocialDialogueSpeaker } from "./dialogue-speaker";
import { advanceRoomState, roomIdFromLootDrop, roomLifecycle } from "./room-state";
import { DEBUG_LAYERS, encounterLifecycle, hitPreviewLabel, turnResourceSummary, type DebugLayer, type RoomEntryPresentation } from "./playability-systems";
import { CAMPAIGN_SAVE_KEY, CAMPAIGN_SAVE_SCHEMA_VERSION, LEGACY_CAMPAIGN_SAVE_KEYS, PUBLISHED_ROUTE_SCENES, isCurrentCampaignSave, repairCampaignState, resolvedEncounterGroups } from "./campaign-state-audit";
import { trapVisualState } from "./trap-state";
import { encounterCompletionFlags, type EncounterOutcome } from "./encounter-completion";
import { canTakeCombatDamage, combatDamageOutcome, isFightClubBystander, repairLegacyFightClub, resolveFightClubBout } from "./fight-club-runtime";
import DialoguePanel from "./dialogue-panel"; import RoomEntryModal from "./room-entry-modal"; import UnitInspectorOverlay from "./unit-inspector-overlay"; import LevelOneRegressionRunner from "./level-one-regression-runner";
import { buildLevelOneRegressionSnapshot, stageLevelOneRegressionCheckpoint } from "./level-one-regression-controller";
import DungeonObjectOverlay, { DungeonOverlaySlot } from "./dungeon-object-overlay"; import { KelimClosetOverlay } from "./kelim-closet-overlay"; import AbilityScoreGrid from "./ability-score-grid"; import Dust2DebugOverlay from "./dust2-debug-overlay";
import { characterFocus, gridColumnLabel, renderedCellIndices as buildRenderedCellIndices, selectDungeonObjectOverlays } from "./map-rendering"; import { athleticSafeFallFeet, canAttemptElevation, canStepElevation, elevationClimbCheckDc, rollFallDamage } from "./elevation-rules";
import { canTraverseDust2Elevation, collapseDust2MovementCosts, dust2DropFeet, dust2ElevationClimbCheckDc, dust2ForcedMoveDestination, dust2HasHighGround, dust2MeleeSpaceCompatible, dust2MoverStepCostSquares, dust2PositionFromKey, dust2PositionKey, dust2PositionState, dust2PositionsAt, dust2PreferredPositionAt, dust2SamePosition, dust2SharesSurface, dust2TraversalNeighbors } from "./dust2-traversal";
import { useBattlefieldPlayerView } from "./use-battlefield-player-view";
import BattlefieldVisionOverlay from "./battlefield-vision-overlay";
import { buildVillageSightCrossings } from "./battlefield-vision-runtime";
import { DUST2_FLAG_SITES, DUST2_SECRET_EXIT, advanceDust2Defuse, advanceDust2FlagCountdown, cancelDust2Defuse, createDust2ObjectiveState, dropDust2Flag, dust2CountdownRounds, dust2FlagCarrierBonus, dust2FlagSiteAt, dust2LooseFlagPosition, pickUpDust2Flag, plantDust2Flag, type Dust2ObjectiveState } from "./dust2-objective";
import { Dust2ObjectiveMarkers, Dust2ObjectivePanel, ObjectiveTracker } from "./objective-tracker"; import ActiveUnitHud from "./active-unit-hud";
import { buildCounterDungeoneerSquad, COUNTER_DUNGEONEER_ACTOR_IDS, counterDungeoneerWeaponFinish } from "./counter-dungeoneers"; import { useCounterDungeoneerContact } from "./use-counter-dungeoneer-contact"; import { levelTwoFalseVictoryUnits, levelTwoJohnWickIsDown } from "./level-two-objective-runtime"; import { levelTwoExitIsOpen, levelTwoFalseVictoryEvents, levelTwoJohnWickDefeatEvents } from "./level-two-objective-state";
import { DUST2_HERO_LEVEL, DUST2_ITEM_LOADOUT, dust2ItemForSkill, grantDust2ItemLoadout, mergeDust2ItemLoadout } from "./dust2-items"; import Dust2FreeplaySetup from "./dust2-freeplay-setup"; import Dust2FreeplayResult from "./dust2-freeplay-result"; import { completeDust2FreeplayRound, createDust2FreeplayMatch, dust2TeamSide, type Dust2FreeplayMatch, type Dust2TeamId } from "./dust2-modes";
import { buildDust2FreeplayDeployment, dust2FactionForUnit, dust2FreeplayWinnerForUnits, dust2ObjectiveAiPlan, resetDust2FreeplayUnits } from "./dust2-freeplay-runtime";
import { battlefieldForState } from "./battlefield-engine"; import { DELVER_ORIENTATION_MESSAGE, FINAL_PRACTICAL_MESSAGE, NIMRAITH_QUESTIONS, SCHOOL_QUIZ_QUESTIONS } from "./scene-content";
import { BRIDGE_LANDMARKS, DUNGEON_LANDMARKS, inProximityBombRoom, type ProximityBombVisualState } from "./map-landmarks";
import { actorVisualClass, spriteSheetForEquipment, type EquippedItemSlots } from "./equipment-visuals";
import { equippedShieldBonus, restoreRestCharges, weaponAttackProfile } from "./equipment-runtime";
import { COMBAT_TIMING, damageFloat, healFloat, missFloat, statusFloat } from "./combat-presentation";
import { isOrdinaryProjectileAttack, ordinaryProjectileBlocked, segmentPlacement } from "./segment-spell-runtime";
import { useCombatFeedback } from "./use-combat-feedback";
import { playSoundCue, type SoundCue } from "./sound-engine";
import { playVoiceLine, stopVoiceLine } from "./voice-engine";
import { SPIKE_PIT_PRESENTATION } from "./trap-presentation";
import { FOREST_GUARD_CAP_OFFER, FOREST_GUARD_WARNING, FOREST_POISON_BAIT_CHOICE, POISON_BAIT_DIALOGUE, POISON_BAIT_ENEMY_TYPES, poisonBaitEnemyName } from "./prologue-content";
import { difficulty, ensureTesterRevive, faceIcon, heroNames, kitAtLevel, kits, makeUnit, migrateHeroToDnd, normalizeAbilityAliases, spawnActor, spawnIntroWolf, playtestKillingCurse, playtestMapWideRevive, progressionSkills, xpForCr, xpForNextLevel } from "./character-runtime";
import { ANIMAL_TRACKS_LABEL, isAnimalTracks, rangerTrackCallout, RANGER_TRACK_FEATURE, RANGER_TRACK_SIGHT } from "./ranger-tracks";
import { BOSS_SPELL_RANGE, COLS, DUNGEON_COLS, DUNGEON_ROWS, DUST2_COLS, DUST2_ROWS, FOREST_COLS, FOREST_ROWS, LEVEL_TWO_COLS, LEVEL_TWO_ROWS, RITUAL_COLS, RITUAL_ROWS, ROWS, UNDERTAKER_CLUB_HOSTS, VILLAGE_COLS, VILLAGE_ROWS,
  blocked, blueLightsaberPoint, bossEngagementDoorwayKeys, bossThronePoint, bridgeBlocked, bridgeHeightMap, bridgeTerrainMap, crossesDungeonWallEdge, crossesDust2WallEdge, diagonalCornerBlocked,
  dungeonAuthoredTriggerKeys, dungeonBlocked, dungeonClosedBlocked, dungeonEdgeKey, dungeonEdgeNeighbor, dungeonEncounterSpawnKeys, dungeonEncounterSpawns, dungeonHeightMap, dungeonOpen, dungeonPoiProp, dungeonRoomLabels, dungeonRoomPoints, dungeonSceneryPropsByTile,
  dungeonSecretDoorCrossingKey, dungeonSecretDoorEdges, dungeonSecretDoorEventByEdge, dungeonSecretDoorPoiByEdge, dungeonTerrainMap, dungeonVisualThemeMap, type DungeonEdgeSide, type DungeonSecretDoorEdge,
  dust2EnemyStarts, dust2HeightMap, dust2PartyStarts, dust2TerrainMap, dwarvenSpigotPoint, eyeHologramPoint, eyeHologramTrigger, floodRoomHazard, floodRoomTileKeys, fightClubTiles, goldenSpearMimicPoint, heightMap, inDungeonOpeningArtZone, inFightClubArtZone, inFightClubRing, inSchoolArtZone, inSchoolFloorZone, inUndertakerClubArtZone,
  levelTwoHeightMap, levelTwoTerrainMap, manticoreContestantSpots, manticoreStageFocus, manticoreStageTiles, manticoreStageZone, manticoreWalkInTileKeys, openingForestEnemyStarts, openingForestHeightMap, openingForestPartyStarts, openingForestSceneryBlocked, openingForestTerrain, openingForestTrackTiles,
  oppositeDungeonEdgeSide, poisonBodyTile, proximityBombPoint, pukeTunnelAreaTileKeys, pukeTunnelReward, pukeTunnelTiles, ritualEnemyStarts, ritualExitKeys, ritualHeightMap, ritualPartyStarts, ritualSceneryBlocked, ritualTerrainMap, ritualTile,
  schoolArtZone, schoolDoorwayY, schoolEastWallCrossings, schoolEntryPoint, schoolFloorZone, schoolStudentDesks, sewerSceneAreaTileKeys, sewerFloodSecretPassage, shieldGuardianPassText, shieldGuardianPatrol, shieldGuardianTrigger, spikedPit28d, spikedPitLure28d,
  terrainMap, TRAINING_MAPS, undertakerAlarmTiles, undertakerClubTiles, undertakerSecretDoor, inVillageInterior, villageBarricadeStarts, villageBreachInterior, villageEntranceEdgeKeys, villageHeightMap, villagePartyCenter, villageSceneryBlocked, villageSceneryPropsByTile, villageTerrain, villageVillagerStarts, villageWallEdgeKeys, villageWindowEdgeKeys, villageWindowStarts, villageWolfCenters, westernGoldCache, westernSecretDoor, westernSecretDoorEvent, woundedGuardTile,
} from "./map-runtime";
import type { Ability, AchievementAward, Barrier, ChargedSpell, DroppedDungeonItem, EncounterMode, Facing, GameFeedback, GameNotice, HeroCombatStats, ManticoreShowState, OverlapSelection, Phase, PointOfInterest, Skill, SkillProficiency, SocialScene, Stage, Team, Unit, WanderingGuardian } from "./game-types";
assertValidGameContent();
const GAME_CONTENT_ISSUES = validateGameContent();
const key = tileKey;
const runtimeNow = GAME_RUNTIME.now, randomUnit = GAME_RUNTIME.random;
const DISGUISE_FORMS = ["Goblin", "Bugbear", "Undertaker", "Wererat"] as const;
const ENEMY_TURN_READ_DELAY_MS = COMBAT_TIMING.enemyDecisionMs, ENEMY_ATTACK_READ_DELAY_MS = COMBAT_TIMING.enemyAttackReadMs;
const DISGUISE_SPRITE_SHEETS: Record<(typeof DISGUISE_FORMS)[number], string> = { Goblin: "/monster-goblin-sprites.png", Bugbear: "/monster-bugbear-sprites.png", Undertaker: "/monster-bandit-sprites.png", Wererat: "/monster-wererat-sprites.png" };
const SCHOOL_TEACHER_ID = "dungeon-24a-teacher";
const MANTICORE_TAILSTORM_RANGE = 6;
const PLAYER_VIEW_RANGES = ["daylight", "120", "60"] as const;
const CUSTOM_ROOM_ENTRY_HANDOFFS = new Set(["2b", "6c", "16", "24a", "39a"]);
const NO_SIGHT_CROSSINGS = new Set<string>();
const DUNGEON_WALL_MOUNTS_BY_TILE = wallMountsByHostTile(key), WESTERN_SECRET_CONCEAL_KEYS = new Set([key(14, 61), key(14, 62)]); // O62–O63
export default function Home() {
  const [stage, setStage] = useState<Stage>("mode"),
    [campaign, setCampaign] = useState(false),
    [heroIds, setHeroIds] = useState<string[]>([]),
    [leaderId, setLeaderId] = useState<string | null>(null),
    [enemyTypes, setEnemyTypes] = useState<string[]>([]),
    [randomCount, setRandomCount] = useState(4),
    [hiddenRandom, setHiddenRandom] = useState(false),
    [, setManual] = useState(false),
    [units, setUnits] = useState<Unit[]>([]),
    [placing, setPlacing] = useState(0);
  const [round, setRound] = useState(1),
    [turn, setTurn] = useState(0),
    [phase, setPhase] = useState<Phase>("move"),
    [chosen, setChosen] = useState<{ kind: "attack" | "skill" | "twin"; i?: number } | null>(null),
    [wallStart, setWallStart] = useState<{ x: number; y: number; skillIndex: number } | null>(null),
    [inspect, setInspect] = useState<string | null>(null),
    [aiBusy, setAiBusy] = useState(false),
    [log, setLog] = useState<string[]>([]);
  const [custom, setCustom] = useState<{ id: string; name: string; role: string; templateId: string; skills: Skill[]; playtestKillingCurse?: boolean } | null>(null),
    [level, setLevel] = useState(1),
    [route, setRoute] = useState<string | null>(null),
    [storyChoice, setStoryChoice] = useState<string | null>(null),
    [campaignScene, setCampaignScene] = useState(1),
    [mapVariant, setMapVariant] = useState<"forest" | "village" | "bridge" | "dungeon">(
      "forest",
    ),
    [trainingMap, setTrainingMap] = useState<
      "woodland" | "ritual" | "village" | "bridge" | "dust2" | "gallery"
    >("woodland"),
    [ritualActive, setRitualActive] = useState(false),
    [ritualSelected, setRitualSelected] = useState(false),
    [barriers, setBarriers] = useState<Barrier[]>([]),
    [villageWave, setVillageWave] = useState(1),
    [villageWaveBreakUntil, setVillageWaveBreakUntil] = useState<number | null>(null),
    [villageAftermath, setVillageAftermath] = useState(false),
    [villageCelebrating, setVillageCelebrating] = useState(false),
    [potions, setPotions] = useState<Record<string, number>>({}),
    [dungeonItems, setDungeonItems] = useState<Record<string, string[]>>({}),
    [equippedItems, setEquippedItems] = useState<Record<string, EquippedItemSlots>>({}),
    [heroCombatStats, setHeroCombatStats] = useState<Record<string, HeroCombatStats>>({}),
    [equippedDialogueItems, setEquippedDialogueItems] = useState<Record<string, string | null>>({}),
    [guardSpeakerId, setGuardSpeakerId] = useState<string | null>(null),
    [guardHatDecision, setGuardHatDecision] = useState<"take" | "decline" | null>(null),
    [heroDisguises, setHeroDisguises] = useState<Record<string, string>>({}),
    [wayfarerSpeakerId, setWayfarerSpeakerId] = useState<string | null>(null),
    [dungeonStatBonuses, setDungeonStatBonuses] = useState<Record<string, { attack: number; defense: number; investigation: number; evasion?: number; move?: number; proficiencies?: SkillProficiency[] }>>({}),
    [socialScene, setSocialScene] = useState<SocialScene | null>(null),
    [manticoreShow, setManticoreShow] = useState<ManticoreShowState>({ round: 0, score: 0 }),
    [pendingDungeonRoomId, setPendingDungeonRoomId] = useState<string | null>(null),
    [schoolQuizStep, setSchoolQuizStep] = useState<number | null>(null),
    [schoolQuizMistakes, setSchoolQuizMistakes] = useState(0),
    [kelimFirstPleaOpen, setKelimFirstPleaOpen] = useState(false),
    [releasedKelimPoint, setReleasedKelimPoint] = useState<{ x: number; y: number } | null>(null),
    [goblinShirtClaim, setGoblinShirtClaim] = useState(false),
    [ambientMessage, setAmbientMessage] = useState<string | null>(null),
    [eyeHologramSpeaking, setEyeHologramSpeaking] = useState(false),
    [achievements, setAchievements] = useState<AchievementAward[]>([]),
    [claimedAchievementIds, setClaimedAchievementIds] = useState<string[]>([]),
    [noticeQueue, setNoticeQueue] = useState<GameNotice[]>([]),
    [downCounts, setDownCounts] = useState<Record<string, number>>({}),
    [soundEnabled, setSoundEnabled] = useState(true),
    [wanderingGuardian, setWanderingGuardian] = useState<WanderingGuardian | null>(null),
    [droppedDungeonItems, setDroppedDungeonItems] = useState<DroppedDungeonItem[]>([]),
    [openChestId, setOpenChestId] = useState<string | null>(null),
    [proximityBombAnimation, setProximityBombAnimation] = useState<"idle" | "exploding" | "resetting">("idle"),
    [portableBombBlast, setPortableBombBlast] = useState<{ x: number; y: number; nonce: number } | null>(null),
    [overlapSelection, setOverlapSelection] = useState<OverlapSelection | null>(null),
    [throneClaimPrompt, setThroneClaimPrompt] = useState(false),
    [inventoryOpen, setInventoryOpen] = useState(false),
    [dashActive, setDashActive] = useState(false),
    [movementSpent, setMovementSpent] = useState(0),
    [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null),
    [burningZone, setBurningZone] = useState<{ tiles: { x: number; y: number }[]; triggerRound: number; sourceId?: string } | null>(null),
    [abilityZones, setAbilityZones] = useState<AbilityZone[]>([]),
    [chargedSpells, setChargedSpells] = useState<ChargedSpell[]>([]),
    [bossShockwave, setBossShockwave] = useState<{ x: number; y: number; nonce: number } | null>(null),
    [bossSpellBurst, setBossSpellBurst] = useState<{ x: number; y: number; nonce: number } | null>(null),
    [bonusSkills, setBonusSkills] = useState<Record<string, Skill[]>>({}),
    [abilityQueue, setAbilityQueue] = useState<string[]>([]),
    [deferredAbilityQueue, setDeferredAbilityQueue] = useState<string[]>([]),
    [levelBeforeGain, setLevelBeforeGain] = useState(1),
    [levelReturn, setLevelReturn] = useState<"story" | "battle" | "poison" | "dungeon">("story"),
    [projectile, setProjectile] = useState<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      nonce: number;
    } | null>(null),
    [lightningBoltEffect, setLightningBoltEffect] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; nonce: number } | null>(null),
    [abilityVfx, setAbilityVfx] = useState<{ name: string; from: { x: number; y: number }; to: { x: number; y: number }; tiles?: { x: number; y: number }[]; nonce: number } | null>(null),
    [teleportingUnitId, setTeleportingUnitId] = useState<string | null>(null),
    [wayfarerLaunchedUnitId, setWayfarerLaunchedUnitId] = useState<string | null>(null),
    [mapCompletions, setMapCompletions] = useState<Record<string, number>>({}),
    [encounterMode, setEncounterMode] = useState<EncounterMode>("combat"),
    [exitReached, setExitReached] = useState(false),
    [leaderAbandoned, setLeaderAbandoned] = useState(false),
    [forestWarningRound, setForestWarningRound] = useState<number | null>(null),
    [discoveredPoi, setDiscoveredPoi] = useState<string[]>([]),
    [resolvedPoi, setResolvedPoi] = useState<string[]>([]),
    [inspectPoi, setInspectPoi] = useState<string | null>(null),
    [firedMapEvents, setFiredMapEvents] = useState<string[]>([]),
    [gameFeedback, setGameFeedback] = useState<GameFeedback | null>(null),
    [revealedTiles, setRevealedTiles] = useState<string[]>([]),
    [chapterIntro, setChapterIntro] = useState(false),
    [wayfarerReady, setWayfarerReady] = useState(false),
    [poisonCutscene, setPoisonCutscene] = useState(false),
    [dungeonPlaytest, setDungeonPlaytest] = useState(false),
    [showGridCoordinates, setShowGridCoordinates] = useState(true),
    [debugLayers, setDebugLayers] = useState<Set<DebugLayer>>(new Set()),
    [objectiveTrackerOpen, setObjectiveTrackerOpen] = useState(true),
    [roomEntryPresentation, setRoomEntryPresentation] = useState<RoomEntryPresentation | null>(null),
    [schoolTransformationFlash, setSchoolTransformationFlash] = useState(false),
    [teleportMode, setTeleportMode] = useState(false),
    [teleportHeroId, setTeleportHeroId] = useState<string | null>(null),
    [boonAbilityFlow, setBoonAbilityFlow] = useState(false),
    [bubblePlacement, setBubblePlacement] = useState<{ left: number; top: number; below: boolean } | null>(null),
    [spritePose, setSpritePose] = useState<Record<string, SpritePose>>({});
  const [dust2Objective, setDust2Objective] = useState<Dust2ObjectiveState>(createDust2ObjectiveState);
  const [dust2FreeplayTeam, setDust2FreeplayTeam] = useState<Dust2TeamId | null>(null);
  const [dust2FreeplayMatch, setDust2FreeplayMatch] = useState<Dust2FreeplayMatch | null>(null);
  const [saveHydrated, setSaveHydrated] = useState(false),
    [hasSave, setHasSave] = useState(false),
    [dungeonViewport, setDungeonViewport] = useState({ left: 0, right: 24, top: 44, bottom: 70 }),
    [mapZoom, setMapZoom] = useState(1.5), [dust2FreeClimb, setDust2FreeClimb] = useState(false),
    [dust2ShowWalls, setDust2ShowWalls] = useState(false),
    [dust2ShowElevation, setDust2ShowElevation] = useState(true),
    [dust2ShowGridLines, setDust2ShowGridLines] = useState(false),
    [editorStartDust2, setEditorStartDust2] = useState(false),
    [encounterSequenceLabel, setEncounterSequenceLabel] = useState<string | null>(null);
  const {
    bubble,
    showCombatBark,
    showDialogueBubble,
    continueDialogueBubble,
    scheduleCutscene,
    clearSequence,
    beginSequence,
    invalidateSequence,
    isSequenceCurrent,
  } = useGameSequenceController();
  const { combatFloats, pushCombatFloat, clearCombatFeedback } = useCombatFeedback();
  const gameTransitions = useGameStateTransitions({
    setEncounterMode,
    setRound,
    setTurn,
    setPhase,
    setChosen,
    setAiBusy,
    setChapterIntro,
    setInventoryOpen,
    setDashActive,
    setMovementSpent,
  });
  const { clearSchoolGlimpse, questionProfessorValeCurriculum, showProfessorGrinGlimpse, startSchoolQuiz } = useSchoolDialogueController({
    scene: socialScene, setScene: setSocialScene, setStep: setSchoolQuizStep,
    setMistakes: setSchoolQuizMistakes, setFlash: setSchoolTransformationFlash,
    setFlags: setFiredMapEvents, setAmbient: setAmbientMessage, setLog,
  });
  const battlefieldRef = useRef<HTMLDivElement | null>(null);
  const incapacitatedTurnRef = useRef("");
  const opportunityPairsRef = useRef<{ turnKey: string; pairs: Set<string> }>({ turnKey: "", pairs: new Set() });
  const encounterChoiceBusyRef = useRef(false);
  const bridgeSequenceGateRef = useRef(new Set<string>());
  const guardDialogueStartedRef = useRef(false);
  const suppressBoardClicksUntilRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const achievementIds = useRef<Set<string>>(new Set());
  const awardedXpSourcesRef = useRef<Set<string>>(new Set());
  const downCountsRef = useRef<Record<string, number>>({});
  const previousDownedState = useRef<Record<string, boolean>>({});
  const previousEnemyDownedState = useRef<Record<string, boolean>>({});
  const previousHeroHp = useRef<Record<string, number>>({});
  const roomTriggerPosition = useRef<string>("");
  const completeEncounterSequenceRef = useRef<(() => void) | null>(null);
  const pendingRoomDialogueRef = useRef<ScriptedEncounterKind | null>(null);
  const chargedTurnCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schoolNightmareCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTurnRef = useRef<() => void>(() => undefined);
  const monsterTraitTurnRef = useRef("");
  const guardianTriggerRoom = useRef(65);
  const spriteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const pushGameFeedback = (kind: GameFeedback["kind"], title: string, detail: string, image?: string) => {
    const nonce = runtimeNow();
    setGameFeedback({ kind, title, detail, image, nonce });
    scheduleCutscene(() => setGameFeedback((current) => current?.nonce === nonce ? null : current), image ? 3200 : kind === "item" ? 1400 : 2600);
  };
  const presentRoomEntry = (roomId: string, title: string, description: string, point: { x: number; y: number }) => {
    void point;
    pendingRoomDialogueRef.current = null;
    suppressBoardClicksUntilRef.current = Number.POSITIVE_INFINITY;
    setRoomEntryPresentation({ roomId, title, description, phase: "forming" });
    scheduleCutscene(() => setRoomEntryPresentation((current) => current?.roomId === roomId
      ? { ...current, phase: "revealing" }
      : current), 360);
    scheduleCutscene(() => setRoomEntryPresentation((current) => current?.roomId === roomId
      ? { ...current, phase: "introducing" }
      : current), 820);
  };
  const dismissRoomEntry = () => {
    suppressBoardClicksUntilRef.current = runtimeNow() + 120;
    const roomId = roomEntryPresentation?.roomId;
    const pendingDialogue = pendingRoomDialogueRef.current || (roomId && !CUSTOM_ROOM_ENTRY_HANDOFFS.has(roomId)
      ? ROOM_BLUEPRINTS[roomId]?.entry.encounter || null
      : null);
    setRoomEntryPresentation(null);
    pendingRoomDialogueRef.current = null;
    if (pendingDialogue) openScriptedEncounter(pendingDialogue);
  };
  const recordHeroCombat = (heroId: string, delta: Partial<HeroCombatStats>) => {
    setHeroCombatStats((current) => {
      const stats = current[heroId] || { attacks: 0, hits: 0, abilitiesUsed: 0, damageDealt: 0, damageTaken: 0 };
      return {
        ...current,
        [heroId]: {
          attacks: stats.attacks + (delta.attacks || 0),
          hits: stats.hits + (delta.hits || 0),
          abilitiesUsed: stats.abilitiesUsed + (delta.abilitiesUsed || 0),
          damageDealt: stats.damageDealt + (delta.damageDealt || 0),
          damageTaken: stats.damageTaken + (delta.damageTaken || 0),
        },
      };
    });
  };
  const battlefield = battlefieldForState({ campaign, campaignScene, mapVariant, trainingMap });
  const currentTerrain = battlefield.terrain, currentHeight = battlefield.elevationFt;
  const pointsOfInterest: PointOfInterest[] = useMemo(() => {
    if (campaignScene === 7)
      return [
        { id: "question-statue", name: "Statue of the Questioner", x: 20, y: 55, kind: "clue", text: resolvedPoi.includes("question-statue") ? "A stern stone scholar watches in silence. Empty grooves remain where the spectacles rested." : "A stern stone scholar wears an extremely unserious pair of spectacles. The plaque reads: ASK BETTER QUESTIONS." },
        { id: "western-secret-panel-14-61", name: "Weathered Pinup Poster", ...westernSecretDoor, kind: "clue", text: firedMapEvents.includes(westernSecretDoorEvent) ? "What's that smell?" : "A glamorous red-haired adventurer smiles from a weathered old poster. The paper shifts slightly in a draft that should not exist." },
        { id: "gold-cache", name: "Hollow Floor Tile", ...westernGoldCache, kind: "clue", text: "The stone at R62 sits a hair above its neighbors and answers a careful tap with a hollow knock." },
        { id: "hall-portrait-1", name: "Sir Orvin, Mimic Inspector", x: 10, y: 24, kind: "clue", text: "Sir Orvin demonstrates his patented mimic inspection technique: placing his entire head inside the chest. The final panel is mostly teeth." },
        { id: "hall-portrait-2", name: "Yara the Ready", x: 11, y: 24, kind: "clue", text: "Yara brought eleven swords, three shields, and no rope. The portrait shows her falling past all eleven swords." },
        { id: "hall-portrait-3", name: "Pell the Precise", x: 12, y: 24, kind: "clue", text: "Pell carefully tested both ends of an unidentified wand. The second test was technically unnecessary." },
        { id: "hall-portrait-4", name: "Brother Torvik, Torch-Snuffer", x: 13, y: 24, kind: "clue", text: "Brother Torvik extinguished every torch to deny the dungeon visibility. The dungeon had darkvision." },
        { id: "hall-portrait-mirror", name: "The Dumbest Delver in the Dungeon", x: 14, y: 24, kind: "clue", text: "An ornate mirror occupies the final frame. Its plaque reads: THE DUMBEST DELVER IN THE DUNGEON. The reflection looks distressingly familiar." },
        { id: "dead-mage", name: "Nimraith, the Hanging Skeleton", x: 8, y: 76, kind: "clue", text: "A dead tiefling mage hangs like a skeletal marionette. His jaw shifts when someone draws near." },
        { id: "ceramic-alarm", name: "Loose Power Cable", ...undertakerAlarmTiles[0], kind: "trap", text: "A black power cable snakes beside the club equipment. Stepping directly on it risks an extremely undignified fall." },
        ...(!firedMapEvents.includes("undertaker-secret-door-open")
          ? [{ id: "three-lords-statues", name: "The Three Lords", ...undertakerSecretDoor, kind: "clue" as const, text: "Three crowned figures are worked into a mounted stone relief: one raises a coin, one grips a sword, and one presses a finger to closed lips. The inscription reads: ONLY ONE LORD KEEPS WHAT CANNOT BE SPOKEN." }]
          : []),
        { id: DUNGEON_LANDMARKS.heartAcid.id, name: "Heart in a Stone Box", ...DUNGEON_LANDMARKS.heartAcid.mountPoint, kind: "clue", text: resolvedPoi.includes("heart-acid") ? "The stone box stands open. The acid is gone and the key remains in the mechanism." : firedMapEvents.includes("heart-acid-dropped") ? "The acid sheet has drained away, but the stone box remains locked. Its keyway matches the Stone-box Key from the hidden club." : "A locked stone box rests beneath a suspended sheet of green acid. Its lid can be forced, and its keyway matches the Stone-box Key from the hidden club." },
        { id: "black-pudding-statue", name: "Black-Coated Statue", x: 22, y: 51, kind: "clue", text: resolvedPoi.includes("black-pudding-statue") ? "The statue stands bare where its living black skin climbed away." : "Glossy black skin hugs the statue like muscle. Two pale eye-shapes briefly open, then vanish." },
        { id: "black-dragon-tracks", name: ANIMAL_TRACKS_LABEL, x: 21, y: 43, kind: "clue", text: "Three-toed prints score the dust, each edged by tiny acid burns." },
        { id: "spiked-pit-28d", name: "Concealed Spiked Pit", ...spikedPit28d, kind: "trap", text: "Hairline seams divide this square of floor from the surrounding stone. The entire slab is a hinged lid." },
        { id: "spike-pit-lure-28d", name: "Shiny Floor Lure", ...spikedPitLure28d, kind: "clue", text: "A tiny glint at the dead end catches the eye." },
        { id: "watch-hall-spear-trap", name: "Watch-Hall Spear Plate", x: 22, y: 63, kind: "trap", text: "A pressure plate at W64 is linked to a bank of heavy wall spears." },
        { id: "proximity-bomb", name: "Small Nuke", ...proximityBombPoint, kind: "trap", text: resolvedPoi.includes("proximity-bomb") ? "A weighted sandbag rests on the stable platform where the nuke once sat." : "A stable stone platform waits beneath a suspiciously small nuke." },
        { id: "dwarven-cave-in", name: "Collapsed Supply Niche", x: 17, y: 77, kind: "clue", text: "A pile of fallen stone seals an old dwarven supply niche at R78." },
        { id: "broom-closet-message", name: "Scrawled Floor Message", x: 8, y: 91, kind: "clue", text: "Broom closet ahead." },
        { id: "sewer-secret-grate", name: "Sewage Runoff Grate", ...sewerFloodSecretPassage.sewer, kind: "clue", text: "A rusted grate blocks a narrow runoff crawl. The same foul water continues into darkness behind it." },
        { id: "flood-room-secret-grate", name: "Flood-Room Runoff Grate", ...sewerFloodSecretPassage.flood, kind: "clue", text: "A matching grate opens into a cramped sewage crawl. Scratches on the bars suggest someone once came through from the other side." },
        { id: "ten-thousand-steps-message", name: "Dungeon Message", x: 28, y: 110, kind: "clue", text: "Get your 10k steps." },
        { id: "dwarven-spigot", name: "Dwarven Healing Spigot", ...dwarvenSpigotPoint, kind: "clue", text: resolvedPoi.includes("dwarven-spigot") ? "The ancient spigot has run dry." : firedMapEvents.includes("dwarven-party-healed") ? "The party is restored. One final measure of healing water remains—just enough to fill the copper tankard." : "Clean steaming water pours from the dwarven spigot. There is enough magic left to restore the party once." },
        ...((firedMapEvents.includes("kelim-first-plea-seen") || firedMapEvents.includes("room-36b")) && !resolvedPoi.includes("kelim-closet")
          ? [{ id: "kelim-closet", name: "Closet Door", ...KELIM_CLOSET_POINT, kind: "clue" as const, text: "Kelim is still hiding inside. He sounds frightened, but alive." }]
          : []),
        { id: "golden-spear-mimic", name: "Golden Spear", ...goldenSpearMimicPoint, kind: "clue", text: "A golden spear rests in the hands of the southern elf statue. It looks valuable—and strangely pristine." },
        { id: DUNGEON_LANDMARKS.hallethPit.id, name: firedMapEvents.includes("halleth-rescued") ? "Reset Barred Pit" : "Halleth Behind Bars", ...DUNGEON_LANDMARKS.hallethPit.point, kind: "clue", text: firedMapEvents.includes("halleth-rescued") ? "The iron bars have reset across the empty pit. The lock can be worked again—or forced with considerable effort." : "" },
      ];
    if (campaignScene === 6)
      return [
        {
          id: BRIDGE_LANDMARKS.snare.id,
          name: "Wire Snare",
          ...BRIDGE_LANDMARKS.snare.point,
          kind: "trap",
          text: "A thin wire runs beneath the moss. Stepping here would spring a bandit snare.",
        },
        {
          id: BRIDGE_LANDMARKS.waystone.id,
          name: "Out-of-Order Toll Projector",
          ...BRIDGE_LANDMARKS.waystone.point,
          kind: "clue",
          text: "Its brass eye has been torn out. A wooden sign hangs from the dead projector like a necklace: PAY TOLL AHEAD... OR ELSE.",
        },
        {
          id: BRIDGE_LANDMARKS.supplyCache.id,
          name: "Weathered Roadside Cache",
          ...BRIDGE_LANDMARKS.supplyCache.point,
          kind: "clue",
          text: resolvedPoi.includes("bridge-supply-cache")
            ? "The wooden cache stands open and empty."
            : "A rain-darkened wooden cache rests beside the bridge. Its lid is shut.",
        },
      ];
    if (campaignScene === 2)
      return [
        {
          id: "forest-ruin-marker",
          name: "Broken Boundary Shrine",
          x: 2,
          y: 2,
          kind: "clue" as const,
          text: resolvedPoi.includes("forest-ruin-marker")
            ? "The rubble is empty."
            : "Five old gold coins glint beneath the rubble.",
        },
        ...openingForestTrackTiles.map((marker, i) => ({
        id: i === 0 ? "forest-wolf-tracks" : `forest-wolf-tracks-${i}`,
        name: ANIMAL_TRACKS_LABEL,
        x: marker.x,
        y: marker.y,
        kind: "clue" as const,
        text: i === 0
          ? "Hmm... looks like fresh wolf tracks... and something... bigger?"
          : "More wolf tracks. The pack is close.",
        })),
      ];
    return [];
  }, [campaignScene, firedMapEvents, resolvedPoi]);
  const dungeonMode = campaign && campaignScene === 7;
  const kelimClosetBark = useKelimClosetBark(dungeonMode && stage === "battle" && encounterMode === "combat" && firedMapEvents.includes("room-36b") && !resolvedPoi.includes("kelim-closet") && units.some((unit) => unit.encounterGroup === "36b" && unit.team === "enemy" && !unit.downed), round);
  const kelimCorpsePoint = kelimCorpsePointFromFlags(firedMapEvents);
  const levelTwoMode = campaign && campaignScene === 9;
  const dust2FreeplayActive = !campaign && trainingMap === "dust2" && !!dust2FreeplayTeam;
  const twoHeadedKingPoint = dungeonRoomPoints.get("39a") || { x: 21, y: 98 };
  const twoHeadedKing = units.find((unit) => unit.encounterGroup === "39a" && unit.role === "Ettin" && !unit.downed);
  const defeatedTwoHeadedKing = units.find((unit) => unit.encounterGroup === "39a" && unit.role === "Ettin" && unit.downed);
  const dungeonExploredFloorCount = revealedTiles.filter((tile) => dungeonOpen.has(tile)).length;
  const dungeonExplorationPercent = Math.min(100, Math.floor((dungeonExploredFloorCount / dungeonOpen.size) * 100));
  const bossHuntStarted = firedMapEvents.includes("boss-hunt-started");
  const bossHasArrived = firedMapEvents.includes("two-headed-king-arrived");
  const throneClaimable = firedMapEvents.includes("two-headed-king-defeated");
  const activeDungeonThreats = units.filter((unit) =>
    unit.team === "enemy" && !unit.downed && unit.encounterGroup !== "39a",
  ).length;
  const floodRoomActive = firedMapEvents.includes("room-33-flood-active") &&
    !firedMapEvents.includes("room-33-flood-drained");
  const villageBattle = campaignScene === 4 || campaignScene === 5;
  const villageMapActive = villageBattle || (!campaign && trainingMap === "village");
  const ritualMapActive = campaignScene === 3 || campaignScene === 8 || (!campaign && trainingMap === "ritual");
  const bridgeMapActive = campaignScene === 6 || (!campaign && trainingMap === "bridge");
  const dust2MapActive = trainingMap === "dust2" && !campaign || levelTwoMode;
  const dust2MapPlaytest = !campaign && dust2MapActive && !enemyTypes.length;
  const mapPlaytest = (dungeonMode && dungeonPlaytest) || dust2MapPlaytest;
  const vfxGalleryMode = !campaign && trainingMap === "gallery";
  useEffect(() => { if (vfxGalleryMode && stage === "battle" && phase !== "action") { setChosen(null); setPhase("action"); } }, [phase, stage, vfxGalleryMode]);
  const openingForestMapActive =
    (campaign && campaignScene === 2) || (!campaign && trainingMap === "woodland");
  const forestVisualMapActive = openingForestMapActive || ritualMapActive;
  const paintedMapFacadeActive = !!battlefield.facade, paintedMapFacade = battlefield.facade;
  const boardCols = battlefield.cols, boardRows = battlefield.rows;
  const boardTilePixels = dust2MapActive ? 60 : 52;
  const updateDungeonViewport = (element: HTMLElement) => {
    if (!dungeonMode) return;
    const overscan = 4;
    const tilePixels = 52 * mapZoom;
    const left = Math.max(0, Math.floor(element.scrollLeft / tilePixels) - overscan);
    const right = Math.min(boardCols - 1, Math.ceil((element.scrollLeft + element.clientWidth) / tilePixels) + overscan);
    const top = Math.max(0, Math.floor(element.scrollTop / tilePixels) - overscan);
    const bottom = Math.min(boardRows - 1, Math.ceil((element.scrollTop + element.clientHeight) / tilePixels) + overscan);
    setDungeonViewport((current) => current.left === left && current.right === right && current.top === top && current.bottom === bottom
      ? current
      : { left, right, top, bottom });
  };
  const closedDungeonSecretDoors = useMemo(() => {
    const edges = dungeonSecretDoorEdges.filter((edge) => {
      const event = dungeonSecretDoorEventByEdge.get(dungeonEdgeKey(edge)); return event && !firedMapEvents.includes(event);
    });
    const crossings = new Set(edges.map(dungeonSecretDoorCrossingKey));
    const renderByPublicTile = new Map<string, { edge: DungeonSecretDoorEdge; side: DungeonEdgeSide }>();
    edges.forEach((edge) => {
      const publicTile = dungeonEdgeNeighbor(edge);
      renderByPublicTile.set(key(publicTile.x, publicTile.y), {
        edge,
        side: oppositeDungeonEdgeSide[edge.side],
      });
    });
    return { edges, crossings, renderByPublicTile };
  }, [firedMapEvents]);
  const currentDungeonWallCrossings = useMemo(() => new Set([
    ...closedDungeonSecretDoors.crossings,
    ...schoolEastWallCrossings,
  ]), [closedDungeonSecretDoors.crossings]);
  const currentDungeonBlocked = useMemo(() => {
    const blocked = new Set(dungeonBlocked);
    if (!resolvedPoi.includes("dwarven-cave-in")) blocked.add(key(17, 77));
    barriers
      .filter((barrier) => barrier.id === floodRoomHazard?.barrier.id && barrier.hp > 0)
      .forEach((barrier) => blocked.add(key(barrier.x, barrier.y)));
    return blocked;
  }, [barriers, resolvedPoi]);
  const villageSightCrossings = useMemo(() => buildVillageSightCrossings({
    wallEdgeKeys:villageWallEdgeKeys,
    entranceEdgeKeys:villageEntranceEdgeKeys,
    barriers,
  }), [barriers]);
  const villageBlocked = useMemo(() => new Set([
    ...battlefield.blocked,
    ...barriers.filter((barrier) => barrier.hp > 0).map((barrier) => key(barrier.x, barrier.y)),
  ]), [barriers, battlefield]);
  const currentBlocked = dungeonMode ? currentDungeonBlocked
    : battlefield.id === "village" ? villageBlocked
    : battlefield.blocked;
  const currentSightCrossings = dungeonMode ? currentDungeonWallCrossings
    : battlefield.id === "village" ? villageSightCrossings
    : NO_SIGHT_CROSSINGS;
  const dungeonRoomPoint = (label: string) => label === "40"
    ? goldenSpearMimicPoint
    : label === "24a"
      ? schoolEntryPoint
      : dungeonRoomPoints.get(label);
  const dungeonRoomEntryMatches = (
    label: string,
    room: (typeof ROOM_BLUEPRINTS)[string],
    position: { x: number; y: number },
    eventFlags: ReadonlySet<string>,
  ) => {
    const point = dungeonRoomPoint(label);
    if (!point || !roomEntryEnabled(room, eventFlags)) return false;
    if (room.entry.triggerTiles?.length)
      return room.entry.triggerTiles.some((tile) => position.x === tile.x && position.y === tile.y);
    if (label === "24a") return inSchoolFloorZone(position.x, position.y);
    return attackDist(position, point) <= (room.entry.radius ?? 2) &&
      playerView.hasLineOfSight(position, point, true);
  };
  const pendingDungeonRoomEntryAt = (
    position: { x: number; y: number },
    eventFlags: ReadonlySet<string>,
  ) => Object.entries(ROOM_BLUEPRINTS).find(([label, room]) => {
    if (label === "24a" || label === "28d") return false;
    if (eventFlags.has(`room-${label}`)) return false;
    return dungeonRoomEntryMatches(label, room, position, eventFlags);
  })?.[0] || null;
  useEffect(() => {
    if (!bubble || bubble.persistent) return;
    let frame = 0;
    const updateBubblePlacement = () => {
      const token = Array.from(document.querySelectorAll<HTMLElement>(".token[data-unit-id]"))
        .find((element) => element.dataset.unitId === bubble.unitId);
      const bubbleElement = document.querySelector<HTMLElement>(".global-speech-bubble");
      if (!token || !bubbleElement) return;
      const tokenRect = token.getBoundingClientRect();
      const boardRect = token.closest<HTMLElement>(".battlefield")?.getBoundingClientRect();
      const width = Math.min(bubbleElement.offsetWidth || 240, window.innerWidth - 16);
      const height = Math.min(bubbleElement.offsetHeight || 90, window.innerHeight - 16);
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, tokenRect.left + tokenRect.width / 2 - width / 2));
      const visibleBoardTop = Math.max(8, boardRect?.top || 8);
      const visibleBoardBottom = Math.min(window.innerHeight - 8, boardRect?.bottom || window.innerHeight - 8);
      const below = tokenRect.top - visibleBoardTop < height + 18;
      const desiredTop = below ? tokenRect.bottom + 12 : tokenRect.top - height - 12;
      const top = Math.max(8, Math.min(window.innerHeight - height - 8, Math.min(visibleBoardBottom - height, desiredTop)));
      setBubblePlacement((current) => current && current.left === left && current.top === top && current.below === below
        ? current
        : { left, top, below });
    };
    frame = window.requestAnimationFrame(updateBubblePlacement);
    window.addEventListener("resize", updateBubblePlacement);
    window.addEventListener("scroll", updateBubblePlacement, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateBubblePlacement);
      window.removeEventListener("scroll", updateBubblePlacement, true);
    };
  }, [bubble, units, stage]);
  const clearTransientTimers = () => {
    clearSequence();
    if (chargedTurnCompletionTimerRef.current) clearTimeout(chargedTurnCompletionTimerRef.current);
    chargedTurnCompletionTimerRef.current = null;
    if (schoolNightmareCompletionTimerRef.current) clearTimeout(schoolNightmareCompletionTimerRef.current);
    clearSchoolGlimpse();
    schoolNightmareCompletionTimerRef.current = null;
    Object.values(spriteTimers.current).forEach((timer) => clearTimeout(timer));
    spriteTimers.current = {};
    encounterChoiceBusyRef.current = false;
    completeEncounterSequenceRef.current = null;
    pendingRoomDialogueRef.current = null;
    setAmbientMessage(null);
    setReleasedKelimPoint(null); setKelimFirstPleaOpen(false);
    setProjectile(null);
    setTeleportingUnitId(null);
    setWayfarerLaunchedUnitId(null);
    setProximityBombAnimation("idle");
    setSchoolTransformationFlash(false);
    setSpritePose({});
    setEncounterSequenceLabel(null);
    clearCombatFeedback();
  };
  const playSound = (cue: SoundCue) => {
    audioContextRef.current = playSoundCue(cue, soundEnabled, audioContextRef.current);
  };
  const playTeleportAway = (unitId: string, onGone?: () => void) => {
    setTeleportingUnitId(unitId);
    playSound("spell");
    scheduleCutscene(() => {
      setUnits((current) => current.filter((unit) => unit.id !== unitId));
      setTeleportingUnitId(null);
      onGone?.();
    }, 1650);
  };
  const awardAchievement = (
    heroId: string,
    award: Omit<AchievementAward, "id" | "heroId" | "awardedAt"> & { key: string },
  ) => {
    const id = `${award.key}:${heroId}`;
    if (achievementIds.current.has(id)) return;
    achievementIds.current.add(id);
    const unlocked: AchievementAward = {
      id,
      heroId,
      title: award.title,
      description: award.description,
      tier: award.tier,
      boxName: award.boxName,
      awardedAt: runtimeNow(),
    };
    setAchievements((current) => [...current, unlocked]);
    setNoticeQueue((current) => [...current, {
      id: `achievement:${unlocked.id}:${unlocked.awardedAt}`,
      kind: "achievement",
      award: unlocked,
    }]);
    playSound("achievement");
  };
  const enqueueHalaster = (text: string) => {
    // This obsolete pit-trap taunt must never reappear through a stale or
    // migrated scripted event. The laugh is the entire Halaster reaction.
    if (text === "The warning was accurate. Your timing was the problem.") return;
    if (text === DELVER_ORIENTATION_MESSAGE) playVoiceLine("halaster-orientation", soundEnabled);
    setNoticeQueue((current) =>
    current.some((notice) => notice.kind === "halaster" && notice.text === text)
      ? current
      : [...current, {
          id: `halaster:${runtimeNow()}:${current.length}`,
          kind: "halaster",
          text,
        }],
    );
  };
  const enqueueNarration = (title: string, text: string, onDismiss?: () => void) => setNoticeQueue((current) => [...current, {
    id: `narration:${runtimeNow()}:${current.length}`,
    kind: "narration",
    title,
    text,
    onDismiss,
  }]);
  const dismissNotice = () => setNoticeQueue((current) => {
    const [notice, ...remaining] = current;
    if (notice?.kind === "narration" && notice.onDismiss) scheduleCutscene(notice.onDismiss, 0);
    return remaining;
  });
  const awardBallCapDialogue = (heroId: string) => awardAchievement(heroId, {
    key: "ball-cap-dialogue",
    title: "The Hat Made Me Do It",
    description: "Used a Ball Cap of Bad Ideas dialogue option.",
    tier: "Bronze",
    boxName: "Bad Idea Dialogue",
  });
  const runEncounterSequence = (
    continueLabel: string,
    steps: { at: number; run: () => void }[],
    completeAt: number,
    onComplete: () => void,
    preparedGeneration?: number,
  ) => {
    const generation = preparedGeneration ?? beginSequence();
    let completed = false;
    const complete = () => {
      if (completed || !isSequenceCurrent(generation)) return;
      completed = true;
      completeEncounterSequenceRef.current = null;
      setEncounterSequenceLabel(null);
      onComplete();
    };
    completeEncounterSequenceRef.current = complete;
    setEncounterSequenceLabel(continueLabel);
    steps.forEach((step) =>
      scheduleCutscene(() => {
        if (!completed && isSequenceCurrent(generation)) step.run();
      }, step.at),
    );
    scheduleCutscene(complete, completeAt);
    // Every authored sequence receives an automatic watchdog and a manual
    // continue action, so a delayed animation can never permanently lock play.
    scheduleCutscene(complete, completeAt + 1800);
    return complete;
  };
  const scenePath = (
    start: { x: number; y: number },
    goal: { x: number; y: number },
    blockedTiles: Set<string>,
    cols: number,
    rows: number,
  ) => {
    const startKey = key(start.x, start.y), goalKey = key(goal.x, goal.y);
    const queue = [startKey], previous = new Map<string, string>();
    const visited = new Set([startKey]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current === goalKey) break;
      const [cx, cy] = current.split(",").map(Number);
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1], [cx + 1, cy - 1], [cx - 1, cy - 1]]) {
        const nextKey = key(nx, ny);
        if (
          nx < 0 || nx >= cols || ny < 0 || ny >= rows ||
          blockedTiles.has(nextKey) || visited.has(nextKey) ||
          diagonalCornerBlocked(cx, cy, nx, ny, blockedTiles)
        ) continue;
        visited.add(nextKey);
        previous.set(nextKey, current);
        queue.push(nextKey);
      }
    }
    if (!visited.has(goalKey)) return [] as { x: number; y: number }[];
    const path: { x: number; y: number }[] = [];
    let cursor = goalKey;
    while (cursor !== startKey) {
      const [x, y] = cursor.split(",").map(Number);
      path.unshift({ x, y });
      cursor = previous.get(cursor)!;
    }
    return path;
  };
  const animateSceneWalk = (unitId: string, path: { x: number; y: number }[], delay: number, stepMs: number = COMBAT_TIMING.ordinaryMoveStepMs) => {
    path.forEach((point, index) => scheduleCutscene(() => {
      setUnits((current) => current.map((unit) => unit.id === unitId ? {
        ...unit,
        x: point.x,
        y: point.y,
        facing: point.x > unit.x ? "e" : point.x < unit.x ? "w" : point.y > unit.y ? "s" : "n",
      } : unit));
      setSpritePose((poses) => ({ ...poses, [unitId]: "walk" }));
      scheduleCutscene(() => setSpritePose((poses) => ({ ...poses, [unitId]: "idle" })), stepMs - 30);
    }, delay + index * stepMs));
    return delay + path.length * stepMs;
  };
  const animateComputedMove = (
    mover: Unit,
    path: { x: number; y: number; surfaceId?: string; elevationFt?: number }[],
    moved: Unit,
    finalUnits: Unit[],
    stepMs: number = COMBAT_TIMING.ordinaryMoveStepMs,
  ) => {
    const finalIndex = path.findIndex((point) => dust2MapActive ? dust2SamePosition(point, moved) : point.x === moved.x && point.y === moved.y);
    const traveledPath = finalIndex >= 0 ? path.slice(0, finalIndex + 1) : [];
    if (!traveledPath.length) {
      setUnits(finalUnits);
      return 0;
    }
    setSpritePose((poses) => ({ ...poses, [mover.id]: "walk" }));
    traveledPath.forEach((point, index) => scheduleCutscene(() => {
      setUnits((current) => current.map((unit) => unit.id === mover.id ? {
        ...unit,
        x: point.x,
        y: point.y,
        ...(dust2MapActive ? dust2PositionState(point) : {}),
        facing: point.x > unit.x ? "e" : point.x < unit.x ? "w" : point.y > unit.y ? "s" : "n",
      } : unit));
    }, index * stepMs));
    const duration = traveledPath.length * stepMs;
    scheduleCutscene(() => {
      setUnits(finalUnits);
      setSpritePose((poses) => ({ ...poses, [mover.id]: "idle" }));
    }, duration);
    return duration;
  };
  const grantDungeonLoot = (heroId: string, loot: string[]) => {
    const carried: string[] = [];
    const ownedItems = new Set(dungeonItems[heroId] || []);
    const grantedSkills: Skill[] = [];
    let attackBonus = 0, armorClassBonus = 0, investigationBonus = 0, moveBonus = 0, healingPotions = 0;
    loot.forEach((item) => {
      if (PURPOSELESS_DUNGEON_LOOT.has(item)) return;
      const definition = getItemDefinition(item);
      const uniqueCarry = definition.carry !== false && !definition.potionDelta;
      if (uniqueCarry && ownedItems.has(item)) return;
      if (uniqueCarry) ownedItems.add(item);
      attackBonus += definition.stats?.attack || 0;
      armorClassBonus += definition.stats?.defense || 0;
      investigationBonus += definition.stats?.investigation || 0;
      moveBonus += definition.stats?.move || 0;
      healingPotions += definition.potionDelta || 0;
      if (definition.skill) grantedSkills.push({ ...definition.skill });
      if (uniqueCarry) carried.push(item);
    });
    setUnits((current) => current.map((unit) => unit.id === heroId ? {
      ...unit,
      attack: unit.attack + attackBonus,
      armorClass: armorClassOf(unit) + armorClassBonus,
      move: unit.move + moveBonus,
      investigation: (unit.investigation || 0) + investigationBonus,
      skills: [...unit.skills, ...grantedSkills.filter((skill) => !unit.skills.some((known) => known.name === skill.name))],
    } : unit));
    if (attackBonus || armorClassBonus || investigationBonus || moveBonus)
      setDungeonStatBonuses((current) => ({
        ...current,
        [heroId]: {
          ...current[heroId],
          attack: (current[heroId]?.attack || 0) + attackBonus,
          defense: (current[heroId]?.defense || 0) + armorClassBonus,
          investigation: (current[heroId]?.investigation || 0) + investigationBonus,
          evasion: current[heroId]?.evasion || 0,
          move: (current[heroId]?.move || 0) + moveBonus,
        },
      }));
    if (grantedSkills.length)
      setBonusSkills((current) => ({
        ...current,
        [heroId]: [
          ...(current[heroId] || []),
          ...grantedSkills.filter((skill) => !(current[heroId] || []).some((known) => known.name === skill.name)),
        ],
      }));
    if (healingPotions)
      setPotions((current) => ({ ...current, [heroId]: (current[heroId] || 0) + healingPotions }));
    if (carried.length) setDungeonItems((items) => ({
      ...items,
      [heroId]: [...new Set([...(items[heroId] || []), ...carried])],
    }));
    const equipment = carried.map((item) => ({ item, definition: getItemDefinition(item) }))
      .filter(({ definition }) => !!definition.equipment);
    if (equipment.length) setEquippedItems((current) => {
      const slots = { ...(current[heroId] || {}) };
      equipment.forEach(({ item, definition }) => {
        slots[definition.equipment!.slot] = item;
      });
      return { ...current, [heroId]: slots };
    });
  };
  const grantHeroProficiency = (heroId: string, proficiency: SkillProficiency) => {
    setUnits((current) => current.map((unit) => unit.id === heroId ? { ...unit, skillProficiencies: [...new Set([...(unit.skillProficiencies || []), proficiency])] } : unit));
    setDungeonStatBonuses((current) => ({ ...current, [heroId]: { attack: current[heroId]?.attack || 0, defense: current[heroId]?.defense || 0, investigation: current[heroId]?.investigation || 0, ...current[heroId], proficiencies: [...new Set([...(current[heroId]?.proficiencies || []), proficiency])] } }));
  };
  const openAchievementBox = (awardId: string) => {
    const award = achievements.find((entry) => entry.id === awardId);
    if (!award || award.openedAt) return;
    const reward = achievementBoxReward(award);
    grantDungeonLoot(award.heroId, [reward]);
    setAchievements((current) => current.filter((entry) => entry.id !== awardId));
    setClaimedAchievementIds((current) => [...new Set([...current, awardId])]);
    const heroName = units.find((unit) => unit.id === award.heroId)?.name || "The hero";
    playSound(reward === "Circlet of Blasting" ? "spell" : "achievement");
    setLog((lines) => [`${heroName} opens the ${award.boxName} box and claims ${reward}.`, ...lines].slice(0, 6));
  };
  const openSpellbook = (heroId: string) => {
    if (!(dungeonItems[heroId] || []).includes("Kelim's Spellbook")) return;
    if (units.find((unit) => unit.id === heroId)?.skills.some(isKelimSpellbookSkill)) {
      setLog((lines) => ["That hero already knows Kelim's Shortcut. The spellbook remains intact.", ...lines].slice(0, 6));
      return;
    }
    setUnits((current) => current.map((unit) => unit.id === heroId && !unit.skills.some(isKelimSpellbookSkill)
      ? { ...unit, skills: [...unit.skills, { ...KELIM_SHORTCUT_SKILL }] }
      : unit));
    setBonusSkills((current) => ({
      ...current,
      [heroId]: (current[heroId] || []).some(isKelimSpellbookSkill) ? current[heroId] : [...(current[heroId] || []), { ...KELIM_SHORTCUT_SKILL }],
    }));
    const owner = units.find((unit) => unit.id === heroId);
    showCombatBark(heroId, "Kelim's Shortcut learned permanently.", 2200);
    setLog((current) => [`${owner?.name || "A hero"} reads Kelim's spellbook. It crumbles after teaching Kelim's Shortcut: teleport 30 feet, once per day.`, ...current].slice(0, 6));
    setDungeonItems((items) => { const carried = [...(items[heroId] || [])], index = carried.indexOf("Kelim's Spellbook"); if (index >= 0) carried.splice(index, 1); return { ...items, [heroId]: carried }; });
    setInventoryOpen(false); setChosen(null);
  };
  const useDelversCompass = () => {
    if (!active) return;
    const throne = dungeonRoomPoints.get("39a");
    if (!throne) return;
    const dx = throne.x - active.x, dy = throne.y - active.y;
    const vertical = dy < 0 ? "north" : "south";
    const horizontal = dx < 0 ? "west" : "east";
    const direction = Math.abs(dx) > Math.abs(dy) * 2 ? horizontal : Math.abs(dy) > Math.abs(dx) * 2 ? vertical : `${vertical}-${horizontal}`;
    showCombatBark(active.id, `The compass points ${direction}.`, 2200);
    setLog((current) => [`The Delver's Compass pulls generally ${direction}, toward the throne hall.`, ...current].slice(0, 6));
    setInventoryOpen(false);
  };
  const nearbySocialHeroes = (roomLabel: string) => {
    const point = dungeonRoomPoint(roomLabel);
    if (!point) return [];
    return units
      .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && attackDist(unit, point) <= 4)
      .sort((a, b) => attackDist(a, point) - attackDist(b, point));
  };
  const socialHeroMeetsRequirements = (hero: Unit, requirements: EncounterChoice["requirements"] = []) =>
    requirements.every((requirement) => {
      if (requirement.kind === "hero-item") return heroHasItem(hero.id, requirement.item);
      if (requirement.kind === "party-item") return !!partyItemOwner(requirement.item);
      if (requirement.kind === "hero-class") return hero.role === requirement.role;
      if (requirement.kind === "hero-archetype") return requirement.archetype === "spellcaster" && isSpellcasterHero(hero);
      if (requirement.kind === "investigation") return (hero.investigation || 0) >= requirement.minimum; if (requirement.kind === "flag-present") return firedMapEvents.includes(requirement.flag);
      return !firedMapEvents.includes(requirement.flag);
    });
  const automaticSocialHero = (roomLabel: string, requirements: EncounterChoice["requirements"] = []) => {
    const nearby = nearbySocialHeroes(roomLabel).filter((hero) => socialHeroMeetsRequirements(hero, requirements));
    return nearby.find((hero) => hero.id === active?.id) || nearby[0] || units.find((hero) =>
      hero.team === "hero" && !hero.npc && !hero.downed && socialHeroMeetsRequirements(hero, requirements),
    );
  }; const socialHeroWithItem = (item: string) => socialScene && automaticSocialHero(socialScene.roomLabel, [{ kind: "hero-item", item }]);
  const openSocialScene = (kind: SocialScene["kind"], roomLabel: string, title: string, speaker: string, text: string) => {
    const heroId = automaticSocialHero(roomLabel)?.id;
    if (!heroId) return;
    encounterChoiceBusyRef.current = false;
    setSocialScene({ kind, roomLabel, title, speaker, text, heroId });
  };
  const spawnConversationUnits = (
    roomLabel: string,
    point: { x: number; y: number },
    names: string[],
    preferredPositions: { x: number; y: number }[] = [],
    replaceExisting = false,
  ) => {
    const occupied = new Set(units.filter((unit) => !unit.downed && (!replaceExisting || unit.encounterGroup !== roomLabel))
      .flatMap((unit) => unitFootprintAt(unit).map((tile) => key(tile.x, tile.y))));
    const positions: { x: number; y: number }[] = preferredPositions
      .filter((spot) => dungeonOpen.has(key(spot.x, spot.y)) && !occupied.has(key(spot.x, spot.y)))
      .slice(0, names.length);
    positions.forEach((spot) => occupied.add(key(spot.x, spot.y)));
    for (let radius = 1; radius <= 5 && positions.length < names.length; radius++)
      for (let y = point.y - radius; y <= point.y + radius && positions.length < names.length; y++)
        for (let x = point.x - radius; x <= point.x + radius && positions.length < names.length; x++)
          if (attackDist(point, { x, y }) === radius && dungeonOpen.has(key(x, y)) && !occupied.has(key(x, y))) {
            positions.push({ x, y });
            occupied.add(key(x, y));
          }
    const actors = names.slice(0, positions.length).map((name, index) => {
      const definition = getActorDefinition(name);
      const actorRole = roomLabel === "23c"
        ? "Spectral Delver"
        : name.includes("Goblin")
          ? "Goblin"
          : name.includes("Bugbear")
            ? "Bugbear"
            : UNDERTAKER_CLUB_HOSTS.includes(name as typeof UNDERTAKER_CLUB_HOSTS[number])
              ? "Club Hostess"
              : name;
      const actor = spawnActor(definition.id, `dungeon-${roomLabel}-${index}`, "neutral", name);
      actor.role = actorRole;
      actor.x = positions[index].x;
      actor.y = positions[index].y;
      if (name === "Tyler Durden") actor.facing = "w";
      actor.npc = true;
      actor.encounterGroup = roomLabel;
      return actor;
    });
    setUnits((current) => replaceExisting || roomLabel === "2b"
      ? [...current.filter((unit) => unit.encounterGroup !== roomLabel), ...actors]
      : current.some((unit) => unit.encounterGroup === roomLabel) ? current : [...current, ...actors]);
    return actors;
  };
  const openScriptedEncounter = (kind: ScriptedEncounterKind, opening?: string) => {
    const encounter = SCRIPTED_DUNGEON_ENCOUNTERS[kind];
    if (kind === "manticore-show") setManticoreShow({ round: 0, score: 0 });
    if (kind !== "spectral-camp" && !firedMapEvents.includes("tutorial-social-solutions")) {
      setFiredMapEvents((events) => [...new Set([...events, "tutorial-social-solutions"])]);
      pushGameFeedback("encounter", "SOCIAL ENCOUNTER", "Items, skills, and good judgment can avoid a fight.");
    }
    const hasAvailableItemChoice = encounter.choices.some((choice) =>
      choice.requirements?.some((requirement) => requirement.kind === "hero-item" || requirement.kind === "party-item") &&
      !!automaticSocialHero(encounter.roomLabel, choice.requirements));
    if (kind !== "spectral-camp" && hasAvailableItemChoice && !firedMapEvents.includes("tutorial-item-dialogue")) {
      setFiredMapEvents((events) => [...new Set([...events, "tutorial-item-dialogue"])]);
      scheduleCutscene(() => pushGameFeedback("item", "ITEM DIALOGUE AVAILABLE", "Carried items can unlock unique solutions and consequences."), 2800);
    }
    if (kind === "paranoid-dwarf") { if (firedMapEvents.includes("gromm-requested-flour")) { openSocialScene(kind, encounter.roomLabel, encounter.title, encounter.speaker, "I need one more bag of flour, and the circle will be complete."); return; } const hero = automaticSocialHero(encounter.roomLabel); if (hero && !firedMapEvents.includes("gromm-introduction-seen")) { setFiredMapEvents((events) => [...new Set([...events, "gromm-introduction-seen"])]); showDialogueBubble(hero.id, "Is this flour?", () => openSocialScene(kind, encounter.roomLabel, encounter.title, encounter.speaker, encounter.opening)); return; } }
    openSocialScene(kind, encounter.roomLabel, encounter.title, encounter.speaker, opening || encounter.opening);
  };
  const resumeEncounterConversation = (unit: Unit) => {
    clearSequence();
    encounterChoiceBusyRef.current = false;
    completeEncounterSequenceRef.current = null;
    setEncounterSequenceLabel(null);
    setChapterIntro(false); setAiBusy(false); setInspect(null);
    if (unit.id === SCHOOL_TEACHER_ID && !firedMapEvents.includes("schoolteacher-hostile")) {
      const hero = automaticSocialHero("24a");
      if (!hero) return;
      setSocialScene({
        kind: "schoolteacher",
        roomLabel: "24a",
        title: "Dweomercore Remedial Fundamentals",
        speaker: "Professor Vale",
        text: schoolQuizStep === null ? "Class resumes. Try to look as though the interruption was educational." : SCHOOL_QUIZ_QUESTIONS[schoolQuizStep].prompt,
        heroId: hero.id,
      });
      return;
    }
    const kind = unit.encounterGroup === "bridge" ? "bridge-bandits" : unit.encounterGroup && ROOM_BLUEPRINTS[unit.encounterGroup]?.entry.encounter;
    if (kind) openScriptedEncounter(kind);
  };
  const leaveSocialConversation = () => {
    if (!socialScene || !DISMISSIBLE_SOCIAL_KINDS.has(socialScene.kind)) return;
    encounterChoiceBusyRef.current = false;
    setSocialScene(null);
  };
  const revealClubHostsAtSecretDoor = (alerted: boolean) => {
    const roomLabel = "6c";
    const clubEncounter = SCRIPTED_DUNGEON_ENCOUNTERS["secret-club"];
    const entry = clubEncounter.entryVariants?.find((variant) => variant.id === (alerted ? "alerted" : "normal"));
    const entryBubbles = entry?.prelude.filter((effect) => effect.kind === "bubble") || [];
    const entryNarration = entry?.prelude.find((effect) => effect.kind === "narration");
    const names = UNDERTAKER_CLUB_HOSTS;
    const insideStarts = [{ x: 13, y: 46 }, { x: 12, y: 45 }, { x: 12, y: 47 }, { x: 11, y: 46 }];
    const clubStations = [{ x: 9, y: 42 }, { x: 12, y: 43 }, { x: 12, y: 48 }, { x: 9, y: 48 }];
    const hallwaySpots = [{ x: 15, y: 46 }, { x: 16, y: 46 }, { x: 15, y: 47 }, { x: 16, y: 47 }];
    const revealedClub = [
      ...undertakerClubTiles,
      ...Array.from({ length: 12 }, (_, index) => key(13 + (index % 6), 45 + Math.floor(index / 6))),
    ];
    setRevealedTiles((tiles) => [...new Set([...tiles, ...revealedClub])]);
    setUnits((current) => {
      const withoutOldClub = current.filter((unit) => unit.encounterGroup !== roomLabel);
      const actors = names.map((name, index) => {
        const actor = spawnActor(name, `dungeon-6c-${index}`, "neutral", name);
        actor.role = "Club Hostess";
        Object.assign(actor, alerted ? insideStarts[index] : clubStations[index]);
        actor.npc = true;
        actor.encounterGroup = roomLabel;
        return actor;
      });
      return [...withoutOldClub, ...actors];
    });
    setFiredMapEvents((events) => [...new Set([
      ...events,
      "room-6c",
      "room-encounter-spawned-6c",
      ...(alerted ? ["undertaker-alerted"] : []),
    ])]);
    setResolvedPoi((ids) => [...new Set([
      ...ids,
      ...(alerted ? ["ceramic-alarm", "three-lords-statues"] : []),
    ])]);
    const heroId = units
      .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed)
      .sort((a, b) => attackDist(a, undertakerSecretDoor) - attackDist(b, undertakerSecretDoor))[0]?.id;
    const openConversation = () => {
      setChapterIntro(false);
      if (heroId) setSocialScene({
        kind: "secret-club",
        roomLabel,
        title: alerted ? "The Extremely Alert Club" : "The Extremely Secret Club",
        speaker: "Countess Velvet",
        text: entry?.opening || clubEncounter.opening,
        heroId,
      });
    };
    if (alerted) {
      setChapterIntro(true);
      const clubSequenceGeneration = beginSequence();
      let opened = false;
      const finishClubArrival = () => {
        if (opened || !isSequenceCurrent(clubSequenceGeneration)) return;
        opened = true;
        completeEncounterSequenceRef.current = null;
        setEncounterSequenceLabel(null);
        openConversation();
      };
      setAmbientMessage(entryNarration?.text || "The music dies.");
      scheduleCutscene(() => setAmbientMessage(null), 3600);
      const arrivalTimes = names.map((_, index) => {
        const path = scenePath(insideStarts[index], hallwaySpots[index], dungeonBlocked, DUNGEON_COLS, DUNGEON_ROWS);
        return animateSceneWalk(`dungeon-6c-${index}`, path, 180 + index * 180, 150);
      });
      completeEncounterSequenceRef.current = finishClubArrival;
      setEncounterSequenceLabel("Finish the Club Evacuation");
      scheduleCutscene(() => showDialogueBubble("dungeon-6c-0", entryBubbles[0]?.text || "WHO PULLED THE ALARM?", () => {
        showDialogueBubble("dungeon-6c-3", entryBubbles[1]?.text || "The beat was about to drop!", finishClubArrival);
      }), Math.max(...arrivalTimes, 800) + 180);
    } else {
      setChapterIntro(true);
      if (entryNarration) {
        setAmbientMessage(entryNarration.text);
        scheduleCutscene(() => setAmbientMessage(null), 3600);
      }
      const clubSequenceGeneration = beginSequence();
      let opened = false;
      const finishClubArrival = () => {
        if (opened || !isSequenceCurrent(clubSequenceGeneration)) return;
        opened = true;
        completeEncounterSequenceRef.current = null;
        setEncounterSequenceLabel(null);
        openConversation();
      };
      completeEncounterSequenceRef.current = finishClubArrival;
      setEncounterSequenceLabel("Meet the Club Hosts");
      scheduleCutscene(() => showDialogueBubble(
        "dungeon-6c-0",
        entryBubbles[0]?.text || "Nobody was supposed to find our club... and now we have guests.",
        finishClubArrival,
      ), 220);
    }
  };
  const completeEncounter = (
    roomLabel: string,
    title: string,
    outcome: EncounterOutcome,
    actorDisposition: "remove" | "retain" = "remove",
  ) => {
    const preserveBridgeBattlefield = roomLabel === "bridge" && campaignScene === 6;
    setFiredMapEvents((events) => [...new Set([
      ...events,
      ...encounterCompletionFlags({ roomLabel, title, outcome }),
    ])]);
    setUnits((current) => {
      const next = actorDisposition === "remove"
        ? current.filter((unit) => unit.encounterGroup !== roomLabel)
        : current.map((unit) => unit.encounterGroup === roomLabel
          ? { ...unit, encounterGroup: undefined, team: "neutral" as Team, npc: true }
          : unit);
      if (!next.some((unit) => unit.team === "enemy" && !unit.downed)) {
        setEncounterMode("exploration");
        setTurn(0);
        setPhase("move");
      }
      setAiBusy(false);
      return next;
    });
    setChosen(null);
    setSocialScene(null);
    if (preserveBridgeBattlefield) {
      // A peaceful toll resolution removes only the collectors. Never route
      // the company through a generic room handoff or reuse stale positions.
      setStage("battle");
      setMapVariant("bridge");
      setExitReached(false);
      setChapterIntro(false);
    }
    encounterChoiceBusyRef.current = false;
    pushGameFeedback("encounter", "ENCOUNTER RESOLVED", `${title} · Exploration resumed`);
  };
  const runSecretClubTour = (heroId: string, tour: Extract<EncounterEffect, { kind: "secret-club-tour" }>) => {
    const hero = units.find((unit) => unit.id === heroId);
    if (!hero) return;
    const { stations, completion } = tour;
    setChapterIntro(true);
    setEncounterMode("exploration");
    setAiBusy(false);
    setUnits((current) => current.map((unit) => {
      if (unit.encounterGroup !== "6c") return unit;
      const index = Number(unit.id.split("-").at(-1));
      return { ...unit, ...(SECRET_CLUB_HOST_POSITIONS[index] || SECRET_CLUB_HOST_POSITIONS[0]), team: "neutral", npc: true };
    }));
    setRevealedTiles((tiles) => [...new Set([...tiles, ...undertakerClubTiles, key(14, 46), key(15, 46)])]);
    const tourSequenceGeneration = beginSequence();
    let completed = false;
    const finishTour = () => {
      if (completed || !isSequenceCurrent(tourSequenceGeneration)) return;
      completed = true;
      completeEncounterSequenceRef.current = null;
      setEncounterSequenceLabel(null);
        awardAchievement(heroId, completion.achievement);
        grantDungeonLoot(heroId, completion.items);
        grantHeroProficiency(heroId, completion.proficiency);
        setFiredMapEvents((events) => [...new Set([...events, ...completion.flags])]);
        setAmbientMessage(`What happens in Undermountain stays in Undermountain. Mostly. ${completion.proficiency} proficiency gained.`);
        scheduleCutscene(() => setAmbientMessage(null), 4200);
        setLog((lines) => [`${hero.name} completes every station, gains ${completion.proficiency} proficiency, and receives ${completion.items.join(" and ")}.`, ...lines].slice(0, 6));
        setChapterIntro(false);
        setSpritePose((poses) => ({
          ...poses,
          [heroId]: "idle",
          "dungeon-6c-0": "idle",
          "dungeon-6c-1": "idle",
          "dungeon-6c-2": "idle",
          "dungeon-6c-3": "idle",
        }));
        if (completion.awardPeaceXp) awardPeaceXp("6c");
        completeEncounter("6c", "The Extremely Secret Club", "special", completion.actorDisposition);
    };
    const visitStation = (index: number, cursor: { x: number; y: number }) => {
      if (completed || !isSequenceCurrent(tourSequenceGeneration)) return;
      const station = stations[index];
      if (!station) {
        const exitPath = scenePath(cursor, SECRET_CLUB_EXIT, dungeonBlocked, DUNGEON_COLS, DUNGEON_ROWS);
        const arrival = animateSceneWalk(heroId, exitPath, 120, SECRET_CLUB_TOUR_TIMING.stepMilliseconds);
        scheduleCutscene(() => {
          if (!completed && isSequenceCurrent(tourSequenceGeneration))
            showDialogueBubble(heroId, "I survived the orientation.", finishTour);
        }, arrival + 180);
        return;
      }
      const hostId = `dungeon-6c-${station.host}`;
      const path = scenePath(cursor, station.point, dungeonBlocked, DUNGEON_COLS, DUNGEON_ROWS);
      const arrival = animateSceneWalk(heroId, path, 120, SECRET_CLUB_TOUR_TIMING.stepMilliseconds);
      scheduleCutscene(() => {
        if (completed || !isSequenceCurrent(tourSequenceGeneration)) return;
        setSpritePose((poses) => ({
          ...poses,
          [heroId]: "damage",
          [hostId]: index === stations.length - 1 ? "cast" : "attack",
        }));
        setLog((lines) => [station.line, ...lines].slice(0, 6));
        showDialogueBubble(hostId, station.line, () => {
          setAmbientMessage(station.aside);
          showDialogueBubble(heroId, station.reply, () => {
            setAmbientMessage(null);
            setSpritePose((poses) => ({ ...poses, [heroId]: "idle", [hostId]: "idle" }));
            visitStation(index + 1, station.point);
          });
        });
      }, arrival + 120);
    };
    completeEncounterSequenceRef.current = finishTour;
    setEncounterSequenceLabel("Finish the Extremely Secret Tour");
    scheduleCutscene(
      () => visitStation(0, { x: hero.x, y: hero.y }),
      SECRET_CLUB_TOUR_TIMING.openingDelay,
    );
  };
  const partyItemOwner = (item: string) =>
    Object.entries(dungeonItems).find(([, items]) => items.includes(item))?.[0];
  const heroHasItem = (heroId: string, item: string) =>
    (dungeonItems[heroId] || []).includes(item);
  const heroEquipmentVisuals = (heroId: string) =>
    (Object.entries(equippedItems[heroId] || {}) as [EquipmentSlot, string][])
      .flatMap(([, item]) => {
        const equipment = getItemDefinition(item).equipment;
        return equipment ? [{ item, ...equipment }] : [];
      });
  const awardDungeonXp = (enemyXp: number, _finisherId?: string, sourceId?: string) => {
    if (!dungeonMode || enemyXp <= 0) return;
    if (sourceId) { if (awardedXpSourcesRef.current.has(sourceId)) return; awardedXpSourcesRef.current.add(sourceId); }
    setUnits((current) => {
      const heroes = current.filter((unit) => unit.team === "hero" && !unit.npc && !unit.actorId);
      if (!heroes.length) return current;
      const defeatedType = sourceId ? current.find((unit) => unit.id === sourceId)?.role : undefined;
      const shared = Math.max(1, Math.floor(enemyXp / heroes.length));
      const next = current.map((unit) => {
        if (unit.team !== "hero" || unit.npc || unit.actorId) return unit;
        const favoredEnemyKills = defeatedType && unit.skills.some((skill) => skill.name === "Favored Enemy") ? { ...(unit.favoredEnemyKills || {}), [defeatedType]: (unit.favoredEnemyKills?.[defeatedType] || 0) + 1 } : unit.favoredEnemyKills;
        const nextXp = (unit.xp || 0) + shared;
        let nextLevel = unit.level || level;
        const oldLevel = nextLevel;
        while (nextXp >= xpForNextLevel(nextLevel)) nextLevel += 1;
        if (nextLevel === oldLevel) return { ...unit, xp: nextXp, favoredEnemyKills };
        const before = kitAtLevel(unit.role, oldLevel);
        const after = kitAtLevel(unit.role, nextLevel);
        const maxHp = unit.maxHp + (after.hp - before.hp);
        return {
          ...unit,
          xp: nextXp,
          favoredEnemyKills,
          level: nextLevel,
          maxHp,
          hp: maxHp,
          downed: false,
          stunned: false,
          attack: unit.attack + (after.attack - before.attack),
          abilities: after.abilities ? { ...after.abilities } : unit.abilities,
          saveProficiencies: [...(after.saveProficiencies || unit.saveProficiencies || [])],
          skills: unit.skills.map((skill) => {
            const previousClassSkill = before.skills.find((candidate) => (candidate.id || candidate.name) === (skill.id || skill.name));
            const nextClassSkill = after.skills.find((candidate) => (candidate.id || candidate.name) === (skill.id || skill.name));
            if (!previousClassSkill || !nextClassSkill || skill.unlimited || skill.dailyCharges) return skill;
            const increase = (nextClassSkill.maxCharges ?? nextClassSkill.charges) - (previousClassSkill.maxCharges ?? previousClassSkill.charges);
            return { ...skill, charges: skill.charges + increase, maxCharges: (skill.maxCharges ?? skill.charges) + increase };
          }),
        };
      });
      const leveled = next.filter((unit, index) => unit.team === "hero" && (unit.level || 1) > (current[index].level || level));
      if (leveled.length) queueMicrotask(() => {
        const nextPartyLevel = Math.max(...leveled.map((hero) => hero.level || 1));
        const previousPartyLevel = Math.min(...leveled.map((hero) => current.find((unit) => unit.id === hero.id)?.level || level));
        const unlockLevels = Array.from({ length: nextPartyLevel - previousPartyLevel }, (_, index) => previousPartyLevel + index + 1).filter((value) => value >= 3 && value % 2 === 1);
        setLevel(nextPartyLevel);
        setLevelBeforeGain(previousPartyLevel);
        if (unlockLevels.length) setDeferredAbilityQueue((queue) => [...queue, ...unlockLevels.flatMap(() => leveled.map((hero) => hero.id))]);
        setLog((lines) => [...leveled.map((hero) => `${hero.name} reaches Level ${hero.level}, returns at full HP, and grows stronger.`), ...lines].slice(0, 6));
      });
      return next;
    });
  };
  const awardPeaceXp = (group: string) => {
    const total = units.filter((unit) => unit.encounterGroup === group).reduce((sum, unit) => sum + (unit.xpReward || xpForCr(unit.cr)), 0);
    awardDungeonXp(total || 200, undefined, `peace:${group}`);
  };
  const removeDungeonItem = (heroId: string, item: string) => {
    setDungeonItems((current) => {
      const nextItems = [...(current[heroId] || [])];
      const index = nextItems.indexOf(item);
      if (index >= 0) nextItems.splice(index, 1);
      return { ...current, [heroId]: nextItems };
    });
  };
  const removeItemGrantedAbility = (heroId: string, item: string) => {
    const grantedName = getItemDefinition(item).skill?.name;
    if (!grantedName) return;
    setUnits((current) => current.map((unit) => unit.id === heroId
      ? { ...unit, skills: unit.skills.filter((skill) => skill.name !== grantedName) }
      : unit));
    setBonusSkills((current) => ({
      ...current,
      [heroId]: (current[heroId] || []).filter((skill) => skill.name !== grantedName),
    }));
  };
  const useBarOfSoap = (heroId: string) => {
    const hero = units.find((unit) => unit.id === heroId);
    if (!hero || !(dungeonItems[heroId] || []).includes("Bar of Soap")) return;
    if (!hero.poisoned && !hero.bleeding) {
      setLog((lines) => [`${hero.name} is neither poisoned nor bleeding. The soap is saved for a dirtier emergency.`, ...lines].slice(0, 6));
      return;
    }
    setUnits((current) => current.map((unit) => unit.id === heroId ? { ...unit, poisoned: false, bleeding: false } : unit));
    showCombatBark(heroId, "Clean enough to keep fighting.", 1800);
    setLog((lines) => [`${hero.name} scrubs the wound clean. Poison and bleeding are removed; the Bar of Soap remains usable.`, ...lines].slice(0, 6));
    setInventoryOpen(false);
    setChosen(null);
    setPhase("facing");
  };
  const dropDungeonItem = (heroId: string, item: string, index: number) => {
    const hero = units.find((unit) => unit.id === heroId);
    if (!hero) return;
    const definition = getItemDefinition(item);
    setDungeonItems((current) => {
      const nextItems = [...(current[heroId] || [])];
      nextItems.splice(index, 1);
      return { ...current, [heroId]: nextItems };
    });
    setEquippedDialogueItems((equipped) =>
      equipped[heroId] === item ? { ...equipped, [heroId]: null } : equipped,
    );
    setEquippedItems((current) => {
      const slots = { ...(current[heroId] || {}) };
      (Object.keys(slots) as (keyof EquippedItemSlots)[]).forEach((slot) => {
        if (slots[slot] === item) delete slots[slot];
      });
      return { ...current, [heroId]: slots };
    });
    if (item === "Disguise Kit") setHeroDisguises((current) => {
      const next = { ...current };
      delete next[heroId];
      return next;
    });
    removeItemGrantedAbility(heroId, item);
    if (definition.removeStatsOnDrop && definition.stats) {
      const stats = definition.stats;
      setUnits((current) => current.map((unit) =>
        unit.id === heroId ? {
          ...unit,
          attack: Math.max(0, unit.attack - (stats.attack || 0)),
          armorClass: Math.max(10, armorClassOf(unit) - (stats.defense || 0)),
          investigation: Math.max(0, (unit.investigation || 0) - (stats.investigation || 0)),
          move: Math.max(0, unit.move - (stats.move || 0)),
        } : unit,
      ));
      setDungeonStatBonuses((current) => ({
        ...current,
        [heroId]: {
          ...current[heroId],
          attack: Math.max(0, (current[heroId]?.attack || 0) - (stats.attack || 0)),
          defense: Math.max(0, (current[heroId]?.defense || 0) - (stats.defense || 0)),
          investigation: Math.max(0, (current[heroId]?.investigation || 0) - (stats.investigation || 0)),
          evasion: Math.max(0, (current[heroId]?.evasion || 0) - (stats.evasion || 0)),
          move: Math.max(0, (current[heroId]?.move || 0) - (stats.move || 0)),
        },
      }));
    }
    setDroppedDungeonItems((items) => [...items, { id: `drop-${runtimeNow()}-${index}`, name: item, x: hero.x, y: hero.y }]);
    setLog((lines) => [`${hero.name} drops ${item}.`, ...lines].slice(0, 6));
  };
  const pickUpDungeonItem = (drop: DroppedDungeonItem) => {
    if (!active || active.team !== "hero" || active.downed || attackDist(active, drop) > 1) {
      setLog((lines) => ["A conscious hero must stand on or beside the item to pick it up.", ...lines].slice(0, 6));
      return;
    }
    grantDungeonLoot(active.id, [drop.name]); if (drop.id === "pantry-bag-of-flour") setFiredMapEvents((events) => [...new Set([...events, "pantry-flour-collected"])]);
    if (drop.id === "puke-immunity-ring")
      setFiredMapEvents((events) => [...new Set([...events, "puke-tunnel-reward-claimed"])]);
    if (drop.name === "Potion of Speed") awardAchievement(active.id, {
      key: "speed-potion",
      title: "Gotta Go Fast",
      description: "Claimed the floating Potion of Speed from the acid mechanism.",
      tier: "Silver",
      boxName: "Velocity",
    });
    setDroppedDungeonItems((items) => items.filter((item) => item.id !== drop.id));
    const lootRoomId = roomIdFromLootDrop(drop.id);
    if (lootRoomId) setFiredMapEvents((events) => advanceRoomState(events, lootRoomId, "looted"));
    pushGameFeedback("item", "ITEM ACQUIRED", drop.name);
    setLog((lines) => [drop.name === "Potion of Speed"
      ? `${active.name} drinks the Potion of Speed and permanently gains +1 movement range.`
      : drop.id === "puke-immunity-ring"
        ? `${active.name} digs the gleaming Ring of Puke Immunity out from beneath the sewage.`
      : `${active.name} picks up ${drop.name}.`, ...lines].slice(0, 6));
  };
  const claimChestItem = (chest: DroppedDungeonItem, itemIndex: number) => {
    if (!active || active.team !== "hero" || active.downed || attackDist(active, chest) > 1) {
      setLog((lines) => ["A conscious hero must stand on or beside the chest to take its loot.", ...lines].slice(0, 6));
      return;
    }
    const item = chest.contents?.[itemIndex];
    if (!item) return;
    grantDungeonLoot(active.id, [item]);
    setDroppedDungeonItems((objects) => objects.flatMap((object) => {
      if (object.id !== chest.id) return [object];
      const remaining = (object.contents || []).filter((_, index) => index !== itemIndex);
      return remaining.length ? [{ ...object, contents: remaining }] : [];
    }));
    if ((chest.contents?.length || 0) <= 1) setOpenChestId(null);
    const lootRoomId = roomIdFromLootDrop(chest.id);
    if (lootRoomId && (chest.contents?.length || 0) <= 1)
      setFiredMapEvents((events) => advanceRoomState(events, lootRoomId, "looted"));
    pushGameFeedback("item", "ITEM ACQUIRED", item);
    setLog((lines) => [`${active.name} takes ${item} from the treasure chest.`, ...lines].slice(0, 6));
  };
  const speakSocialLine = (line: string, heroId?: string) => {
    if (!socialScene) return;
    showDialogueBubble(heroId || automaticSocialHero(socialScene.roomLabel)?.id || socialScene.heroId, line);
  };
  const completeSchoolQuiz = (heroId: string) => {
    const hero = units.find((unit) => unit.id === heroId);
    setSchoolQuizStep(null);
    setSchoolQuizMistakes(0);
    setSocialScene(null);
    showDialogueBubble(SCHOOL_TEACHER_ID, "Excellent. Barely excellent, but academia survives on technicalities.", () => {
      if (!heroHasItem(heroId, "Dweomercore Remedial Diploma"))
        grantDungeonLoot(heroId, ["Dweomercore Remedial Diploma"]);
      setFiredMapEvents((events) => [...new Set([...events, "school-diploma-earned"])]);
      setLog((lines) => [`${hero?.name || "A student"} receives a genuine Dweomercore Remedial Diploma. It may open doors later.`, ...lines].slice(0, 6));
      awardPeaceXp("24a"); completeEncounter("24a", "Dweomercore Remedial Classroom", "peace", "retain");
    });
  };
  const triggerSchoolNightmare = (spokenAnswer: string) => {
    if (!socialScene || socialScene.kind !== "schoolteacher" || schoolNightmareCompletionTimerRef.current) return;
    const hero = units.find((unit) => unit.id === socialScene.heroId);
    clearSequence(); encounterChoiceBusyRef.current = false;
    completeEncounterSequenceRef.current = null; setEncounterSequenceLabel(null);
    clearSchoolGlimpse();
    setSchoolQuizStep(null); setSchoolQuizMistakes(0);
    setSocialScene((scene) => scene?.kind === "schoolteacher" ? { ...scene, speaker: "Professor Vale", text: "No. No more guessing. Let us start the class properly." } : scene);
    setChapterIntro(true); setAiBusy(true);
    setInspect(null); setInspectPoi(null); setSchoolTransformationFlash(false);
    setAmbientMessage("PROFESSOR VALE STOPS SMILING");
    [true, false, true, false, true].forEach((showGrin, index) => scheduleCutscene(() => setSchoolTransformationFlash(showGrin), 1500 + index * 230));
    schoolNightmareCompletionTimerRef.current = setTimeout(() => {
      schoolNightmareCompletionTimerRef.current = null;
      setSchoolTransformationFlash(false);
      setSocialScene(null);
      setChapterIntro(false); setAiBusy(false);
      setFiredMapEvents((events) => [...new Set([...events, "school-nightmare", "schoolteacher-hostile", "room-encounter-spawned-24a"])]);
      setUnits((current) => current.map((unit) => {
        if (unit.id !== SCHOOL_TEACHER_ID) return unit;
        return { ...spawnActor("Nightmare Clown", unit.id, "enemy", "Professor Grin"), x: unit.x, y: unit.y, facing: unit.facing, npc: false, encounterGroup: unit.encounterGroup };
      }));
      setEnemyTypes(["Nightmare Clown"]);
      gameTransitions.startCombat();
      setAmbientMessage("INCORRECT · WELCOME TO REMEDIAL INSTRUCTION");
      scheduleCutscene(() => setAmbientMessage(null), 4200);
      setLog((lines) => [`${hero?.name || "A student"} answers “${spokenAnswer}.” Vale flickers between herself and Professor Grin before the classroom rots away. Combat begins.`, ...lines].slice(0, 6));
    }, 2780);
  };
  const answerSchoolQuiz = (answerIndex: number) => {
    if (!socialScene || socialScene.kind !== "schoolteacher" || schoolQuizStep === null) return;
    const question = SCHOOL_QUIZ_QUESTIONS[schoolQuizStep];
    const answer = question.answers[answerIndex];
    if (answerIndex !== question.correct) {
      if (schoolQuizMistakes >= 1) { triggerSchoolNightmare(answer); return; }
      setSchoolQuizMistakes(1);
      showProfessorGrinGlimpse("Incorrect. Entirely salvageable.", question.prompt);
      setLog((lines) => [`“${answer}.” Professor Vale's smile briefly belongs to someone else. She calmly repeats the question.`, ...lines].slice(0, 6));
      return;
    }
    if (schoolQuizStep === SCHOOL_QUIZ_QUESTIONS.length - 1) {
      completeSchoolQuiz(socialScene.heroId);
      return;
    }
    const nextStep = schoolQuizStep + 1;
    setSchoolQuizStep(nextStep);
    setSocialScene((scene) => scene ? { ...scene, text: SCHOOL_QUIZ_QUESTIONS[nextStep].prompt } : scene);
  };
  const scriptedEncounter = socialScene && socialScene.kind in SCRIPTED_DUNGEON_ENCOUNTERS
    ? SCRIPTED_DUNGEON_ENCOUNTERS[socialScene.kind as ScriptedEncounterKind]
    : null;
  const encounterRequirementMet = (choice: EncounterChoice) =>
    !socialScene || !!automaticSocialHero(socialScene.roomLabel, choice.requirements);
  const resolveScriptedEncounterChoice = (choice: EncounterChoice, preferredHeroId?: string) => {
    if (!socialScene || !scriptedEncounter || encounterChoiceBusyRef.current) return;
    encounterChoiceBusyRef.current = true;
    suppressBoardClicksUntilRef.current = runtimeNow() + 600;
    if (!encounterRequirementMet(choice)) {
      const missing = (choice.requirements || []).find((requirement) => {
        const probe = { ...choice, requirements: [requirement] };
        return !encounterRequirementMet(probe);
      });
      setLog((lines) => [`That choice requires ${missing ? requirementLabel(missing) : "something the party does not have"}.`, ...lines].slice(0, 6));
      encounterChoiceBusyRef.current = false;
      return;
    }
    const chosenHero = nearbySocialHeroes(socialScene.roomLabel).find((hero) => hero.id === preferredHeroId && socialHeroMeetsRequirements(hero, choice.requirements)) || automaticSocialHero(socialScene.roomLabel, choice.requirements);
    if (!chosenHero) {
      encounterChoiceBusyRef.current = false;
      return;
    }
    const scene = { ...socialScene, heroId: chosenHero.id };
    const groupSpeakers = () => units.filter((unit) => unit.encounterGroup === scene.roomLabel && !unit.downed).sort((a, b) => a.id.localeCompare(b.id));
    const groupSpeaker = () => groupSpeakers()[0];
    if ((choice.requirements || []).some((requirement) =>
      requirement.kind === "hero-item" && requirement.item === "Ball Cap of Bad Ideas"
    )) awardBallCapDialogue(scene.heroId);
    const conditionalEffects = choice.conditionalEffects?.find((branch) =>
      branch.when === "village-abandoned" &&
      (route === "abandoned_village_for_bridge" || !mapCompletions.village_defense)
    )?.effects;
    const sharedSequence = scriptedEncounter.sharedSequences?.find((sequence) => sequence.id === choice.sharedSequence);
    const encounterEffects = [
      ...(scriptedEncounter.itemCallbacks || []).filter((callback) => partyItemOwner(callback.item)).flatMap((callback) => callback.effects),
      ...(conditionalEffects || choice.effects),
      ...(sharedSequence?.effects || []),
    ];
    const peacefullyDismisses = encounterEffects.some((effect) => effect.kind === "dismiss-group");
    if (scene.kind === "troll" && peacefullyDismisses) awardAchievement(scene.heroId, {
      key: "fresh-meat-troll",
      title: "You Don't Want None of This",
      description: "Fed the hungry troll instead of fighting it.",
      tier: "Silver",
      boxName: "Ricky Bobby",
    });
    if (scene.kind === "undertakers-harria" &&
      choice.effects.some((effect) => effect.kind === "consume-hero-item" || effect.kind === "consume-party-item")) {
      awardAchievement(scene.heroId, {
        key: "undertaker-payment",
        title: "Professional Courtesy",
        description: "Paid the Undertakers and avoided an unnecessary fight.",
        tier: "Silver",
        boxName: "Coin Talks",
      });
    }
    const runEffect = (effectIndex: number) => {
      const effect = encounterEffects[effectIndex];
      if (!effect) {
        encounterChoiceBusyRef.current = false;
        setSocialScene(null);
        if (scene.kind === "fight-club" && choice.id === "enter-the-ring") {
          gameTransitions.startExploration();
        }
        return;
      }
      if (effect.kind === "bubble") {
        const npcIndex = effect.speaker === "npc-2" ? 1 : effect.speaker === "npc-3" ? 2 : 0;
        const speakerId = effect.speaker.startsWith("npc")
          ? groupSpeakers()[npcIndex]?.id || groupSpeaker()?.id
          : effect.speaker === "golem"
            ? units.find((unit) => unit.encounterGroup === scene.roomLabel && unit.role === "Flesh Golem" && !unit.downed)?.id
            : scene.heroId;
        if (speakerId) {
          showDialogueBubble(speakerId, effect.text, () => runEffect(effectIndex + 1));
          return;
        }
      } else if (effect.kind === "narration") {
        enqueueNarration(effect.title, effect.text, () => runEffect(effectIndex + 1));
        return;
      } else if (effect.kind === "log") {
        setLog((lines) => [effect.text, ...lines].slice(0, 6));
      } else if (effect.kind === "consume-hero-item") {
        removeDungeonItem(scene.heroId, effect.item);
      } else if (effect.kind === "consume-party-item") {
        const owner = partyItemOwner(effect.item);
        if (owner) removeDungeonItem(owner, effect.item);
      } else if (effect.kind === "grant-hero-item") {
        grantDungeonLoot(scene.heroId, [effect.item]);
      } else if (effect.kind === "grant-skill-proficiency") {
        grantHeroProficiency(scene.heroId, effect.proficiency);
      } else if (effect.kind === "choose-goblin-shirt") {
        encounterChoiceBusyRef.current = false;
        setGoblinShirtClaim(true);
        setSocialScene(scene);
        return;
      } else if (effect.kind === "secret-club-tour") {
        runSecretClubTour(scene.heroId, effect);
      } else if (effect.kind === "award-peace-xp") {
        awardPeaceXp(scene.roomLabel);
      } else if (effect.kind === "set-flag") { setFiredMapEvents((events) => [...new Set([...events, effect.flag])]);
      } else if (effect.kind === "clear-flag") { setFiredMapEvents((events) => events.filter((flag) => flag !== effect.flag));
      } else if (effect.kind === "reopen-encounter") { encounterChoiceBusyRef.current = false; setSocialScene({ ...scene, text: effect.text, speaker: effect.speaker === "golem" ? "Flesh Golem" : effect.speaker === "npc" ? scriptedEncounter.speaker : scene.speaker }); return;
      } else if (effect.kind === "trap-flour-ghost") {
        const point = dungeonRoomPoints.get("19c") || { x: 18, y: 46 };
        const ghost = spawnActor("Living Shroud", "flour-bound-ghost", "neutral", "Flour-Bound Ghost");
        ghost.x = point.x;
        ghost.y = point.y;
        ghost.npc = true;
        ghost.encounterGroup = "flour-ghost-trapped";
        setUnits((current) => current.some((unit) => unit.id === ghost.id) ? current : [...current, ghost]);
        setFiredMapEvents((events) => [...new Set([...events, "flour-ghost-trapped"]) ]);
        setAmbientMessage("THE FLOUR CIRCLE FLASHES · A GHOST IS TRAPPED INSIDE");
        scheduleCutscene(() => setAmbientMessage(null), 3400);
      } else if (effect.kind === "empower-flour-ghost") {
        const point = dungeonRoomPoints.get("19c") || { x: 18, y: 46 };
        const gromm = units.find((unit) => unit.encounterGroup === "19c" && !unit.downed);
        const ghost = spawnActor("Living Shroud", "empowered-flour-ghost", "enemy", "The Starved Ghost");
        ghost.cr = Math.max(4, (ghost.cr || 1) + 3);
        ghost.x = point.x; ghost.y = point.y;
        ghost.hp = Math.round(ghost.maxHp * 1.8);
        ghost.maxHp = ghost.hp;
        ghost.attack += 5; ghost.move = 8; ghost.range = 1;
        ghost.encounterGroup = "flour-ghost-hostile";
        const destination = gromm || point, passable = new Set(currentBlocked); passable.delete(key(destination.x, destination.y));
        const route = gromm ? scenePath(point, destination, passable, boardCols, boardRows) : [], arrival = 1100 + route.length * 320;
        setUnits((current) => [...current.filter((unit) => unit.id !== ghost.id), ghost]);
        setEnemyTypes((types) => [...new Set([...types, "Living Shroud"])]);
        setFiredMapEvents((events) => [...new Set([...events, "flour-ghost-empowered"]) ]);
        setAmbientMessage("THE DRAWN DOOR OPENS · THE STARVED GHOST RISES INSIDE THE FLOUR CIRCLE"); setAiBusy(true);
        runEncounterSequence("Finish the Ghost's Attack", [
          { at: 900, run: () => { setAmbientMessage("THE STARVED GHOST CROSSES THE ROOM TOWARD GROMM"); animateSceneWalk(ghost.id, route, 0, 320); } },
          { at: arrival, run: () => { setAmbientMessage("THE STARVED GHOST SEIZES GROMM"); setBossSpellBurst({ x: destination.x, y: destination.y, nonce: runtimeNow() }); setSpritePose((poses) => ({ ...poses, [ghost.id]: "cast" })); playSound("boss"); } },
          { at: arrival + 750, run: () => { setUnits((current) => current.filter((unit) => unit.encounterGroup !== "19c")); setAmbientMessage("THE STARVED GHOST SWALLOWS GROMM WHOLE"); } },
          { at: arrival + 1700, run: () => setAmbientMessage("NOTHING OF GROMM REMAINS · THE STARVED GHOST TURNS TO YOU") },
        ], arrival + 2800, () => {
          setUnits((current) => current.filter((unit) => unit.encounterGroup !== "19c").map((unit) => unit.id === ghost.id ? { ...unit, x: destination.x, y: destination.y } : unit));
          setAmbientMessage(null); setBossSpellBurst(null); setSpritePose((poses) => ({ ...poses, [ghost.id]: "idle" })); setAiBusy(false); gameTransitions.startCombat();
        });
        setLog((lines) => ["The bad ward opens like a mouth. The Starved Ghost takes Gromm whole—boots, beard, panic, and all—then becomes solid enough to fight.", ...lines].slice(0, 6));
      } else if (effect.kind === "walk-away") {
        const walker = units.find((unit) => unit.encounterGroup === scene.roomLabel && unit.role === "Flesh Golem" && !unit.downed);
        if (walker) {
          const route = scenePath(walker, effect.destination, currentBlocked, boardCols, boardRows);
          const duration = animateSceneWalk(walker.id, route, 0, effect.stepMs);
          scheduleCutscene(() => { setUnits((current) => current.filter((unit) => unit.id !== walker.id)); runEffect(effectIndex + 1); }, duration + 80);
          return;
        }
      } else if (effect.kind === "start-combat") {
        const bugbearsHitFirst = scene.kind === "pillar-bugbears" && choice.id === "ball-cap-first-hit";
        const fightClubBout = scene.kind === "fight-club";
        setFiredMapEvents((events) => advanceRoomState(
          [...new Set([...events, `room-encounter-spawned-${scene.roomLabel}`])],
          scene.roomLabel,
          "active",
        ));
        setUnits((current) => current.map((unit) =>
          unit.encounterGroup === scene.roomLabel
            ? fightClubBout && (unit.name !== "Tyler Durden" && unit.role !== "Tyler Durden")
              ? { ...unit, team: "neutral", npc: true }
              : { ...unit, team: "enemy", npc: false, ...(bugbearsHitFirst ? { initiativeRoll: 100 } : {}) }
            : unit,
        ));
        if (encounterMode === "exploration") {
          setRound(1);
          setTurn(0);
        }
        setEncounterMode("combat");
        setPhase("move");
        setChosen(null);
      } else if (effect.kind === "dismiss-group") {
        const finishDismissal = () => completeEncounter(scene.roomLabel, scene.title, "peace", effect.retain ? "retain" : "remove");
        if (effect.delay) {
          scheduleCutscene(finishDismissal, effect.delay);
          return;
        }
        finishDismissal();
      }
      runEffect(effectIndex + 1);
    };
    // Close the choice panel so the board-mounted dialogue bubble is visible and clickable.
    // The captured scene above keeps the encounter context alive until every line is advanced.
    setSocialScene(null);
    runEffect(0);
  };
  const rescueKelim = () => {
    if (!socialScene) return;
    const scene = socialScene, hero = units.find((unit) => unit.id === scene.heroId), threats = units.filter((unit) => unit.team === "enemy" && !unit.downed && (unit.encounterGroup === "36b" || unit.encounterGroup === "36c" || KELIM_ESCAPE_PATH.some((point) => unitOccupiesTile(unit, point))));
    const danger = threats.map((monster) => ({ monster, path: scenePath(KELIM_ESCAPE_PATH[0], monster, currentBlocked, boardCols, boardRows) })).filter(({ monster, path }) => path.length || unitOccupiesTile(monster, KELIM_ESCAPE_PATH[0])).sort((a, b) => a.path.length - b.path.length)[0], latentPredator = pendingKelimPredator(firedMapEvents);
    const travel = danger ? danger.path : latentPredator ? scenePath(KELIM_ESCAPE_PATH[0], latentPredator.point, currentBlocked, boardCols, boardRows) : KELIM_ESCAPE_PATH.slice(1), arrival = travel.length * 420;
    setResolvedPoi((ids) => [...new Set([...ids, "kelim-closet"])]);
    setSocialScene(null); setReleasedKelimPoint(KELIM_ESCAPE_PATH[0]); travel.forEach((point, index) => scheduleCutscene(() => setReleasedKelimPoint(point), (index + 1) * 420));
    if (danger || latentPredator) { const deathPoint = travel.at(-1) || KELIM_ESCAPE_PATH[0], attackerName = danger?.monster.name || latentPredator?.name || "a Grick in the darkness"; scheduleCutscene(() => { const board = battlefieldRef.current; if (board) { board.scrollLeft = Math.max(0, deathPoint.x * 52 * mapZoom - board.clientWidth / 2); board.scrollTop = Math.max(0, deathPoint.y * 52 * mapZoom - board.clientHeight / 2); updateDungeonViewport(board); } if (danger) { animateSprite(danger.monster.id, "attack", 1000); showCombatBark(danger.monster.id, "SKREEE!", 1400); } setReleasedKelimPoint(null); setAmbientMessage("KELIM: “AHHHHH!” · SOMETHING IN THE DARK EATS HIM"); setFiredMapEvents((events) => [...new Set([...events, "kelim-eaten", "kelim-death-cry", kelimCorpseFlag(deathPoint)])]); setDroppedDungeonItems((items) => items.some((item) => item.id === "kelim-corpse-spellbook") ? items : [...items, { id: "kelim-corpse-spellbook", name: "Kelim's Spellbook", ...deathPoint }]); setLog((lines) => [`Kelim leaves the closet, walks into ${attackerName}, screams, and is eaten. His body and spellbook remain in the passage.`, ...lines].slice(0, 6)); }, arrival); scheduleCutscene(() => { setAmbientMessage(null); setFiredMapEvents((events) => events.filter((event) => event !== "kelim-death-cry")); }, arrival + 2800); return; }
    awardAchievement(scene.heroId, { key: "rescue-kelim", title: "Nobody Gets Left in the Closet", description: "Found Kelim alive and brought him out of hiding.", tier: "Bronze", boxName: "Rescue Mission" }); grantDungeonLoot(scene.heroId, ["Kelim's Spellbook"]); setFiredMapEvents((events) => [...new Set([...events, "kelim-rescued"])]);
    scheduleCutscene(() => { setLog((lines) => [`Kelim safely walks out, thanks ${hero?.name || "his rescuer"}, and hands over his spellbook.`, ...lines].slice(0, 6)); setSocialScene({ ...scene, text: "Thank you! I thought those things were going to tear through the door." }); }, arrival + 180);
  };
  const claimGoblinShirt = (heroId: string) => {
    if (!socialScene || firedMapEvents.includes("goblin-shirt-taken")) return;
    const recipient = units.find((unit) => unit.id === heroId);
    grantDungeonLoot(heroId, ["Wife-Beater of Questionable Resilience"]);
    setFiredMapEvents((events) => [...new Set([...events, "goblin-shirt-taken"])]);
    setGoblinShirtClaim(false);
    setSocialScene((scene) => scene ? {
      ...scene,
      text: "Cold now. Still hungry.",
    } : scene);
    setLog((lines) => [
      `${recipient?.name || "A hero"} receives the Wife-Beater of Questionable Resilience and gains +1 AC.`,
      ...lines,
    ].slice(0, 6));
  };
  const askNimraith = (questionId: string, answer: string, heroId?: string) => {
    const flag = `nimraith-question-${questionId}`;
    if (firedMapEvents.includes(flag) || firedMapEvents.includes("nimraith-five-questions")) return;
    const priorQuestions = firedMapEvents.filter((event) => event.startsWith("nimraith-question-")).length;
    const finalQuestion = priorQuestions + 1 >= 5;
    setFiredMapEvents((events) => [...new Set([...events, flag, ...(finalQuestion ? ["nimraith-five-questions"] : [])])]);
    if (finalQuestion) {
      setResolvedPoi((ids) => [...new Set([...ids, "dead-mage"])]);
      setSocialScene(null);
      setLog((lines) => [`Nimraith: “${answer}” The fifth answer leaves his mouth; the strings snap upward and carry him away.`, ...lines].slice(0, 6));
      return;
    }
    setSocialScene((scene) => scene ? {
      ...scene,
      speaker: "Nimraith",
      text: answer,
      heroId: heroId || scene.heroId,
    } : scene);
  };
  const mockTrapVictim = (unitId: string, line: string) => {
    showCombatBark(unitId, line, 1500);
  };
  const triggerDungeonTrap = (trap: PointOfInterest, hero: Unit) => {
    const ceramicAlarm = trap.id.startsWith("ceramic-alarm");
    // Guard on the durable event as well as resolved state so a stale movement
    // closure cannot trigger the same cable twice.
    if (ceramicAlarm && (
      firedMapEvents.includes("ceramic-alarm-sounded") ||
      resolvedPoi.includes("ceramic-alarm")
    )) return;
    playSound("trap");
    if (trap.id !== "spiked-pit-28d")
      pushGameFeedback("trap", "TRAP TRIGGERED", `${trap.name} · ${hero.name}`);
    awardAchievement(hero.id, {
      key: "face-first-trap",
      title: "Try the Next One Face-First",
      description: `Triggered ${trap.name} personally. Halaster is delighted.`,
      tier: "Beginner",
      boxName: "Situational Awareness",
    });
    if (trap.id === "watch-hall-spear-trap") {
      setUnits((current) => current.map((unit) => unit.id === hero.id
        ? { ...unit, ...combatDamageOutcome(unit, damageAfterProtection(unit, 18, "piercing")), stunned: unit.hp > 18 && !unit.conditionImmunities?.includes("stunned") }
        : unit));
      setResolvedPoi((ids) => [...new Set([...ids, trap.id])]);
      setDiscoveredPoi((ids) => [...new Set([...ids, trap.id])]);
      showCombatBark(hero.id, "Wall spears!", 1500);
      const feedback = damageFloat(18);
      pushCombatFloat(hero.id, feedback.text, feedback.tone);
      const stunned = statusFloat("STUNNED");
      pushCombatFloat(hero.id, stunned.text, stunned.tone);
      setLog((lines) => [`${hero.name} depresses the plate at W64. Wall spears deal 18 damage and end the hero's turn.`, ...lines].slice(0, 6));
      return;
    }
    if (trap.id === "bridge-snare") {
      setUnits((current) => current.map((unit) => unit.id === hero.id ? { ...unit, stunned: !unit.conditionImmunities?.includes("stunned") } : unit));
      setResolvedPoi((ids) => [...new Set([...ids, trap.id])]);
      setDiscoveredPoi((ids) => [...new Set([...ids, trap.id])]);
      showCombatBark(hero.id, "I'm caught!", 1600);
      const feedback = statusFloat("SNARED");
      pushCombatFloat(hero.id, feedback.text, feedback.tone);
      setLog((lines) => [`${hero.name} steps into the wire snare and loses the rest of the turn.`, ...lines].slice(0, 6));
      return;
    }
    if (trap.id === SPIKE_PIT_PRESENTATION.id) {
      setUnits((current) => current.map((unit) => unit.id === hero.id ? { ...unit, hp: Math.max(1, unit.hp - SPIKE_PIT_PRESENTATION.damage) } : unit));
      setDiscoveredPoi((ids) => [...new Set([...ids, trap.id])]);
      setFiredMapEvents((events) => [...new Set([...events, SPIKE_PIT_PRESENTATION.triggeredFlag])]);
      setAmbientMessage(SPIKE_PIT_PRESENTATION.laugh);
      scheduleCutscene(() => setAmbientMessage(null), 1400);
      const feedback = damageFloat(SPIKE_PIT_PRESENTATION.damage, true);
      pushCombatFloat(hero.id, feedback.text, feedback.tone);
      setLog((lines) => [SPIKE_PIT_PRESENTATION.log(hero.name), ...lines].slice(0, 6));
      return;
    }
    setUnits((current) => current.map((unit) => unit.id === hero.id ? { ...unit, hp: Math.max(1, unit.hp - 12) } : unit));
    const feedback = damageFloat(12);
    pushCombatFloat(hero.id, feedback.text, feedback.tone);
    setResolvedPoi((ids) => [...new Set([...ids, trap.id])]);
    setDiscoveredPoi((ids) => [...new Set([...ids, trap.id])]);
    const acid = trap.id === "heart-acid";
    if (ceramicAlarm) {
      setResolvedPoi((ids) => [...new Set([...ids, "ceramic-alarm"])]);
      setDiscoveredPoi((ids) => [...new Set([...ids, "ceramic-alarm"])]);
      setFiredMapEvents((events) => [...new Set([
        ...events,
        "ceramic-alarm-sounded",
        "undertaker-secret-door-open",
        "undertaker-alerted",
      ])]);
      scheduleCutscene(() => revealClubHostsAtSecretDoor(true), 350);
    }
    // The club tour supplies its own station dialogue. Do not queue Halaster's
    // generic trap speech here: it was resurfacing between every station.
    if (ceramicAlarm) showCombatBark(hero.id, "That was an alarm.", 2200);
    else mockTrapVictim(hero.id, acid ? "My eyebrows are gone." : "That floor bites.");
    setLog((lines) => [
      ceramicAlarm
        ? `${hero.name} trips over the club's power cable beside the equipment, stops immediately, and takes 12 damage. The music cuts out and the hosts are alerted.`
        : `${hero.name} triggers ${trap.name} and takes 12 damage.`,
      ...lines,
    ].slice(0, 6));
  };
  const triggerPantryTeleport = (hero: Unit) => {
    const trap = DUNGEON_LANDMARKS.pantryTeleportTrap;
    if (!firedMapEvents.includes(trap.activatesAfter) || firedMapEvents.includes("room-34-teleport-triggered") || hero.x !== trap.point.x || hero.y !== trap.point.y) return false;
    setTeleportingUnitId(hero.id);
    setUnits((current) => current.map((unit) => unit.id === hero.id ? { ...unit, ...trap.destination } : unit));
    const destinationReveal = Array.from({ length: 49 }, (_, index) => ({ x: trap.destination.x - 3 + (index % 7), y: trap.destination.y - 3 + Math.floor(index / 7) }))
      .filter((point) => point.x >= 0 && point.y >= 0 && point.x < DUNGEON_COLS && point.y < DUNGEON_ROWS && playerView.hasLineOfSight(trap.destination, point, true));
    setRevealedTiles((tiles) => [...new Set([...tiles, ...destinationReveal.map((point) => key(point.x, point.y))])]);
    scheduleCutscene(() => {
      setTeleportingUnitId(null);
      const board = battlefieldRef.current;
      if (!board) return;
      board.scrollLeft = Math.max(0, trap.destination.x * 52 * mapZoom - board.clientWidth / 2);
      board.scrollTop = Math.max(0, trap.destination.y * 52 * mapZoom - board.clientHeight / 2);
      updateDungeonViewport(board);
    }, trap.resetMs);
    setFiredMapEvents((events) => [...new Set([...events.filter((event) => event !== "halleth-bars-open"), "room-34-teleport-triggered", "halleth-bars-reset"])]);
    playSound("trap"); setAmbientMessage("THE DOORWAY FOLDS · FIRST GUEST RETURNED TO THE PIT");
    scheduleCutscene(() => setAmbientMessage(null), trap.resetMs + 900);
    setLog((lines) => [`${hero.name} reaches the trapped room 34 doorway at HH67 and vanishes into Halleth's opened pit at U87. The threshold goes inert; the next hero can enter normally.`, ...lines].slice(0, 6));
    return true;
  };
  const activatePoi = (poi: PointOfInterest, x: number, y: number) => {
    const definition = getPoiDefinition(poi.id);
    if (definition.action === "move-onto") {
      if (poi.kind === "clue" && active?.team === "hero" && unitOccupiesTile(active, x, y)) {
        setInspectPoi(poi.id);
        return;
      }
      if (phase === "move" && reachable(x, y)) tileClick(x, y);
      else pushGameFeedback("room", "MOVE REQUIRED", "Select a conscious hero who can reach this square.");
      return;
    }
    if (definition.action === "trigger-mimic") {
      const interactingHero = active?.team === "hero" && !active.npc && !active.downed ? active : null;
      if (!interactingHero) {
        pushGameFeedback("room", "HERO REQUIRED", "Select a conscious hero before touching the golden spear.");
        return;
      }
      awardAchievement(interactingHero.id, {
        key: "golden-spear-mimic",
        title: "Definitely a Statue",
        description: "Personally discovered the golden spear was attached to a mimic.",
        tier: "Silver",
        boxName: "Trust Issues",
      });
      setResolvedPoi((ids) => [...new Set([...ids, poi.id])]);
      setFiredMapEvents((events) => [...new Set([...events, "mimic-triggered"])]);
      // Queue Room 40 directly. Waiting for a second positional scan allowed
      // the POI, spawn, and initiative state to separate across renders.
      setPendingDungeonRoomId("40");
      setLog((lines) => ["The golden spear bends like wax. The statue tears free—a large mimic!", ...lines].slice(0, 6));
      showCombatBark(interactingHero.id, "That's not a statue!", 1700);
      return;
    }
    setInspectPoi(poi.id);
  };
  const openCertainDeathPoster = (poi: PointOfInterest) => {
    if (!active || active.team !== "hero" || active.npc || active.downed || attackDist(active, poi) > 1) {
      setLog((lines) => ["The character attempting this must stand beside the poster at O62.", ...lines].slice(0, 6));
      return;
    }
    playSound("door");
    enqueueNarration(
      "The Certain Death Crawl",
      "Blood along the walls spells out CERTAIN DEATH. Oh well, I'm sure that's for some other weaker adventurers.",
    );
    awardAchievement(active.id, {
      key: "poster-punch-secret-door",
      title: "A Hole Lot of Bad Ideas",
      description: "Fisted a glamour poster at O62 and discovered the Certain Death sewage crawl.",
      tier: "Gold",
      boxName: "Poster Child",
    });
    setFiredMapEvents((events) => [...new Set([...events, westernSecretDoorEvent, "poster-punched"])]);
    setResolvedPoi((ids) => [...new Set([...ids, poi.id])]);
    setRevealedTiles((tiles) => [...new Set([
      ...tiles,
      ...pukeTunnelTiles.map((tile) => key(tile.x, tile.y)),
      key(pukeTunnelReward.x, pukeTunnelReward.y),
      ...sewerSceneAreaTileKeys,
    ])]);
    setLog((lines) => [`${active.name} fists straight through the poster at O62. The paper tears away from a rancid sewage crawl leading toward O69.`, ...lines].slice(0, 6));
    setInspectPoi(null);
  };
  const startManticoreShow = () => {
    if (!socialScene || socialScene.kind !== "manticore-show" || encounterChoiceBusyRef.current) return;
    encounterChoiceBusyRef.current = true;
    suppressBoardClicksUntilRef.current = runtimeNow() + 600;
    const litStage: string[] = [];
    for (let y = 20; y <= 29; y++) {
      for (let x = 18; x <= 24; x++) {
        if (dungeonOpen.has(key(x, y))) litStage.push(key(x, y));
      }
    }
    setRevealedTiles((tiles) => [...new Set([...tiles, ...litStage])]);
    setManticoreShow({ round: 1, score: 0 });
    const quiz = SCRIPTED_DUNGEON_ENCOUNTERS["manticore-show"].quiz!;
    setSocialScene((scene) => scene ? {
      ...scene,
      text: `${quiz.intro} ${quiz.questions[0].prompt}`,
    } : scene);
    setAmbientMessage("SHOWTIME: ALL THREE MANTICORES TAKE THE STAGE");
    scheduleCutscene(() => setAmbientMessage(null), 2800);
    scheduleCutscene(() => { encounterChoiceBusyRef.current = false; }, 300);
  };
  const answerManticoreQuestion = (answerIndex: number) => {
    if (!socialScene || socialScene.kind !== "manticore-show" || manticoreShow.round < 1 || encounterChoiceBusyRef.current) return;
    encounterChoiceBusyRef.current = true;
    suppressBoardClicksUntilRef.current = runtimeNow() + 600;
    const question = MANTICORE_SHOW_QUESTIONS[manticoreShow.round - 1];
    const quiz = SCRIPTED_DUNGEON_ENCOUNTERS["manticore-show"].quiz!;
    const correct = answerIndex === question.correct;
    const score = manticoreShow.score + (correct ? 1 : 0);
    if (manticoreShow.round < MANTICORE_SHOW_QUESTIONS.length) {
      const nextQuestion = MANTICORE_SHOW_QUESTIONS[manticoreShow.round];
      setManticoreShow({ round: manticoreShow.round + 1, score });
      setSocialScene((scene) => scene ? {
        ...scene,
        text: `${correct ? quiz.correctResponse : quiz.incorrectResponse} ${nextQuestion.prompt}`,
      } : scene);
      scheduleCutscene(() => { encounterChoiceBusyRef.current = false; }, 300);
      return;
    }
    const heroesFirst = score >= 2;
    setUnits((current) => current.map((unit) => {
      if (unit.encounterGroup === "16") return { ...unit, team: "enemy" as const, npc: false, initiativeRoll: (unit.initiativeRoll || 0) + (heroesFirst ? 0 : 50) };
      if (unit.team === "hero" && !unit.npc) return { ...unit, initiativeRoll: (unit.initiativeRoll || 0) + (heroesFirst ? 50 : 0) };
      return unit;
    }));
    setFiredMapEvents((events) => [...new Set([...events, "manticore-den-intro-complete"])]);
    setLog((lines) => [
      `${heroesFirst ? quiz.winningOutcome : quiz.losingOutcome} Final score: ${score} to ${MANTICORE_SHOW_QUESTIONS.length - score}.`,
      ...lines,
    ].slice(0, 6));
    setAmbientMessage(heroesFirst ? "THE PARTY WINS. HEROES ACT FIRST." : "THE MANTICORES WIN. HOME TEAM ACTS FIRST.");
    scheduleCutscene(() => setAmbientMessage(null), 3600);
    setSocialScene(null);
    setManticoreShow({ round: 0, score: 0 });
    setEncounterMode("combat");
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    scheduleCutscene(() => { encounterChoiceBusyRef.current = false; }, 300);
  };
  const replayEyeHologram = () => {
    playSound("spell");
    playVoiceLine("princess-hologram", soundEnabled);
    setEyeHologramSpeaking(true);
    setLog((lines) => ["The blue princess flickers: “Help us, adventurers. You’re our only hope.”", ...lines].slice(0, 6));
    scheduleCutscene(() => setEyeHologramSpeaking(false), 4400);
  };
  const disableHeartAcid = () => {
    if (!active) return;
    const keyOwner = partyItemOwner("Stone-box Key");
    if (!keyOwner) return;
    playSound("spell");
    awardAchievement(active.id, {
      key: "disable-heart-acid",
      title: "Acid Reflux",
      description: firedMapEvents.includes("heart-acid-dropped")
        ? "Used the club key to open the trapped stone box after the acid drained."
        : "Used the club key to open the trapped stone box safely.",
      tier: "Gold",
      boxName: "Keyed Solution",
    });
    removeDungeonItem(keyOwner, "Stone-box Key");
    setResolvedPoi((ids) => [...new Set([...ids, "heart-acid"])]);
    const mechanism = pointsOfInterest.find((point) => point.id === "heart-acid") || active;
    setDroppedDungeonItems((items) => items.some((item) => item.id === "heart-speed-potion")
      ? items
      : [...items, { id: "heart-speed-potion", name: "Potion of Speed", x: mechanism.x, y: mechanism.y }]);
    showCombatBark(active.id, "The box is open.", 1800);
    setAmbientMessage("KEY ACCEPTED · STONE BOX OPEN · POTION OF SPEED RELEASED");
    scheduleCutscene(() => setAmbientMessage(null), 2800);
    setLog((lines) => [`${active.name} inserts the club's key. The stone box opens and a glowing Potion of Speed floats free.`, ...lines].slice(0, 6));
    setInspectPoi(null);
  };
  const forceHeartAcid = () => {
    if (!active || active.team !== "hero" || active.npc || active.downed) return;
    const mechanism = pointsOfInterest.find((point) => point.id === "heart-acid");
    if (!mechanism || attackDist(active, mechanism) > 1) {
      setLog((lines) => ["A conscious hero must stand beside the stone box to force it.", ...lines].slice(0, 6));
      return;
    }
    playSound("trap");
    setUnits((current) => current.map((unit) => unit.id === active.id
      ? { ...unit, hp: Math.max(1, unit.hp - 12) }
      : unit));
    setFiredMapEvents((events) => [...new Set([...events, "heart-acid-dropped"])]);
    awardAchievement(active.id, {
      key: "face-first-heart-acid",
      title: "Try the Next One Face-First",
      description: "Forced the trapped heart box before finding its key.",
      tier: "Beginner",
      boxName: "Situational Awareness",
    });
    showCombatBark(active.id, "ACID!", 1500);
    setLog((lines) => [`${active.name} forces the box. The acid drops on that hero alone for 12 damage, then drains away; the box remains locked.`, ...lines].slice(0, 6));
  };
  const animateSprite = (
    unitId: string,
    pose: Exclude<SpritePose, "idle" | "ko">,
    duration = 520,
  ) => {
    if (pose === "attack") playSound("attack");
    if (pose === "damage") playSound("impact");
    if (pose === "cast") playSound("spell");
    if (spriteTimers.current[unitId])
      clearTimeout(spriteTimers.current[unitId]);
    setSpritePose((poses) => ({ ...poses, [unitId]: pose }));
    spriteTimers.current[unitId] = setTimeout(
      () => setSpritePose((poses) => ({ ...poses, [unitId]: "idle" })),
      spritePoseDuration(pose, duration),
    );
  };
  const baseRoster = useMemo(
    () =>
      Object.entries(heroNames).flatMap(([role, names]) =>
        names.map((name, i) => ({ id: `${role}-${i}`, name, role })),
      ),
    [],
  );
  const roster = useMemo(
    () => (custom ? [...baseRoster, custom] : baseRoster),
    [custom, baseRoster],
  );
  const heroFromRoster = (id: string, heroLevel = level) => {
    const r = roster.find((x) => x.id === id)!;
    const unit = makeUnit(
      id,
      r.name,
      r.role,
      "hero",
      kitAtLevel(r.role, heroLevel),
    );
    if (custom && id === custom.id)
      unit.skills = [...custom.skills.map((x) => ({ ...x })), ...(custom.playtestKillingCurse ? [{ ...playtestKillingCurse }] : [])];
    unit.level = heroLevel;
    unit.investigation = skillCheckBonus(unit, "Investigation");
    unit.xp = 0;
    const learnedByName = new Map(unit.skills.map((skill) => [skill.name, { ...skill }]));
    (bonusSkills[id] || []).forEach((skill) => learnedByName.set(skill.name, { ...skill }));
    unit.skills = [...learnedByName.values()];
    const dungeonBonus = dungeonStatBonuses[id];
    if (dungeonBonus) {
      unit.attack += dungeonBonus.attack || 0;
      unit.armorClass = armorClassOf(unit) + (dungeonBonus.defense || 0);
      unit.investigation = (unit.investigation || 0) + (dungeonBonus.investigation || 0);
      unit.move += dungeonBonus.move || 0;
      unit.skillProficiencies = [...new Set([...(unit.skillProficiencies || []), ...(dungeonBonus.proficiencies || []), ...(dungeonBonus.evasion ? ["Acrobatics" as const] : [])])];
    }
    return unit;
  };
  const spriteSheetForUnit = (unit: Unit) => {
    const disguise = heroDisguises[unit.id] as (typeof DISGUISE_FORMS)[number] | undefined;
    if (disguise) return DISGUISE_SPRITE_SHEETS[disguise];
    return spriteSheetForEquipment(unit, equippedItems[unit.id], MONSTER_SPRITE_SHEETS);
  };
  const usesHeroSprite = (unit: Unit) => !!spriteSheetForUnit(unit);
  const snapToCharacter = () => {
    const hero = active?.team === "hero" && !active.npc && !active.downed ? active : units.find((unit) => unit.id === leaderId && unit.team === "hero" && !unit.npc && !unit.downed) || units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
    const board = battlefieldRef.current;
    if (!hero || !board) return;
    const focus = characterFocus(hero, boardCols, boardRows, mapZoom, board.clientWidth, board.clientHeight, boardTilePixels);
    setDungeonViewport(focus.viewport); board.scrollTo({ ...focus.scroll, behavior: "smooth" });
    scheduleCutscene(() => updateDungeonViewport(board), 360);
  };
  const creatureSpriteClass = (unit: Unit) =>
    unit.role === "Dire Wolf" ? "dire-wolf-sprite" : unit.role === "Werewolf" ? "werewolf-sprite" : "";
  const initiativeTotal = (unit: Unit) => initiativeModifierOf(unit) + (unit.initiativeRoll ?? 0);
  const order = useMemo(
    () =>
      units
        .filter(
          (u) =>
            !u.npc &&
            (encounterMode === "combat" || u.team === "hero"),
        )
        .flatMap((u) =>
          u.role === "Ettin" && u.encounterGroup === "39a" && !u.downed
            ? [
                { ...u, name: "The Two-Headed King — Spell Head", initiative: u.initiative + 8, bossHead: "spellcaster" as const },
                { ...u, name: "The Two-Headed King — Bruiser Head", initiative: u.initiative, bossHead: "bruiser" as const },
              ]
            : [u],
        )
        .sort((a, b) => {
          const totalDifference = initiativeTotal(b) - initiativeTotal(a);
          // Initiative stat breaks the rare tie; remaining ties preserve deployment order.
          return totalDifference || b.initiative - a.initiative;
        }),
    [units, encounterMode],
  );
  const initiativeOrder = order.filter((u) => u.team === "hero" || !u.downed);
  const active = order[turn] || order[0], storyVisionDisabled = villageMapActive || dungeonMode || poisonCutscene, playerView = useBattlefieldPlayerView({
    enabled:stage === "battle" && !storyVisionDisabled, scopeOverride:dust2FreeplayActive ? "selected" : undefined, memoryNamespace:dust2FreeplayActive ? active?.id : undefined,
    battlefield,
    blocked:currentBlocked,
    blockedCrossings:currentSightCrossings,
    units,
    active,
    zones:abilityZones,
  });
  useCounterDungeoneerContact({ enabled:levelTwoMode, stage, encounterMode, units, isVisible:playerView.isUnitVisible, onContact:() => { gameTransitions.startCombat(); setLog((lines) => ["Counter Dungeoneers have visual contact. Roll for the objective.", ...lines].slice(0, 6)); } });
  const dust2InitiativeCount = Math.max(1, order.filter((unit) => !unit.downed).length);
  const dust2SiteUnderActive = active && dust2MapActive ? dust2FlagSiteAt(active.x, active.y) : undefined;
  const dust2RoundsRemaining = dust2CountdownRounds(dust2Objective, dust2InitiativeCount);
  const dust2ActiveFaction = dust2FactionForUnit(active);
  const dust2PlantedSitePoint = dust2Objective.plantedSite ? DUST2_FLAG_SITES[dust2Objective.plantedSite] : null;
  const dust2ActiveCanDefuse = !!(dust2FreeplayMatch && active && active.team === "hero" && !active.npc && !active.downed && !unitCannotAct(active) && dust2ActiveFaction &&
    dust2TeamSide(dust2FreeplayMatch, dust2ActiveFaction) === "defend" && dust2PlantedSitePoint && attackDist(active, dust2PlantedSitePoint) <= 1 && !dust2Objective.defused && !dust2Objective.secured);
  useEffect(() => { const defuserId = dust2Objective.defusingActorId; if (!defuserId) return; const defuser = units.find((unit) => unit.id === defuserId); if (!defuser || defuser.downed || unitCannotAct(defuser) || !dust2PlantedSitePoint || attackDist(defuser, dust2PlantedSitePoint) > 1 || active?.id === defuser.id && (!!chosen || phase === "facing")) setDust2Objective((state) => cancelDust2Defuse(state, defuserId)); }, [units, dust2Objective.defusingActorId, dust2PlantedSitePoint, active?.id, chosen, phase]);
  useEffect(() => {
    if (!dust2MapActive || dust2FreeplayActive || !dust2Objective.secured || firedMapEvents.includes("dust2-flag-secured")) return;
    if (levelTwoMode) { setFiredMapEvents(levelTwoFalseVictoryEvents); setUnits((current) => levelTwoFalseVictoryUnits(current, DUST2_SECRET_EXIT)); setEncounterMode("combat"); setAmbientMessage(`SITE ${dust2Objective.plantedSite} SECURED · OBJECTIVE WON · JOHN WICK ENTERS`); setLog((lines) => ["The Flag activates and the Dungeoneers appear to win. The red-rock door opens just far enough for John Wick to step through—then seals behind him.", ...lines].slice(0, 6)); scheduleCutscene(() => setAmbientMessage(null), 3600); return; }
    setFiredMapEvents((events) => [...new Set([...events, "dust2-flag-secured", "dust2-secret-exit-open"])]); setAmbientMessage(`SITE ${dust2Objective.plantedSite} SECURED · RED-ROCK EXIT OPEN`);
    scheduleCutscene(() => setAmbientMessage(null), 3000);
    setLog((lines) => [`The One True Flag holds at Site ${dust2Objective.plantedSite}. A secret door opens in the red-rock wall at ${DUST2_SECRET_EXIT.coordinate}.`, ...lines].slice(0, 6));
  }, [dust2MapActive, dust2FreeplayActive, dust2Objective.plantedSite, dust2Objective.secured, firedMapEvents]);
  useEffect(() => { if (!levelTwoMode || !firedMapEvents.includes("dust2-john-wick-arrived") || firedMapEvents.includes("dust2-john-wick-defeated") || !levelTwoJohnWickIsDown(units)) return;
    setFiredMapEvents((events) => levelTwoJohnWickDefeatEvents(events, true)); setAmbientMessage("JOHN WICK DEFEATED · RED-ROCK EXIT OPEN"); scheduleCutscene(() => setAmbientMessage(null), 3200); setLog((lines) => ["John Wick falls. The red-rock door unlocks and Level 2's exit is finally open.", ...lines].slice(0, 6)); }, [levelTwoMode, firedMapEvents, units]);
  const dust2RoundWinner = dust2FreeplayMatch ? dust2FreeplayWinnerForUnits(dust2FreeplayMatch, dust2Objective, units) : null;
  useEffect(() => { const carrier = units.find((unit) => unit.id === dust2Objective.flagCarrierId); if (carrier?.downed) setDust2Objective((state) => dropDust2Flag(state, carrier.id, carrier)); }, [units, dust2Objective.flagCarrierId]);
  useEffect(() => {
    if (!dust2FreeplayMatch || !dust2RoundWinner || stage !== "battle") return;
    const nextMatch = completeDust2FreeplayRound(dust2FreeplayMatch, dust2RoundWinner);
    setDust2FreeplayMatch(nextMatch);
    if (nextMatch.winner) {
      setAmbientMessage(`${nextMatch.winner === "dungeoneers" ? "DUNGEONEERS" : "COUNTER-DUNGEONEERS"} WIN · ${nextMatch.scores.dungeoneers}-${nextMatch.scores["counter-dungeoneers"]}`);
      setExitReached(true);
      return;
    }
    setUnits((current) => resetDust2FreeplayUnits(current, nextMatch));
    setDust2Objective(createDust2ObjectiveState()); setRound(nextMatch.round); setTurn(0); setPhase("move"); setMovementSpent(0); setChosen(null); setExitReached(false);
    setAmbientMessage(`ROUND ${nextMatch.round} · SIDES SWITCHED`); scheduleCutscene(() => setAmbientMessage(null), 2200);
    setLog((lines) => [`${dust2RoundWinner === "dungeoneers" ? "Dungeoneers" : "Counter-Dungeoneers"} win round ${dust2FreeplayMatch.round}. Score ${nextMatch.scores.dungeoneers}-${nextMatch.scores["counter-dungeoneers"]}. Sides switch.`, ...lines].slice(0, 6));
  }, [dust2FreeplayMatch, dust2RoundWinner, stage]);
  const activeWeapon = active ? weaponAttackProfile(active, equippedItems[active.id]?.weapon, !equippedItems[active.id]?.offhand) : null;
  const walkerDefaultOffhand = active?.name === "Walker" && active.role === "Fighter" && !equippedItems[active.id]?.offhand && activeWeapon?.hands === 1;
  const activeOffhand = active && equippedItems[active.id]?.offhand
    ? weaponAttackProfile(active, equippedItems[active.id]?.offhand)
    : walkerDefaultOffhand ? weaponAttackProfile(active) : null;
  const canTwinStrike = !!activeWeapon && !!activeOffhand && activeWeapon.hands === 1 && activeOffhand.hands === 1 && activeWeapon.tags.includes("melee") && activeOffhand.tags.includes("melee");
  const effectiveSkillRange = (unit: Unit, skill: Skill) => skill.range * (unit.skills.some((known) => known.name === "Distant Spell") && isMagicalAbility(skill) ? 2 : 1);
  const spellMultiplier = (unit: Unit, skill: Skill) => unit.skills.some((known) => known.name === "Twinned Spell") && isMagicalAbility(skill) ? 2 : 1;
  const inspected = units.find((u) => u.id === inspect);
  const enemyCr = enemyTypes.reduce((n, t) => n + getActorDefinition(t).cr, 0);
  const encounterBalance = auditEncounterBalance(enemyTypes, Array.from({ length: Math.max(1, heroIds.length) }, () => level));
  const enemyCleared =
    units.some((u) => u.team === "enemy") &&
    !units.some((u) => u.team === "enemy" && !u.downed);
  const bridgeCleared =
    campaignScene === 6 && firedMapEvents.includes("bridge-bandits-cleared");
  const encounterCleared =
    (enemyCleared || bridgeCleared) &&
    (campaignScene !== 4 ||
      (villageWave === 2 && firedMapEvents.includes("village-wave2-arrived")));
  const victory = stage === "battle" && exitReached, levelOneComplete = campaign && campaignScene === 7 && firedMapEvents.includes("level-one-complete");
  const companyHeroes = units.filter((unit) => unit.team === "hero" && !unit.npc);
  const unopenedAchievementBoxes = achievements.filter((award) => !award.openedAt);
  const tutorialRecapVisible =
    campaign && victory && campaignScene === 6 &&
    !firedMapEvents.includes("tutorial-recap-reviewed");
  const exitTile = campaign
    ? campaignScene === 7
      ? { x: 17, y: 1, label: "Ascend to the Yawning Portal" }
    : campaignScene === 6
      ? { ...BRIDGE_LANDMARKS.exit.point, label: BRIDGE_LANDMARKS.exit.visual.states.default }
      : mapVariant === "village"
        ? { x: 6, y: 1, label: "North Road" }
        : campaignScene === 3 || campaignScene === 8
          ? { x: 5, y: 1, label: "Moonlit Forest Path" }
          : { x: 5, y: 0, label: "Trail" }
    : { x: 5, y: 0, label: "Leave Battlefield" };
  const leaderDowned =
    campaign && !!leaderId && !!units.find((u) => u.id === leaderId)?.downed;
  const defeat =
    stage === "battle" &&
    !dust2FreeplayActive &&
    units.some((u) => u.team === "hero" && !u.npc) &&
    (!units.some((u) => u.team === "hero" && !u.npc && !u.downed) ||
      leaderAbandoned);
  const playVictorySoundFromEffect = useEffectEvent(() => {
    playSound(campaignScene === 7 ? "victory" : "achievement");
  });
  const awardAchievementFromEffect = useEffectEvent((
    heroId: string,
    award: Omit<AchievementAward, "id" | "heroId" | "awardedAt"> & { key: string },
  ) => awardAchievement(heroId, award));
  const awardLevelOneCompletionFromEffect = useEffectEvent(() => {
    const survivingHeroes = units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
    const recipient = survivingHeroes.find((unit) => unit.id === leaderId) || survivingHeroes[0];
    if (!recipient) return;
    awardAchievement(recipient.id, {
      key: "level-one-complete",
      title: "Floor One Belongs to Us",
      description: "Defeated the Two-Headed King and claimed the throne of Level 1.",
      tier: "Legendary",
      boxName: "Undermountain Delver",
    });
    if (survivingHeroes.length === units.filter((unit) => unit.team === "hero" && !unit.npc).length) {
      awardAchievement(recipient.id, {
        key: "whole-company-survived",
        title: "Everybody Made It",
        description: "Finished Level 1 with the entire company still standing.",
        tier: "Gold",
        boxName: "No One Left Behind",
      });
    }
  });
  const enqueueHalasterFromEffect = useEffectEvent((text: string) => enqueueHalaster(text));
  const awardGuardianPassFromEffect = useEffectEvent((pass: number) => {
    const witness = units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
    if (!witness || pass !== 1) return;
    awardAchievement(witness.id, {
      key: "wandering-guardian",
      title: "The Hall Monitor",
      description: "Watched the shield guardian complete its extremely important patrol.",
      tier: "Bronze",
      boxName: "Hall Monitor",
    });
  });
  useDeferredEffect(() => {
    LEGACY_CAMPAIGN_SAVE_KEYS.forEach((key) => localStorage.removeItem(key));
    setHasSave(!!localStorage.getItem(CAMPAIGN_SAVE_KEY));
    setSoundEnabled(localStorage.getItem("shattered-crown-sound") !== "off");
    setSaveHydrated(true);
  }, []);
  useEffect(() => {
    if (!saveHydrated) return;
    localStorage.setItem("shattered-crown-sound", soundEnabled ? "on" : "off");
  }, [soundEnabled, saveHydrated]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle" || socialScene?.kind !== "manticore-show") return;
    const timer = setTimeout(() => {
      const board = battlefieldRef.current;
      if (!board) return;
      board.scrollLeft = Math.max(0, (manticoreStageFocus.x + 0.5) * 52 * mapZoom - board.clientWidth / 2);
      updateDungeonViewport(board);
    }, 80);
    return () => clearTimeout(timer);
  }, [dungeonMode, stage, socialScene?.kind, mapZoom]);
  useEffect(() => {
    if (!victory) return;
    playVictorySoundFromEffect();
  }, [victory]);
  useEffect(() => {
    if (isGuestReplicaActive()) return; const heroes = units.filter((unit) => unit.team === "hero" && !unit.npc);
    heroes.forEach((hero) => {
      const newlyDowned = hero.downed && !previousDownedState.current[hero.id];
      previousDownedState.current[hero.id] = !!hero.downed;
      if (!newlyDowned || !campaign || campaignScene > 6) return;
      const count = (downCountsRef.current[hero.id] || 0) + 1;
      downCountsRef.current[hero.id] = count;
      setDownCounts({ ...downCountsRef.current });
      if (count === 3) awardAchievementFromEffect(hero.id, {
        key: "tutorial-three-downs",
        title: "You're Gonna Need It",
        description: "Got downed three times during the tutorial map.",
        tier: "Beginner",
        boxName: "Health",
      });
    });
  }, [units, campaignScene, campaign]);
  useEffect(() => {
    if (isGuestReplicaActive()) return; units.filter((unit) => unit.team === "hero" && !unit.npc).forEach((hero) => {
      const previousHp = previousHeroHp.current[hero.id];
      if (previousHp !== undefined && hero.hp < previousHp)
        recordHeroCombat(hero.id, { damageTaken: previousHp - hero.hp });
      previousHeroHp.current[hero.id] = hero.hp;
    });
  }, [units]);
  useEffect(() => {
    if (isGuestReplicaActive()) return; units.filter((unit) => unit.team === "enemy").forEach((enemy) => {
      const newlyDowned = enemy.downed && !previousEnemyDownedState.current[enemy.id];
      previousEnemyDownedState.current[enemy.id] = !!enemy.downed;
      if (!newlyDowned || !enemy.lastDamagerId) return;
      awardAchievementFromEffect(enemy.lastDamagerId, {
        key: "first-blood",
        title: "First Blood",
        description: `Landed the finishing blow on ${enemy.name}.`,
        tier: "Bronze",
        boxName: "Finisher",
      });
      if (enemy.role === "Ettin" && enemy.encounterGroup === "39a") {
        awardAchievementFromEffect(enemy.lastDamagerId, {
          key: "king-slayer",
          title: "Two Heads, One Problem",
          description: "Landed the finishing blow on the Two-Headed King.",
          tier: "Legendary",
          boxName: "Kingbreaker",
        });
      }
    });
  }, [units]);
  useEffect(() => {
    if (isGuestReplicaActive() || ((!victory && !levelOneComplete) || campaignScene !== 7)) return;
    awardLevelOneCompletionFromEffect();
  }, [victory, levelOneComplete, campaignScene]);
  useDeferredEffect(() => {
    if (
      !(dungeonMode || dust2MapActive) ||
      stage !== "battle" ||
      encounterMode !== "exploration" ||
      socialScene ||
      bubble?.persistent ||
      noticeQueue.length ||
      chapterIntro ||
      encounterSequenceLabel ||
      units.some((unit) => unit.encounterGroup === "2b" && unit.team === "neutral" && !unit.downed)
    ) return;
    const hero = units.find((u) => u.team === "hero" && !u.npc && !u.downed);
    if (hero) setDungeonViewport({
      left: Math.max(0, hero.x - 10),
      right: Math.min(boardCols - 1, hero.x + 10),
      top: Math.max(0, hero.y - 9),
      bottom: Math.min(boardRows - 1, hero.y + 9),
    });
    const timer = setTimeout(() => {
      const board = battlefieldRef.current;
      if (board && hero) {
        board.scrollLeft = Math.max(0, hero.x * boardTilePixels * mapZoom - board.clientWidth / 2);
        board.scrollTop = Math.max(0, hero.y * boardTilePixels * mapZoom - board.clientHeight / 3);
        updateDungeonViewport(board);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [dungeonMode, dust2MapActive, stage, boardCols, boardRows, mapZoom]);
  useEffect(() => {
    if (!saveHydrated || !campaign || !leaderId || chapterIntro || dungeonPlaytest) return;
    const snapshot = {
      schemaVersion: CAMPAIGN_SAVE_SCHEMA_VERSION,
      stage,
      campaign,
      heroIds,
      leaderId,
      enemyTypes,
      units,
      round,
      turn,
      phase,
      movementSpent,
      dashActive,
      custom,
      level,
      route,
      storyChoice,
      campaignScene,
      mapVariant,
      ritualActive,
      ritualSelected,
      barriers,
      villageWave,
      villageWaveBreakUntil,
      villageAftermath,
      villageCelebrating,
      potions,
      dungeonItems,
      equippedItems,
      heroCombatStats,
      equippedDialogueItems,
      guardSpeakerId,
      guardHatDecision,
      heroDisguises,
      wayfarerSpeakerId,
      socialScene,
      manticoreShow,
      goblinShirtClaim,
      wayfarerReady,
      guardianTriggerAt: guardianTriggerRoom.current,
      droppedDungeonItems,
      dungeonStatBonuses,
      burningZone,
      abilityZones,
      chargedSpells,
      bonusSkills,
      abilityQueue,
      deferredAbilityQueue,
      levelBeforeGain,
      levelReturn,
      mapCompletions,
      encounterMode,
      exitReached,
      leaderAbandoned,
      forestWarningRound,
      boonAbilityFlow,
      discoveredPoi,
      resolvedPoi,
      firedMapEvents,
      revealedTiles,
      achievements,
      claimedAchievementIds,
      downCounts,
      wanderingGuardian,
      roomEntryPresentation,
      dust2Objective,
      log,
    };
    localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new Event("shattered-crown-save"));
    queueMicrotask(() => setHasSave(true));
  }, [
    saveHydrated,
    stage,
    campaign,
    heroIds,
    leaderId,
    enemyTypes,
    units,
    round,
    turn,
    phase,
    movementSpent,
    dashActive,
    custom,
    level,
    route,
    storyChoice,
    campaignScene,
    mapVariant,
    ritualActive,
    ritualSelected,
    barriers,
    villageWave,
    villageWaveBreakUntil,
    villageAftermath,
    villageCelebrating,
    potions,
    dungeonItems,
    equippedItems,
    heroCombatStats,
    equippedDialogueItems,
    guardSpeakerId,
    guardHatDecision,
    heroDisguises,
    wayfarerSpeakerId,
    socialScene,
    manticoreShow,
    goblinShirtClaim,
    wayfarerReady,
    droppedDungeonItems,
    dungeonStatBonuses,
    burningZone,
    abilityZones,
    chargedSpells,
    bonusSkills,
    abilityQueue,
    deferredAbilityQueue,
    levelBeforeGain,
    levelReturn,
    mapCompletions,
    encounterMode,
    exitReached,
    leaderAbandoned,
    forestWarningRound,
    boonAbilityFlow,
    discoveredPoi,
    resolvedPoi,
    firedMapEvents,
    revealedTiles,
    achievements,
    claimedAchievementIds,
    downCounts,
    wanderingGuardian,
    roomEntryPresentation,
    dust2Objective,
    chapterIntro,
    dungeonPlaytest,
    log,
  ]);
  const continueCampaign = (multiplayerSnapshot?: unknown) => {
    try {
      clearTransientTimers();
      const s = multiplayerSnapshot === undefined ? JSON.parse(localStorage.getItem(CAMPAIGN_SAVE_KEY) || "null") : JSON.parse(JSON.stringify(multiplayerSnapshot));
      if (!isCurrentCampaignSave(s)) {
        if (multiplayerSnapshot === undefined) { localStorage.removeItem(CAMPAIGN_SAVE_KEY); setHasSave(false); }
        return;
      }
      const publishedScene = s.route
        ? PUBLISHED_ROUTE_SCENES[s.route]
        : undefined;
      const savedFlags: string[] = s.firedMapEvents || [];
      const repairedState = repairCampaignState<Unit>({
        flags: savedFlags,
        discoveredPoi: s.discoveredPoi || [],
        resolvedPoi: s.resolvedPoi || [],
        units: (s.units || []) as Unit[],
        socialKind: s.socialScene?.kind,
        encounterMode: s.encounterMode,
      });
      const restoredFlags = repairedState.flags.filter((flag) =>
        !/^room-(?:23a|23b|25b)$/.test(flag) &&
        !/^room-state:(?:23a|23b|25b):/.test(flag),
      );
      const restoredUnits = repairedState.units.map((unit) => unit.team === "hero" ? migrateHeroToDnd(unit, s.dungeonStatBonuses?.[unit.id] || {}) : normalizeMonsterRuntime(unit.role === "Ettin" && unit.encounterGroup === "39a" ? { ...unit, name: "The Two-Headed King", initiative: 8, bossHead: undefined } : unit));
      const resolvedGroups = resolvedEncounterGroups(restoredFlags);
      setCampaign(true);
      setHeroIds(s.heroIds || []);
      setLeaderId(s.leaderId || null);
      setEnemyTypes(s.enemyTypes || []);
      setUnits(restoredUnits);
      setRound(s.round || 1);
      setTurn(s.turn || 0);
      setPhase(s.phase || "move");
      setMovementSpent(normalizeMovementCost(s.movementSpent || 0)); setDashActive(!!s.dashActive);
      setCustom(s.custom ? { ...s.custom, skills: s.custom.id === "custom-hero" && s.custom.name === "Tester" ? ensureTesterRevive(s.custom.skills) : s.custom.skills } : null);
      setLevel(s.level || 1);
      setRoute(s.route || null);
      setStoryChoice(s.storyChoice || null);
      setCampaignScene(publishedScene ?? s.campaignScene ?? 1);
      setMapVariant(s.mapVariant || "forest");
      setRitualActive(!!s.ritualActive);
      setRitualSelected(!!s.ritualSelected);
      const restoredBarriers: Barrier[] = s.barriers || [];
      const normalizedBarriers = !floodRoomHazard
        ? restoredBarriers
        : restoredFlags.includes("room-33-flood-drained")
          ? restoredBarriers.filter((barrier) => barrier.id !== floodRoomHazard.barrier.id)
          : restoredFlags.includes("room-33-flood-active") && !restoredBarriers.some((barrier) => barrier.id === floodRoomHazard.barrier.id)
            ? [...restoredBarriers, { ...floodRoomHazard.barrier }]
            : restoredBarriers;
      setBarriers(normalizedBarriers);
      setVillageWave(s.villageWave || 1);
      setVillageWaveBreakUntil(s.villageWaveBreakUntil ?? null);
      setVillageAftermath(!!s.villageAftermath);
      setVillageCelebrating(false);
      setPotions(s.potions || {});
      const restoredDungeonItems = Object.fromEntries(Object.entries(s.dungeonItems || {}).map(([heroId, items]) => [heroId,
        [...new Set((items as string[]).map((item) => item === "Glowing Longsword" ? "Blue Lightsaber" : item)
          .filter((item) => !PURPOSELESS_DUNGEON_LOOT.has(item)))],]));
      const kelimSpellLearned = Object.values(s.bonusSkills || {}).some((skills) => (skills as Skill[]).some(isKelimSpellbookSkill)), kelimAwardOwner = (s.achievements || []).find((award: AchievementAward) => award.id.startsWith("rescue-kelim:"))?.heroId || (s.claimedAchievementIds || []).find((id: string) => id.startsWith("rescue-kelim:"))?.slice("rescue-kelim:".length);
      const restoredKelimOwner = s.spellbookOwner || kelimAwardOwner || (s.socialScene?.kind === "kelim" ? s.socialScene.heroId : null) || s.leaderId || restoredUnits.find((unit) => unit.team === "hero" && !unit.npc)?.id, recoverKelimBook = !!restoredKelimOwner && !kelimSpellLearned && repairedState.resolvedPoi.includes("kelim-closet") && !restoredFlags.includes("kelim-eaten");
      if (recoverKelimBook) restoredDungeonItems[restoredKelimOwner] = [...new Set([...(restoredDungeonItems[restoredKelimOwner] || []), "Kelim's Spellbook"])];
      setDungeonItems(restoredDungeonItems);
      const restoredEquipment: Record<string, EquippedItemSlots> = Object.fromEntries(Object.entries(s.equippedItems || {}).map(([heroId, slots]) => [
        heroId,
        Object.fromEntries(Object.entries(slots as EquippedItemSlots).map(([slot, item]) => [
          slot,
          item === "Glowing Longsword" ? "Blue Lightsaber" : item,
        ])),
      ]));
      setEquippedItems(restoredEquipment);
      setHeroCombatStats(s.heroCombatStats || {});
      setEquippedDialogueItems(s.equippedDialogueItems || {});
      setGuardSpeakerId(s.guardSpeakerId || null);
      const restoredGuardDecision = s.guardHatDecision ||
        (s.guardSpeakerId && (s.dungeonItems?.[s.guardSpeakerId] || []).includes("Ball Cap of Bad Ideas") ? "take" : null);
      setGuardHatDecision(restoredGuardDecision);
      setHeroDisguises(s.heroDisguises || Object.fromEntries((s.disguisedHeroIds || []).map((id: string) => [id, "Goblin"])));
      setWayfarerSpeakerId(s.wayfarerSpeakerId || null);
      setSocialScene((publishedScene ?? s.campaignScene) === 2 && s.guardSpeakerId ? {
        kind: "forest-guard",
        roomLabel: "forest-guard",
        title: "The Missing Guard",
        speaker: restoredGuardDecision === null ? "Wounded Guard" : "Fallen Guard",
        text: restoredGuardDecision === null
          ? FOREST_GUARD_CAP_OFFER
          : restoredGuardDecision === "take"
            ? "The cap changes hands. The guard gives one faint nod, then falls still."
            : "The cap remains with him. The guard falls still.",
        heroId: s.guardSpeakerId,
      } : s.socialScene?.roomLabel && resolvedGroups.has(s.socialScene.roomLabel) ? null : s.socialScene || null);
      setPendingDungeonRoomId(null);
      setManticoreShow(s.manticoreShow || { round: 0, score: 0 });
      setGoblinShirtClaim(!!s.goblinShirtClaim);
      setWayfarerReady(!!s.wayfarerReady);
      setWanderingGuardian(s.wanderingGuardian || null);
      setRoomEntryPresentation(s.roomEntryPresentation || null);
      setDust2Objective(s.dust2Objective || createDust2ObjectiveState());
      guardianTriggerRoom.current = s.guardianTriggerAt || guardianTriggerRoom.current;
      const restoredDrops = (s.droppedDungeonItems || []).flatMap((item: DroppedDungeonItem) => {
        if (OBSOLETE_DUNGEON_DROP_IDS.has(item.id)) return [];
        if (PURPOSELESS_DUNGEON_LOOT.has(item.name)) return [];
        if (!item.contents) return [item];
        const contents = item.contents.filter((name) => !PURPOSELESS_DUNGEON_LOOT.has(name));
        return contents.length ? [{ ...item, contents }] : [];
      });
      const restoredOwnsBlueLightsaber = Object.values(restoredDungeonItems)
        .some((items) => (items as string[]).includes("Blue Lightsaber"));
      const restoredClaimedBlueLightsaber = restoredFlags.includes("room-state:28b:looted");
      const restoredDropsWithFlour = (publishedScene ?? s.campaignScene) === 7 && !restoredFlags.includes("pantry-flour-collected") && !Object.values(restoredDungeonItems).some((items) => (items as string[]).includes("Bag of Flour")) && !restoredDrops.some((item: DroppedDungeonItem) => item.name === "Bag of Flour") ? [...restoredDrops, { id: "pantry-bag-of-flour", name: "Bag of Flour", ...DUNGEON_LANDMARKS.pantryTeleportTrap.feastPoint }] : restoredDrops;
      setDroppedDungeonItems(
        (publishedScene ?? s.campaignScene) === 7 &&
        !restoredOwnsBlueLightsaber &&
        !restoredClaimedBlueLightsaber &&
        !restoredDropsWithFlour.some((item: DroppedDungeonItem) => item.id === "room-loot-28b-0")
          ? [...restoredDropsWithFlour, { id: "room-loot-28b-0", name: "Blue Lightsaber", ...blueLightsaberPoint }]
          : restoredDropsWithFlour,
      );
      setDungeonStatBonuses(s.dungeonStatBonuses || {});
      setBurningZone(s.burningZone || null);
      setAbilityZones(s.abilityZones || []);
      setChargedSpells(s.chargedSpells || []);
      setBonusSkills(Object.fromEntries(Object.entries(s.bonusSkills || {}).map(([id, skills]) => [id, normalizeAbilityAliases(skills as Skill[])])));
      setAbilityQueue(s.abilityQueue || []);
      setDeferredAbilityQueue(s.deferredAbilityQueue || []);
      setLevelBeforeGain(s.levelBeforeGain || 1);
      setLevelReturn(s.levelReturn || "story");
      setMapCompletions(s.mapCompletions || {});
      setEncounterMode(
        s.encounterMode || (s.exitReached ? "exploration" : "combat"),
      );
      setExitReached((publishedScene ?? s.campaignScene) === 2 ? false : !!s.exitReached);
      setLeaderAbandoned(!!s.leaderAbandoned);
      setForestWarningRound(s.forestWarningRound ?? null);
      setBoonAbilityFlow(!!s.boonAbilityFlow);
      setDiscoveredPoi(repairedState.discoveredPoi);
      setResolvedPoi(repairedState.resolvedPoi);
      setFiredMapEvents(restoredFlags);
      setRevealedTiles(s.revealedTiles || []);
      const restoredAchievements: AchievementAward[] = s.achievements || [];
      const restoredClaimedIds = [...new Set([
        ...(s.claimedAchievementIds || []),
        ...restoredAchievements.filter((award) => award.openedAt).map((award) => award.id),
      ])] as string[];
      setAchievements(restoredAchievements.filter((award) => !award.openedAt));
      setClaimedAchievementIds(restoredClaimedIds);
      achievementIds.current = new Set([
        ...restoredClaimedIds,
        ...restoredAchievements.map((award) => award.id),
      ]);
      const restoredDownCounts = s.downCounts || {};
      setDownCounts(restoredDownCounts);
      downCountsRef.current = restoredDownCounts;
      // Saves contain durable battle state, never transient animation/AI locks.
      setAiBusy(false);
      setChapterIntro(false);
      setPoisonCutscene(false);
      invalidateSequence();
      completeEncounterSequenceRef.current = null;
      setEncounterSequenceLabel(null);
      setBossShockwave(null);
      setBossSpellBurst(null);
      // Version 29 briefly used a shared potion pool. Migrate any remaining
      // shared potions onto living heroes so old saves remain usable.
      const migratedPotions = { ...(s.potions || {}) };
      let sharedPotions = s.partyItems?.["Healing Potion"] || 0;
      for (const hero of (s.units || []).filter(
        (u: Unit) => u.team === "hero" && !u.npc && !u.downed,
      )) {
        if (sharedPotions <= 0) break;
        migratedPotions[hero.id] = (migratedPotions[hero.id] || 0) + 1;
        sharedPotions -= 1;
      }
      setPotions(migratedPotions);
      setLog(s.log || []);
      if (repairedState.issues.length)
        setLog((lines) => [`Save audit repaired ${repairedState.issues.length} contradictory state entr${repairedState.issues.length === 1 ? "y" : "ies"}.`, ...lines].slice(0, 6));
      setStage(publishedScene !== undefined || s.stage === "waiting" ? "story" : s.stage || "story");
    } catch {
      if (multiplayerSnapshot === undefined) { localStorage.removeItem(CAMPAIGN_SAVE_KEY); setHasSave(false); }
    }
  };
  const multiplayerHeroes = companyHeroes.map(({ id, name, role }) => ({ id, name, role }));
  const multiplayer = useMultiplayerSession({ saveKey: CAMPAIGN_SAVE_KEY, heroes: multiplayerHeroes, activeHeroId: active?.team === "hero" && !active.npc ? active.id : null, onGuestSnapshot: (snapshot) => continueCampaign(snapshot) });
  const mirroredDialogueClaimRef = useRef(""); const onlineDialogueHero = () => units.find((hero) => hero.id === (multiplayer.role === "guest" ? multiplayer.assignedHeroId : leaderId) && hero.team === "hero" && !hero.npc && !hero.downed && !!socialScene && nearbySocialHeroes(socialScene.roomLabel).some((nearby) => nearby.id === hero.id));
  const chooseSharedEncounterResponse = async (choice: EncounterChoice) => { if (!socialScene) return;
    const preferredId = multiplayer.role === "guest" ? multiplayer.assignedHeroId : leaderId;
    if (multiplayer.role !== "solo" && !onlineDialogueHero()) { setLog((lines) => ["Your character must be present to answer for the party.", ...lines].slice(0, 6)); return; }
    const speaker = nearbySocialHeroes(socialScene.roomLabel).find((hero) => hero.id === preferredId && socialHeroMeetsRequirements(hero, choice.requirements)) || automaticSocialHero(socialScene.roomLabel, choice.requirements);
    if (!speaker) return;
    const result = await multiplayer.claimDialogueChoice({ sceneKey: `${socialScene.kind}:${socialScene.roomLabel}:${socialScene.text}`, choiceId: choice.id, choiceLabel: choice.label, claimantHeroId: preferredId || speaker.id, speakerHeroId: speaker.id });
    if (result.accepted) { mirroredDialogueClaimRef.current = `${result.dialogueClaim?.baseRevision}:${choice.id}`; resolveScriptedEncounterChoice(choice, result.dialogueClaim?.speakerHeroId || speaker.id); } else if (result.dialogueClaim) setLog((lines) => [`${units.find((unit) => unit.id === result.dialogueClaim?.speakerHeroId)?.name || "Another player"} answered first: “${result.dialogueClaim.choiceLabel}”`, ...lines].slice(0, 6));
  };
  useEffect(() => {
    const claim = multiplayer.dialogueClaim, claimKey = claim ? `${claim.baseRevision}:${claim.choiceId}` : "";
    if (!claim || !socialScene || !scriptedEncounter || mirroredDialogueClaimRef.current === claimKey || claim.sceneKey !== `${socialScene.kind}:${socialScene.roomLabel}:${socialScene.text}`) return;
    const choice = scriptedEncounter.choices.find((candidate) => candidate.id === claim.choiceId); if (!choice) return; mirroredDialogueClaimRef.current = claimKey; resolveScriptedEncounterChoice(choice, claim.speakerHeroId);
  }, [multiplayer.dialogueClaim, socialScene, scriptedEncounter]);
  const hostWaitingForPlayerTwo = multiplayer.role === "host" && multiplayer.guestConnected && active?.team === "hero" && active.id === multiplayer.assignedHeroId;
  const pendingMultiplayerAttack = useRef<{ seq: number; x: number; y: number } | null>(null);
  const toggleHero = (id: string) =>
    setHeroIds((h) => {
      if (h.includes(id)) {
        if (leaderId === id) setLeaderId(null);
        return h.filter((x) => x !== id);
      }
      return h.length < 4 ? [...h, id] : h;
    });
  const addEnemy = (type: string) => {
    setHiddenRandom(false);
    setEnemyTypes((e) => (e.length < 6 ? [...e, type] : e));
  };
  const randomize = () => {
    const names = Object.keys(ACTOR_REGISTRY);
    setEnemyTypes(
      Array.from(
        { length: randomCount },
        () => names[Math.floor(randomUnit() * names.length)],
      ),
    );
    setHiddenRandom(true);
  };
  const buildUnits = (manualMode: boolean) => {
    setEncounterMode(enemyTypes.length ? "combat" : "exploration");
    setExitReached(false);
    setLeaderAbandoned(false);
    setForestWarningRound(null);
    if (trainingMap === "gallery") {
      const monsterVfxRoles = ["Black Dragon", "Gelatinous Cube", "Grell", "Manticore", "Air Elemental", "Large Mimic", "Dire Wolf", "Spectral Delver", "Troll", "Grick Alpha"];
      const monsterVfxSkills = monsterVfxRoles.flatMap((role, index) => spawnActor(role, `gallery-monster-${index}`, "enemy").skills.filter((skill) => ["Acid Breath", "Engulf", "Tentacles", "Tail Spike", "Whirlwind Slam", "Adhesive Pseudopod", "Pounce", "Spectral Delver Strike", "Claw", "Rending Tentacles"].includes(skill.name)).map((skill) => ({ ...skill, name: skill.name === "Tail Spike" ? "Tailstorm" : skill.name === "Claw" ? "Regeneration" : skill.name, charges: 99, maxCharges: 99, unlimited: true, galleryGroup: "Monsters", galleryActorRole: role })));
      const nextMonsterVfxRoles = ["Werewolf", "Flesh Golem", "Grick", "Manticore", "Flyndol", "Living Shroud", "Nightmare Clown", "Pillar Bugbear"];
      const nextMonsterVfxSkills = nextMonsterVfxRoles.flatMap((role, index) => spawnActor(role, `gallery-next-monster-${index}`, "enemy").skills.filter((skill) => ["Predator's Leap", "Rending Claws", "Slam", "Beak and Tentacles", "Tail Spike", "Silvered Blade", "Living Shroud Strike", "Nightmare Clown Strike", "Pillar Bugbear Strike"].includes(skill.name)).map((skill) => ({ ...skill, charges: 99, maxCharges: 99, unlimited: true, galleryGroup: "Monsters", galleryActorRole: role })));
      const lightningAbsorptionVfx = { ...nextMonsterVfxSkills.find((skill) => skill.name === "Slam")!, id: "gallery-lightning-absorption", name: "Lightning Absorption", power: 0, galleryGroup: "Monsters", galleryActorRole: "Flesh Golem" };
      const monsterGallerySkills = [...monsterVfxSkills, ...nextMonsterVfxSkills, lightningAbsorptionVfx].sort((a, b) => a.name.localeCompare(b.name));
      const tester = makeUnit("vfx-gallery-tester", "VFX Tester", "Wizard", "hero", { ...kits.Wizard, hp: 999, move: 99, skills: [...galleryAbilityLibrary.map(({ role, skill }) => ({ ...skill, charges: 99, maxCharges: 99, unlimited: true, chargeRounds: undefined, galleryGroup: role, automatic: skill.name === "Hellish Rebuke" ? false : skill.automatic })), ...monsterGallerySkills] });
      tester.x = 2; tester.y = 4; tester.level = 10; tester.hp = tester.maxHp = 999;
      const dummy = makeUnit("vfx-gallery-sandbag", "Sandbag", "Training Dummy", "enemy", { hp: 99999, move: 0, attack: 0, defense: 0, accuracy: 0, evasion: 0, range: 1, initiative: -100, skills: [], armorClass: 10 });
      dummy.x = 7; dummy.y = 4; dummy.hp = dummy.maxHp = 99999; dummy.xpReward = 0; dummy.npc = true;
      const performer = spawnActor("Black Dragon", "vfx-gallery-monster-performer", "neutral", "Monster Performer"); performer.x = -10; performer.y = -10; performer.npc = true;
      setUnits([tester, dummy, performer]); setRound(1); setTurn(0); setPhase("action"); setChosen(null); setLog(["VFX Gallery ready. Choose any ability, then select the sandbag or a target square."]); setStage("battle"); return;
    }
    const heroes = heroIds.map((id) => {
      return heroFromRoster(id);
    });
    const counts: Record<string, number> = {};
    const foes = enemyTypes.map((t) => {
      counts[t] = (counts[t] || 0) + 1;
      return spawnActor(t, `enemy-${t}-${counts[t]}`, "enemy", `${t} ${counts[t]}`);
    });
    const all = [...heroes, ...foes];
    if (!manualMode) {
      const heroMelee = heroes.sort((a, b) => a.range - b.range);
      const enemyMelee = foes.sort((a, b) => a.range - b.range);
      if (trainingMap === "woodland") {
        openingForestPartyStarts.forEach(({ x, y }, i) => {
          if (heroMelee[i]) {
            heroMelee[i].x = x;
            heroMelee[i].y = y;
          }
        });
        const center = openingForestEnemyStarts[0] || { x: 16, y: 0 };
        const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]];
        enemyMelee.forEach((unit, i) => {
          unit.x = Math.max(0, Math.min(FOREST_COLS - 1, center.x + offsets[i][0]));
          unit.y = Math.max(0, Math.min(FOREST_ROWS - 1, center.y + offsets[i][1]));
        });
      } else if (trainingMap === "dust2") {
        dust2PartyStarts.forEach(([x, y], i) => {
          if (heroMelee[i]) { heroMelee[i].x = x; heroMelee[i].y = y; }
        });
        dust2EnemyStarts.forEach(([x, y], i) => {
          if (enemyMelee[i]) { enemyMelee[i].x = x; enemyMelee[i].y = y; }
        });
      } else if (trainingMap === "bridge") {
        [
          [3, 7],
          [4, 7],
          [5, 7],
          [6, 7],
        ].forEach(([x, y], i) => {
          if (heroMelee[i]) {
            heroMelee[i].x = x;
            heroMelee[i].y = y;
          }
        });
        [
          [4, 0],
          [5, 0],
          [3, 0],
          [6, 0],
          [2, 0],
          [7, 0],
        ].forEach(([x, y], i) => {
          if (enemyMelee[i]) {
            enemyMelee[i].x = x;
            enemyMelee[i].y = y;
          }
        });
      } else {
        heroMelee.forEach((u, i) => {
          u.x = 2 + (i % 3);
          u.y = 6 + Math.floor(i / 3);
        });
        enemyMelee.forEach((u, i) => {
          u.x = 7 - (i % 3);
          u.y = 1 + Math.floor(i / 3);
        });
      }
      setUnits([...heroMelee, ...enemyMelee]);
      setStage("battle");
      setLog([enemyTypes.length ? "Battle begins on the training grounds." : "Map test ready. Explore the battlefield without opposition."]);
    } else {
      setUnits(all);
      setPlacing(0);
      setStage("deploy");
    }
  };
  const startDust2MapLab = () => { const entry = roster.find((hero) => hero.name === "Koko" && hero.role === "Ranger"); if (!entry) return; const hero = heroFromRoster(entry.id), [x, y] = dust2PartyStarts[0]; Object.assign(hero, { x, y, facing: "n" as Facing }, dust2PositionState({ x, y })); setCampaign(false); setDust2FreeplayTeam(null); setDust2FreeplayMatch(null); setTrainingMap("dust2"); setHeroIds([entry.id]); setLeaderId(entry.id); setEnemyTypes([]); setUnits([hero]); setTeleportHeroId(entry.id); setTeleportMode(false); setDust2Objective(createDust2ObjectiveState()); setEncounterMode("exploration"); setExitReached(false); setRound(1); setTurn(0); setPhase("move"); setMovementSpent(0); setDashActive(false); setChosen(null); setMapZoom(1); setShowGridCoordinates(true); setDust2ShowWalls(false); setDust2ShowElevation(true); setDust2ShowGridLines(false); setDust2FreeClimb(false); setLog(["Dust 2 Map Lab ready. It now uses the Level 1 playtest controls with Player View, exact-foot elevation, vector walls, routes, falls, and objective markers."]); setStage("battle"); };
  const startDust2Freeplay = (team: Dust2TeamId, characterIds: string[]) => {
    clearTransientTimers();
    const { selectedUnits, opposingUnits } = buildDust2FreeplayDeployment({ team, characterIds, rosterIds:roster.map((entry) => entry.id), makeHero:(id) => heroFromRoster(id, DUST2_HERO_LEVEL) });
    setLevel(DUST2_HERO_LEVEL);
    setCampaign(false); setCampaignScene(1); setRoute(null); setTrainingMap("dust2");
    setDust2FreeplayTeam(team); setDust2FreeplayMatch(createDust2FreeplayMatch("dungeoneers"));
    setHeroIds(selectedUnits.map((unit) => unit.id)); setLeaderId(selectedUnits[0]?.id || null);
    const equippedPlayers = selectedUnits.map(grantDust2ItemLoadout); setUnits([...equippedPlayers, ...opposingUnits]); setEnemyTypes(opposingUnits.map((unit) => unit.name));
    setDungeonItems(Object.fromEntries(equippedPlayers.map((unit) => [unit.id, [...DUST2_ITEM_LOADOUT]]))); setEquippedItems(Object.fromEntries(equippedPlayers.map((unit) => [unit.id, { weapon:"Dragon Glass AWP", quick1:"Emerald Frag Grenade", quick2:"Runic Smoke Grenade" }])));
    setDust2Objective(createDust2ObjectiveState()); setEncounterMode("combat"); setExitReached(false);
    setRound(1); setTurn(0); setPhase("move"); setMovementSpent(0); setDashActive(false); setChosen(null); setInspect(null);
    setTeleportMode(false); setMapZoom(1); setShowGridCoordinates(false); setDust2ShowWalls(false); setDust2ShowElevation(false); setDust2ShowGridLines(false);
    setLog([`${team === "dungeoneers" ? "Dungeoneers attack" : "Counter-Dungeoneers defend"} in round 1.`, "First to three round wins. Sides switch after every round. There is no round timer."]);
    setStage("battle");
  };
  const place = (x: number, y: number) => {
    const deployingUnit = units[placing];
    const footprint = deployingUnit ? unitFootprintAt(deployingUnit, x, y) : [{ x, y }];
    if (
      footprint.some((tile) =>
        tile.x < 0 || tile.x >= boardCols || tile.y < 0 || tile.y >= boardRows ||
        currentBlocked.has(key(tile.x, tile.y)) ||
        units.some((u, i) => i < placing && unitOccupiesTile(u, tile.x, tile.y))
      )
    )
      return;
    setUnits((us) => us.map((u, i) => (i === placing ? { ...u, x, y } : u)));
    if (placing + 1 >= units.length) {
      setStage("battle");
      setLog(["Manual deployment complete. Battle begins."]);
    } else setPlacing((p) => p + 1);
  };
  const positionOccupied = (position: { x:number; y:number; surfaceId?:string; elevationFt?:number }) => units.some((u) => !u.downed && (!dust2MapActive || dust2SharesSurface(u, position)) && unitOccupiesTile(u, position.x, position.y));
  const occupied = (x: number, y: number) => dust2MapActive ? dust2PositionsAt(x, y).every(positionOccupied) : positionOccupied({ x, y });
  const terrainMoveCost = (x: number, y: number) => {
    const terrain = currentTerrain[y]?.[x];
    return terrain === "difficult" || abilityZones.some((zone) => zone.difficult && !(zone.name === "Plant Growth" && active?.role === "Ranger") && zoneContains(zone, { x, y })) ? 2 : 1;
  };
  const movementStepCost = (mover: Unit, from: { x:number; y:number; surfaceId?:string; elevationFt?:number }, to: { x:number; y:number; surfaceId?:string; elevationFt?:number }) => {
    if (dust2MapActive) return dust2MoverStepCostSquares(from, to, terrainMoveCost(to.x, to.y), { flying: mover.movementMode === "fly", climbSpeed: mover.movementMode === "climb" && !!monsterMovementModes(mover).climb });
    if (mover.movementMode === "fly") return 1;
    const riseFt = Math.max(0, (currentHeight[to.y]?.[to.x] || 0) - (currentHeight[from.y]?.[from.x] || 0));
    return terrainMoveCost(to.x, to.y) + riseFt / 5;
  };
  const playerViewAllowsStep = (mover: Unit, from: { x:number; y:number; surfaceId?:string; elevationFt?:number }, to: { x:number; y:number }) =>
    mover.team !== "hero" || mover.npc || playerView.tileState(from.x, from.y) !== "unexplored" &&
      (playerView.tileState(to.x, to.y) !== "unexplored" || attackDist(from, to) <= 1);
  const crossesVillageWall = (fromX: number, fromY: number, toX: number, toY: number) => {
    if (!villageMapActive) return false;
    return crossesDungeonWallEdge({ x:fromX, y:fromY }, { x:toX, y:toY }, villageSightCrossings);
  };
  const crossesClosedDungeonSecretDoor = (fromX: number, fromY: number, toX: number, toY: number) => {
    if (!dungeonMode) return false;
    return crossesDungeonWallEdge(
      { x: fromX, y: fromY },
      { x: toX, y: toY },
      closedDungeonSecretDoors.crossings,
    );
  };
  const crossesSchoolWall = (fromX: number, fromY: number, toX: number, toY: number) =>
    dungeonMode && crossesDungeonWallEdge(
      { x: fromX, y: fromY },
      { x: toX, y: toY },
      schoolEastWallCrossings,
    );
  const routeTo = (mover: Unit, goalX: number, goalY: number, allowAllies: boolean, exactGoal?: { x:number; y:number; surfaceId?:string; elevationFt?:number }) => {
    const goalKey = key(goalX, goalY);
    const findRoute = (goal: { x:number; y:number; surfaceId?:string; elevationFt?:number }) => findWeightedRoute({
      start: dust2MapActive ? { ...mover, ...dust2PositionState(mover) } : mover,
      goal,
      keyOf: (point) => dust2MapActive ? dust2PositionKey(point) : key(point.x, point.y),
      pointFromKey: (value) => { if (dust2MapActive) return dust2PositionFromKey(value); const [x, y] = value.split(",").map(Number); return { x, y }; },
      neighbors: dust2MapActive ? dust2TraversalNeighbors : undefined,
      canEnter: (from, to) => {
        if (!playerViewAllowsStep(mover, from, to)) return false;
        const moverFootprint = unitFootprintAt(mover, to.x, to.y);
        if (moverFootprint.some((tile) =>
          tile.x < 0 || tile.x >= boardCols || tile.y < 0 || tile.y >= boardRows ||
          (currentBlocked.has(key(tile.x, tile.y)) && !monsterIgnoresTerrain(mover, currentTerrain[tile.y]?.[tile.x]))
        ) || crossesVillageWall(from.x, from.y, to.x, to.y) ||
          (dust2MapActive && crossesDust2WallEdge(from, to)) ||
          crossesClosedDungeonSecretDoor(from.x, from.y, to.x, to.y) ||
          crossesSchoolWall(from.x, from.y, to.x, to.y) ||
          diagonalCornerBlocked(from.x, from.y, to.x, to.y, currentBlocked)) return false;
        const occupant = units.find((unit) =>
          unit.id !== mover.id && (!dust2MapActive || dust2SharesSurface(unit, to)) && moverFootprint.some((tile) => unitOccupiesTile(unit, tile.x, tile.y)),
        );
        const isGoal = dust2MapActive ? dust2SamePosition(to, goal) : key(to.x, to.y) === goalKey;
        const canSqueeze = monsterTraitEffects(mover).some((trait) => trait.squeezesThroughOccupiedTiles);
        if (occupant && !occupant.downed && !canSqueeze &&
          !(mover.role === "Gelatinous Cube" && isGoal && occupant.team !== mover.team) &&
          (isGoal || occupant.team !== mover.team || !allowAllies)) return false;
        const movementModes = monsterMovementModes(mover);
        const ignoresElevation = (dust2MapPlaytest && dust2FreeClimb) || Boolean(mover.movementMode === "climb" && movementModes.climb) || mover.movementMode === "fly";
        return dust2MapActive ? canTraverseDust2Elevation(from, to, ignoresElevation) : canAttemptElevation(currentHeight[from.y][from.x], currentHeight[to.y][to.x], ignoresElevation);
      },
      stepCost: (from, to) => movementStepCost(mover, from, to),
    });
    return (dust2MapActive ? exactGoal ? [exactGoal] : dust2PositionsAt(goalX, goalY) : [{ x: goalX, y: goalY }]).map(findRoute).sort((a, b) => a.cost - b.cost)[0];
  };
  const infinitePlaytestMovement = !!(active?.team === "hero" && !active.npc && (mapPlaytest || active.id === "custom-hero"));
  const movementBudget = active?.team === "hero" && stage === "battle" && phase === "move"
    ? infinitePlaytestMovement ? 9999 : Math.max(0, effectiveMovement(active) * (dashActive ? 2 : 1) - movementSpent)
    : -1;
  // Build one bounded cost field; the clicked route is still resolved below.
  const movementCostByState = active && movementBudget >= 0
    ? buildMovementCostField({
        start: dust2MapActive ? { ...active, ...dust2PositionState(active) } : active,
        budget: movementBudget,
        keyOf: (point) => dust2MapActive ? dust2PositionKey(point) : key(point.x, point.y),
        pointFromKey: (value) => { if (dust2MapActive) return dust2PositionFromKey(value); const [x, y] = value.split(",").map(Number); return { x, y }; },
        neighbors: dust2MapActive ? dust2TraversalNeighbors : undefined,
        canEnter: (from, to) => {
          if (!playerViewAllowsStep(active, from, to)) return false;
          const footprint = unitFootprintAt(active, to.x, to.y);
          if (footprint.some((tile) =>
            tile.x < 0 || tile.x >= boardCols || tile.y < 0 || tile.y >= boardRows ||
            currentBlocked.has(key(tile.x, tile.y)),
          ) || crossesVillageWall(from.x, from.y, to.x, to.y) ||
            (dust2MapActive && crossesDust2WallEdge(from, to)) ||
            crossesClosedDungeonSecretDoor(from.x, from.y, to.x, to.y) ||
            crossesSchoolWall(from.x, from.y, to.x, to.y) ||
            diagonalCornerBlocked(from.x, from.y, to.x, to.y, currentBlocked)) return false;
          const blockingUnit = units.find((unit) =>
            unit.id !== active.id && !unit.downed && unit.team !== active.team && (!dust2MapActive || dust2SharesSurface(unit, to)) &&
            footprint.some((tile) => unitOccupiesTile(unit, tile.x, tile.y)),
          );
          const ignoresElevation = (dust2MapPlaytest && dust2FreeClimb) || Boolean(active.movementMode === "climb" && monsterMovementModes(active).climb) || active.movementMode === "fly";
          return !blockingUnit && (dust2MapActive ? canTraverseDust2Elevation(from, to, ignoresElevation) : canAttemptElevation(currentHeight[from.y][from.x], currentHeight[to.y][to.x], ignoresElevation));
        },
        stepCost: (from, to) => movementStepCost(active, from, to),
      })
    : new Map<string, number>();
  const movementCostByTile = dust2MapActive ? collapseDust2MovementCosts(movementCostByState) : movementCostByState;
  const moveCost = (goalX: number, goalY: number) => movementCostByTile.get(key(goalX, goalY)) ?? 99;
  const clearLine = (
    a: { x: number; y: number; id?:string; surfaceId?:string; elevationFt?:number },
    b: { x: number; y: number; surfaceId?:string; elevationFt?:number },
    allowBlockedTarget = false,
  ) => {
    const source = a.id ? units.find((unit) => unit.id === a.id) : units.find((unit) =>
      unit.x === a.x && unit.y === a.y && (!dust2MapActive || (unit.surfaceId || "terrain") === (a.surfaceId || "terrain")),
    );
    if (source && conditionLimitsVision(source) && attackDist(a, b) > 1) return false;
    return playerView.hasLineOfSight(a, b, allowBlockedTarget);
  };
  const reachable = (x: number, y: number) =>
    stage === "battle" &&
    active?.team === "hero" &&
    phase === "move" &&
    !(active.x === x && active.y === y) &&
    !(active.x === DUNGEON_LANDMARKS.hallethPit.point.x && active.y === DUNGEON_LANDMARKS.hallethPit.point.y && firedMapEvents.includes("halleth-rescued") && !firedMapEvents.includes("halleth-bars-open")) &&
    (playerView.tileState(x, y) !== "unexplored" || attackDist(active, { x, y }) <= 1) &&
    !currentBlocked.has(key(x, y)) &&
    !occupied(x, y) &&
    moveCost(x, y) <= movementBudget;
  const maxReach = (x: number, y: number) => {
    if (!reachable(x, y) || !active) return false;
    const budget = movementBudget;
    if (moveCost(x, y) === budget) return true;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx < 0 || ny < 0 || nx >= boardCols || ny >= boardRows || moveCost(nx, ny) > budget;
    });
  };
  const targetWithShield = (target: Unit): Unit => {
    const bonus = equippedShieldBonus(equippedItems[target.id]?.offhand) + effectArmorClassBonus(target) + dust2FlagCarrierBonus(dust2Objective, target.id);
    return bonus ? { ...target, armorClass: armorClassOf(target) + bonus } : target;
  };
  const combatHighGround = (a: Unit, t: Unit) => dust2MapActive ? dust2HasHighGround(a, t) : currentHeight[a.y][a.x] - currentHeight[t.y][t.x] >= 5;
  const hit = (a: Unit, t: Unit, b = 0, attackRange = a.range, attackBonusOverride?: number) => d20HitChance(a, targetWithShield(t), b, attackRange > 1 && combatHighGround(a, t), isRearAttack(a, t), (attackBonusOverride ?? attackBonusOf(a, b)) + dust2FlagCarrierBonus(dust2Objective, a.id));
  const rollAttack = (a: Unit, t: Unit, b = 0, attackRange = a.range, attackBonusOverride?: number, forceAdvantage = false) => {
    const inspiration = (a.combatEffects || []).find((effect) => effect.kind === "inspiration");
    const penalty = (a.combatEffects || []).find((effect) => effect.kind === "roll-penalty");
    const favoredBonus = favoredEnemyBonus(a, t);
    const situationalBonus = (inspiration ? 1 + Math.floor(randomUnit() * (inspiration.value || 6)) : 0) - (penalty?.value || 0) + favoredBonus;
    if (inspiration || penalty) setUnits((current) => current.map((unit) => unit.id === a.id ? { ...unit, combatEffects: (unit.combatEffects || []).filter((effect) => effect.id !== inspiration?.id && effect.id !== penalty?.id) } : unit));
    const wantsAdvantage = isRearAttack(a, t) || forceAdvantage || conditionAttackAdvantage(a) || conditionGrantsIncomingAdvantage(t, attackRange) || hasEffect(t, "reckless");
    const wantsDisadvantage = conditionAttackDisadvantage(a) || conditionGrantsIncomingDisadvantage(t, attackRange);
    const roll = GAME_RUNTIME.rollD20(), secondRoll = wantsAdvantage || wantsDisadvantage ? GAME_RUNTIME.rollD20() : undefined;
    let base = resolveD20Attack({ attacker: a, target: targetWithShield(t), skillAccuracy: b, roll, advantageRoll: wantsAdvantage ? secondRoll : undefined, disadvantageRoll: wantsDisadvantage ? secondRoll : undefined, highGround: attackRange > 1 && combatHighGround(a, t), attackBonusOverride: (attackBonusOverride ?? attackBonusOf(a, b)) + situationalBonus + dust2FlagCarrierBonus(dust2Objective, a.id) });
    if (base.hit && conditionForcesAdjacentCritical(t, attackRange)) base = { ...base, critical: true };
    const ward = t.skills.find((skill) => skill.automatic && skill.wardAcBonus && skill.charges > 0);
    if (!base.hit || base.critical || !ward || base.total >= base.armorClass + (ward.wardAcBonus || 0)) return base;
    setUnits((current) => current.map((unit) => unit.id === t.id ? { ...unit, skills: unit.skills.map((skill) => skill.id === ward.id ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) } : unit));
    setAbilityVfx({ name: "Shield", from: { x: t.x, y: t.y }, to: { x: t.x, y: t.y }, nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), 1600);
    return { ...base, armorClass: base.armorClass + (ward.wardAcBonus || 0), hit: false, wardTriggered: true };
  };
  const rollLabel = (check: ReturnType<typeof rollAttack>) => `d20 ${check.roll} ${check.attackBonus >= 0 ? "+" : ""}${check.attackBonus} = ${check.total} vs AC ${check.armorClass}${check.advantage ? " · advantage" : ""}`;
  const abilitySavingThrow = (source: Unit, target: Unit, ability: Ability, dc = spellSaveDc(source)) => {
    const inspiration = (target.combatEffects || []).find((effect) => effect.kind === "inspiration"), penalty = (target.combatEffects || []).find((effect) => effect.kind === "roll-penalty");
    const heightened = source.skills.some((skill) => skill.name === "Heightened Spell"), roll = heightened ? Math.min(GAME_RUNTIME.rollD20(), GAME_RUNTIME.rollD20()) : GAME_RUNTIME.rollD20();
    const result = resolveSavingThrow(target, ability, dc, roll), adjustment = (inspiration ? 1 + Math.floor(randomUnit() * (inspiration.value || 6)) : 0) - (penalty?.value || 0);
    if (inspiration || penalty) setUnits((current) => current.map((unit) => unit.id === target.id ? { ...unit, combatEffects: (unit.combatEffects || []).filter((effect) => effect.id !== inspiration?.id && effect.id !== penalty?.id) } : unit));
    return adjustment ? { ...result, bonus: result.bonus + adjustment, total: result.total + adjustment, success: result.total + adjustment >= result.dc } : result;
  };
  const saveDamage = (source: Unit, target: Unit, power: number, damageType: Skill["damageType"], ability: Ability = "dexterity") => {
    const save = abilitySavingThrow(source, target, ability);
    const damage = damageAfterProtection(target, save.success ? Math.floor(power / 2) : power, damageType);
    return { damage, save };
  };
  const saveLabel = (save: ReturnType<typeof resolveSavingThrow>, ability = "DEX") => `${ability} save d20 ${save.roll} ${save.bonus >= 0 ? "+" : ""}${save.bonus} = ${save.total} vs DC ${save.dc}${save.success ? " · half damage" : ""}`;
  const reactiveDefense = (attacker: Unit, defender: Unit, incomingDamage: number, melee = true) => {
    let defenderDamage = incomingDamage, attackerDamage = 0, counterLabel = "", rebukeSkillId: string | undefined, preempted = false;
    const stance = hasEffect(defender, "counterstance"), counterWeapon = stance ? weaponAttackProfile(defender, equippedItems[defender.id]?.weapon, !equippedItems[defender.id]?.offhand) : null;
    if (counterWeapon && attackDist(attacker, defender) <= counterWeapon.range) {
      const check = rollAttack(defender, attacker, 0, counterWeapon.range, counterWeapon.attackBonus), counterDamage = check.hit ? damageAfterProtection(attacker, criticalDamage(counterWeapon.damage, check.critical), counterWeapon.damageType) : 0;
      const strikesFirst = initiativeTotal(defender) > initiativeTotal(attacker);
      attackerDamage += counterDamage; counterLabel = `${defender.name} ${strikesFirst ? "counters first" : "counters afterward"}${counterDamage ? ` for ${counterDamage}` : " but misses"}.`;
      if (strikesFirst && counterDamage >= attacker.hp) { defenderDamage = 0; preempted = true; }
      if (!strikesFirst && defenderDamage >= defender.hp) attackerDamage -= counterDamage;
    }
    if (defenderDamage > 0 && melee && (defender.temporaryHp || 0) > 0) attackerDamage += (defender.combatEffects || []).filter((effect) => effect.kind === "armor-of-agathys").reduce((sum, effect) => sum + damageAfterProtection(attacker, effect.value || 0, effect.damageType), 0);
    const rebuke = defenderDamage > 0 && defenderDamage < defender.hp ? defender.skills.find((skill) => skill.automatic && skill.name === "Hellish Rebuke" && skill.charges > 0 && attackDist(attacker, defender) <= skill.range) : undefined;
    if (rebuke) { attackerDamage += damageAfterProtection(attacker, rebuke.power, rebuke.damageType || "fire"); rebukeSkillId = rebuke.id || rebuke.name; }
    return { defenderDamage, attackerDamage, counterLabel, rebukeSkillId, preempted };
  };
  const rollSkill = (unit: Unit, skill: SkillProficiency, dc: number) => { const inspiration = (unit.combatEffects || []).find((effect) => effect.kind === "inspiration"), penalty = (unit.combatEffects || []).find((effect) => effect.kind === "roll-penalty"), adjustment = (inspiration ? 1 + Math.floor(randomUnit() * (inspiration.value || 6)) : 0) - (penalty?.value || 0), roll = GAME_RUNTIME.rollD20(), bonus = skillCheckBonus(unit, skill) + adjustment, total = roll + bonus; if (inspiration || penalty) setUnits((current) => current.map((candidate) => candidate.id === unit.id ? { ...candidate, combatEffects: (candidate.combatEffects || []).filter((effect) => effect.id !== inspiration?.id && effect.id !== penalty?.id) } : candidate)); return { roll, bonus, total, dc, success: roll === 20 || (roll !== 1 && total >= dc), label: `${skill}: d20 ${roll} ${bonus >= 0 ? "+" : ""}${bonus} = ${total} vs DC ${dc}` }; };
  const meleeThreatens = (attacker: Unit, tile: { x: number; y: number; surfaceId?: string; elevationFt?: number }) =>
    !attacker.downed && !unitCannotAct(attacker) && !cannotMakeOpportunityAttack(attacker) && attacker.team !== "neutral" &&
    attackDist(attacker, tile) === 1 && (dust2MapActive ? dust2MeleeSpaceCompatible(attacker, tile) && clearLine(attacker, tile) : Math.abs(currentHeight[attacker.y][attacker.x] - currentHeight[tile.y][tile.x]) <= 5);
  const moveAlongRoute = (
    mover: Unit,
    path: { x: number; y: number; surfaceId?: string; elevationFt?: number }[],
    budget: number,
    sourceUnits: Unit[],
    provokeOpportunity = true,
  ) => {
    let nextUnits = sourceUnits.map((unit) => ({ ...unit }));
    let moved = hasCondition(mover, "prone") ? removeCondition({ ...mover }, "prone") : { ...mover };
    let spent = 0;
    let pukeDamage = 0, zoneDamage = 0, fallDamage = 0;
    const opportunityLogs: string[] = [], climbLogs: string[] = [];
    const opportunityTurnKey = `${round}:${active?.id || mover.id}:${turn}`;
    if (opportunityPairsRef.current.turnKey !== opportunityTurnKey) opportunityPairsRef.current = { turnKey: opportunityTurnKey, pairs: new Set() };
    const opportunityPairs = opportunityPairsRef.current.pairs;
    for (const step of path) {
      const stepCost = movementStepCost(moved, moved, step);
      if (normalizeMovementCost(spent + stepCost) > budget) break;
      const movementModes = monsterMovementModes(moved);
      const ignoresClimbCheck = (dust2MapPlaytest && dust2FreeClimb) || moved.movementMode === "fly" || (moved.movementMode === "climb" && !!movementModes.climb);
      const climbDc = dust2MapActive
        ? dust2ElevationClimbCheckDc(moved, step, ignoresClimbCheck)
        : elevationClimbCheckDc(currentHeight[moved.y]?.[moved.x] || 0, currentHeight[step.y]?.[step.x] || 0, ignoresClimbCheck);
      if (climbDc) {
        const roll = GAME_RUNTIME.rollD20(), bonus = skillCheckBonus(moved, "Athletics"), total = roll + bonus;
        const succeeds = roll === 20 || (roll !== 1 && total >= climbDc);
        climbLogs.push(`${moved.name} ${succeeds ? "climbs" : "fails to climb"} the ${climbDc}-foot rise. Athletics: d20 ${roll} ${bonus >= 0 ? "+" : ""}${bonus} = ${total} vs DC ${climbDc}.`);
        if (!succeeds) {
          spent = normalizeMovementCost(spent + Math.min(1, Math.max(0, budget - spent)));
          break;
        }
      }
      const reactors = provokeOpportunity ? nextUnits.filter(
        (unit) =>
          unit.team !== moved.team &&
          unit.team !== "neutral" &&
          !opportunityPairs.has(`${unit.id}:${moved.id}`) &&
          meleeThreatens(unit, moved) &&
          !meleeThreatens(unit, step),
      ) : [];
      for (const reactor of reactors) {
        if (moved.downed) break;
        opportunityPairs.add(`${reactor.id}:${moved.id}`);
        const monsterReaction = monsterOpportunityAttackProfile(reactor), reactorWeapon = monsterReaction || weaponAttackProfile(reactor, equippedItems[reactor.id]?.weapon, !equippedItems[reactor.id]?.offhand);
        if (!reactorWeapon) continue;
        const check = rollAttack(reactor, moved, 0, 1, reactorWeapon.attackBonus);
        const connects = check.hit;
        if (connects) {
          const damage = Math.min(monsterReaction?.damageCap ?? Number.POSITIVE_INFINITY, damageAfterProtection(moved, criticalDamage(reactorWeapon.damage, check.critical), reactorWeapon.damageType));
          moved = { ...moved, ...combatDamageOutcome(moved, damage), lastDamagerId: reactor.id };
          opportunityLogs.push(
            `${reactor.name} makes an opportunity attack against ${mover.name} for ${damage}. ${rollLabel(check)}.`,
          );
        } else {
          opportunityLogs.push(
            `${reactor.name} misses an opportunity attack against ${mover.name}. ${rollLabel(check)}.`,
          );
        }
      }
      nextUnits = nextUnits.map((unit) => unit.id === moved.id ? { ...unit, ...moved, name: unit.name, initiative: unit.initiative, bossHead: unit.bossHead } : unit);
      if (moved.downed) break;
      const dropFt = dust2MapActive ? dust2DropFeet(moved, step) : currentHeight[moved.y][moved.x] - currentHeight[step.y][step.x], stepFallDamage = moved.movementMode === "fly" || moved.movementMode === "climb" ? 0 : damageAfterProtection(moved, rollFallDamage(dropFt, () => 1 + Math.floor(randomUnit() * 6), athleticSafeFallFeet(moved)), "bludgeoning");
      moved = { ...moved, x: step.x, y: step.y, ...(dust2MapActive ? dust2PositionState(step) : {}), ...(stepFallDamage ? { ...combatDamageOutcome(moved, stepFallDamage), lastDamageType: "bludgeoning" as const } : {}) }; fallDamage += stepFallDamage;
      if (moved.downed) { spent = normalizeMovementCost(spent + stepCost); nextUnits = nextUnits.map((unit) => unit.id === moved.id ? { ...unit, ...moved } : unit); break; }
      const movementHazards = abilityZones.filter((zone) => zone.movementDamage && zone.sourceTeam !== moved.team && zoneContains(zone, step));
      for (const zone of movementHazards) { const damage = damageAfterProtection(moved, zone.movementDamage || 0, zone.damageType); moved = { ...moved, ...combatDamageOutcome(moved, damage), lastDamagerId: zone.sourceId }; zoneDamage += damage; }
      if (
        campaignScene === 7 &&
        moved.team === "hero" &&
        !moved.npc &&
        firedMapEvents.includes(westernSecretDoorEvent) &&
        pukeTunnelAreaTileKeys.has(key(step.x, step.y)) &&
        !heroHasItem(moved.id, "Ring of Puke Immunity")
      ) {
        moved = { ...moved, ...combatDamageOutcome(moved, 1) };
        pukeDamage += 1;
      }
      spent = normalizeMovementCost(spent + stepCost);
      nextUnits = nextUnits.map((unit) => unit.id === moved.id ? { ...unit, ...moved, name: unit.name, initiative: unit.initiative, bossHead: unit.bossHead } : unit);
    }
    return {
      units: nextUnits,
      mover: moved,
      spent,
      pukeDamage,
      logs: [
        ...climbLogs,
        ...opportunityLogs,
        ...(fallDamage ? [`${mover.name} falls and takes ${fallDamage} bludgeoning damage.`] : []),
        ...(pukeDamage ? [`${mover.name} crawls through ${pukeDamage} square${pukeDamage === 1 ? "" : "s"} of rancid sludge and takes ${pukeDamage} puke damage.`] : []),
        ...(zoneDamage ? [`${mover.name} takes ${zoneDamage} damage moving through a spell zone.`] : []),
      ],
    };
  };
  const finish = () => {
    if (chargedTurnCompletionTimerRef.current) clearTimeout(chargedTurnCompletionTimerRef.current);
    chargedTurnCompletionTimerRef.current = null;
    setAiBusy(false);
    setChosen(null);
    setInventoryOpen(false);
    setPhase("move");
    setDashActive(false);
    setMovementSpent(0);
    if (dust2MapActive) setDust2Objective((state) => advanceDust2FlagCountdown(state));
    if (active) setUnits((current) => current.map((unit) => unit.id === active.id ? advanceTimedEffects(advanceConditionDurations(unit, GAME_RUNTIME.rollD20)) : unit));
    let next = turn + 1;
    while (next < order.length && order[next].downed) next += 1;
    if (next >= order.length) {
      const conditionTicks = units.flatMap((unit) => {
        if (unit.downed) return [];
        const results = resolveOngoingConditions(unit, GAME_RUNTIME.rollD20);
        return results.length ? [{ unit, results }] : [];
      });
      if (conditionTicks.length) {
        conditionTicks.forEach(({ unit, results }) => {
          const totalDamage = results.reduce((sum, result) => sum + result.damage, 0);
          if (unit.team === "enemy" && totalDamage >= unit.hp)
            awardDungeonXp(unit.xpReward || xpForCr(unit.cr), unit.lastDamagerId, unit.id);
        });
        setUnits((current) => current.map((unit) => {
          const tick = conditionTicks.find((entry) => entry.unit.id === unit.id);
          if (!tick || unit.downed) return {
            ...unit,
            poisoned: unit.conditionImmunities?.includes("poisoned") ? false : unit.poisoned,
            bleeding: unit.conditionImmunities?.includes("bleeding") ? false : unit.bleeding,
            stunned: unit.conditionImmunities?.includes("stunned") ? false : unit.stunned,
          };
          const damage = tick.results.reduce((sum, result) => sum + result.damage, 0);
          const poisonSave = tick.results.find((result) => result.condition === "poisoned");
          const bleedSave = tick.results.find((result) => result.condition === "bleeding");
          return {
            ...unit,
            ...combatDamageOutcome(unit, damage),
            poisoned: poisonSave?.save.success ? false : unit.poisoned,
            bleeding: bleedSave?.save.success ? false : unit.bleeding,
          };
        }));
        const messages = conditionTicks.flatMap(({ unit, results }) => results.map((result) =>
          `${unit.name} ${result.save.success ? `shakes off ${result.condition === "poisoned" ? "the poison" : "the bleeding"}` : `takes ${result.damage} ${result.condition === "poisoned" ? "poison" : "bleeding"} damage`} (CON save d20 ${result.save.roll} ${result.save.bonus >= 0 ? "+" : ""}${result.save.bonus} = ${result.save.total} vs DC ${result.save.dc}).`,
        ));
        setLog((current) => [...messages, ...current].slice(0, 6));
      }
      if (burningZone && burningZone.triggerRound <= round) {
        units.filter((unit) => unit.team === "enemy" && !unit.downed && canTakeCombatDamage(unit) && unit.hp <= 5 && burningZone.tiles.some((tile) => unitOccupiesTile(unit, tile.x, tile.y)))
          .forEach((unit) => awardDungeonXp(unit.xpReward || xpForCr(unit.cr), burningZone.sourceId || unit.lastDamagerId, unit.id));
        setUnits((us) =>
          us.map((u) => {
            if (
              u.downed ||
              !canTakeCombatDamage(u) ||
              !burningZone.tiles.some((p) => unitOccupiesTile(u, p.x, p.y))
            )
              return u;
            return { ...u, ...combatDamageOutcome(u, damageAfterProtection(u, 5, "fire")) };
          }),
        );
        setLog((l) =>
          [
            "The Fireball's burning ground deals 5 damage to everything inside.",
            ...l,
          ].slice(0, 6),
        );
        setBurningZone(null);
      }
      const tickingZones = abilityZones.filter((zone) => zone.roundDamage || zone.roundHealing || zone.condition);
      if (tickingZones.length) {
        setUnits((current) => current.map((unit) => tickingZones.reduce((affected, zone) => {
          if (affected.downed || !zoneContains(zone, affected)) return affected;
          if (zone.roundHealing && affected.team === zone.sourceTeam) return { ...affected, hp: Math.min(affected.maxHp, affected.hp + zone.roundHealing) };
          if (affected.team === zone.sourceTeam) return affected;
          const damaged = zone.roundDamage ? { ...affected, ...combatDamageOutcome(affected, damageAfterProtection(affected, zone.roundDamage, zone.damageType)), lastDamagerId: zone.sourceId } : affected;
          return zone.condition ? applyCondition(damaged, zone.condition, { sourceId: zone.sourceId, durationRounds: 1 }) : damaged;
        }, unit)));
        setLog((lines) => [`${tickingZones.map((zone) => zone.name).join(", ")} pulses across the battlefield.`, ...lines].slice(0, 6));
      }
      if (abilityZones.length) setAbilityZones((zones) => advanceZones(zones));
      if (campaignScene === 3 && ritualActive) {
        setUnits((us) =>
          us.map((u) =>
            u.team === "enemy" && u.role === "Werewolf" && !u.downed
              ? { ...u, hp: Math.min(u.maxHp, u.hp + 5) }
              : u,
          ),
        );
        setLog((l) =>
          ["The ritual restores 5 HP to each living werewolf.", ...l].slice(0, 6),
        );
        const livingWolf = order.find(
          (u) => u.role === "Werewolf" && !u.downed,
        );
        if (livingWolf)
          showCombatBark(livingWolf.id, "The ritual renews our flesh!");
      }
      const intactFloodgate = floodRoomHazard && barriers.some((barrier) =>
        barrier.id === floodRoomHazard.barrier.id && barrier.hp > 0,
      );
      if (floodRoomActive && floodRoomHazard && intactFloodgate) {
        const priorLevel = firedMapEvents
          .filter((event) => event.startsWith("room-33-flood-level-"))
          .map((event) => Number(event.replace("room-33-flood-level-", "")))
          .reduce((highest, level) => Math.max(highest, Number.isFinite(level) ? level : 0), 0);
        const nextLevel = priorLevel + 1;
        const floodDamage = Math.min(30, floodRoomHazard.baseDamage + (nextLevel - 1) * 7);
        const trapped = units.filter((unit) =>
          unit.team === "hero" && !unit.npc && !unit.downed && floodRoomTileKeys.has(key(unit.x, unit.y)),
        );
        if (trapped.length) {
          setUnits((current) => current.map((unit) =>
            trapped.some((hero) => hero.id === unit.id)
              ? { ...unit, ...combatDamageOutcome(unit, floodDamage) }
              : unit,
          ));
          setFiredMapEvents((events) => [...new Set([...events, `room-33-flood-level-${nextLevel}`])]);
          setAmbientMessage(`WATER LEVEL ${nextLevel} · ${floodDamage} DAMAGE`);
          scheduleCutscene(() => setAmbientMessage(null), 1800);
          setLog((lines) => [`Water level ${nextLevel} deals ${floodDamage} damage to everyone trapped inside AH62–AJ64.`, ...lines].slice(0, 6));
        }
      }
      setUnits((current) => current.map((unit) => {
        if (!unit.rageRounds) return unit;
        if (unit.rageRounds <= 1) return {
          ...unit,
          attack: Math.max(0, unit.attack - 5),
          rageRounds: undefined,
        };
        return { ...unit, rageRounds: unit.rageRounds - 1 };
      }));
      setRound((r) => r + 1);
      const firstLiving = order.findIndex((u) => !u.downed);
      setTurn(Math.max(0, firstLiving));
    } else setTurn(next);
  };
  useEffect(() => {
    finishTurnRef.current = finish;
  });
  const plantActiveDust2Flag = () => {
    if (!active || active.team !== "hero" || active.npc || active.downed || !dust2SiteUnderActive || dust2Objective.flagCarrierId !== active.id) return;
    const planted = plantDust2Flag(dust2Objective, active.id, dust2SiteUnderActive.id, dust2InitiativeCount);
    if (planted === dust2Objective) return;
    setDust2Objective(planted);
    setAmbientMessage(`THE ONE TRUE FLAG PLANTED · SITE ${dust2SiteUnderActive.id} · 3 ROUNDS`);
    scheduleCutscene(() => setAmbientMessage(null), 2600);
    setLog((lines) => [`${active.name} plants The One True Flag at Site ${dust2SiteUnderActive.id} (${dust2SiteUnderActive.coordinate}). The countdown begins with the next person in initiative.`, ...lines].slice(0, 6));
    finish();
  };
  const defuseActiveDust2Flag = () => {
    if (!active || !dust2ActiveCanDefuse) return;
    const defused = advanceDust2Defuse(dust2Objective, active.id);
    if (defused === dust2Objective) return;
    setDust2Objective(defused);
    if (defused.defused) {
      setAmbientMessage(`THE ONE TRUE FLAG DEFUSED · SITE ${defused.plantedSite}`);
      scheduleCutscene(() => setAmbientMessage(null), 2400);
      setLog((lines) => [`${active.name} defuses The One True Flag. Counter-Dungeoneers win the round.`, ...lines].slice(0, 6));
    } else setLog((lines) => [`${active.name} begins defusing. One more uninterrupted action is required.`, ...lines].slice(0, 6));
    finish();
  };
  const scheduleChargedTurnCompletion = (delay = 950) => {
    if (chargedTurnCompletionTimerRef.current) clearTimeout(chargedTurnCompletionTimerRef.current);
    setAiBusy(true);
    chargedTurnCompletionTimerRef.current = setTimeout(() => {
      chargedTurnCompletionTimerRef.current = null;
      setAiBusy(false);
      finishTurnRef.current();
    }, delay);
  };
  const face = (f: Facing) => {
    if (chapterIntro || poisonCutscene || (!!encounterSequenceLabel && !dungeonPlaytest)) return;
    setUnits((us) =>
      us.map((u) => (u.id === active.id ? { ...u, facing: f } : u)),
    );
    finish();
  };
  const areaTiles = (skill: Skill, x: number, y: number) =>
    skillAreaTiles(skill.area, effectiveSkillRange(active, skill), active, { x, y }, boardCols, boardRows, clearLine);
  const armChargedSpell = (
    source: Unit,
    name: string,
    tiles: { x: number; y: number }[],
    power: number,
    accuracy: number,
    damageType: ChargedSpell["damageType"],
    skillIndex?: number,
  ) => {
    const spell: ChargedSpell = {
      id: `${chargedCasterKey(source)}:${name}`,
      unitId: source.id,
      bossHead: source.bossHead,
      name,
      tiles,
      power,
      accuracy,
      damageType,
      resolvesRound: round + 1,
    };
    setChargedSpells((current) => [
      ...current.filter((charge) => chargedCasterKey(charge) !== chargedCasterKey(source)),
      spell,
    ]);
    if (skillIndex !== undefined) {
      setUnits((current) => current.map((unit) => unit.id === source.id ? {
        ...unit,
        skills: unit.skills.map((skill, index) =>
          index === skillIndex && !skill.unlimited
            ? { ...skill, charges: Math.max(0, skill.charges - 1) }
            : skill,
        ),
      } : unit));
    }
    animateSprite(source.id, "cast", 850);
    playSound("charge");
    showCombatBark(source.id, `${name} charging!`, 1700);
    setLog((lines) => [
      `${source.name} begins charging ${name}. The marked squares will be struck next round.`,
      ...lines,
    ].slice(0, 6));
  };
  const releaseChargedSpell = (charge: ChargedSpell) => {
    const source = units.find((unit) => unit.id === charge.unitId);
    if (!source || source.downed) {
      setChargedSpells((current) => current.filter((spell) => spell.id !== charge.id));
      return;
    }
    const targets = units.filter((unit) =>
      !unit.downed &&
      canTakeCombatDamage(unit) &&
      unit.team !== source.team &&
      charge.tiles.some((tile) => unitOccupiesTile(unit, tile.x, tile.y)),
    );
    const results = targets.map((target) => {
      if (charge.name === "Solar Beam") {
        const { damage, save } = saveDamage(source, target, charge.power, charge.damageType);
        return { target, damage, check: null, save };
      }
      const check = rollAttack(source, target, charge.accuracy);
      const damage = check.hit ? damageAfterProtection(target, criticalDamage(charge.power, check.critical), charge.damageType) : 0;
      return { target, damage, check, save: null };
    });
    if (source.team === "hero" && !source.npc)
      recordHeroCombat(source.id, {
        attacks: results.length,
        hits: results.filter((result) => result.damage).length,
        damageDealt: results.reduce((total, result) => total + Math.min(result.damage, Math.max(0, result.target.hp)), 0),
      });
    results.forEach(({ target, damage }) => {
      if (!damage) {
        const feedback = missFloat();
        pushCombatFloat(target.id, feedback.text, feedback.tone);
      }
      else {
        const feedback = damageFloat(damage);
        pushCombatFloat(target.id, feedback.text, feedback.tone);
        animateSprite(target.id, "damage", 520);
        if (!target.downed && target.hp <= damage) awardDungeonXp(target.xpReward || xpForCr(target.cr), source.id, target.id);
      }
    });
    animateSprite(source.id, "cast", 900);
    playSound("spell");
    const finalTile = charge.tiles[charge.tiles.length - 1] || source;
    if (charge.name === "Solar Beam") {
      setAbilityVfx({ name: charge.name, from: { x: source.x, y: source.y }, to: finalTile, tiles: charge.tiles, nonce: runtimeNow() });
      scheduleCutscene(() => setAbilityVfx(null), 1600);
    } else {
      setProjectile({ from: { x: source.x, y: source.y }, to: finalTile, nonce: runtimeNow() });
      scheduleCutscene(() => setProjectile(null), 700);
    }
    setUnits((current) => current.map((unit) => {
      const result = results.find(({ target }) => target.id === unit.id);
      return result?.damage ? {
        ...unit,
        ...combatDamageOutcome(unit, result.damage),
        lastDamagerId: source.id,
      } : unit;
    }));
    setChargedSpells((current) => current.filter((spell) => spell.id !== charge.id));
    setLog((lines) => [
      `${source.name} releases ${charge.name}, dealing ${charge.damageType} damage to ${results.filter((result) => result.damage).length} target${results.filter((result) => result.damage).length === 1 ? "" : "s"}.`,
      ...results.slice(0, 3).map(({ target, check, save }) => `${target.name}: ${save ? saveLabel(save) : rollLabel(check!)}.`),
      ...lines,
    ].slice(0, 6));
  };
  const pushResult = (attacker: Unit, target: Unit, spaces = 1, rollDamage = true) => {
    const dx = Math.sign(target.x - attacker.x), dy = Math.sign(target.y - attacker.y);
    let position = dust2MapActive ? { ...target, ...dust2PositionState(target) } : target, fallDamage = 0;
    for (let i = 0; i < spaces; i++) {
      const nx = position.x + dx, ny = position.y + dy;
      const candidate = dust2MapActive ? dust2ForcedMoveDestination(position, nx, ny) : { x: nx, y: ny };
      if (!candidate) break;
      const nextFootprint = unitFootprintAt(target, nx, ny);
      const overlapsAnotherUnit = units.some(
        (unit) => unit.id !== target.id && !unit.downed && (!dust2MapActive || dust2SharesSurface(unit, candidate)) &&
          nextFootprint.some((tile) => unitOccupiesTile(unit, tile.x, tile.y)),
      );
      if (
        nextFootprint.some(
          (tile) => tile.x < 0 || tile.x >= boardCols || tile.y < 0 || tile.y >= boardRows || currentBlocked.has(key(tile.x, tile.y)),
        ) || overlapsAnotherUnit || crossesVillageWall(position.x, position.y, nx, ny) ||
        (dust2MapActive && crossesDust2WallEdge(position, candidate)) || crossesClosedDungeonSecretDoor(position.x, position.y, nx, ny) ||
        crossesSchoolWall(position.x, position.y, nx, ny) || diagonalCornerBlocked(position.x, position.y, nx, ny, currentBlocked) ||
        (!dust2MapActive && !canStepElevation(currentHeight[position.y][position.x], currentHeight[ny][nx]))
      ) break;
      const dropFt = dust2MapActive ? dust2DropFeet(position, candidate) : currentHeight[position.y][position.x] - currentHeight[ny][nx];
      if (rollDamage && target.movementMode !== "fly") fallDamage += damageAfterProtection(target, rollFallDamage(dropFt, () => 1 + Math.floor(randomUnit() * 6), athleticSafeFallFeet(target)), "bludgeoning");
      position = { ...position, ...candidate, ...(dust2MapActive ? dust2PositionState(candidate) : {}) };
    }
    return { x: position.x, y: position.y, ...(dust2MapActive ? dust2PositionState(position) : {}), fallDamage };
  };
  const markEncounterGroupsHostile = (groups: ReadonlySet<string>) => {
    if (!groups.size) return;
    encounterChoiceBusyRef.current = false;
    setSocialScene(null);
    setFiredMapEvents((events) => {
      const additions = [...groups].flatMap((group) => [
        `room-encounter-spawned-${group}`,
        ...(HOSTILE_FLAG_BY_ENCOUNTER_GROUP[group] ? [HOSTILE_FLAG_BY_ENCOUNTER_GROUP[group]!] : []),
      ]);
      return [...new Set([...events, ...additions])];
    });
  };
  const resolveArea = (
    skill: Skill, skillIndex: number,
    x: number, y: number, explicitTiles?: { x: number; y: number }[], visualFrom?: { x: number; y: number },
  ) => {
    const galleryPerformer = vfxGalleryMode && skill.galleryActorRole ? units.find((unit) => unit.id === "vfx-gallery-monster-performer") : null, visualCaster = galleryPerformer || active;
    if (isMagicalAbility(skill) && conditionPreventsSpeech(active)) { setLog((lines) => [`${active.name} is Silenced and cannot cast ${skill.name}. The charge was not spent.`, ...lines].slice(0, 6)); return; }
    if (skill.name === "Drop Proximity Bomb") {
      if (droppedDungeonItems.some((item) => item.id.startsWith("portable-proximity-bomb:"))) { setLog((lines) => ["The stolen proximity bomb is already armed.", ...lines].slice(0, 6)); return; }
      const bombId = `portable-proximity-bomb:${active.id}`;
      setDroppedDungeonItems((items) => [...items, { id: bombId, name: "Armed Proximity Bomb", x: active.x, y: active.y }]);
      setDungeonItems((items) => { const carried = [...(items[active.id] || [])], index = carried.indexOf("Stolen Proximity Bomb"); if (index >= 0) carried.splice(index, 1); return { ...items, [active.id]: carried }; });
      removeItemGrantedAbility(active.id, "Stolen Proximity Bomb");
      setUnits((current) => current.map((unit) => unit.id === active.id ? { ...unit, skills: unit.skills.map((entry, index) => index === skillIndex ? { ...entry, charges: Math.max(0, entry.charges - 1) } : entry) } : unit));
      recordHeroCombat(active.id, { abilitiesUsed: 1 }); animateSprite(active.id, "cast", 650); playSound("trap");
      setLog((lines) => [`${active.name} drops the stolen nuke. Move outside its 3×3 blast to trigger it.`, ...lines].slice(0, 6)); setChosen(null); setPhase("move"); return;
    }
    if (heroDisguises[active.id]) {
      setHeroDisguises((current) => {
        const next = { ...current };
        delete next[active.id];
        return next;
      });
      setLog((lines) => [`${active.name}'s monster disguise is exposed by the attack.`, ...lines].slice(0, 6));
    }
    const tiles = explicitTiles || areaTiles(skill, x, y);
    const areaMechanic = mechanicFor(skill.name);
    if (areaMechanic?.zone) {
      const zoneDefinition = areaMechanic.zone, multiplier = spellMultiplier(active, skill);
      const initialHits = zoneDefinition.initialDamage ? units.filter((unit) => unit.team !== active.team && unit.team !== "neutral" && !unit.downed && canTakeCombatDamage(unit) && tiles.some((tile) => unitOccupiesTile(unit, tile.x, tile.y))).map((target) => ({ target, damage: damageAfterProtection(target, zoneDefinition.initialDamage! * multiplier, zoneDefinition.damageType) })) : [];
      setAbilityZones((zones) => [...zones.filter((zone) => zone.sourceId !== active.id || zone.name !== skill.name), { ...zoneDefinition, initialDamage: undefined, roundDamage: zoneDefinition.roundDamage ? zoneDefinition.roundDamage * multiplier : undefined, roundHealing: zoneDefinition.roundHealing ? zoneDefinition.roundHealing * multiplier : undefined, movementDamage: zoneDefinition.movementDamage ? zoneDefinition.movementDamage * multiplier : undefined, id: `${skill.id || skill.name}:${active.id}:${round}`, sourceId: active.id, sourceTeam: active.team, tiles, segment: visualFrom ? { a: visualFrom, b: { x, y } } : undefined }]);
      setUnits((current) => current.map((unit) => { const hit = initialHits.find((entry) => entry.target.id === unit.id); return hit ? { ...unit, ...combatDamageOutcome(unit, hit.damage), lastDamagerId: active.id, lastDamageType: zoneDefinition.damageType } : unit.id === active.id ? { ...unit, skills: unit.skills.map((entry, index) => index === skillIndex && !entry.unlimited ? { ...entry, charges: Math.max(0, entry.charges - 1) } : entry) } : unit; }));
      initialHits.forEach(({ target, damage }) => { const feedback = damageFloat(damage); pushCombatFloat(target.id, feedback.text, feedback.tone); if (damage) animateSprite(target.id, "damage", 520); if (damage >= target.hp) awardDungeonXp(target.xpReward || xpForCr(target.cr), active.id, target.id); });
      setAbilityVfx({ name: skill.name, from: visualFrom || visualCaster, to: { x, y }, tiles, nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), 1800);
      const consumedItem = dust2ItemForSkill(skill.name); if (consumedItem) removeDungeonItem(active.id, consumedItem); recordHeroCombat(active.id, { abilitiesUsed: 1, damageDealt: initialHits.reduce((sum, { target, damage }) => sum + Math.min(damage, Math.max(0, target.hp)), 0) }); setLog((lines) => [`${active.name} creates ${skill.name} for ${zoneDefinition.remainingRounds} rounds.${initialHits.length ? ` Its opening blast hits ${initialHits.length} ${initialHits.length === 1 ? "enemy" : "enemies"}.` : ""}`, ...lines].slice(0, 6)); setChosen(null); setPhase("facing"); return;
    }
    const targets = units.filter(
      (u) =>
        !u.downed &&
        canTakeCombatDamage(u) &&
        u.team !== active.team &&
        (skill.name !== "Turn the Unholy" || (!!u.actorId && ["undead", "fiend"].includes(getActorDefinition(u.actorId).statBlock.creatureType))) &&
        tiles.some((p) => unitOccupiesTile(u, p.x, p.y)),
    );
    const provokedEncounterGroups = new Set(
      targets
        .filter((unit) => unit.team === "neutral" && unit.encounterGroup)
        .map((unit) => unit.encounterGroup!),
    );
    const individuallyProvokedIds = new Set(
      targets
        .filter((unit) => unit.team === "neutral" && !unit.encounterGroup)
        .map((unit) => unit.id),
    );
    const isProvokedUnit = (unit: Unit) =>
      individuallyProvokedIds.has(unit.id) ||
      (!!unit.encounterGroup && provokedEncounterGroups.has(unit.encounterGroup));
    const combatUnits = units.map((unit) =>
      isProvokedUnit(unit) ? { ...unit, team: "enemy" as Team, npc: false } : unit,
    );
    markEncounterGroupsHostile(provokedEncounterGroups);
    if (encounterMode === "exploration") {
      const fullOrder = combatUnits
        .filter((u) => !u.npc && u.team !== "neutral")
        .sort(
          (a, b) =>
            initiativeTotal(b) - initiativeTotal(a) ||
            b.initiative - a.initiative,
        );
      setEncounterMode("combat");
      setTurn(Math.max(0, fullOrder.findIndex((u) => u.id === active.id)));
    }
    animateSprite(visualCaster.id, skill.galleryActorRole ? actorActionAnimation(skill.galleryActorRole, skill.name).pose : "cast", 700);
    if (active.team === "hero" && !active.npc)
      recordHeroCombat(active.id, { abilitiesUsed: 1 });
    if (skill.chargeRounds) {
      armChargedSpell(
        active,
        skill.name,
        tiles,
        skill.power,
        skill.accuracy ?? 0,
        skill.damageType || "arcane",
        skillIndex,
      );
      setPhase("facing");
      setChosen(null);
      return;
    }
    if (skill.area === "line" && tiles.length) {
      const finalTile = tiles[tiles.length - 1];
      if (skill.name === "Lightning Bolt") {
        setLightningBoltEffect({ from: { x: visualCaster.x, y: visualCaster.y }, to: finalTile, nonce: runtimeNow() });
        scheduleCutscene(() => setLightningBoltEffect(null), 760);
      } else {
        setProjectile({ from: { x: visualCaster.x, y: visualCaster.y }, to: finalTile, nonce: runtimeNow() });
        scheduleCutscene(() => setProjectile(null), 700);
      }
    }
    const results = targets.map((target) => {
      if (skill.name === "Fireball" || skill.name === "Lightning Bolt" || areaMechanic?.save) {
        const { damage: dmg, save } = saveDamage(active, target, skill.power * spellMultiplier(active, skill), skill.damageType, areaMechanic?.save?.ability || "dexterity");
        const absorbed = skill.damageType === "lightning" && target.role === "Flesh Golem"
          ? (save.success ? Math.floor(skill.power / 2) : skill.power)
          : 0;
        const feedback = damageFloat(dmg);
        pushCombatFloat(target.id, feedback.text, feedback.tone);
        const stunSave = !!skill.stunChance && !target.conditionImmunities?.includes("stunned") && randomUnit() * 100 < skill.stunChance
          ? abilitySavingThrow(active, target, "constitution") : null;
        return { target, dmg, absorbed, check: null, save, stunned: !!stunSave && !stunSave.success, landed: !save.success || !!dmg };
      }
      const check = rollAttack(active, target, skill.accuracy ?? 0);
      const dmg = check.hit ? damageAfterProtection(target, criticalDamage(skill.power * spellMultiplier(active, skill), check.critical), skill.damageType) : 0;
      const feedback = dmg ? damageFloat(dmg) : missFloat();
      pushCombatFloat(target.id, feedback.text, feedback.tone);
      return {
        target,
        dmg,
        check,
        save: null,
        absorbed: 0,
        stunned: !!dmg && !!skill.stunChance && !target.conditionImmunities?.includes("stunned") && randomUnit() * 100 < skill.stunChance && !abilitySavingThrow(active, target, "constitution").success,
        landed: check.hit,
      };
    });
    if (active.team === "hero" && !active.npc)
      recordHeroCombat(active.id, {
        attacks: results.length,
        hits: results.filter((result) => result.dmg).length,
        damageDealt: results.reduce((total, result) => total + Math.min(result.dmg, Math.max(0, result.target.hp)), 0),
      });
    setUnits((us) =>
      us.map((u) => {
        const provoked = isProvokedUnit(u);
        const combatant = provoked ? { ...u, team: "enemy" as Team, npc: false } : u;
        const result = results.find((r) => r.target.id === u.id);
        if (result?.absorbed)
          return { ...combatant, hp: Math.min(combatant.maxHp, combatant.hp + result.absorbed) };
        if (result?.landed) {
          let affected = {
            ...combatant,
            ...combatDamageOutcome(combatant, result.dmg),
            stunned: result.stunned || combatant.stunned,
            lastDamagerId: active.id,
            lastDamageType: skill.damageType,
          };
          if (areaMechanic?.targetEffect) affected = applyGrantedEffect(affected, areaMechanic.targetEffect, active.id);
          if (areaMechanic?.targetCondition && !result.save?.success) affected = applyCondition(affected, areaMechanic.targetCondition.condition, { sourceId: active.id, durationRounds: areaMechanic.targetCondition.durationRounds, saveAbility: areaMechanic.targetCondition.repeatSave ? areaMechanic.save?.ability : undefined, saveDc: areaMechanic.targetCondition.repeatSave ? spellSaveDc(active) : undefined, saveTiming: areaMechanic.targetCondition.repeatSave ? "end-of-turn" : undefined });
          return affected;
        }
        if (u.id === active.id)
          return {
            ...combatant,
            skills: combatant.skills.map((q, i) =>
              i === skillIndex && !q.unlimited ? { ...q, charges: q.charges - 1 } : q,
            ),
          };
        return combatant;
      }),
    );
    const lightningGolem = results.find((result) => result.absorbed)?.target;
    if (lightningGolem) {
      setAbilityVfx({ name: "Lightning Absorption", from: { x: lightningGolem.x, y: lightningGolem.y }, to: { x: lightningGolem.x, y: lightningGolem.y }, nonce: runtimeNow() });
      scheduleCutscene(() => setAbilityVfx(null), 1600);
      setLog((lines) => [`${lightningGolem.name} absorbs the lightning and repairs itself.`, ...lines].slice(0, 6));
    }
    if (provokedEncounterGroups.size)
      setEnemyTypes((types) => [...new Set([
        ...types,
        ...combatUnits.filter((unit) => isProvokedUnit(unit)).map((unit) => unit.role),
      ])]);
    results.filter(({ target, dmg }) => dmg && !target.downed && target.hp <= dmg)
      .forEach(({ target }) => awardDungeonXp(target.xpReward || xpForCr(target.cr), active.id, target.id));
    if (skill.name === "Fireball")
      setBurningZone({ tiles, triggerRound: round, sourceId: active.id });
    if (hasAbilityVfx(skill.name)) {
      setAbilityVfx({ name: skill.name, from: visualFrom || { x: visualCaster.x, y: visualCaster.y }, to: { x, y }, tiles, nonce: runtimeNow() });
      scheduleCutscene(() => setAbilityVfx(null), 1800);
    }
    if (skill.name === "Throw Holy Water") {
      removeDungeonItem(active.id, "Holy Water");
      removeItemGrantedAbility(active.id, "Holy Water");
    } const consumedDust2Item = dust2ItemForSkill(skill.name); if (consumedDust2Item) removeDungeonItem(active.id, consumedDust2Item);
    const hits = results.filter((r) => r.dmg).length;
    setLog((l) =>
      [
        `${active.name} casts ${skill.name}, striking ${hits} target${hits === 1 ? "" : "s"}.`,
        ...results.slice(0, 3).map(({ target, check, save }) => `${target.name}: ${save ? saveLabel(save) : rollLabel(check!)}.`),
        ...l,
      ].slice(0, 6),
    );
    setPhase("facing");
    setChosen(null);
  };
  const resolve = (target: Unit) => {
    if (!chosen) return;
    if (isFightClubBystander(target)) {
      setInspect(null);
      setLog((lines) => [`${target.name} is part of the crowd, not the bout. The action was not spent.`, ...lines].slice(0, 6));
      return;
    }
    const provokedNeutral = target.team === "neutral";
    const provokedEncounterGroups = new Set(
      provokedNeutral && target.encounterGroup ? [target.encounterGroup] : [],
    );
    const isProvokedUnit = (unit: Unit) => provokedNeutral && (
      target.encounterGroup ? unit.encounterGroup === target.encounterGroup : unit.id === target.id
    );
    markEncounterGroupsHostile(provokedEncounterGroups);
    if (target.team !== active.team && encounterMode === "exploration") {
      const fullOrder = [...units]
        .map((u) =>
          isProvokedUnit(u)
            ? { ...u, team: "enemy" as Team, npc: false }
            : u,
        )
        .filter((u) => !u.npc && u.team !== "neutral")
        .sort(
          (a, b) =>
            initiativeTotal(b) - initiativeTotal(a) ||
            b.initiative - a.initiative,
        );
      setEncounterMode("combat");
      setTurn(Math.max(0, fullOrder.findIndex((u) => u.id === active.id)));
      setLog((l) => [
        provokedNeutral
          ? `${active.name} attacks ${target.name}. The neutral NPC turns hostile and joins initiative.`
          : `${active.name} initiates combat. Hostile units join initiative.`,
        ...l,
      ].slice(0, 6));
    }
    const sk = chosen.kind === "skill" ? active.skills[chosen.i!] : null;
    const galleryPerformer = vfxGalleryMode && sk?.galleryActorRole ? units.find((unit) => unit.id === "vfx-gallery-monster-performer") : null, visualCaster = galleryPerformer || active;
    const mechanic = mechanicFor(sk?.name);
    const projectileDeflected = chosen.kind === "attack" && !!activeWeapon && isOrdinaryProjectileAttack(activeWeapon.range, activeWeapon.damageType) && ordinaryProjectileBlocked(abilityZones, active, target);
    if (projectileDeflected) {
      const flameShot = flameArrowShotsRemaining(active) > 0, feedback = missFloat();
      animateSprite(active.id, "attack", 620); pushCombatFloat(target.id, feedback.text, feedback.tone); if (active.team === "hero" && !active.npc) recordHeroCombat(active.id, { attacks: 1, hits: 0 });
      setUnits((current) => current.map((unit) => unit.id === active.id ? (flameShot ? consumeFlameArrowAttack(removeCondition(unit, "invisible")) : removeCondition(unit, "invisible")) : isProvokedUnit(unit) ? { ...unit, team: "enemy", npc: false } : unit));
      setLog((lines) => [`Wind Wall deflects ${active.name}'s ${activeWeapon.name}. The attack is spent.${flameShot ? ` Flame Arrows has ${Math.max(0, flameArrowShotsRemaining(active) - 1)} shot${flameArrowShotsRemaining(active) === 2 ? "" : "s"} remaining.` : ""}`, ...lines].slice(0, 6));
      setChosen(null); setPhase("facing"); return;
    }
    if (sk && isMagicalAbility(sk) && conditionPreventsSpeech(active)) { setLog((lines) => [`${active.name} is Silenced and cannot cast ${sk.name}. The charge was not spent.`, ...lines].slice(0, 6)); return; }
    if (sk && mechanic?.requiresUnacted && (round > 1 || order.findIndex((unit) => unit.id === target.id) <= turn)) { setLog((lines) => [`${target.name} has already acted in this combat. Assassinate was not spent.`, ...lines].slice(0, 6)); return; }
    if (sk && active.team === "hero" && !active.npc)
      recordHeroCombat(active.id, { abilitiesUsed: 1 });
    if (target.team !== active.team && heroDisguises[active.id]) {
      setHeroDisguises((current) => {
        const next = { ...current };
        delete next[active.id];
        return next;
      });
      setLog((lines) => [`${active.name}'s monster disguise is exposed by the attack.`, ...lines].slice(0, 6));
    }
    if (sk && hasAbilityVfx(sk.name)) {
      setAbilityVfx({ name: sk.name, from: { x: visualCaster.x, y: visualCaster.y }, to: { x: target.x, y: target.y }, nonce: runtimeNow() });
      scheduleCutscene(() => setAbilityVfx(null), 1600);
    }
    if (chosen.kind === "twin" && activeWeapon && activeOffhand && canTwinStrike) {
      const mainCheck = rollAttack(active, target, 0, activeWeapon.range, activeWeapon.attackBonus);
      const offhandCheck = rollAttack(active, target, 0, activeOffhand.range, activeOffhand.attackBonus);
      const mainDamage = mainCheck.hit ? damageAfterProtection(target, criticalDamage(activeWeapon.damage, mainCheck.critical), activeWeapon.damageType) : 0;
      const offhandDamage = offhandCheck.hit ? damageAfterProtection(target, criticalDamage(activeOffhand.damage, offhandCheck.critical), activeOffhand.damageType) : 0;
      const totalDamage = mainDamage + offhandDamage;
      recordHeroCombat(active.id, { attacks: 2, hits: Number(mainCheck.hit) + Number(offhandCheck.hit), damageDealt: Math.min(totalDamage, Math.max(0, target.hp)), abilitiesUsed: 1 });
      animateSprite(active.id, "attack", 760);
      if (totalDamage) animateSprite(target.id, "damage", 520);
      const feedback = totalDamage ? damageFloat(totalDamage) : missFloat();
      pushCombatFloat(target.id, feedback.text, feedback.tone);
      setUnits((current) => current.map((unit) => unit.id === target.id
        ? { ...unit, team: isProvokedUnit(unit) ? "enemy" : unit.team, npc: isProvokedUnit(unit) ? false : unit.npc, ...combatDamageOutcome(unit, totalDamage), lastDamagerId: active.id }
        : isProvokedUnit(unit) ? { ...unit, team: "enemy", npc: false } : unit));
      if (!target.downed && totalDamage >= target.hp) awardDungeonXp(target.xpReward || xpForCr(target.cr), active.id, target.id);
      setLog((lines) => [`${active.name} uses Twin Strike: ${activeWeapon.name} ${mainCheck.hit ? `${mainDamage} damage` : "misses"}; ${activeOffhand.name} ${offhandCheck.hit ? `${offhandDamage} damage` : "misses"}.`, ...lines].slice(0, 6));
      setChosen(null);
      setPhase("facing");
      return;
    }
    if (sk?.instakill && target.team !== active.team) {
      const curseTargets = units.filter((unit) =>
        !unit.downed && canTakeCombatDamage(unit) && (unit.team === "enemy" || unit.id === target.id),
      );
      showCombatBark(active.id, "Avada Kedavra!", 1800);
      animateSprite(active.id, "cast", 700);
      curseTargets.forEach((unit) => {
        animateSprite(unit.id, "damage", 480);
        awardDungeonXp(unit.xpReward || xpForCr(unit.cr), active.id, unit.id);
      });
      const cursedIds = new Set(curseTargets.map((unit) => unit.id));
      if (active.team === "hero" && !active.npc)
        recordHeroCombat(active.id, {
          attacks: curseTargets.length,
          hits: curseTargets.length,
          damageDealt: curseTargets.reduce((total, unit) => total + Math.max(0, unit.hp), 0),
        });
      setUnits((current) => current.map((unit) => cursedIds.has(unit.id)
        ? { ...unit, team: isProvokedUnit(unit) ? "enemy" : unit.team, npc: false, ...combatDamageOutcome(unit, unit.hp), lastDamagerId: active.id }
        : isProvokedUnit(unit) ? { ...unit, team: "enemy", npc: false } : unit));
      setLog((lines) => [
        `${active.name} casts Avada Kedavra. ${curseTargets.length} target${curseTargets.length === 1 ? " is" : "s are"} instantly defeated.`,
        ...lines,
      ].slice(0, 6));
      setPhase("facing");
      setChosen(null);
      return;
    }
    if (sk?.kind === "heal") {
      animateSprite(visualCaster.id, sk?.galleryActorRole ? actorActionAnimation(sk.galleryActorRole, sk.name).pose : "cast", 650);
      const healingPower = mechanic?.temporaryHp ? 0 : sk.power * spellMultiplier(active, sk), restored = Math.min(healingPower, target.maxHp - Math.max(0, target.hp));
      const feedback = healFloat(restored);
      pushCombatFloat(target.id, restored ? feedback.text : sk.name === "Armor of Agathys" ? "+8 TEMP HP" : sk.name === "Invisibility" ? "INVISIBLE" : sk.name === "Flame Arrows" ? `+${FLAME_ARROWS_DAMAGE} FIRE · ${FLAME_ARROWS_ATTACKS} SHOTS` : mechanic?.temporaryHp ? "WARD ACTIVE" : mechanic?.targetEffect || mechanic?.selfEffect ? "EFFECT ACTIVE" : "FULL HP", restored ? feedback.tone : "status");
      if (target.downed) awardAchievement(active.id, {
        key: "combat-revival",
        title: "Get Back in There",
        description: `Revived ${target.name} during combat.`,
        tier: "Bronze",
        boxName: "Field Medic",
      });
      const companionSpot = (dust2MapActive ? dust2TraversalNeighbors(active) : [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: active.x + dx, y: active.y + dy }))).find((point) => point.x >= 0 && point.y >= 0 && point.x < boardCols && point.y < boardRows && !currentBlocked.has(key(point.x, point.y)) && !positionOccupied(point) && (!dust2MapActive || routeTo(active, point.x, point.y, false, point).path.length === 1));
      setUnits((us) => {
        const updated = us.map((u) => {
          let next = u;
          if (u.id === target.id) { next = { ...u, hp: Math.min(u.maxHp, Math.max(0, u.hp) + healingPower), downed: healingPower ? false : u.downed, stunned: healingPower ? false : u.stunned }; if (mechanic?.cleanse) next = cleanseConditions(next, mechanic.cleanse); if (sk.name === "Wholeness of Body") next = cleanseConditions(next, ["poisoned", "bleeding"]); if (mechanic?.targetEffect) next = applyGrantedEffect(next, mechanic.targetEffect, active.id, target.id); if (mechanic?.targetCondition) next = applyCondition(next, mechanic.targetCondition.condition, { sourceId: active.id, durationRounds: mechanic.targetCondition.durationRounds }); if (mechanic?.temporaryHp) next = { ...next, temporaryHp: Math.max(next.temporaryHp || 0, mechanic.temporaryHp) }; }
          if (u.id === active.id) { if (mechanic?.selfEffect) next = applyGrantedEffect(next, mechanic.selfEffect, active.id); next = { ...next, skills: next.skills.map((q, i) => i === chosen.i && !q.unlimited ? { ...q, charges: Math.max(0, q.charges - 1) } : q) }; }
          return next;
        });
        if (mechanic?.summon && companionSpot && !us.some((unit) => unit.id === `animal-companion:${active.id}`)) { const companion = spawnActor("Dire Wolf", `animal-companion:${active.id}`, "hero", `${active.name}'s Companion`); Object.assign(companion, companionSpot, dust2MapActive ? dust2PositionState(companionSpot) : {}, { npc: false, encounterGroup: undefined }); return [...updated, companion]; }
        return updated;
      });
      setLog((l) =>
        [
          `${active.name} uses ${sk.name}.${restored ? ` ${target.name} ${target.downed ? "returns to the fight with" : "recovers"} ${restored} HP.` : sk.name === "Flame Arrows" ? ` The next ${FLAME_ARROWS_ATTACKS} standard ranged attacks deal +${FLAME_ARROWS_DAMAGE} fire damage on a hit.` : " Its effect is active."}`,
          ...l,
        ].slice(0, 6),
      );
      setPhase("facing");
      return;
    }
    if (provokedNeutral) {
      setUnits((us) =>
        us.map((u) =>
          isProvokedUnit(u) ? { ...u, team: "enemy", npc: false } : u,
        ),
      );
    }
    if (sk && mechanic?.targetEffect && !mechanic.weaponRider && sk.power === 0) {
      setUnits((current) => current.map((unit) => unit.id === target.id ? applyGrantedEffect(unit, mechanic.targetEffect, active.id, target.id) : unit.id === active.id ? { ...unit, skills: unit.skills.map((ability, index) => index === chosen.i ? { ...ability, charges: Math.max(0, ability.charges - 1) } : ability) } : unit));
      setLog((lines) => [`${active.name} uses ${sk.name} on ${target.name}.`, ...lines].slice(0, 6)); setChosen(null); setPhase("facing"); return;
    }
    if (sk && mechanic?.save && !mechanic.weaponRider && sk.name !== "Toll the Dead" && sk.name !== "Hold Person") {
      const save = abilitySavingThrow(active, target, mechanic.save.ability);
      const power = sk.power * spellMultiplier(active, sk), damage = damageAfterProtection(target, save.success ? mechanic.save.halfDamage ? Math.floor(power / 2) : 0 : power, sk.damageType);
      setUnits((current) => current.map((unit) => unit.id === target.id ? (!save.success && mechanic.targetCondition ? applyCondition({ ...unit, ...combatDamageOutcome(unit, damage), lastDamagerId: active.id }, mechanic.targetCondition.condition, { sourceId: active.id, durationRounds: mechanic.targetCondition.durationRounds }) : { ...unit, ...combatDamageOutcome(unit, damage), lastDamagerId: damage ? active.id : unit.lastDamagerId }) : unit.id === active.id ? { ...unit, skills: unit.skills.map((ability, index) => index === chosen.i ? { ...ability, charges: Math.max(0, ability.charges - 1) } : ability) } : unit));
      pushCombatFloat(target.id, damage ? `${damage}` : "SAVE", damage ? "damage" : "status"); setLog((lines) => [`${target.name} rolls ${mechanic.save!.ability.slice(0, 3).toUpperCase()} ${save.total} vs DC ${save.dc}: ${save.success ? "success" : `${sk.name} takes effect`}.`, ...lines].slice(0, 6)); setChosen(null); setPhase("facing"); return;
    }
    if (sk?.name === "Toll the Dead") {
      const save = abilitySavingThrow(active, target, "wisdom");
      const baseDamage = (target.hp < target.maxHp ? 7 : sk.power) * spellMultiplier(active, sk);
      const damage = save.success ? 0 : damageAfterProtection(target, baseDamage, "necrotic");
      animateSprite(active.id, "cast", 620);
      if (damage) animateSprite(target.id, "damage", 480);
      const feedback = damage ? damageFloat(damage) : missFloat();
      pushCombatFloat(target.id, feedback.text, feedback.tone);
      if (active.team === "hero" && !active.npc)
        recordHeroCombat(active.id, { attacks: 1, hits: damage ? 1 : 0, damageDealt: Math.min(damage, Math.max(0, target.hp)) });
      setUnits((current) => current.map((unit) => unit.id === target.id
        ? { ...unit, team: isProvokedUnit(unit) ? "enemy" : unit.team, npc: isProvokedUnit(unit) ? false : unit.npc, ...combatDamageOutcome(unit, damage), lastDamagerId: damage ? active.id : unit.lastDamagerId, lastDamageType: damage ? "necrotic" : unit.lastDamageType }
        : unit.id === active.id
          ? { ...unit, skills: unit.skills.map((ability, index) => index === chosen.i ? { ...ability, charges: Math.max(0, ability.charges - 1) } : ability) }
          : isProvokedUnit(unit) ? { ...unit, team: "enemy", npc: false } : unit));
      if (damage >= target.hp && !target.downed) awardDungeonXp(target.xpReward || xpForCr(target.cr), active.id, target.id);
      setLog((lines) => [`${active.name} tolls the dead. ${target.name} rolls WIS ${save.total} vs DC ${save.dc}: ${save.success ? "resists" : `${damage} necrotic damage${target.hp < target.maxHp ? " (wounded)" : ""}`}.`, ...lines].slice(0, 6));
      setChosen(null);
      setPhase("facing");
      return;
    }
    if (sk?.name === "Hold Person") {
      const save = abilitySavingThrow(active, target, "wisdom");
      animateSprite(active.id, "cast", 620);
      setUnits((current) => current.map((unit) => unit.id === target.id && !save.success
        ? applyCondition(unit, "restrained", { sourceId: active.id, durationRounds: 2, saveAbility: "wisdom", saveDc: save.dc, saveTiming: "end-of-turn" })
        : unit.id === active.id
          ? { ...unit, skills: unit.skills.map((ability, index) => index === chosen.i ? { ...ability, charges: Math.max(0, ability.charges - 1) } : ability) }
          : unit));
      setLog((lines) => [`${active.name} casts Hold Person. ${target.name} rolls WIS ${save.total} vs DC ${save.dc}: ${save.success ? "resists" : "Restrained (save ends)"}.`, ...lines].slice(0, 6));
      setChosen(null);
      setPhase("facing");
      return;
    }
    const strikeTargets = mechanic?.allAdjacent
      ? units.filter((unit) => unit.team !== active.team && unit.team !== "neutral" && !unit.downed && canTakeCombatDamage(unit) && attackDist(active, unit) <= 1)
      : [target];
    const outcomes = strikeTargets.map((victim) => {
      const profile = abilityStrikeProfile(active, victim, sk, activeWeapon), attackRange = sk && !mechanic?.weaponRider ? effectiveSkillRange(active, sk) : profile.range, checks = Array.from({ length: profile.attackCount }, () => rollAttack(active, victim, sk?.accuracy || 0, attackRange, profile.attackBonus));
      const hits = checks.filter((result) => result.hit), sneak = sk?.name === "Sneak Attack" && isRearAttack(active, victim);
      const sneakBonus = sneak ? 3 * Math.ceil((active.level || 1) / 2) : 0;
      const damage = hits.reduce((sum, result, index) => sum + damageAfterProtection(victim, criticalDamage(profile.baseDamage + (index === 0 ? sneakBonus : 0), result.critical), profile.damageType) + damageAfterProtection(victim, criticalDamage(profile.riderDamage, result.critical), profile.riderDamageType) + damageAfterProtection(victim, profile.bonusDamage, "fire"), 0);
      const save = hits.length && mechanic?.save ? abilitySavingThrow(active, victim, mechanic.save.ability) : null;
      const conditionChecks = hits.length ? (sk?.inflictedConditions || []).filter((entry) => entry.condition !== mechanic?.targetCondition?.condition).map((condition) => ({ condition, save: condition.saveAbility ? abilitySavingThrow(active, victim, condition.saveAbility, condition.saveDc || spellSaveDc(active)) : null })) : [];
      const conditions = conditionChecks.filter(({ save: conditionSave }) => !conditionSave?.success).map(({ condition }) => condition);
      if (hits.length && mechanic?.targetCondition && !save?.success) conditions.push({ ...mechanic.targetCondition, saveAbility: mechanic.save?.ability, saveDc: spellSaveDc(active) });
      const knockSave = hits.length && sk?.knockback ? abilitySavingThrow(active, victim, "strength") : null;
      const pushed = hits.length && sk?.knockback && !knockSave?.success ? pushResult(active, victim, sk.knockback) : null;
      return { victim, profile, checks, hits, sneak, damage: damage + (pushed?.fallDamage || 0), save, conditions, conditionChecks, knockSave, pushed };
    });
    const landed = outcomes.filter((outcome) => outcome.hits.length), primary = outcomes[0], flameArrowUsed = !sk && !!primary?.profile.bonusDamage, flameArrowRemaining = flameArrowUsed ? Math.max(0, flameArrowShotsRemaining(active) - 1) : 0;
    outcomes.forEach((outcome) => { const feedback = outcome.damage ? damageFloat(outcome.damage, outcome.sneak) : missFloat(); pushCombatFloat(outcome.victim.id, feedback.text, feedback.tone); if (outcome.hits.length) animateSprite(outcome.victim.id, "damage", 480); });
    animateSprite(visualCaster.id, sk?.galleryActorRole ? actorActionAnimation(sk.galleryActorRole, sk.name).pose : sk ? "cast" : "attack", 620);
    const splashTargets = mechanic?.splashDamage && primary?.hits.length ? units.filter((unit) => unit.id !== primary.victim.id && unit.team !== active.team && !unit.downed && canTakeCombatDamage(unit) && attackDist(unit, primary.victim) <= 1) : [];
    const lifeSteal = mechanic?.lifeSteal ? Math.floor(landed.reduce((sum, outcome) => sum + outcome.damage, 0) * mechanic.lifeSteal) : 0;
    setUnits((us) => us.map((unit) => {
      const outcome = outcomes.find((entry) => entry.victim.id === unit.id);
      if (outcome?.hits.length) {
        let next: Unit = { ...unit, team: isProvokedUnit(unit) ? "enemy" : unit.team, npc: isProvokedUnit(unit) ? false : unit.npc, x: outcome.pushed?.x ?? unit.x, y: outcome.pushed?.y ?? unit.y, ...(dust2MapActive && outcome.pushed ? dust2PositionState(outcome.pushed) : {}), ...combatDamageOutcome(unit, outcome.damage), lastDamagerId: active.id, lastDamageType: outcome.pushed?.fallDamage ? "bludgeoning" : outcome.profile.damageType };
        for (const condition of outcome.conditions) next = applyCondition(next, condition.condition, { sourceId: active.id, durationRounds: condition.durationRounds, saveAbility: condition.repeatSave ? condition.saveAbility : undefined, saveDc: condition.repeatSave ? condition.saveDc : undefined, saveTiming: condition.repeatSave ? "end-of-turn" : undefined });
        if (mechanic?.targetEffect) next = applyGrantedEffect(next, mechanic.targetEffect, active.id, unit.id);
        return next;
      }
      if (splashTargets.some((splash) => splash.id === unit.id)) return { ...unit, ...combatDamageOutcome(unit, damageAfterProtection(unit, mechanic!.splashDamage!, sk?.damageType || "lightning")), lastDamagerId: active.id };
      if (unit.id === active.id) {
        let next = removeCondition({ ...unit, hp: Math.min(unit.maxHp, unit.hp + lifeSteal), skills: sk ? unit.skills.map((ability, index) => index === chosen.i && !ability.unlimited ? { ...ability, charges: Math.max(0, ability.charges - 1) } : ability) : unit.skills }, "invisible"); if (flameArrowUsed) next = consumeFlameArrowAttack(next);
        if (mechanic?.selfEffect) next = applyGrantedEffect(next, mechanic.selfEffect, active.id);
        return next;
      }
      return isProvokedUnit(unit) ? { ...unit, team: "enemy", npc: false } : unit;
    }));
    outcomes.filter((outcome) => !outcome.victim.downed && outcome.damage >= outcome.victim.hp).forEach((outcome) => awardDungeonXp(outcome.victim.xpReward || xpForCr(outcome.victim.cr), active.id, outcome.victim.id));
    if (active.team === "hero" && !active.npc) recordHeroCombat(active.id, { attacks: outcomes.reduce((sum, outcome) => sum + outcome.checks.length, 0), hits: landed.reduce((sum, outcome) => sum + outcome.hits.length, 0), damageDealt: landed.reduce((sum, outcome) => sum + Math.min(outcome.damage, Math.max(0, outcome.victim.hp)), 0) });
    setLog((lines) => [landed.length ? `${active.name}${sk ? ` uses ${sk.name} and` : ""} hits ${landed.length} target${landed.length === 1 ? "" : "s"} for ${landed.reduce((sum, outcome) => sum + outcome.damage, 0)} total damage.${flameArrowUsed ? ` Flame Arrows adds ${FLAME_ARROWS_DAMAGE} fire; ${flameArrowRemaining} shot${flameArrowRemaining === 1 ? "" : "s"} remain.` : ""}${lifeSteal ? ` ${active.name} restores ${lifeSteal} HP.` : ""}` : `${active.name}${sk ? ` uses ${sk.name} but` : ""} misses. ${primary ? primary.checks.map(rollLabel).join(" · ") : "No adjacent targets."}${flameArrowUsed ? ` Flame Arrows expends a shot; ${flameArrowRemaining} remain.` : ""}`, ...landed.some((outcome) => outcome.pushed?.fallDamage) ? [`The knockback causes ${landed.reduce((sum, outcome) => sum + (outcome.pushed?.fallDamage || 0), 0)} bludgeoning fall damage.`] : [], ...lines].slice(0, 6));
    setChosen(null);
    if (sk?.name === "Zephyr Strike") { setMovementSpent(effectiveMovement(active)); setPhase("move"); }
    else setPhase("facing");
  };
  const barrierAimPoint = (barrier: Barrier) => {
    if (!barrier.edgeKey) return { x: barrier.x, y: barrier.y };
    const [edgeX, edgeY, side] = barrier.edgeKey.split(",");
    const x = Number(edgeX), y = Number(edgeY);
    const adjacent = side === "n"
      ? [{ x, y }, { x, y: y - 1 }]
      : [{ x, y }, { x: x - 1, y }];
    return adjacent.sort((a, b) => attackDist(active || barrier, a) - attackDist(active || barrier, b))[0];
  };
  const attackBarrierTarget = (barrier: Barrier) => {
    if (!active || active.team !== "hero" || barrier.hp <= 0) return;
    if (phase !== "action" || chosen?.kind !== "attack") {
      setLog((lines) => [`Choose Attack, then click the ${barrier.name}.`, ...lines].slice(0, 6));
      return;
    }
    const aim = barrierAimPoint(barrier);
    if (attackDist(active, aim) > (activeWeapon?.range || active.range)) {
      setLog((lines) => [`${barrier.name} is out of range.`, ...lines].slice(0, 6));
      return;
    }
    if (!clearLine(active, aim, true)) {
      setLog((lines) => [`Something blocks the line to the ${barrier.name}.`, ...lines].slice(0, 6));
      return;
    }
    const damage = Math.ceil(barrier.maxHp / 5);
    animateSprite(active.id, "attack", 620);
    setBarriers((current) => current.map((candidate) => candidate.id === barrier.id
      ? { ...candidate, hp: Math.max(0, candidate.hp - damage) }
      : candidate));
    setLog((lines) => [
      `${active.name} strikes the ${barrier.name} for ${damage}.`,
      ...lines,
    ].slice(0, 6));
    showCombatBark(active.id, barrier.hp <= damage ? "The way is open!" : "Break it down!");
    if (barrier.id === floodRoomHazard?.barrier.id && barrier.hp <= damage) {
      setFiredMapEvents((events) => [...new Set([...events, "room-33-flood-drained"])]);
      setAmbientMessage("FLOODGATE DESTROYED · WATER DRAINING");
      scheduleCutscene(() => setAmbientMessage(null), 2200);
      setLog((lines) => ["The floodgate breaks. Water tears through AH63 and drains into the hallway.", ...lines].slice(0, 6));
    }
    setChosen(null);
    setPhase("facing");
  };
  const tileClick = (x: number, y: number) => {
    if (runtimeNow() < suppressBoardClicksUntilRef.current) return;
    if (stage === "deploy") {
      place(x, y);
      return;
    }
    const barrierTarget = villageBattle || dungeonMode
      ? barriers.find((barrier) => barrier.hp > 0 && barrier.x === x && barrier.y === y)
      : undefined;
    if (barrierTarget && phase === "action" && chosen?.kind === "attack" && active?.team === "hero") {
      attackBarrierTarget(barrierTarget);
      return;
    }
    if (stage !== "battle") return;
    if (mapPlaytest && teleportMode) {
      const teleportHero = units.find((unit) => unit.id === teleportHeroId && unit.team === "hero" && !unit.npc) ||
        units.find((unit) => unit.team === "hero" && !unit.npc);
      if (!teleportHero) {
        setLog((lines) => ["No party hero is available to teleport.", ...lines].slice(0, 6));
        return;
      }
      if (teleportHero.id !== teleportHeroId) setTeleportHeroId(teleportHero.id);
      const landing = Array.from({ length: boardCols * boardRows }, (_, index) => ({
        x: index % boardCols,
        y: Math.floor(index / boardCols),
      }))
        .map((point) => dust2MapActive ? dust2PreferredPositionAt(teleportHero, point.x, point.y) : point)
        .filter((point) => !currentBlocked.has(key(point.x, point.y)) && !units.some((unit) =>
          !unit.downed && unit.id !== teleportHero.id && (!dust2MapActive || dust2SharesSurface(unit, point)) && unitOccupiesTile(unit, point.x, point.y)
        ))
        .sort((a, b) =>
          attackDist(a, { x, y }) - attackDist(b, { x, y }) ||
          dist(a, { x, y }) - dist(b, { x, y }),
        )[0];
      if (!landing) {
        setLog((lines) => ["No walkable teleport landing is available.", ...lines].slice(0, 6));
        return;
      }
      setUnits((current) =>
        current.map((unit) =>
          unit.id === teleportHero.id
            ? { ...unit, ...landing, ...(dust2MapActive ? dust2PositionState(landing) : {}), hp: Math.max(1, unit.hp), downed: false }
            : unit,
        ),
      );
      setLog((lines) => [
        `${teleportHero.name} teleports to the nearest clear tile, ${gridColumnLabel(landing.x)}${landing.y + 1}. Teleport remains active; press Resume Normal Movement to walk.`,
        ...lines,
      ].slice(0, 6));
      return;
    }
    if (victory || defeat || chapterIntro || poisonCutscene || (!!encounterSequenceLabel && !dungeonPlaytest)) return;
    const selectedSkill = chosen?.kind === "skill" ? active?.skills[chosen.i!] : null;
    const segmentPlacementDefinition = selectedSkill ? mechanicFor(selectedSkill.name)?.placement : undefined;
    if (phase === "action" && active && selectedSkill && segmentPlacementDefinition?.kind === "segment") {
      if (!wallStart || wallStart.skillIndex !== chosen!.i) { if (attackDist(active, { x, y }) > effectiveSkillRange(active, selectedSkill) || !clearLine(active, { x, y })) { setLog((lines) => ["That wall endpoint is out of range or blocked.", ...lines].slice(0, 6)); return; } setWallStart({ x, y, skillIndex: chosen!.i! }); setLog((lines) => [`${selectedSkill.name}: choose the other end of the wall.`, ...lines].slice(0, 6)); return; }
      const end = { x, y }, placement = segmentPlacement(wallStart, end, segmentPlacementDefinition.maxLengthSquares);
      if (!placement.valid || attackDist(active, end) > effectiveSkillRange(active, selectedSkill) || !clearLine(active, end)) { setLog((lines) => [placement.distanceSquares === 0 ? "Point B must be different from Point A." : `Point B must be visible, in casting range, and no more than ${segmentPlacementDefinition.maxLengthSquares * 5} feet from Point A.`, ...lines].slice(0, 6)); return; }
      setWallStart(null); resolveArea(selectedSkill, chosen!.i!, end.x, end.y, placement.tiles, wallStart); return;
    }
    if (phase === "action" && active && selectedSkill?.movement === "teleport" && chosen?.kind === "skill") {
      const destination = dust2MapActive ? dust2PreferredPositionAt(active, x, y) : { x, y }, occupied = units.some((unit) => unit.id !== active.id && (!dust2MapActive || dust2SharesSurface(unit, destination)) && unitOccupiesTile(unit, x, y));
      const error = kelimTeleportIssue({ charges: selectedSkill.charges, sameTile: x === active.x && y === active.y && (!dust2MapActive || dust2SamePosition(active, destination)), distance: attackDist(active, destination), range: vfxGalleryMode ? Math.max(boardCols, boardRows) : effectiveSkillRange(active, selectedSkill), open: !(dungeonMode && (!dungeonOpen.has(key(x, y)) || (!dungeonPlaytest && !revealedTileSet.has(key(x, y))))) && !currentBlocked.has(key(x, y)), occupied, visible: vfxGalleryMode || clearLine(active, destination) });
      if (error) { setLog((lines) => [error, ...lines].slice(0, 6)); return; }
      setUnits((current) => current.map((unit) => unit.id === active.id ? { ...unit, ...destination, ...(dust2MapActive ? dust2PositionState(destination) : {}), skills: unit.skills.map((skill, index) => index === chosen.i ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) } : unit));
      setAbilityVfx({ name: selectedSkill.name, from: { x: active.x, y: active.y }, to: { x, y }, nonce: runtimeNow() });
      scheduleCutscene(() => setAbilityVfx(null), 1600);
      if (selectedSkill.name !== "Leap of the Clouds") { setTeleportingUnitId(active.id); scheduleCutscene(() => setTeleportingUnitId(null), 1650); }
      animateSprite(active.id, "cast", 1650); playSound("spell");
      setLog((lines) => [`${active.name} uses ${selectedSkill.name} to reach ${gridColumnLabel(x)}${y + 1}.`, ...lines].slice(0, 6));
      const pantryTriggered = triggerPantryTeleport({ ...active, x, y });
      const landingTrap = pointsOfInterest.find((point) => !pantryTriggered && point.kind === "trap" && point.id !== "heart-acid" && point.id !== "proximity-bomb" && !(point.id === "spiked-pit-28d" && firedMapEvents.includes(SPIKE_PIT_PRESENTATION.triggeredFlag)) && point.x === x && point.y === y && !resolvedPoi.includes(point.id));
      if (landingTrap) triggerDungeonTrap(landingTrap, { ...active, x, y });
      if (active.team === "hero" && !active.npc) recordHeroCombat(active.id, { abilitiesUsed: 1 });
      setChosen(null); setPhase("facing");
      return;
    }
    const clickedMoveRoute = phase === "move" && active && reachable(x, y) ? routeTo(active, x, y, true) : null, clickedMoveDestination = clickedMoveRoute?.path.at(-1);
    const livingTargets = units.filter((u) => !u.downed && playerView.isUnitVisible(u) && unitOccupiesTile(u, x, y) && (phase !== "move" || !dust2MapActive || !clickedMoveDestination || dust2SharesSurface(u, clickedMoveDestination)));
    if (livingTargets.length > 1) {
      setOverlapSelection({ x, y, unitIds: livingTargets.map((unit) => unit.id) });
      return;
    }
    const livingTarget = livingTargets[0];
    const downedTarget = units.find((u) => u.downed && playerView.isUnitVisible(u) && unitOccupiesTile(u, x, y));
    if (livingTarget?.id === SCHOOL_TEACHER_ID && livingTarget.team === "neutral" && firedMapEvents.includes("school-diploma-earned")) {
      showDialogueBubble(livingTarget.id, "Class dismissed. Miraculously.");
      return;
    }
    if (livingTarget?.id === SCHOOL_TEACHER_ID && livingTarget.team === "enemy" && phase === "move") {
      setPhase("action");
      setChosen({ kind: "attack" });
      setInspect(null);
      setLog((lines) => ["Professor Grin is hostile. Attack selected—click her again to strike.", ...lines].slice(0, 6));
      return;
    }
    if (
      campaignScene === 2 &&
      encounterMode === "exploration" &&
      encounterCleared &&
      x === woundedGuardTile.x &&
      y === woundedGuardTile.y
    ) {
      if (!active || active.team !== "hero" || active.npc || active.downed || attackDist(active, woundedGuardTile) > 1) {
        setLog((lines) => ["Move a conscious hero beside the wounded guard first.", ...lines].slice(0, 6));
        return;
      }
      if (leaderDowned) {
        setLog((lines) => ["Revive the company leader before continuing the campaign.", ...lines].slice(0, 6));
        return;
      }
      showDialogueBubble(active.id, "One guard still breathes.", () => {
        chooseGuardSpeaker(active.id);
      });
      return;
    }
    // Units and valid destinations underneath annotations retain priority.
    if (
      (campaignScene === 3 || campaignScene === 8) &&
      ritualActive &&
      active?.team === "hero" &&
      attackDist(active, ritualTile) <= 1 &&
      attackDist({ x, y }, ritualTile) <= 1
    ) {
      setRitualSelected(true);
      return;
    }
    // Downed allies remain selectable for healing, but do not block movement.
    const target =
      livingTarget ||
      (phase === "action" &&
      selectedSkill?.kind === "heal" &&
      downedTarget?.team === active?.team
        ? downedTarget
        : undefined);
    if (phase === "move") {
      if (target) {
        if (target.id === "halleth" && !resolvedPoi.includes("halleth-pit")) {
          if (HALLETH_DIALOGUE_FLAGS.some((flag) => !firedMapEvents.includes(flag))) {
            openScriptedEncounter(
              "halleth-bard",
              firedMapEvents.includes("halleth-bard-met") ? "Any other requests while I am still trapped down here?" : undefined,
            );
            return;
          }
          setInspectPoi("halleth-pit");
          return;
        }
        setInspect(target.id);
        return;
      }
      if (reachable(x, y)) {
        const route = clickedMoveRoute || routeTo(active, x, y, true);
        const firstTrapIndex = route.path.findIndex((step) =>
          pointsOfInterest.some((point) =>
            point.kind === "trap" &&
            point.id !== "heart-acid" &&
            !(point.id === "spiked-pit-28d" && firedMapEvents.includes(SPIKE_PIT_PRESENTATION.triggeredFlag)) &&
            point.id !== "proximity-bomb" &&
            point.x === step.x &&
            point.y === step.y &&
            !resolvedPoi.includes(point.id),
          ),
        );
        const movementEventFlags = new Set(firedMapEvents);
        const pendingRoomEntries = dungeonMode
          ? route.path.map((step) => pendingDungeonRoomEntryAt(step, movementEventFlags))
          : [];
        const firstRoomEntryIndex = pendingRoomEntries.findIndex((roomId) => !!roomId);
        const enteredRoomId = firstRoomEntryIndex >= 0 ? pendingRoomEntries[firstRoomEntryIndex] : null;
        const firstBossDoorwayIndex = dungeonMode && bossHasArrived &&
          !firedMapEvents.includes("two-headed-king-engaged")
          ? route.path.findIndex((step) => bossEngagementDoorwayKeys.has(key(step.x, step.y)))
          : -1;
        const bombResolved = resolvedPoi.includes("proximity-bomb");
        const bombArmed = firedMapEvents.includes("proximity-bomb-armed");
        const firstBombEntryIndex = dungeonMode && !bombResolved && !bombArmed && !inProximityBombRoom(active)
          ? route.path.findIndex(inProximityBombRoom)
          : -1;
        const firstSchoolDoorwayIndex = dungeonMode && !firedMapEvents.includes("school-class-started")
          ? route.path.findIndex((step) => step.x === 7 && step.y === schoolDoorwayY)
          : -1;
        const teleportTrap = DUNGEON_LANDMARKS.pantryTeleportTrap;
        const firstTeleportTrapIndex = dungeonMode && firedMapEvents.includes(teleportTrap.activatesAfter) &&
          !firedMapEvents.includes("room-34-teleport-triggered")
          ? route.path.findIndex((step) => step.x === teleportTrap.point.x && step.y === teleportTrap.point.y)
          : -1;
        const stopIndices = [firstTrapIndex, firstRoomEntryIndex, firstBombEntryIndex, firstBossDoorwayIndex, firstSchoolDoorwayIndex, firstTeleportTrapIndex]
          .filter((index) => index >= 0);
        const firstStopIndex = stopIndices.length ? Math.min(...stopIndices) : -1;
        const travelPath = firstStopIndex >= 0 ? route.path.slice(0, firstStopIndex + 1) : route.path;
        if (travelPath.length && dust2Objective.defusingActorId === active.id)
          setDust2Objective((state) => cancelDust2Defuse(state, active.id));
        const movement = moveAlongRoute(
          active,
          travelPath,
          movementBudget,
          units,
        );
        const movedUnit = movement.mover;
        const leftResetPit = active.x === DUNGEON_LANDMARKS.hallethPit.point.x && active.y === DUNGEON_LANDMARKS.hallethPit.point.y &&
          (movedUnit.x !== active.x || movedUnit.y !== active.y) && firedMapEvents.includes("halleth-rescued");
        if (leftResetPit) setFiredMapEvents((events) => [...new Set([...events.filter((event) => event !== "halleth-bars-open"), "halleth-bars-reset"])]);
        if (firedMapEvents.includes("room-33-secret-arrival-safe") && floodRoomTileKeys.has(key(active.x, active.y)) && !floodRoomTileKeys.has(key(movedUnit.x, movedUnit.y))) setFiredMapEvents((events) => events.filter((event) => event !== "room-33-secret-arrival-safe"));
        const completedGuardianPasses = [1, 2, 3].filter((pass) => firedMapEvents.includes(`wandering-guardian-pass-${pass}-complete`)).length;
        const enteredGuardianTrigger = dungeonMode &&
          movedUnit.x === shieldGuardianTrigger.x && movedUnit.y === shieldGuardianTrigger.y &&
          !wanderingGuardian &&
          completedGuardianPasses < 3;
        const autoEnteredSchool = dungeonMode && !firedMapEvents.includes("school-class-started") &&
          movedUnit.x === 7 && movedUnit.y === schoolDoorwayY &&
          !movement.units.some((unit) => unit.id !== movedUnit.id && !unit.downed && unitOccupiesTile(unit, 6, schoolDoorwayY));
        if (autoEnteredSchool) {
          setFiredMapEvents((events) => [...new Set([...events, "school-auto-entry"])]);
          setLog((lines) => [`${active.name} reaches the classroom doorway at H76. The company files slowly through G76.`, ...lines].slice(0, 6));
        }
        const reachedPathIndex = travelPath.findIndex((step) => dust2MapActive ? dust2SamePosition(step, movedUnit) : step.x === movedUnit.x && step.y === movedUnit.y);
        const traveledSteps = reachedPathIndex >= 0 ? travelPath.slice(0, reachedPathIndex + 1) : [];
        const looseFlagPosition = dust2LooseFlagPosition(dust2Objective), crossedDust2Flag = dust2MapActive && !!looseFlagPosition && !dust2Objective.secured && (!dust2FreeplayMatch || !dust2ActiveFaction || dust2TeamSide(dust2FreeplayMatch, dust2ActiveFaction) === "attack") &&
          [active, ...traveledSteps].some((step) => step.x === looseFlagPosition.x && step.y === looseFlagPosition.y);
        if (crossedDust2Flag) {
          setDust2Objective((state) => pickUpDust2Flag(state, active.id));
          setLog((lines) => [`${active.name} picks up The One True Flag. Reach Site A at G6 or Site B at AA7.`, ...lines].slice(0, 6));
        }
        if (dungeonMode && !firedMapEvents.includes("kelim-first-plea-seen") && [active, ...traveledSteps].some((step) => step.x === KELIM_SIGHTING_TRIGGER.x && step.y === KELIM_SIGHTING_TRIGGER.y)) {
          setFiredMapEvents((events) => [...new Set([...events, "kelim-first-plea-seen"])]); setRevealedTiles((tiles) => [...new Set([...tiles, key(KELIM_CLOSET_POINT.x, KELIM_CLOSET_POINT.y)])]); setKelimFirstPleaOpen(true);
          scheduleCutscene(() => { const board = battlefieldRef.current; if (board) { board.scrollLeft = Math.max(0, KELIM_CLOSET_POINT.x * 52 * mapZoom - board.clientWidth / 2); board.scrollTop = Math.max(0, KELIM_CLOSET_POINT.y * 52 * mapZoom - board.clientHeight / 2); updateDungeonViewport(board); } }, 100); scheduleCutscene(() => { setKelimFirstPleaOpen(false); const board = battlefieldRef.current; if (board) { board.scrollLeft = Math.max(0, movedUnit.x * 52 * mapZoom - board.clientWidth / 2); board.scrollTop = Math.max(0, movedUnit.y * 52 * mapZoom - board.clientHeight / 2); updateDungeonViewport(board); } }, 5600);
        }
        const bombTravel = [active, ...traveledSteps];
        const enteredBombRange = dungeonMode && !bombResolved && bombTravel.some(inProximityBombRoom);
        const leftBombRange = dungeonMode && !bombResolved && bombArmed && bombTravel.some((point, index) =>
          index > 0 && inProximityBombRoom(bombTravel[index - 1]) && !inProximityBombRoom(point));
        const crossedHollowGoldTile = reachedPathIndex >= 0 && travelPath
          .slice(0, reachedPathIndex + 1)
          .some((step) => step.x === westernGoldCache.x && step.y === westernGoldCache.y);
        if (dungeonMode && crossedHollowGoldTile && !discoveredPoi.includes("gold-cache") && !resolvedPoi.includes("gold-cache")) {
          playSound("door");
          setDiscoveredPoi((ids) => [...new Set([...ids, "gold-cache"])]);
          showDialogueBubble(active.id, "Click. That floor tile is hollow.");
          setLog((lines) => [`${active.name}'s boot makes the floor tile at R62 click against something hollow underneath.`, ...lines].slice(0, 6));
        }
        if (movement.pukeDamage) {
          playSound("impact");
          showCombatBark(active.id, "SQUELCH.", 1100);
        }
        const dx = movedUnit.x - active.x, dy = movedUnit.y - active.y;
        const movedFacing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n");
        const triggeredTeleportTrap = firedMapEvents.includes(teleportTrap.activatesAfter) &&
          !firedMapEvents.includes("room-34-teleport-triggered") &&
          movedUnit.x === teleportTrap.point.x && movedUnit.y === teleportTrap.point.y;
        const finalMovedUnits = movement.units.map((u) => {
          return u.id === active.id
            ? {
                ...u,
                ...(triggeredTeleportTrap ? teleportTrap.destination : {}),
                facing:
                  encounterMode === "exploration" && movement.spent > 0
                    ? movedFacing
                    : u.facing,
              }
            : u;
        });
        const animatedBridgeExplorationWalk =
          campaignScene === 6 &&
          encounterMode === "exploration" &&
          traveledSteps.length > 1;
        const animatedDust2Walk = dust2MapActive && traveledSteps.length > 0;
        const animatedWalkDuration = animatedBridgeExplorationWalk || animatedDust2Walk
          ? animateComputedMove(active, travelPath, movedUnit, finalMovedUnits, animatedDust2Walk ? 75 : 140)
          : 0;
        if (animatedBridgeExplorationWalk || animatedDust2Walk) {
          suppressBoardClicksUntilRef.current = runtimeNow() + animatedWalkDuration + 100;
        } else {
          animateSprite(active.id, "walk", 560);
          setUnits(finalMovedUnits);
        }
        if (triggeredTeleportTrap) triggerPantryTeleport({ ...active, x: movedUnit.x, y: movedUnit.y });
        if (autoEnteredSchool) {
          const classroomOrder = [active.id, ...finalMovedUnits
            .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && unit.id !== active.id)
            .map((unit) => unit.id)].slice(0, schoolStudentDesks.length);
          setChapterIntro(true);
          const walkDurations = classroomOrder.map((unitId, index) => {
            const student = finalMovedUnits.find((unit) => unit.id === unitId);
            const desk = schoolStudentDesks[index];
            if (!student || !desk) return 0;
            const hallDoor = { x: 7, y: schoolDoorwayY };
            const roomDoor = { x: 6, y: schoolDoorwayY };
            const hallwayPath = student.x === hallDoor.x && student.y === hallDoor.y
              ? []
              : scenePath(student, hallDoor, currentBlocked, boardCols, boardRows);
            const deskPath = scenePath(roomDoor, desk, currentBlocked, boardCols, boardRows);
            return animateSceneWalk(unitId, [...hallwayPath, roomDoor, ...deskPath], index * 160, 340);
          });
          const classroomWalkDuration = Math.max(0, ...walkDurations);
          suppressBoardClicksUntilRef.current = runtimeNow() + classroomWalkDuration + 400;
          scheduleCutscene(() => {
            setPendingDungeonRoomId("24a");
            setChapterIntro(false);
          }, classroomWalkDuration + 220);
        }
        if (enteredRoomId) setPendingDungeonRoomId(enteredRoomId);
        if (enteredGuardianTrigger) {
          const guardianPath = shieldGuardianPatrol.filter((point) => dungeonOpen.has(key(point.x, point.y)));
          if (guardianPath.length >= 4) {
            const pass = completedGuardianPasses + 1;
            setFiredMapEvents((events) => [...new Set([...events, "wandering-guardian", `wandering-guardian-pass-${pass}`])]);
            setWanderingGuardian({ path: guardianPath, step: 0, pass });
            setLog((lines) => [shieldGuardianPassText[pass - 1].sighting, ...lines].slice(0, 6));
          }
        }
        if (!bombArmed && enteredBombRange) {
          setFiredMapEvents((events) => [...new Set([...events, "proximity-bomb-armed"])]);
          setDiscoveredPoi((ids) => [...new Set([...ids, "proximity-bomb"])]);
          setAmbientMessage("A SMALL NUKE DROPS ONTO THE PLATFORM · THE ROOM ARMS");
          scheduleCutscene(() => setAmbientMessage(null), 2800);
          showDialogueBubble(active.id, "That thing just changed position. Nobody leave the room.");
          setLog((lines) => ["A small nuke drops onto the stable platform at J64. Crossing the doorway will detonate every square in the room; another nuke drops once the empty room rearms.", ...lines].slice(0, 6));
        }
        if (leftBombRange) {
          const blastDamage = 35;
          const nukeProofHeroes = finalMovedUnits.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && inProximityBombRoom(unit) && itemsGrantHazardImmunity(dungeonItems[unit.id], "proximity-nuke")).map((unit) => unit.name);
          setProximityBombAnimation("exploding");
          scheduleCutscene(() => setProximityBombAnimation("resetting"), 360);
          scheduleCutscene(() => setProximityBombAnimation("idle"), 1150);
          const roomStillOccupied = finalMovedUnits.some((unit) => unit.team === "hero" && !unit.npc && !unit.downed && inProximityBombRoom(unit));
          setUnits((current) => current.map((unit) =>
            unit.team === "hero" && !unit.npc && !unit.downed && inProximityBombRoom(unit) && !itemsGrantHazardImmunity(dungeonItems[unit.id], "proximity-nuke")
              ? { ...unit, ...combatDamageOutcome(unit, damageAfterProtection(unit, blastDamage, "fire")) }
              : unit,
          ));
          if (!roomStillOccupied) setFiredMapEvents((events) => [...new Set([...events.filter((event) => event !== "proximity-bomb-armed"), "proximity-bomb-reset"])]);
          playSound("trap");
          pushGameFeedback("trap", "PROXIMITY BOMB", nukeProofHeroes.length ? `${nukeProofHeroes.join(", ")} survives in the Wife-Beater · everyone else takes ${blastDamage}` : `${active.name} escaped · everyone remaining takes ${blastDamage}`);
          setAmbientMessage("THE SMALL NUKE DETONATES · THE PLATFORM REMAINS");
          scheduleCutscene(() => setAmbientMessage(null), 2200);
          setLog((lines) => [`${active.name} leaves the J64 bomb room. The nuke engulfs all nine squares for ${blastDamage} damage${nukeProofHeroes.length ? `, but ${nukeProofHeroes.join(", ")}'s Wife-Beater absorbs the blast` : ""}, then ${roomStillOccupied ? "stays armed" : "the stable platform rearms in the empty room"}.`, ...lines].slice(0, 6));
        }
        if (autoEnteredSchool) {
          setRevealedTiles((tiles) => [...new Set([
            ...tiles,
            ...Array.from({ length: schoolFloorZone.width * schoolFloorZone.height }, (_, index) => key(
              schoolFloorZone.left + (index % schoolFloorZone.width),
              schoolFloorZone.top + Math.floor(index / schoolFloorZone.width),
            )),
          ])]);
          setLog((lines) => ["The company walks through the classroom door and takes its assigned desks.", ...lines].slice(0, 6));
        }
        const steppedTrap = pointsOfInterest.find(
          (p) =>
            p.kind === "trap" &&
            p.id !== "heart-acid" &&
            !(p.id === "spiked-pit-28d" && firedMapEvents.includes(SPIKE_PIT_PRESENTATION.triggeredFlag)) &&
            p.id !== "proximity-bomb" &&
            p.x === movedUnit.x &&
            p.y === movedUnit.y &&
            !resolvedPoi.includes(p.id),
        );
        if (!movedUnit.downed && steppedTrap) {
          triggerDungeonTrap(steppedTrap, { ...active, x: movedUnit.x, y: movedUnit.y });
          if (!infinitePlaytestMovement) setMovementSpent(effectiveMovement(active) * (dashActive ? 2 : 1));
          setPhase("action");
        }
        if (
          campaignScene === 2 &&
          encounterMode === "exploration" &&
          encounterCleared &&
          !guardSpeakerId &&
          !movedUnit.downed &&
          attackDist(movedUnit, woundedGuardTile) <= 1
        ) {
          if (leaderDowned) {
            setLog((lines) => ["The guard is close, but the company cannot continue without its fallen leader.", ...lines].slice(0, 6));
          } else {
            showDialogueBubble(movedUnit.id, "One guard still breathes.", () => {
              chooseGuardSpeaker(movedUnit.id);
            });
          }
        }
        if (
          (campaignScene === 3 || campaignScene === 8) &&
          ritualActive &&
          !movedUnit.downed &&
          attackDist(movedUnit, ritualTile) <= 1
        ) {
          setRitualSelected(true);
        }
        const reachedVillageExit =
          campaignScene === 4 &&
          movedUnit.y === 1 &&
          (movedUnit.x === 6 || movedUnit.x === 7);
        const reachedRitualExit =
          (campaignScene === 3 || campaignScene === 8) &&
          ritualExitKeys.has(key(movedUnit.x, movedUnit.y));
        const reachedDust2Exit = dust2MapActive && dust2Objective.secured && (!levelTwoMode || levelTwoExitIsOpen(firedMapEvents)) &&
          movedUnit.x === DUST2_SECRET_EXIT.x && movedUnit.y === DUST2_SECRET_EXIT.y;
        const reachedActiveExit =
          reachedDust2Exit || encounterMode === "exploration" && encounterCleared &&
          (reachedVillageExit || reachedRitualExit ||
            (!dust2MapActive && campaignScene !== 2 && campaignScene !== 3 && campaignScene !== 4 && campaignScene !== 8 &&
              movedUnit.x === exitTile.x && movedUnit.y === exitTile.y));
        const completeActiveExit = () => {
          if (leaderDowned) {
            setLeaderAbandoned(true);
            setLog((lines) => [
              "The company leaves its fallen leader behind. The thread of fate has been severed.",
              ...lines,
            ].slice(0, 6));
          } else if (reachedVillageExit && villageAftermath) {
            startBridgeScene();
          } else {
            setExitReached(true);
          }
        };
        if (reachedActiveExit) {
          if (animatedBridgeExplorationWalk) scheduleCutscene(completeActiveExit, animatedWalkDuration);
          else completeActiveExit();
        }
        if (!steppedTrap && !infinitePlaytestMovement) setMovementSpent((spent) => normalizeMovementCost(spent + movement.spent));
        setLog((l) =>
          [
            ...movement.logs,
            movedUnit.downed
              ? `${active.name} is downed before escaping melee range.`
              : `${active.name} moves to ${gridColumnLabel(movedUnit.x)}${movedUnit.y + 1}.`,
            ...l,
          ].slice(0, 6),
        );
      }
    } else if (phase === "action" && target && chosen) {
      const sk = chosen.kind === "skill" ? active.skills[chosen.i!] : null;
      if (sk?.area) {
        const cardinal = sk.area !== "line" || isLineAim(active, { x, y });
        if (
          cardinal &&
          (vfxGalleryMode || attackDist(active, { x, y }) <= effectiveSkillRange(active, sk)) &&
          (vfxGalleryMode || clearLine(active, { x, y }))
        )
          resolveArea(sk, chosen.i!, x, y);
        return;
      }
      const valid =
        sk?.kind === "heal"
          ? target.team === active.team
          : target.team !== active.team;
      if (
        valid &&
        (vfxGalleryMode || sk?.mapWide || attackDist(active, target) <= (sk ? effectiveSkillRange(active, sk) : activeWeapon?.range || active.range)) &&
        (vfxGalleryMode || (sk ? effectiveSkillRange(active, sk) : activeWeapon?.range || active.range) > 1 ||
          (dust2MapActive ? dust2MeleeSpaceCompatible(active, target) : Math.abs(currentHeight[active.y][active.x] - currentHeight[target.y][target.x]) <= 5)) &&
        (vfxGalleryMode || sk?.mapWide || clearLine(active, target))
      )
        resolve(target);
      else {
        const reason = attackDist(active, target) > (sk ? effectiveSkillRange(active, sk) : activeWeapon?.range || active.range)
          ? "out of range"
          : !clearLine(active, target)
            ? "not in clear line of sight"
            : "not a valid target";
        setInspect(null);
        setLog((lines) => [`${target.name} is ${reason}. The attack was not spent.`, ...lines].slice(0, 6));
      }
    } else if (
      phase === "action" &&
      chosen?.kind === "skill" &&
      active.skills[chosen.i!]?.area
    ) {
      const sk = active.skills[chosen.i!],
        cardinal = sk.area !== "line" || isLineAim(active, { x, y });
      if (
        cardinal &&
        (vfxGalleryMode || attackDist(active, { x, y }) <= effectiveSkillRange(active, sk)) &&
        (vfxGalleryMode || clearLine(active, { x, y }))
      )
        resolveArea(sk, chosen.i!, x, y);
    } else if (target) setInspect(target.id);
    else if (downedTarget) setInspect(downedTarget.id);
  };
  useDeferredEffect(() => {
    const command = multiplayer.pendingCommand;
    if (multiplayer.role !== "host" || !command) return;
    if (command.type === "state") { continueCampaign(command.snapshot); void multiplayer.acknowledge(command.seq, command.snapshot); return; }
    if (active?.id !== command.heroId || active.team !== "hero" || active.npc || active.downed) { void multiplayer.acknowledge(command.seq); return; }
    if (command.type === "move") { tileClick(command.x, command.y); void multiplayer.acknowledge(command.seq); return; }
    pendingMultiplayerAttack.current = command; setPhase("action"); setChosen({ kind: "attack" });
  }, [multiplayer.pendingCommand]);
  useDeferredEffect(() => {
    const command = pendingMultiplayerAttack.current;
    if (!command || phase !== "action" || chosen?.kind !== "attack") return;
    pendingMultiplayerAttack.current = null; tileClick(command.x, command.y); void multiplayer.acknowledge(command.seq);
  }, [phase, chosen]);
  useDeferredEffect(() => {
    const bomb = droppedDungeonItems.find((item) => item.id.startsWith("portable-proximity-bomb:")); if (!bomb) return;
    const ownerId = bomb.id.slice("portable-proximity-bomb:".length), owner = units.find((unit) => unit.id === ownerId && !unit.downed);
    const tiles = skillAreaTiles("square", 1, bomb, bomb, boardCols, boardRows, () => true); if (!shouldDetonatePortableBomb(tiles, owner)) return;
    const targets = units.filter((unit) => !unit.downed && canTakeCombatDamage(unit) && tiles.some((tile) => unitOccupiesTile(unit, tile.x, tile.y))), groups = new Set(targets.filter((unit) => unit.team === "neutral" && unit.encounterGroup).map((unit) => unit.encounterGroup!));
    setDroppedDungeonItems((items) => items.filter((item) => item.id !== bomb.id)); markEncounterGroupsHostile(groups); playSound("trap"); setPortableBombBlast({ x: bomb.x, y: bomb.y, nonce: runtimeNow() });
    targets.forEach((target) => { const damage = damageAfterProtection(target, 35, "fire"); pushCombatFloat(target.id, `${damage}`, "damage"); if (target.team === "enemy" && target.hp <= damage) awardDungeonXp(target.xpReward || xpForCr(target.cr), ownerId, target.id); });
    setUnits((current) => current.map((unit) => { const hit = targets.find((target) => target.id === unit.id); if (!hit) return unit; const damage = damageAfterProtection(unit, 35, "fire"); return { ...unit, team: unit.team === "neutral" ? "enemy" as Team : unit.team, npc: unit.team === "neutral" ? false : unit.npc, ...combatDamageOutcome(unit, damage), lastDamagerId: ownerId }; }));
    setAmbientMessage("THE STOLEN NUKE DETONATES"); setLog((lines) => [`${owner?.name || "The Rogue"} clears the blast. The proximity bomb detonates across its 3×3 area.`, ...lines].slice(0, 6)); scheduleCutscene(() => { setPortableBombBlast(null); setAmbientMessage(null); }, 1100);
  }, [droppedDungeonItems, units]);
  useDeferredEffect(() => {
    if (!dungeonMode || !firedMapEvents.includes("proximity-bomb-armed") || resolvedPoi.includes("proximity-bomb")) return;
    if (units.some((unit) => unit.team === "hero" && !unit.npc && !unit.downed && inProximityBombRoom(unit))) return;
    setFiredMapEvents((events) => [...new Set([...events.filter((event) => event !== "proximity-bomb-armed"), "proximity-bomb-reset"])]);
  }, [dungeonMode, units, firedMapEvents, resolvedPoi]);
  useEffect(() => {
    const moveFromKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.matches("input, select, textarea, button") || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (stage !== "battle" || phase !== "move" || !active || active.team !== "hero" || active.npc || active.downed) return;
      if (hostWaitingForPlayerTwo) return;
      if (teleportMode || inspect || inventoryOpen || socialScene || bubble || noticeQueue.length || chapterIntro) return;
      const directions: Record<string, [number, number]> = {
        ArrowUp: [0, -1], KeyW: [0, -1], Numpad8: [0, -1],
        ArrowDown: [0, 1], KeyS: [0, 1], Numpad2: [0, 1],
        ArrowLeft: [-1, 0], KeyA: [-1, 0], Numpad4: [-1, 0],
        ArrowRight: [1, 0], KeyD: [1, 0], Numpad6: [1, 0],
        Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
      };
      const direction = directions[event.code] || directions[event.key];
      if (!direction) return;
      event.preventDefault();
      tileClick(active.x + direction[0], active.y + direction[1]);
    };
    window.addEventListener("keydown", moveFromKeyboard);
    return () => window.removeEventListener("keydown", moveFromKeyboard);
  });
  const attackBarrier = (barrier: Barrier, attacker: Unit) => {
    const dmg = Math.ceil(barrier.maxHp / 5);
    setBarriers((bs) =>
      bs.map((b) =>
        b.id === barrier.id ? { ...b, hp: Math.max(0, b.hp - dmg) } : b,
      ),
    );
    setLog((l) =>
      [
        `${attacker.name} tears into the ${barrier.name} for ${dmg}.`,
        ...l,
      ].slice(0, 6),
    );
    showCombatBark(
      attacker.id,
      barrier.hp <= dmg ? "The way is open!" : "Break it down!",
    );
  };
  useEffect(() => {
    if (isGuestReplicaActive() || stage !== "battle" || !active?.downed || victory || defeat) return;
    const timer = setTimeout(() => finishTurnRef.current(), 150);
    return () => clearTimeout(timer);
  }, [active?.id, active?.downed, round, stage, victory, defeat]);
  useDeferredEffect(() => {
    if (stage !== "battle" || !active?.stunned || victory || defeat) return;
    showCombatBark(active.id, "STUNNED!", 900);
    setLog((l) =>
      [`${active.name} is stunned and loses this turn.`, ...l].slice(0, 6),
    );
    // Clear the status only when the skip resolves. Clearing it immediately
    // retriggers this effect, cancels the timer in cleanup, and leaves combat
    // waiting forever on the stunned unit.
    const stunnedId = active.id;
    const timer = setTimeout(() => {
      setUnits((us) =>
        us.map((u) => (u.id === stunnedId ? { ...u, stunned: false } : u)),
      );
      finishTurnRef.current();
    }, 950);
    return () => clearTimeout(timer);
  }, [active?.id, active?.stunned, round, stage, victory, defeat]);
  const readyEncounterDirectiveIds = new Set(readyEncounterDirectives({
    stage,
    campaignScene,
    encounterMode,
    round,
    villageWave,
    villageWaveBreakUntil,
    flags: new Set(firedMapEvents),
    defeat,
    activeEnemyCount: units.filter((unit) => unit.team === "enemy" && !unit.downed).length,
    encounterCleared,
    forestWarningRound,
    dungeonMode,
    throneClaimable,
    bossHuntStarted,
    bossHasArrived,
    dungeonExplorationPercent,
    activeDungeonThreats,
    kingPresent: units.some((unit) => unit.encounterGroup === "39a"),
    kingEngageable: !!twoHeadedKing && units.some((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed &&
      bossEngagementDoorwayKeys.has(key(unit.x, unit.y)),
    ),
    kingBelowHalf: !!twoHeadedKing && twoHeadedKing.hp <= twoHeadedKing.maxHp / 2,
    manticoresExist: units.some((unit) => unit.encounterGroup === "16" && unit.role === "Manticore"),
    livingManticores: units.filter((unit) => unit.encounterGroup === "16" && unit.role === "Manticore" && !unit.downed).length,
    guardianPresent: !!wanderingGuardian,
    guardianReady: units.some((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed &&
      unit.x === shieldGuardianTrigger.x && unit.y === shieldGuardianTrigger.y,
    ),
    sceneBusy: !!socialScene || !!bubble?.persistent || !!noticeQueue.length || chapterIntro || !!encounterSequenceLabel,
    bridgeTargetDetected: campaignScene === 6 && !!active && units.some((unit) => unit.team === "enemy" && !unit.downed && attackDist(active, unit) <= 6),
    eyeHologramTriggered: units.some((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed &&
      unit.x === eyeHologramTrigger.x && unit.y === eyeHologramTrigger.y,
    ),
  }).map((directive) => directive.id));
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("village-wave-one")) return;
    const occupiedSpawns: { x: number; y: number }[] = [];
    const wave = ["Dire Wolf", "Dire Wolf", "Dire Wolf", "Dire Wolf"].map(
      (type, i) => {
        const wolf = spawnIntroWolf(type as "Dire Wolf", `village-wave1-${i}`, `Wolf ${i + 1}`);
        const center = villageWolfCenters[i % villageWolfCenters.length];
        const candidates = [
          { x: center.x, y: center.y }, { x: center.x + 1, y: center.y },
          { x: center.x - 1, y: center.y }, { x: center.x, y: center.y + 1 },
          { x: center.x, y: center.y - 1 },
        ];
        const position = candidates.find((p) =>
          p.x >= 0 && p.y >= 0 && p.x < VILLAGE_COLS && p.y < VILLAGE_ROWS &&
          !villageSceneryBlocked.has(key(p.x, p.y)) &&
          !occupiedSpawns.some((q) => q.x === p.x && q.y === p.y)
        ) || center;
        occupiedSpawns.push(position);
        wolf.x = position.x;
        wolf.y = position.y;
        return wolf;
      },
    );
    setFiredMapEvents((events) => [...events, "village-wave1-arrived"]);
    setUnits((current) => current.filter((unit) => unit.team !== "enemy"));
    setEnemyTypes(["Dire Wolf", "Dire Wolf", "Dire Wolf", "Dire Wolf"]);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setLog(["Growls circle the inn. Shapes emerge from separate approaches."]);
    runEncounterSequence(
      "Let the Pack Arrive",
      wave.map((wolf, index) => ({
        at: 180 + index * 260,
        run: () => setUnits((current) => [...current.filter((unit) => unit.id !== wolf.id), wolf]),
      })),
      1350,
      () => {
        setUnits((current) => [...current.filter((unit) => unit.team !== "enemy"), ...wave]);
        setFiredMapEvents((events) => [...new Set([...events, "village-wave1-ready"])]);
        setEncounterMode("combat");
        setChapterIntro(false); setAiBusy(false);
        setTurn(0);
        setPhase("move");
        setChosen(null);
        showCombatBark(
          wave[0].id,
          partyItemOwner("Werewolf Lycanthropy") ? "Break down the doors!" : "Grrr... Awooo!",
          1300,
        );
        scheduleCutscene(() => {
          setEncounterMode("combat");
          setAiBusy(false);
          setPhase("move");
        }, 80);
      },
    );
  }, [campaignScene, stage, round, firedMapEvents, defeat]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("village-rest-round")) return;
      setFiredMapEvents((events) => [...new Set([...events, "village-wave-break"])]);
      setVillageWaveBreakUntil(round + 2);
      setUnits((current) => current.filter((unit) => unit.team !== "enemy"));
      setEncounterMode("exploration");
      setAiBusy(false);
      setRound((current) => current + 1);
      setTurn(0);
      setPhase("move");
      setChosen(null);
      setLog(["The first pack falls. The company has one full round to reposition before the alpha arrives."]);
      const speaker = units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
      if (speaker) showDialogueBubble(speaker.id, "Poor Jim.");
  }, [campaignScene, stage, villageWave, firedMapEvents, units, defeat, villageWaveBreakUntil, round]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("village-wave-two")) return;
      setFiredMapEvents((events) => [...new Set([...events, "village-wave2-starting"])]);
      setVillageWaveBreakUntil(null);
      const wave = [
        spawnIntroWolf("Werewolf", "village-werewolf", "Pack Alpha"),
        spawnIntroWolf("Dire Wolf", "village-wave2-1", "Ravager"),
        spawnIntroWolf("Dire Wolf", "village-wave2-2", "Nightfang"),
        spawnIntroWolf("Dire Wolf", "village-wave2-3", "Greyback"),
      ];
      const approaches = [
        ...villageWolfCenters.map(({ x, y }) => ({ x, y })),
        { x: villagePartyCenter.x, y: VILLAGE_ROWS - 1 },
      ];
      const occupiedWaveSpawns: { x: number; y: number }[] = [];
      wave.forEach((unit) => {
        const center = approaches[Math.floor(randomUnit() * approaches.length)];
        const nearby = [
          center, { x: center.x + 1, y: center.y }, { x: center.x - 1, y: center.y },
          { x: center.x, y: center.y + 1 }, { x: center.x, y: center.y - 1 },
        ];
        const position = nearby.find((p) =>
          p.x >= 0 && p.y >= 0 && p.x < VILLAGE_COLS && p.y < VILLAGE_ROWS &&
          !villageSceneryBlocked.has(key(p.x, p.y)) &&
          !occupiedWaveSpawns.some((q) => q.x === p.x && q.y === p.y)
        ) || center;
        occupiedWaveSpawns.push(position);
        unit.x = position.x;
        unit.y = position.y;
      });
      setUnits((us) => us.filter((u) => u.team !== "enemy"));
      setEnemyTypes(["Werewolf", "Dire Wolf", "Dire Wolf", "Dire Wolf"]);
      setVillageWave(2);
      setRound((r) => r + 1);
      setTurn(0);
      setPhase("move");
      setChosen(null);
      setLog(["A werewolf howls from the road. The second wave closes from every side!"]);
      runEncounterSequence(
        "Let the Alpha Arrive",
        wave.map((foe, index) => ({
          at: 180 + index * 260,
          run: () => setUnits((current) => [...current.filter((unit) => unit.id !== foe.id), foe]),
        })),
        1350,
        () => {
          setUnits((current) => [...current.filter((unit) => unit.team !== "enemy"), ...wave]);
          setFiredMapEvents((events) => [...new Set([...events, "village-wave2-arrived"])]);
          setEncounterMode("combat");
          setChapterIntro(false);
          setAiBusy(false);
          setTurn(0);
          setPhase("move");
          setChosen(null);
          showCombatBark("village-werewolf", partyItemOwner("Werewolf Lycanthropy") ? "Break down the doors!" : "Awooo! Grrrr!", 1500);
          scheduleCutscene(() => {
            setEncounterMode("combat");
            setAiBusy(false);
            setPhase("move");
          }, 80);
        },
      );
  }, [campaignScene, stage, villageWave, villageWaveBreakUntil, round, firedMapEvents, defeat]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("village-victory-cheer")) return;
    setFiredMapEvents((events) => [...new Set([...events, "village-wave2-cheered"])]);
    const survivors = units.filter((unit) => unit.npc && !unit.downed).slice(0, 4);
    const lines = ["Thank you!", "You saved us!", "We won't forget this.", "Thank you. All of you."];
    survivors.forEach((villager, index) =>
      scheduleCutscene(() => showCombatBark(villager.id, lines[index], 1200), 250 + index * 1300),
    );
    setLog((current) => ["The surviving villagers cheer inside the battered inn.", ...current].slice(0, 6));
  }, [campaignScene, stage, villageWave, firedMapEvents, units, defeat]);
  useDeferredEffect(() => {
    // Transient enemy timers must never survive into a hero/exploration turn.
    if (stage === "battle" && active?.team === "hero" && aiBusy) setAiBusy(false);
  }, [stage, active?.id, active?.team, active?.bossHead, aiBusy]);
  useDeferredEffect(() => {
    if (!chargedSpells.length) return;
    const livingIds = new Set(units.filter((unit) => !unit.downed).map((unit) => unit.id));
    if (chargedSpells.some((charge) => !livingIds.has(charge.unitId)))
      setChargedSpells((charges) => charges.filter((charge) => livingIds.has(charge.unitId)));
  }, [units, chargedSpells]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("eye-hologram")) return;
    setFiredMapEvents((events) => [...new Set([...events, "eye-hologram-awakened"])]);
    replayEyeHologram();
  }, [campaignScene, stage, units, firedMapEvents]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("combat-cleared")) return;
    gameTransitions.startExploration();
    setLog((l) => [
      campaignScene === 7
        ? "Combat ends. Undermountain remains open—keep exploring the floor."
        : `Combat ends. The area remains open—move a hero to the ${exitTile.label} exit when ready.`,
      ...l,
    ].slice(0, 6));
  }, [stage, encounterMode, encounterCleared, defeat, campaignScene]);
  useDeferredEffect(() => {
    if (stage !== "battle") return;
    const nearbyHeroes = units.filter(
      (unit) => unit.team === "hero" && !unit.npc && !unit.downed,
    );
    const newlyFound = pointsOfInterest.flatMap((point) => {
      if (discoveredPoi.includes(point.id)) return [];
      // The opening shrine is a visible, optional pickup. Merely walking near
      // it must not open or narrate its interaction; players inspect it by
      // clicking the prop when they choose.
      if (
        point.id === "forest-ruin-marker" ||
        point.id === "bridge-waystone" ||
        point.id === "gold-cache" ||
        point.id === "dead-mage" ||
        point.id === "halleth-pit" ||
        point.id.startsWith("hall-portrait-")
      ) return [];
      const finder = nearbyHeroes
        .filter(
          (hero) =>
            (point.kind === "trap"
              ? hero.role === "Rogue" && attackDist(hero, point) <= 2
              : isAnimalTracks(point)
                ? attackDist(hero, point) <= 1
              : attackDist(hero, point) <= Math.max(1, hero.investigation || 0)) &&
            clearLine(hero, point),
        )
        .sort(
          (a, b) =>
            (b.investigation || 0) - (a.investigation || 0) ||
            attackDist(a, point) - attackDist(b, point),
        )[0];
      return finder ? [{ point, finder }] : [];
    });
    if (!newlyFound.length) return;
    setDiscoveredPoi((ids) => [...ids, ...newlyFound.map(({ point }) => point.id)]);
    const { point, finder } = newlyFound[0];
    if (point.kind === "trap" && !firedMapEvents.includes("tutorial-rogue-traps")) {
      setFiredMapEvents((events) => [...new Set([...events, "tutorial-rogue-traps"])]);
      pushGameFeedback("trap", "ROGUE TRAP MARKING", "Rogues automatically mark hidden traps while moving nearby.");
    }
    setLog((l) => [
      point.kind === "trap"
        ? `${finder.name}'s Rogue instincts automatically mark ${point.name}.`
        : finder.role === "Ranger" && isAnimalTracks(point)
          ? `${finder.name} examines ${point.name}.`
        : `${finder.name}'s passive Investigation ${finder.investigation || 0} reveals ${point.name}.`,
      ...l,
    ].slice(0, 6));
    if (point.text) showDialogueBubble(finder.id, finder.role === "Ranger" && isAnimalTracks(point) ? rangerTrackCallout(point) : point.text);
    const forestTrackDiscovery = newlyFound.find(({ point: foundPoint }) =>
      foundPoint.id === "forest-wolf-tracks"
    );
    if (forestTrackDiscovery) {
      // Begin a clean setup round. The pack appears only after every hero has
      // had a turn to react to the tracks. This must not depend on which clue
      // happened to be first when several were discovered in one movement.
      setForestWarningRound(round);
      setTurn(0);
      setPhase("move");
      setChosen(null);
    }
  }, [stage, units, pointsOfInterest, discoveredPoi, firedMapEvents]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("forest-pack")) return;
    const forestEnemies = ["Dire Wolf", "Dire Wolf", "Dire Wolf", "Werewolf"];
    const foes = forestEnemies.map((type, i) => {
      const foe = spawnIntroWolf(type as "Dire Wolf" | "Werewolf", `forest-${type}-${i}`, type === "Werewolf" ? "The Werewolf" : `Wolf ${i + 1}`);
      const center = openingForestEnemyStarts[0] || { x: 16, y: 0 };
      const offsets = [[0, 0], [-1, 0], [0, 1], [-1, 1]];
      foe.x = Math.max(0, Math.min(FOREST_COLS - 1, center.x + offsets[i][0]));
      foe.y = Math.max(0, Math.min(FOREST_ROWS - 1, center.y + offsets[i][1]));
      return foe;
    });
    setForestWarningRound(null);
    setUnits((current) => [...current.filter((unit) => unit.team !== "enemy"), ...foes]);
    setEnemyTypes(forestEnemies);
    setEncounterMode("combat");
    setAiBusy(false);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setLog(["The brush erupts. The pack closes on the trail!"]);
  }, [campaignScene, forestWarningRound, round, encounterMode, defeat]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle") return;
    const next = new Set(revealedTiles);
    playerView.visibleNow.forEach((visible, index) => {
      if (visible) next.add(key(index % boardCols, Math.floor(index / boardCols)));
    });
    if (next.size !== revealedTiles.length) setRevealedTiles([...next]);
  }, [dungeonMode, stage, playerView.visibleNow, revealedTiles, boardCols]);
  useDeferredEffect(() => {
    if (!dungeonMode) return;
    setDroppedDungeonItems((items) => {
      const retained = items.filter((item) => !OBSOLETE_DUNGEON_DROP_IDS.has(item.id));
      return retained.length === items.length ? items : retained;
    });
  }, [dungeonMode]);
  // Restore ordinary room loot if an interrupted save recorded the room entry
  // but missed the item-spawn update. Encounter rewards remain encounter-owned.
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle") return;
    const ownedItems = new Set(Object.values(dungeonItems).flat());
    const additions = Object.entries(ROOM_BLUEPRINTS).flatMap(([label, room]) => {
      if (
        !firedMapEvents.includes(`room-${label}`) ||
        roomLifecycle(label, firedMapEvents) !== "resolved" ||
        room.actors?.length ||
        !room.rewards?.items.length
      ) return [];
      const point = dungeonRoomPoint(label);
      if (!point) return [];
      const missing = room.rewards.items.filter((item) => !ownedItems.has(item));
      if (!missing.length) return [];
      if (room.rewards.presentation === "chest")
        return [{ id: `room-loot-${label}-chest`, name: "Treasure Chest", contents: missing, ...point } satisfies DroppedDungeonItem];
      return missing.map((name, index) => ({ id: `room-loot-${label}-${index}`, name, ...point } satisfies DroppedDungeonItem));
    });
    if (!additions.length) return;
    setDroppedDungeonItems((current) => {
      const existing = new Set(current.map((item) => item.id));
      const missing = additions.filter((item) => !existing.has(item.id));
      return missing.length ? [...current, ...missing] : current;
    });
  }, [dungeonMode, stage, firedMapEvents, dungeonItems]);
  useEffect(() => {
    if (isGuestReplicaActive() || !dungeonMode || stage !== "battle") return;
    const triggers = readyMapTriggers(DUNGEON_MAP_TRIGGERS, {
      scope: "dungeon",
      flags: new Set(firedMapEvents),
      heroes: units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed),
      roomPoints: dungeonRoomPoints,
      explorationPercent: dungeonExplorationPercent,
      activeEnemyCount: units.filter((unit) => unit.team === "enemy" && !unit.downed).length,
    });
    triggers.flatMap((trigger) => trigger.effects).forEach((effect: MapTriggerEffect) => {
      if (effect.kind === "set-flag")
        setFiredMapEvents((events) => [...new Set([...events, effect.flag])]);
      else if (effect.kind === "log")
        setLog((lines) => [effect.text, ...lines].slice(0, 6));
      else if (effect.kind === "halaster") {
        if (effect.delay) scheduleCutscene(() => enqueueHalasterFromEffect(effect.text), effect.delay);
        else enqueueHalasterFromEffect(effect.text);
      }
      else if (effect.kind === "ambient") {
        setAmbientMessage(effect.text);
        scheduleCutscene(() => setAmbientMessage(null), effect.duration || 3200);
      } else if (effect.kind === "spawn-item")
        setDroppedDungeonItems((items) => items.some((item) => item.id === effect.id)
          ? items
          : [...items, { id: effect.id, name: effect.item, x: effect.x, y: effect.y }]);
    });
  }, [dungeonMode, stage, units, firedMapEvents, dungeonExplorationPercent, scheduleCutscene]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle") return;
    const repair = repairLegacyFightClub(units, firedMapEvents);
    if (!repair) return;
    setUnits(repair.units); setFiredMapEvents(repair.flags);
    if (!repair.otherBattleContinues) { setEncounterMode("exploration"); setTurn(0); setPhase("move"); setAiBusy(false); }
  }, [dungeonMode, stage, firedMapEvents, units]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle" || chapterIntro || roomEntryPresentation) return;
    const consciousHeroes = units.filter(
      (unit) => unit.team === "hero" && !unit.npc && !unit.downed,
    );
    const eventFlags = new Set(firedMapEvents);
    const pendingEntry = pendingDungeonRoomId && ROOM_BLUEPRINTS[pendingDungeonRoomId]
      ? {
          label: pendingDungeonRoomId,
          room: ROOM_BLUEPRINTS[pendingDungeonRoomId],
          point: dungeonRoomPoint(pendingDungeonRoomId),
        }
      : null;
    const entry = pendingEntry || Object.entries(ROOM_BLUEPRINTS)
      .map(([label, room]) => ({
        label,
        room,
        point: dungeonRoomPoint(label),
      }))
      .find(({ label, room, point }) => {
        const notEntered = label === "24a"
          ? !firedMapEvents.includes("school-class-started")
          : !firedMapEvents.includes(`room-${label}`);
        const heroEntered = consciousHeroes.some((hero) =>
          dungeonRoomEntryMatches(label, room, hero, eventFlags));
        return point && notEntered && roomEntryEnabled(ROOM_BLUEPRINTS[label], eventFlags) && heroEntered;
      });
    if (!entry?.point) return;
    const { label, room, point } = entry;
    setPendingDungeonRoomId(null);
    const roomPresentation = room.entry.presentation || "modal";
    if (roomPresentation === "modal") presentRoomEntry(label, room.title, room.description, point);
    else if (roomPresentation === "ambient") {
      setAmbientMessage(`${room.title} · ${room.description}`);
      scheduleCutscene(() => setAmbientMessage(null), 3400);
    }
    setFiredMapEvents((events) => {
      const entered = advanceRoomState([...events, `room-${label}`], label, "discovered");
      return room.actors?.length ? advanceRoomState(entered, label, "active") : advanceRoomState(entered, label, "resolved");
    });
    if (roomPresentation === "modal" && label !== "28d" && label !== "23c") {
      setLog((l) => [`${room.title}: ${room.description}`, ...l].slice(0, 6));
      pushGameFeedback("room", "ROOM DISCOVERED", `${label} · ${room.title}`);
    }
    if (room.bubble) {
      const observer = [...consciousHeroes].sort((a, b) => attackDist(a, point) - attackDist(b, point))[0];
      if (observer) showDialogueBubble(observer.id, room.bubble);
    }
    if (label === "37") {
      pendingRoomDialogueRef.current = "halleth-bard";
      return;
    }
    if (room.entry.action === "boss-gate") {
      setFiredMapEvents((events) => [...new Set([...events, "room-39a", "boss-hunt-started"])]);
      setAmbientMessage(`THE EMPTY THRONE WAITS · EXPLORE 90% OF LEVEL 1 · ${dungeonExplorationPercent}% FOUND`);
      scheduleCutscene(() => setAmbientMessage(null), 5200);
      setLog((lines) => [
        `The throne room is empty. Explore 90% of the floor and clear every active threat to draw its king back to the seat.`,
        ...lines,
      ].slice(0, 6));
      return;
    }
    if (room.entry.encounter && room.entry.encounter !== "manticore-show") {
      if (label === "6c") { revealClubHostsAtSecretDoor(firedMapEvents.includes("undertaker-alerted")); return; }
      const actors = room.actors || [];
      const actorNames = actors.map((actor) => actor.name || actor.actorId);
      const finalSpawns = actors.flatMap((actor) => actor.spawn ? [actor.spawn] : []);
      if (room.arrival) {
        const arriving = spawnConversationUnits(label, point, actorNames, room.arrival.starts);
        setFiredMapEvents((events) => [...new Set([...events, `room-encounter-spawned-${label}`])]);
        setChapterIntro(true);
        scheduleCutscene(() => {
          const arrivals = arriving.map((actor, index) => {
            const destination = finalSpawns[index];
            if (!destination) return 0;
            return animateSceneWalk(
              actor.id,
              scenePath(actor, destination, currentBlocked, boardCols, boardRows),
              index * 120,
              room.arrival?.stepMs || 230,
            );
          });
          scheduleCutscene(() => {
            const speaker = arriving[0];
            if (!speaker) {
              setChapterIntro(false);
              openScriptedEncounter(room.entry.encounter!);
              return;
            }
            showDialogueBubble(speaker.id, room.arrival!.line, () => {
              setChapterIntro(false);
              openScriptedEncounter(room.entry.encounter!);
            });
          }, Math.max(0, ...arrivals) + 180);
        }, 40);
        return;
      }
      spawnConversationUnits(label, point, actorNames, finalSpawns);
      if (label === "41") {
        setRevealedTiles((tiles) => [...new Set([...tiles, ...fightClubTiles])]);
      }
      setFiredMapEvents((events) => [...new Set([...events, `room-encounter-spawned-${label}`])]);
      if (room.entry.encounter === "starving-goblins") setGoblinShirtClaim(false);
      pendingRoomDialogueRef.current = room.entry.encounter;
      return;
    }
    if (room.entry.action === "schoolteacher") {
      setFiredMapEvents((events) => [...new Set([...events, "school-class-started"])]);
      const teacherSpot = { x: schoolArtZone.left + 2, y: schoolArtZone.top + 1 };
      const teacher = spawnActor("Professor Vale", SCHOOL_TEACHER_ID, "neutral");
      teacher.x = teacherSpot.x;
      teacher.y = teacherSpot.y;
      teacher.facing = "s";
      teacher.npc = true;
      teacher.encounterGroup = "24a";
      setUnits((current) => current.some((unit) => unit.id === SCHOOL_TEACHER_ID) ? current : [...current, teacher]);
      const student = nearbySocialHeroes("24a")[0] || units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
      setSchoolQuizStep(null);
      setSchoolQuizMistakes(0);
      setChapterIntro(true);
      setAmbientMessage("CLASS BELL RINGS");
      playSound("door");
      scheduleCutscene(() => setAmbientMessage(null), 1700);
      scheduleCutscene(() => {
        if (!student) {
          setChapterIntro(false);
          return;
        }
        showDialogueBubble(teacher.id, "Settle down, students.", () => {
          setChapterIntro(false);
          setSocialScene({
            kind: "schoolteacher",
            roomLabel: "24a",
            title: "Dweomercore Remedial Fundamentals",
            speaker: "Professor Vale",
            text: "Late. Armed. Bleeding on the carpet. Wonderful. At least this class has potential. Professor Vale, Remedial Dungeon Literacy. I have never failed a student who deserved to pass.",
            heroId: student.id,
          });
        });
      }, 220);
      return;
    }
    const roomLoot = room.rewards?.items || [];
    if (roomLoot.length && label !== "39a" && label !== "16") {
      const dropSpots = [
        point,
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 },
      ].filter((spot) => dungeonOpen.has(key(spot.x, spot.y)));
      setDroppedDungeonItems((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const additions: DroppedDungeonItem[] = room.rewards?.presentation === "chest"
          ? [{ id: `room-loot-${label}-chest`, name: "Treasure Chest", contents: [...roomLoot], ...(dropSpots[0] || point) }]
          : roomLoot.map((name, index) => ({ id: `room-loot-${label}-${index}`, name, ...(dropSpots[index % Math.max(1, dropSpots.length)] || point) }));
        const newObjects = additions.filter((item) => !existingIds.has(item.id));
        return [...current, ...newObjects];
      });
    }
    const roomMonsters = (room.actors || []).map((actor) => actor.name || actor.actorId);
    if (!roomMonsters.length) return;
    const encounterBaseUnits = label === "16"
      ? units.map((unit) => {
          if (unit.team !== "hero" || unit.npc || unit.downed) return unit;
          const partyIndex = units
            .filter((candidate) => candidate.team === "hero" && !candidate.npc && !candidate.downed)
            .findIndex((candidate) => candidate.id === unit.id);
          const spot = manticoreContestantSpots[partyIndex];
          return spot ? { ...unit, ...spot, facing: "n" as Facing } : unit;
        })
      : units;
    const occupied = new Set(encounterBaseUnits.filter((u) => !u.downed)
      .flatMap((u) => unitFootprintAt(u).map((tile) => key(tile.x, tile.y))));
    const footprintProbe = label === "16"
      ? { x: 0, y: 0, role: "Manticore" }
      : label === "39a"
        ? { x: 0, y: 0, role: "Ettin", encounterGroup: "39a" }
        : { x: 0, y: 0 };
    const candidateFits = (spot: { x: number; y: number }) =>
      unitFootprintAt(footprintProbe, spot.x, spot.y).every((tile) =>
        dungeonOpen.has(key(tile.x, tile.y)) && !occupied.has(key(tile.x, tile.y)),
      );
    const candidates: { x: number; y: number }[] = [];
    for (const candidate of dungeonEncounterSpawns[label] || []) {
      if (!candidateFits(candidate)) continue;
      candidates.push(candidate);
      unitFootprintAt(footprintProbe, candidate.x, candidate.y)
        .forEach((tile) => occupied.add(key(tile.x, tile.y)));
    }
    const candidateKeys = new Set(candidates.map((candidate) => key(candidate.x, candidate.y)));
    if (candidates.length < roomMonsters.length) {
      for (let radius = 0; radius <= 8 && candidates.length < roomMonsters.length; radius++)
        for (let y = point.y - radius; y <= point.y + radius; y++)
          for (let x = point.x - radius; x <= point.x + radius; x++)
            if (
              attackDist(point, { x, y }) === radius &&
              !candidateKeys.has(key(x, y)) &&
              candidateFits({ x, y })
            ) {
              candidates.push({ x, y });
              candidateKeys.add(key(x, y));
              unitFootprintAt(footprintProbe, x, y)
                .forEach((tile) => occupied.add(key(tile.x, tile.y)));
            }
    }
    const encounterMonsters = roomMonsters;
    const enemies = encounterMonsters.slice(0, candidates.length).map((name, index) => {
      const actorDefinition = getActorDefinition(name);
      const enemy = spawnActor(actorDefinition.id, `dungeon-${label}-${index}`, "enemy");
      enemy.x = candidates[index].x;
      enemy.y = candidates[index].y;
      enemy.encounterGroup = label;
      if (label === "17b" && name === "Black Dragon") { enemy.team = "neutral"; enemy.npc = true; enemy.facing = "s"; }
      if (label === "16") {
        enemy.team = "neutral";
        enemy.npc = true;
      }
      return enemy;
    });
    const currentActiveId = active?.id;
    const nextUnits = [...encounterBaseUnits, ...enemies];
    if (enemies.length) {
      setFiredMapEvents((events) => [...new Set([...events, `room-encounter-spawned-${label}`])]);
    }
    setUnits(nextUnits);
    if (label === "17b") {
      const dragon = enemies.find((enemy) => enemy.role === "Black Dragon"), board = battlefieldRef.current;
      setEnemyTypes([]); setEncounterMode("exploration"); setPhase("move"); setChosen(null); setChapterIntro(true);
      setFiredMapEvents((events) => [...new Set([...events, "black-dragon-sleeping"])]);
      if (dragon) { setRevealedTiles((tiles) => [...new Set([...tiles, ...Array.from({ length: 35 }, (_, index) => key(dragon.x - 2 + index % 5, dragon.y - 3 + Math.floor(index / 5)))])]); if (board) scheduleCutscene(() => { const focus = characterFocus(dragon, boardCols, boardRows, mapZoom, board.clientWidth, board.clientHeight); setDungeonViewport(focus.viewport); board.scrollTo({ ...focus.scroll, behavior: "smooth" }); }, 120); }
      setAmbientMessage("Something black and scaled sleeps beneath the statue's shadow."); scheduleCutscene(() => { setAmbientMessage(null); setChapterIntro(false); }, 2800); return;
    }
    setEnemyTypes(roomMonsters);
    setAiBusy(false);
    if (label === "16") {
      setRevealedTiles((tiles) => [...new Set([...tiles, ...manticoreStageTiles, ...manticoreWalkInTileKeys])]);
      setChapterIntro(false);
      setEncounterMode("exploration");
      setPhase("move");
      setChosen(null);
      setAmbientMessage("The party takes its marks. Three manticores lean forward beneath the judges' lights.");
      scheduleCutscene(() => setAmbientMessage(null), 3200);
      openScriptedEncounter("manticore-show");
      return;
    }
    setChapterIntro(false);
    if (encounterMode === "exploration") {
      setEncounterMode("combat");
      setRound(1);
      setTurn(0);
    } else if (currentActiveId) {
      const nextOrder = nextUnits
        .filter((unit) => !unit.npc)
        .sort(
          (a, b) =>
            initiativeTotal(b) - initiativeTotal(a) ||
            b.initiative - a.initiative,
        );
      setTurn(Math.max(0, nextOrder.findIndex((unit) => unit.id === currentActiveId)));
    }
    setPhase("move");
    setChosen(null);
    if (label !== "40") setLog((lines) => [
      encounterMode === "combat"
        ? `${room.title} joins the existing battle. Initiative continues in round ${round}.`
        : `${room.title}: ${room.description}`,
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, active?.id, firedMapEvents, units, round, dungeonExplorationPercent, pendingDungeonRoomId, chapterIntro, roomEntryPresentation]);
  useDeferredEffect(() => {
    if (!dungeonMode || encounterMode !== "exploration" || !firedMapEvents.includes("black-dragon-sleeping") || firedMapEvents.includes("black-dragon-awake")) return;
    const dragon = units.find((unit) => unit.role === "Black Dragon" && unit.encounterGroup === "17b" && !unit.downed);
    if (!dragon || !units.some((unit) => unit.team === "hero" && !unit.npc && !unit.downed && attackDist(unit, dragon) <= 2)) return;
    setFiredMapEvents((events) => [...new Set([...events, "black-dragon-awake"])]); setUnits((current) => current.map((unit) => unit.id === dragon.id ? { ...unit, team: "enemy", npc: false } : unit));
    setEnemyTypes(["Black Dragon"]); setEncounterMode("combat"); setRound(1); setTurn(0); setPhase("move"); setChosen(null);
    showCombatBark(dragon.id, "HSSSSK!", 1400); setLog((lines) => ["At ten feet, one acidic eye opens. The black dragon wakes.", ...lines].slice(0, 6));
  }, [dungeonMode, encounterMode, firedMapEvents, units]);
  // Reconcile older or interrupted saves where a scripted room was marked
  // active but its cast or choice panel vanished. Content flags should never
  // be able to leave a live encounter empty.
  useDeferredEffect(() => {
    if (
      !dungeonMode || stage !== "battle" || encounterMode !== "exploration" ||
      socialScene || bubble?.persistent || noticeQueue.length || chapterIntro || encounterSequenceLabel ||
      roomEntryPresentation || encounterChoiceBusyRef.current
    ) return;
    const flags = new Set(firedMapEvents);
    const recoverable = Object.entries(ROOM_BLUEPRINTS).find(([label, room]) =>
      !!room.entry.encounter &&
      !!room.actors?.length &&
      flags.has(`room-${label}`) &&
      roomLifecycle(label, firedMapEvents) === "active" &&
      scriptedEncounterNeedsRecovery(room.entry.encounter, flags),
    );
    if (!recoverable) return;
    const [label, room] = recoverable;
    const point = dungeonRoomPoint(label);
    if (!point || !room.entry.encounter) return;
    const actors = room.actors || [];
    const livingCast = units.filter((unit) => unit.encounterGroup === label && !unit.downed).length;
    if (livingCast < actors.length) spawnConversationUnits(
        label,
        point,
        actors.map((actor) => actor.name || actor.actorId),
        actors.flatMap((actor) => actor.spawn ? [actor.spawn] : []),
        true,
      );
    setFiredMapEvents((events) => [...new Set([...events, `room-encounter-spawned-${label}`])]);
    openScriptedEncounter(room.entry.encounter);
    setLog((lines) => [`${room.title} restores its missing encounter cast and resumes.`, ...lines].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, socialScene, bubble?.persistent, noticeQueue.length, chapterIntro, encounterSequenceLabel, roomEntryPresentation, firedMapEvents, units]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("boss-arrival")) return;
    const occupied = new Set(units.filter((unit) => !unit.downed)
      .flatMap((unit) => unitFootprintAt(unit).map((tile) => key(tile.x, tile.y))));
    const spawnCandidates: { x: number; y: number }[] = [];
    const authoredSpawn = dungeonEncounterSpawns["39a"]?.[0] || bossThronePoint;
    for (let radius = 0; radius <= 6; radius++)
      for (let y = authoredSpawn.y - radius; y <= authoredSpawn.y + radius; y++)
        for (let x = authoredSpawn.x - radius; x <= authoredSpawn.x + radius; x++) {
          if (attackDist(authoredSpawn, { x, y }) !== radius) continue;
          const fits = unitFootprintAt({ x, y, role: "Ettin", encounterGroup: "39a" }).every((tile) =>
            dungeonOpen.has(key(tile.x, tile.y)) && !occupied.has(key(tile.x, tile.y)),
          );
          if (fits) spawnCandidates.push({ x, y });
        }
    const spawn = spawnCandidates[0] || authoredSpawn;
    const king = spawnActor("Ettin", "dungeon-39a-0", "enemy");
    Object.assign(king, {
      x: spawn.x,
      y: spawn.y,
      encounterGroup: "39a",
    });
    setFiredMapEvents((events) => [...new Set([
      ...events,
      "two-headed-king-arrived",
      "room-encounter-spawned-39a",
    ])]);
    setUnits((current) => [...current, king]);
    setRevealedTiles((tiles) => [...new Set([
      ...tiles,
      ...Array.from({ length: 25 }, (_, index) => key(19 + (index % 5), 99 + Math.floor(index / 5))),
    ])]);
    setEnemyTypes(["Ettin"]);
    setAiBusy(false);
    setPhase("move");
    setChosen(null);
    playSound("boss");
    setAmbientMessage("A ROAR SHAKES LEVEL 1 · THE THRONE IS OCCUPIED");
    scheduleCutscene(() => setAmbientMessage(null), 5200);
    enqueueHalaster(FINAL_PRACTICAL_MESSAGE);
    setLog((lines) => [
      "A roar rolls through every cleared hall. The Two-Headed King is now seated on his throne at V101, waiting for the Final Practical.",
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, throneClaimable, bossHuntStarted, bossHasArrived, dungeonExplorationPercent, activeDungeonThreats, units]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("boss-engagement") || !twoHeadedKing) return;
    const approachingHero = units.find((unit) =>
      unit.team === "hero" &&
      !unit.npc &&
      !unit.downed &&
      bossEngagementDoorwayKeys.has(key(unit.x, unit.y)),
    );
    if (!approachingHero) return;
    setFiredMapEvents((events) => [...new Set([...events.filter((event) => event !== "wife-beater-killing-curse"), "two-headed-king-engaged"])]);
    const bossSequence = beginSequence();
    setNoticeQueue([]);
    setAmbientMessage(null);
    setSocialScene(null);
    setChapterIntro(true);
    setSpritePose((poses) => ({ ...poses, [twoHeadedKing.id]: "cast" }));
    playSound("boss");
    const kingRecognition = firedMapEvents.includes("black-goo-emo-bond")
      ? "SPELL HEAD: THE SADLY DRESSED ONE IS MINE."
      : firedMapEvents.includes("flour-ghost-empowered")
        ? "BRUISER HEAD: YOU FED THE GHOST. WE LIKED THAT."
        : firedMapEvents.includes("manticore-den-intro-complete")
          ? "BOTH HEADS: THE JUDGES SENT THEIR SCORES."
          : firedMapEvents.includes("school-diploma-earned")
            ? "SPELL HEAD: A GRADUATE. HOW ADORABLE."
            : "BOTH HEADS: YOU CAME TO US.";
    showDialogueBubble(twoHeadedKing.id, kingRecognition, () => {
      if (!isSequenceCurrent(bossSequence)) return;
      showDialogueBubble(twoHeadedKing.id, "BOTH HEADS: FINAL PRACTICAL. TRY TO DIE ENTERTAININGLY.", () => {
        if (!isSequenceCurrent(bossSequence)) return;
        setChapterIntro(false);
        setSpritePose((poses) => ({ ...poses, [twoHeadedKing.id]: "idle" }));
        gameTransitions.startCombat();
      });
    });
    setLog((lines) => [
      `${approachingHero.name} reaches a throne-room doorway. The Two-Headed King rises from his throne and delivers the Final Practical before combat begins.`,
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, twoHeadedKing?.id, twoHeadedKing?.x, twoHeadedKing?.y, units, firedMapEvents, currentBlocked, closedDungeonSecretDoors.crossings]);
  useDeferredEffect(() => {
    if (
      !dungeonMode || stage !== "battle" || encounterMode !== "exploration" ||
      !firedMapEvents.includes("fight-club-ring-open") ||
      firedMapEvents.includes("fight-club-bout-started") ||
      firedMapEvents.includes("fight-club-won") ||
      socialScene || chapterIntro || bubble
    ) return;
    const entrant = units.find((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed && inFightClubRing(unit),
    );
    const tyler = units.find((unit) =>
      unit.encounterGroup === "41" &&
      (unit.name === "Tyler Durden" || unit.role === "Tyler Durden") &&
      !unit.downed,
    );
    if (!entrant || !tyler) return;
    const narrator = units.find((unit) => unit.encounterGroup === "41" && unit.name === "The Narrator");
    setFiredMapEvents((events) => advanceRoomState(
      [...new Set([...events, "fight-club-bout-started", "room-encounter-spawned-41"])],
      "41",
      "active",
    ));
    setUnits((current) => current.map((unit) => {
      if (unit.encounterGroup !== "41") return unit;
      if (unit.name === "Tyler Durden" || unit.role === "Tyler Durden") {
        return { ...unit, team: "enemy", npc: false };
      }
      return { ...unit, team: "neutral", npc: true };
    }));
    setRound(1);
    setTurn(0);
    setEncounterMode("combat");
    setPhase("move");
    setChosen(null);
    setAiBusy(false);
    setAmbientMessage("THE BOUT BEGINS · TYLER IS THE ONLY OPPONENT");
    scheduleCutscene(() => setAmbientMessage(null), 2600);
    if (narrator) showDialogueBubble(narrator.id, "Fight.");
    setLog((lines) => [
      `${entrant.name} steps inside the outlined square. The Narrator starts the bout; Tyler stays in the ring and becomes the only opponent.`,
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, firedMapEvents, units, socialScene, chapterIntro, bubble]);
  useDeferredEffect(() => {
    if (
      !dungeonMode || stage !== "battle" || encounterMode !== "exploration" || !twoHeadedKing ||
      !firedMapEvents.includes("two-headed-king-engaged") || socialScene || bubble?.persistent ||
      noticeQueue.length || chapterIntro || encounterSequenceLabel
    ) return;
    const approachingHero = units.find((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed &&
      bossEngagementDoorwayKeys.has(key(unit.x, unit.y)),
    );
    if (!approachingHero) return;
    setSpritePose((poses) => ({ ...poses, [twoHeadedKing.id]: "idle" }));
    setAiBusy(false);
    gameTransitions.startCombat();
    setLog((lines) => [
      "The interrupted throne-room challenge resumes. The Two-Headed King enters combat.",
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, twoHeadedKing?.id, firedMapEvents, socialScene, bubble?.persistent, noticeQueue.length, chapterIntro, encounterSequenceLabel, units]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle") return;
    const bout = resolveFightClubBout(units, firedMapEvents);
    if (!bout) return;
    const { concedingFighter, recipient } = bout;
    setFiredMapEvents(bout.flags); setUnits(bout.units); grantDungeonLoot(recipient.id, ["Bar of Soap"]);
    if (!bout.otherBattleContinues) { setEncounterMode("exploration"); setTurn(0); }
    setPhase("move"); setChosen(null); setAiBusy(false);
    setAmbientMessage("FIGHT STOPPED AT 1 HP · NO ONE DIES · BAR OF SOAP AWARDED"); scheduleCutscene(() => setAmbientMessage(null), 3400);
    showDialogueBubble(concedingFighter.id, "My ear, man?"); setLog((lines) => [`The Narrator stops the bout when Tyler reaches 1 HP and awards ${recipient.name} a handmade Bar of Soap. Nobody dies.`, ...lines].slice(0, 6));
    pushGameFeedback("item", "BAR OF SOAP", `${recipient.name} receives a reusable cleansing bar.`, "/fight-club-soap-v1.png");
  }, [dungeonMode, stage, firedMapEvents, units]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle") return;
    const completedRoom = firedMapEvents
      .filter((flag) => flag.startsWith("room-encounter-spawned-"))
      .map((flag) => flag.replace("room-encounter-spawned-", ""))
      .find((roomLabel) =>
        !firedMapEvents.includes(`encounter-complete:${roomLabel}`) &&
        !units.some((unit) => unit.encounterGroup === roomLabel && !unit.downed),
      );
    if (!completedRoom) return;
    const title = ROOM_BLUEPRINTS[completedRoom]?.title || `Room ${completedRoom}`;
    setFiredMapEvents((events) => [...new Set([
      ...events,
      ...encounterCompletionFlags({ roomLabel: completedRoom, title, outcome: "combat" }),
    ])]);
    if (!units.some((unit) => unit.team === "enemy" && !unit.downed)) {
      setEncounterMode("exploration");
      setTurn(0);
      setPhase("move");
      setAiBusy(false);
    }
    pushGameFeedback("encounter", "ENCOUNTER CLEARED", `${title} · Exploration resumed`);
  }, [dungeonMode, stage, firedMapEvents, units]);
  useDeferredEffect(() => {
    const recipient = schoolCombatGraduate(units, firedMapEvents, leaderId, SCHOOL_TEACHER_ID);
    if (!dungeonMode || !recipient) return;
    if (!heroHasItem(recipient.id, "Dweomercore Remedial Diploma")) grantDungeonLoot(recipient.id, ["Dweomercore Remedial Diploma"]);
    setUnits((current) => current.map((unit) => restoreProfessorVale(unit, SCHOOL_TEACHER_ID)));
    setFiredMapEvents((events) => [...new Set([...events, "school-diploma-earned"])]);
    setAmbientMessage("PROFESSOR VALE: YOUR PRACTICAL EXAMINATION WAS UNCONVENTIONAL. PASSING GRADE.");
    scheduleCutscene(() => setAmbientMessage(null), 4200);
    setLog((lines) => [`${recipient.name} receives the Dweomercore Remedial Diploma after surviving Professor Grin's practical exam.`, ...lines].slice(0, 6));
    pushGameFeedback("item", "DIPLOMA AWARDED", "Violence remains an accredited learning outcome.");
  }, [dungeonMode, firedMapEvents, units, leaderId]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle") return;
    const defeatedRewardRooms = [
      { label: "6c", hostile: "undertaker-hostile-6c" },
      { label: "8b", hostile: "undertaker-hostile-8b" },
      { label: "18", hostile: "troll-hostile" },
      { label: "39a", hostile: null },
    ];
    const reward = defeatedRewardRooms.find(({ label, hostile }) =>
      firedMapEvents.includes(`room-${label}`) &&
      firedMapEvents.includes(`room-encounter-spawned-${label}`) &&
      (!hostile || firedMapEvents.includes(hostile)) &&
      !firedMapEvents.includes(`room-loot-ready-${label}`) &&
      !units.some((unit) => unit.encounterGroup === label && !unit.downed),
    );
    if (!reward) return;
    const point = dungeonRoomPoints.get(reward.label);
    const loot = ROOM_BLUEPRINTS[reward.label]?.rewards?.items || [];
    if (!point || !loot.length) return;
    if (reward.label === "6c") {
      const lastHit = units.find((unit) => unit.encounterGroup === "6c" && unit.lastDamagerId)?.lastDamagerId;
      const recipient = units.find((unit) => unit.id === lastHit && unit.team === "hero")
        || units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
      if (recipient) awardAchievement(recipient.id, {
        key: "undertaker-club-combat",
        title: "Killed the Vibe",
        description: "Turned down the Extremely Secret Club's music permanently.",
        tier: "Silver",
        boxName: "Noise Complaint",
      });
    }
    setFiredMapEvents((events) => advanceRoomState(
      [...new Set([...events, `room-loot-ready-${reward.label}`])],
      reward.label,
      "resolved",
    ));
    setDroppedDungeonItems((current) => current.some((object) => object.id === `room-loot-${reward.label}-chest`)
      ? current
      : [...current, { id: `room-loot-${reward.label}-chest`, name: reward.label === "6c" ? "Velvet Lockbox" : "Treasure Chest", contents: [...loot], ...point }]);
    setLog((lines) => [reward.label === "6c"
      ? "The club falls silent. Countess Velvet's lockbox holds the Stone-box Key and Dwarven Signet Ring. The party also earns Killed the Vibe."
      : `The ${ROOM_BLUEPRINTS[reward.label].title} is clear. Its treasure chest can now be opened.`, ...lines].slice(0, 6));
    pushGameFeedback("encounter", "ENCOUNTER CLEARED", `${ROOM_BLUEPRINTS[reward.label].title} · Loot available`);
  }, [dungeonMode, stage, firedMapEvents, units]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("manticore-reward")) return;
    const finisherId = units.find((unit) =>
      unit.encounterGroup === "16" && unit.role === "Manticore" && unit.lastDamagerId,
    )?.lastDamagerId;
    const recipient = units.find((unit) => unit.id === finisherId)
      || units.find((unit) => unit.id === leaderId && unit.team === "hero" && !unit.npc)
      || units.find((unit) => unit.team === "hero" && !unit.npc);
    if (!recipient) return;
    setFiredMapEvents((events) => [...new Set([...events, "manticore-show-must-go-on-awarded"])]);
    awardAchievement(recipient.id, {
      key: "manticore-show-must-go-on",
      title: "The Show Must Go On",
      description: "Survived Halaster's Three Questions and closed the show by defeating all three manticores.",
      tier: "Silver",
      boxName: "Encore Box",
    });
    setLog((lines) => [
      `${recipient.name} earns The Show Must Go On. The den contains no treasure chest—only the promise of an Encore Box at the recap.`,
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, firedMapEvents, units, leaderId]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("boss-enrage") || !twoHeadedKing) return;
    setFiredMapEvents((events) => [...new Set([...events, "two-headed-king-enraged"])]);
    setUnits((current) => current.map((unit) => unit.id === twoHeadedKing.id
      ? { ...unit, attack: unit.attack + 5, move: unit.move + 1, accuracy: unit.accuracy + 6 }
      : unit));
    setBossShockwave({ x: twoHeadedKing.x, y: twoHeadedKing.y, nonce: runtimeNow() });
    scheduleCutscene(() => setBossShockwave(null), 950);
    showCombatBark(twoHeadedKing.id, "BOTH HEADS AGREE—CRUSH THEM!", 2400);
    setLog((lines) => ["At half health, both heads finally agree. The king enrages: +5 damage, +1 Move, and +1 to attack rolls.", ...lines].slice(0, 6));
  }, [twoHeadedKing?.id, twoHeadedKing?.hp, firedMapEvents]);
  useDeferredEffect(() => {
    if (!twoHeadedKing || encounterMode !== "combat" || !firedMapEvents.includes("two-headed-king-engaged") || firedMapEvents.includes("wife-beater-killing-curse")) return;
    const wearer = units.find((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed &&
      heroHasItem(unit.id, "Wife-Beater of Questionable Resilience"),
    );
    const target = wearer || units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed)
      .sort((a, b) => attackDist(twoHeadedKing, a) - attackDist(twoHeadedKing, b))[0];
    if (!target) return;
    setFiredMapEvents((events) => [...new Set([...events, "wife-beater-killing-curse"])]);
    showCombatBark(twoHeadedKing.id, "SPELL HEAD: AVADA KEDAVRA!", 2300);
    animateSprite(twoHeadedKing.id, "cast", 1000);
    scheduleCutscene(() => {
      setProjectile({ from: { x: twoHeadedKing.x, y: twoHeadedKing.y }, to: { x: target.x, y: target.y }, nonce: runtimeNow() });
      setUnits((current) => current.map((unit) => unit.id === target.id ? { ...unit, hp: wearer ? 1 : 0, downed: !wearer } : unit));
      animateSprite(target.id, "damage", 700);
      setLog((lines) => [
        wearer
          ? `${wearer.name}'s Wife-Beater of Questionable Resilience absorbs the king's killing curse. ${wearer.name} falls—but refuses to stay down.`
          : `${target.name} is struck by the king's killing curse and falls instantly.`,
        ...lines,
      ].slice(0, 6));
    }, 650);
    scheduleCutscene(() => {
      if (!wearer) return;
      setUnits((current) => current.map((unit) => unit.id === wearer.id
        ? { ...unit, hp: 1, downed: false, attack: unit.attack + 5, rageRounds: 5 }
        : unit));
      animateSprite(wearer.id, "attack", 900);
      showCombatBark(wearer.id, "You're gonna get it now.", 2600);
      awardAchievement(wearer.id, {
        key: "boy-who-lived",
        title: "The Boy Who Lived",
        description: "Survived the Two-Headed King's killing curse at 1 HP.",
        tier: "Legendary",
        boxName: "The Boy Who Lived",
      });
      setLog((lines) => [
        `${wearer.name} gets back up at 1 HP in a five-round Rage: +5 Attack. Legendary Box earned: The Boy Who Lived.`,
        ...lines,
      ].slice(0, 6));
    }, 1250);
    scheduleCutscene(() => setProjectile(null), 1600);
  }, [twoHeadedKing?.id, firedMapEvents, units, dungeonItems]);
  useDeferredEffect(() => {
    if (!defeatedTwoHeadedKing || firedMapEvents.includes("two-headed-king-defeated")) return;
    setFiredMapEvents((events) => [...new Set([...events, "two-headed-king-defeated"])]);
    setBossShockwave({ x: defeatedTwoHeadedKing.x, y: defeatedTwoHeadedKing.y, nonce: runtimeNow() });
    playSound("boss");
    setAmbientMessage("THE TWO-HEADED KING FALLS · THE THRONE RECOGNIZES ITS CONQUERORS");
    scheduleCutscene(() => setBossShockwave(null), 1200);
    scheduleCutscene(() => setAmbientMessage(null), 4200);
    const finisher = units.find((unit) => unit.id === defeatedTwoHeadedKing.lastDamagerId);
    if (finisher) showCombatBark(finisher.id, "Level One is ours.", 2500);
    setLog((lines) => [
      "The Two-Headed King crashes across all four squares. The throne's crown-runes ignite; claiming the seat will end Level 1.",
      ...lines,
    ].slice(0, 6));
  }, [defeatedTwoHeadedKing?.id, firedMapEvents]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("wandering-guardian")) return;
    const hero = units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
    if (!hero) return;
    const path = shieldGuardianPatrol.filter((point) => dungeonOpen.has(key(point.x, point.y)));
    if (path.length < 4) return;
    setFiredMapEvents((events) => [...new Set([...events, "wandering-guardian", "wandering-guardian-pass-1"])]);
    setWanderingGuardian({ path, step: 0, pass: 1 });
    setLog((lines) => [shieldGuardianPassText[0].sighting, ...lines].slice(0, 6));
  }, [dungeonMode, stage, encounterMode, wanderingGuardian, firedMapEvents, units, socialScene, bubble?.persistent, noticeQueue.length, chapterIntro, encounterSequenceLabel]);
  useEffect(() => {
    if (isGuestReplicaActive() || !wanderingGuardian) return;
    const timer = setTimeout(() => {
      const nextStep = wanderingGuardian.step + 1;
      if (nextStep >= wanderingGuardian.path.length) {
        const pass = wanderingGuardian.pass || 1;
        awardGuardianPassFromEffect(pass);
        setWanderingGuardian(null);
        setFiredMapEvents((events) => [...new Set([
          ...events,
          `wandering-guardian-pass-${pass}-complete`,
          ...(pass >= 3 ? ["wandering-guardian-complete"] : []),
        ])]);
        setLog((lines) => [shieldGuardianPassText[pass - 1].departure, ...lines].slice(0, 6));
        return;
      }
      const next = wanderingGuardian.path[nextStep];
      setUnits((current) => {
        const occupant = current.find((unit) => unitOccupiesTile(unit, next.x, next.y));
        if (!occupant) return current;
        const occupied = new Set(current.filter((unit) => unit.id !== occupant.id)
          .flatMap((unit) => unitFootprintAt(unit).map((tile) => key(tile.x, tile.y))));
        const landing = [
          { x: next.x + 1, y: next.y }, { x: next.x - 1, y: next.y },
          { x: next.x, y: next.y + 1 }, { x: next.x, y: next.y - 1 },
          { x: next.x + 1, y: next.y + 1 }, { x: next.x - 1, y: next.y - 1 },
        ].find((point) => dungeonOpen.has(key(point.x, point.y)) && !occupied.has(key(point.x, point.y)));
        if (!landing) return current;
        setLog((lines) => [`The shield guardian gently but firmly pushes ${occupant.name} aside.`, ...lines].slice(0, 6));
        return current.map((unit) => unit.id === occupant.id ? { ...unit, ...landing } : unit);
      });
      setWanderingGuardian((guardian) => guardian ? { ...guardian, step: nextStep } : null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [wanderingGuardian]);
  useDeferredEffect(() => {
    if (!dungeonMode || stage !== "battle" || !floodRoomHazard ||
      firedMapEvents.includes("room-33-flood-active") ||
      firedMapEvents.includes("room-33-flood-drained") ||
      firedMapEvents.includes("room-33-secret-arrival-safe")) return;
    const entrant = units.find((unit) =>
      unit.team === "hero" && !unit.npc && !unit.downed &&
      unit.x === floodRoomHazard.trigger.x && unit.y === floodRoomHazard.trigger.y,
    );
    if (!entrant) return;
    const gate = floodRoomHazard.barrier;
    setBarriers((current) => current.some((barrier) => barrier.id === gate.id)
      ? current
      : [...current, { id: gate.id, name: gate.name, x: gate.x, y: gate.y, hp: gate.hp, maxHp: gate.hp, kind: "door" }]);
    setFiredMapEvents((events) => [...new Set([...events, "room-33-flood-active", "room-33-flood-level-0"])]);
    setAmbientMessage("FLOODGATE SEALED · WATER RISING");
    scheduleCutscene(() => setAmbientMessage(null), 2600);
    showDialogueBubble(entrant.id, "The door just sealed behind me. The room is filling with water!");
    setLog((lines) => [
      `${entrant.name} reaches AI63. The floodgate slams across AH63 and water begins pouring into AH62–AJ64. Destroy the door.`,
      ...lines,
    ].slice(0, 6));
  }, [dungeonMode, stage, units, firedMapEvents]);
  useDeferredEffect(() => {
    if (!readyEncounterDirectiveIds.has("bridge-detection") || !active) return;
    const alertBandit = units.find(
      (u) => u.team === "enemy" && !u.downed && attackDist(active, u) <= 6 && clearLine(u, active),
    );
    if (!alertBandit) return;
    setFiredMapEvents((events) => [...events, "bridge-detection"]);
    setEncounterMode("combat");
    setTurn(0);
    setPhase("move");
    showCombatBark(alertBandit.id, "That is close enough. Toll's due!", 1600);
    setLog((l) => ["The company enters the bandits' detection zone. Combat begins.", ...l].slice(0, 6));
  }, [active?.id, active?.x, active?.y, stage, encounterMode, campaignScene, units, firedMapEvents]);
  useDeferredEffect(() => {
    if (stage !== "battle" || !active || active.team !== "hero" || active.downed || victory || defeat) return;
    const readyCharge = readyChargedSpellFor(chargedSpells, active, round);
    if (!readyCharge) return;
    releaseChargedSpell(readyCharge);
    setChosen(null);
    setPhase("facing");
    scheduleChargedTurnCompletion();
  }, [stage, active?.id, active?.bossHead, active?.team, active?.downed, round, chargedSpells, victory, defeat]);
  useDeferredEffect(() => {
    if (stage !== "battle" || encounterMode !== "combat" || !active || active.downed || !unitCannotAct(active) || victory || defeat) return;
    const turnKey = `${round}:${active.id}:${active.bossHead || "body"}`; if (incapacitatedTurnRef.current === turnKey) return; incapacitatedTurnRef.current = turnKey;
    setAiBusy(true); setLog((lines) => [`${active.name} cannot act this turn.`, ...lines].slice(0, 6)); scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 700);
  }, [stage, encounterMode, active?.id, active?.bossHead, active?.downed, active?.conditions, active?.stunned, round, victory, defeat]);
  const advanceEnemyToward = (
    mover: Unit,
    target: Unit,
    budget: number,
    desiredRange: number,
  ) => {
    const destinations: { x: number; y: number; cost: number; path: { x: number; y: number }[] }[] = [];
    for (let y = Math.max(0, target.y - desiredRange); y <= Math.min(boardRows - 1, target.y + desiredRange); y++)
      for (let x = Math.max(0, target.x - desiredRange); x <= Math.min(boardCols - 1, target.x + desiredRange); x++) {
        if (attackDist({ x, y }, target) > desiredRange) continue;
        const route = routeTo(mover, x, y, false);
        if (route.cost < 99) destinations.push({ x, y, ...route });
      }
    const destination = destinations.sort((a, b) => a.cost - b.cost)[0];
    return destination
      ? moveAlongRoute(mover, destination.path, budget, units)
      : { units, mover, spent: 0, logs: [] as string[] };
  };
  const canEnemySeeHero = (enemy: Unit, hero: Unit) =>
    enemyCanSeeHero(enemy, hero, heroDisguises) && monsterCanPerceive(enemy, attackDist(enemy, hero), clearLine(enemy, hero));
  // The cube owns an unusual turn: it routes directly onto a hero's occupied
  // square instead of stopping beside them. If that special action ever fails
  // to resolve, do not let one ooze hold initiative forever.
  useEffect(() => {
    if (
      isGuestReplicaActive() ||
      stage !== "battle" ||
      encounterMode !== "combat" ||
      active?.role !== "Gelatinous Cube" ||
      active.downed ||
      unitCannotAct(active) ||
      chapterIntro ||
      poisonCutscene ||
      victory ||
      defeat
    ) return;
    const timer = setTimeout(() => {
      setAiBusy(false);
      setLog((lines) => ["The Gelatinous Cube shudders, loses its prey, and forfeits the stalled turn.", ...lines].slice(0, 6));
      finishTurnRef.current();
    }, 2500);
    return () => clearTimeout(timer);
  }, [active?.id, active?.role, active?.downed, active?.stunned, turn, round, stage, encounterMode, chapterIntro, poisonCutscene, victory, defeat]);
  useDeferredEffect(() => {
    if (
      stage !== "battle" ||
      !active ||
      active.downed ||
      unitCannotAct(active) ||
      active.team !== "enemy" ||
      aiBusy ||
      chapterIntro ||
      poisonCutscene ||
      (!!encounterSequenceLabel && !dungeonPlaytest) ||
      victory ||
      defeat
    )
      return;
    const normalizedActive = dust2FreeplayActive && active.encounterGroup === "dust2-freeplay-dungeoneers" ? active : normalizeMonsterRuntime(active);
    const monsterRuntimeChanged = normalizedActive.actorId !== active.actorId
      || normalizedActive.combatProfile?.kind !== "monster"
      || normalizedActive.maxHp !== active.maxHp || normalizedActive.hp !== active.hp
      || normalizedActive.skills.length !== active.skills.length
      || normalizedActive.skills.some((skill, index) => skill.id !== active.skills[index]?.id);
    if (monsterRuntimeChanged) {
      setUnits((current) => current.map((unit) => unit.id === active.id ? normalizedActive : unit));
      setAiBusy(false);
      return;
    }
    const traitTurnKey = `${round}:${active.id}`;
    if (monsterTraitTurnRef.current !== traitTurnKey) {
      monsterTraitTurnRef.current = traitTurnKey;
      const healing = active.lastDamageType === "fire" ? 0 : monsterTraitEffects(active).reduce((sum, trait) => sum + (trait.startTurnHealing || 0), 0);
      if (healing && active.hp > 0 && active.hp < active.maxHp) {
        setAbilityVfx({ name: "Regeneration", from: { x: active.x, y: active.y }, to: { x: active.x, y: active.y }, nonce: runtimeNow() });
        animateSprite(active.id, "cast", 900);
        scheduleCutscene(() => setAbilityVfx(null), 1600);
        setUnits((current) => current.map((unit) => unit.id === active.id ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + healing), lastDamageType: undefined } : unit));
        setLog((lines) => [`${active.name} regenerates ${Math.min(healing, active.maxHp - active.hp)} HP.`, ...lines].slice(0, 6));
      }
    }
    setAiBusy(true);
    const objectivePlan = dust2FreeplayMatch ? dust2ObjectiveAiPlan(dust2FreeplayMatch, dust2Objective, active, units, units.some((unit) => !unit.downed && dust2FactionForUnit(unit) !== dust2FactionForUnit(active) && monsterCanPerceive(active, attackDist(active, unit), clearLine(active, unit)))) : null;
    if (objectivePlan) {
      const route = routeTo(active, objectivePlan.target.x, objectivePlan.target.y, true), movement = moveAlongRoute(active, route.path, active.move, units);
      const arrived = movement.mover.x === objectivePlan.target.x && movement.mover.y === objectivePlan.target.y;
      const advanced = arrived || movement.mover.x !== active.x || movement.mover.y !== active.y;
      if (advanced) {
        const travelMs = animateComputedMove(active, route.path, movement.mover, movement.units, 150);
        scheduleCutscene(() => { if (arrived && objectivePlan.action !== "guard" && objectivePlan.action !== "escort") setDust2Objective((state) => objectivePlan.action === "recover" ? pickUpDust2Flag(state, active.id) : objectivePlan.action === "defuse" ? advanceDust2Defuse(state, active.id) : plantDust2Flag(state, active.id, objectivePlan.target.id, dust2InitiativeCount)); setLog((lines) => [`${active.name} ${arrived ? objectivePlan.action === "guard" ? `guards Site ${objectivePlan.target.id}` : objectivePlan.action === "escort" ? "escorts the Flag carrier" : objectivePlan.action === "recover" ? "recovers The One True Flag" : objectivePlan.action === "defuse" ? dust2Objective.defuseActions ? "finishes defusing the Flag" : "begins defusing the Flag" : `plants at Site ${objectivePlan.target.id}` : "advances toward the objective"}.`, ...lines].slice(0, 6)); setAiBusy(false); finishTurnRef.current(); }, travelMs + 260); return;
      }
    }
    const readyCharge = readyChargedSpellFor(chargedSpells, active, round);
    const frightenedState = active.conditions?.frightened, fearSource = frightenedState?.sourceId ? units.find((unit) => unit.id === frightenedState.sourceId) : undefined;
    if (frightenedState && fearSource) {
      const budget = effectiveMovement(active), retreatOptions: { distance: number; cost: number; path: { x:number; y:number; surfaceId?:string; elevationFt?:number }[] }[] = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let step = 1; step <= budget; step++) {
        const x = active.x + dx * step, y = active.y + dy * step; if (x < 0 || y < 0 || x >= boardCols || y >= boardRows) continue;
        const route = routeTo(active, x, y, false); if (route.cost > 0 && route.cost <= budget) retreatOptions.push({ ...route, distance: attackDist({ x, y }, fearSource) });
      }
      const path = retreatOptions.sort((a, b) => b.distance - a.distance || b.cost - a.cost)[0]?.path || [];
      const retreat = moveAlongRoute(active, path, effectiveMovement(active), units), travel = animateComputedMove(active, path, retreat.mover, retreat.units, 240);
      setLog((lines) => [`${active.name} flees from ${fearSource.name} while Frightened.`, ...lines].slice(0, 6)); scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, travel + 260); return;
    }
    if (readyCharge) {
      if (hasEffect(active, "counterspell")) {
        setChargedSpells((spells) => spells.filter((spell) => spell.id !== readyCharge.id)); setUnits((current) => current.map((unit) => unit.id === active.id ? removeEffect(unit, "counterspell") : unit));
        setLog((lines) => [`${active.name}'s charged ${readyCharge.name} is countered.`, ...lines].slice(0, 6)); setAiBusy(false); finishTurnRef.current(); return;
      }
      releaseChargedSpell(readyCharge);
      scheduleChargedTurnCompletion();
      return;
    }
    if (active.role === "Manticore") {
      const target = units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit) && attackDist(active, unit) <= MANTICORE_TAILSTORM_RANGE && clearLine(active, unit)).sort((a, b) => attackDist(active, a) - attackDist(active, b))[0];
      if (target) {
        const tiles = Array.from({ length: 9 }, (_, index) => ({ x: target.x + (index % 3) - 1, y: target.y + Math.floor(index / 3) - 1 })).filter((tile) => tile.x >= 0 && tile.x < boardCols && tile.y >= 0 && tile.y < boardRows);
        setAbilityVfx({ name: "Tailstorm", from: { x: active.x, y: active.y }, to: { x: target.x, y: target.y }, tiles, nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), 1800);
        animateSprite(active.id, "cast", 1150);
        armChargedSpell(active, "Tailstorm", tiles, 20, -6, "physical");
        scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 800);
        return;
      }
    }
    if (active.role === "Black Dragon") {
      const heroes = units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit));
      const breathIndex = active.skills.findIndex((skill) => skill.id === "wyrmling-acid-breath"), breath = active.skills[breathIndex];
      const rechargeRoll = breath?.charges === 0 ? Math.floor(randomUnit() * 6) + 1 : 0, breathReady = !!breath && (breath.charges > 0 || (!!breath.rechargeRoll && rechargeRoll >= breath.rechargeRoll.min && rechargeRoll <= breath.rechargeRoll.max));
      const breathOptions = heroes.map((hero) => { const tiles = skillAreaTiles("line", breath?.range || 1, active, hero, boardCols, boardRows, clearLine);
        return { hero, tiles, victims: heroes.filter((candidate) => tiles.some((tile) => unitOccupiesTile(candidate, tile.x, tile.y))) };
      }).filter((option) => option.victims.length);
      const bestBreath = breathOptions.sort((a, b) => b.victims.length - a.victims.length || attackDist(active, a.hero) - attackDist(active, b.hero))[0];
      if (breathReady && bestBreath) {
        const saves = bestBreath.victims.map((victim) => { const save = resolveSavingThrow(victim, breath.saveAbility || "dexterity", breath.saveDc || 10, GAME_RUNTIME.rollD20()), damage = damageAfterProtection(victim, save.success && breath.halfDamageOnSave ? Math.floor(breath.power / 2) : breath.power, breath.damageType || "acid"); return { victim, save, damage, reaction: reactiveDefense(active, victim, damage, false) }; });
        setAbilityVfx({ name: "Acid Breath", from: { x: active.x, y: active.y }, to: bestBreath.tiles[bestBreath.tiles.length - 1], tiles: bestBreath.tiles, nonce: runtimeNow() }); animateSprite(active.id, "cast", 1200); showCombatBark(active.id, "HSSSSK!", 1200);
        setUnits((current) => current.map((unit) => {
          if (unit.id === active.id) return { ...unit, ...combatDamageOutcome(unit, saves.reduce((sum, result) => sum + result.reaction.attackerDamage, 0)), skills: unit.skills.map((skill, index) => index === breathIndex ? { ...skill, charges: 0 } : skill) };
          const result = saves.find((entry) => entry.victim.id === unit.id);
          return result ? { ...unit, ...combatDamageOutcome(unit, result.reaction.defenderDamage), skills: result.reaction.rebukeSkillId ? unit.skills.map((skill) => (skill.id || skill.name) === result.reaction.rebukeSkillId ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) : unit.skills, lastDamagerId: result.reaction.defenderDamage ? active.id : unit.lastDamagerId, lastDamageType: breath.damageType || "acid" } : unit;
        }));
        setLog((lines) => [`Black Dragon uses ${breath.name} on ${saves.length} ${saves.length === 1 ? "hero" : "heroes"}. ${saves.map(({ victim, save, reaction }) => `${victim.name}: ${String(breath.saveAbility || "dexterity").slice(0,3).toUpperCase()} ${save.total} vs DC ${breath.saveDc}, ${reaction.defenderDamage} ${breath.damageType}`).join("; ")}.`, ...(rechargeRoll && breath.rechargeRoll && rechargeRoll >= breath.rechargeRoll.min ? [`${breath.name} recharged on a ${rechargeRoll}.`] : []), ...lines].slice(0, 6)); scheduleCutscene(() => setAbilityVfx(null), 1600); scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 1650); return;
      }
      const adjacent = heroes.sort((a, b) => attackDist(active, a) - attackDist(active, b))[0]; if (adjacent && attackDist(active, adjacent) <= 1) {
        const rend = active.skills.find((skill) => skill.id === "wyrmling-rend");
        if (!rend) {
          setUnits((current) => current.map((unit) => unit.id === active.id ? normalizeMonsterRuntime(unit) : unit));
          setAiBusy(false);
          return;
        }
        const attacks = Array.from({ length: rend.attackCount || 1 }, () => {
          const check = rollAttack(active, adjacent, 0, rend.range, rend.attackBonus);
          const primary = check.hit ? damageAfterProtection(adjacent, criticalDamage(rend.power, check.critical), rend.damageType) : 0;
          const additional = check.hit ? (rend.additionalDamage || []).reduce((sum, part) => sum + damageAfterProtection(adjacent, criticalDamage(part.damage, check.critical), part.damageType), 0) : 0;
          return { check, damage: primary + additional };
        });
        const totalDamage = attacks.reduce((sum, attack) => sum + attack.damage, 0);
        const reaction = reactiveDefense(active, adjacent, totalDamage, true);
        animateSprite(active.id, "attack", 900); if (totalDamage) animateSprite(adjacent.id, "damage", 520);
        setUnits((current) => current.map((unit) => unit.id === adjacent.id ? { ...unit, ...combatDamageOutcome(unit, reaction.defenderDamage), skills: reaction.rebukeSkillId ? unit.skills.map((skill) => (skill.id || skill.name) === reaction.rebukeSkillId ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) : unit.skills, lastDamagerId: reaction.defenderDamage ? active.id : unit.lastDamagerId, lastDamageType: rend.damageType } : unit.id === active.id ? { ...unit, ...combatDamageOutcome(unit, reaction.attackerDamage), skills: breath.rechargeRoll && rechargeRoll >= breath.rechargeRoll.min ? unit.skills.map((skill, index) => index === breathIndex ? { ...skill, charges: 1 } : skill) : unit.skills } : unit));
        setLog((lines) => [`Black Dragon makes two Rend attacks against ${adjacent.name}: ${attacks.map((attack) => attack.check.hit ? `${attack.damage} damage${attack.check.critical ? " (critical)" : ""}` : "miss").join("; ")}.${reaction.counterLabel ? ` ${reaction.counterLabel}` : ""}${reaction.attackerDamage ? ` It takes ${reaction.attackerDamage} reactive damage.` : ""}`, ...(rechargeRoll >= 5 ? [`Acid Breath recharges on a ${rechargeRoll}.`] : []), ...lines].slice(0, 6));
        scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 950); return;
      }
      if (rechargeRoll >= 5) setUnits((current) => current.map((unit) => unit.id === active.id ? { ...unit, skills: unit.skills.map((skill, index) => index === breathIndex ? { ...skill, charges: 1 } : skill) } : unit));
    }
    if (active.role === "Ettin" && active.encounterGroup === "39a" && active.bossHead === "spellcaster") {
      const nearestHero = units
        .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit))
        .sort((a, b) => attackDist(active, a) - attackDist(active, b))[0];
      if (!firedMapEvents.includes("boss-39a-advanced")) {
        const advance = nearestHero
          ? advanceEnemyToward(active, nearestHero, Math.min(3, active.move), 4)
          : { units, mover: active, spent: 0, logs: [] as string[] };
        setUnits(advance.units);
        setFiredMapEvents((events) => [...new Set([...events, "boss-39a-advanced"])]);
        showCombatBark(active.id, "BOTH HEADS: WHO ENTERS OUR HALL?", 1900);
        setLog((lines) => [
          advance.spent
            ? `The Two-Headed King lumbers ${advance.spent} square${advance.spent === 1 ? "" : "s"} toward the intruders before raising either weapon.`
            : "The Two-Headed King rises, sizes up the intruders, and claims the center of the hall.",
          ...lines,
        ].slice(0, 6));
        scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 850);
        return;
      }
      const heroes = units.filter((unit) =>
        unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit) && attackDist(active, unit) <= BOSS_SPELL_RANGE,
      );
      const target = [...heroes].sort((a, b) => attackDist(active, a) - attackDist(active, b))[0];
      if (!target) {
        const advance = nearestHero
          ? advanceEnemyToward(active, nearestHero, Math.min(3, active.move), BOSS_SPELL_RANGE)
          : { units, mover: active, spent: 0, logs: [] as string[] };
        setUnits(advance.units);
        showCombatBark(active.id, advance.spent ? "SPELL HEAD: CLOSER!" : "SPELL HEAD: GET IN MY FIELD!", 1500);
        setLog((lines) => [advance.spent
          ? `The Two-Headed King advances ${advance.spent} square${advance.spent === 1 ? "" : "s"}, bringing the spell head's field closer.`
          : `The spell head has no target inside its ${BOSS_SPELL_RANGE}-square casting field.`, ...lines].slice(0, 6));
        scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 650);
        return;
      }
      const horizontal = Math.abs(target.x - active.x) >= Math.abs(target.y - active.y);
      const aim = horizontal ? { x: target.x, y: active.y } : { x: active.x, y: target.y };
      armChargedSpell(active, "Crown Beam", skillAreaTiles("line", BOSS_SPELL_RANGE, active, aim, boardCols, boardRows, clearLine), 28, 2, "arcane");
      showCombatBark(active.id, "SPELL HEAD: HOLD STILL!", 1900);
      scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 850);
      return;
    }
    if (active.role === "Ettin" && active.encounterGroup === "39a" && active.bossHead === "bruiser") {
      let moved = active;
      let victims = units.filter((unit) =>
        unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit) && attackDist(moved, unit) <= 2,
      );
      if (!victims.length) {
        const target = units
          .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit))
          .sort((a, b) => attackDist(moved, a) - attackDist(moved, b))[0];
        if (target) {
          const advance = advanceEnemyToward(moved, target, Math.min(3, moved.move), 2);
          moved = advance.mover;
          victims = units.filter((unit) =>
            unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit) && attackDist(moved, unit) <= 2,
          );
          setUnits(advance.units);
          if (advance.spent) setLog((lines) => [
            `The Two-Headed King stomps ${advance.spent} square${advance.spent === 1 ? "" : "s"} toward ${target.name}.`,
            ...lines,
          ].slice(0, 6));
        }
      }
      const claimed = new Set(units.filter((unit) => !victims.some((victim) => victim.id === unit.id))
        .flatMap((unit) => unitFootprintAt(unit).map((tile) => key(tile.x, tile.y))));
      const pushes = new Map<string, { x: number; y: number }>();
      victims.forEach((victim) => {
        const dx = victim.x - moved.x, dy = victim.y - moved.y;
        const landing = Math.abs(dx) >= Math.abs(dy)
          ? { x: victim.x + Math.sign(dx || 1), y: victim.y }
          : { x: victim.x, y: victim.y + Math.sign(dy || 1) };
        if (dungeonOpen.has(key(landing.x, landing.y)) && !currentBlocked.has(key(landing.x, landing.y)) && !claimed.has(key(landing.x, landing.y))) {
          pushes.set(victim.id, landing);
          claimed.add(key(landing.x, landing.y));
        }
      });
      animateSprite(active.id, "attack", 900);
      showCombatBark(active.id, "BRUISER HEAD: CROWN-SLAM!", 1900);
      setBossShockwave({ x: moved.x, y: moved.y, nonce: runtimeNow() });
      scheduleCutscene(() => setBossShockwave(null), 950);
      setUnits((current) => current.map((unit) => {
        if (unit.id === active.id) return { ...unit, x: moved.x, y: moved.y };
        if (!victims.some((victim) => victim.id === unit.id)) return unit;
        const damage = damageAfterProtection(unit, 24, "bludgeoning");
        return { ...unit, ...(pushes.get(unit.id) || {}), ...combatDamageOutcome(unit, damage), lastDamagerId: active.id };
      }));
      setLog((lines) => [victims.length
        ? `The bruiser head slams ${victims.length} nearby ${victims.length === 1 ? "hero" : "heroes"}, dealing damage and knocking them back one square when space allows.`
        : "The bruiser head slams the floor, but the company stays outside the shockwave.", ...lines].slice(0, 6));
      scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, 1050);
      return;
    }
    if (active.role === "Werewolf") showCombatBark(active.id, "AWOOOOOO!", 1100);
    const timer = setTimeout(
      () => {
        const livingVillagers = units.filter((u) => u.role === "Villager" && u.npc && !u.downed);
        const intactEntrances = barriers.filter((b) => b.hp > 0);
        const villageBreached = villageBattle && barriers.some((barrier) => barrier.hp <= 0);
        const openEntrance = villageBattle ? barriers.find((barrier) => barrier.hp <= 0 && barrier.edgeKey) : undefined;
        const breachPoint = openEntrance?.edgeKey && !inVillageInterior(active) ? villageBreachInterior(openEntrance.edgeKey) : null;
        const phasingFlourGhost = active.id === "empowered-flour-ghost";
        const ordinaryHeroTargets = units.filter((u) =>
          u.team === "hero" && !u.downed && (phasingFlourGhost || canEnemySeeHero(active, u)),
        );
        const targets = rankEnemyTargets(
          active,
          villageBreached && livingVillagers.length ? livingVillagers : ordinaryHeroTargets,
          units,
        );
        const meleeThreat =
          active.role === "Bandit Archer"
            ? targets.find((u) => attackDist(active, u) <= 1)
            : undefined;
        const effectiveRange = meleeThreat ? 1 : enemyThreatRange(active.range, active.skills);
        // Enemies engage exposed heroes before battering scenery. A target is only
        // considered exposed when the enemy can reach attack range this turn and
        // has a clear line, preventing units from fixating on someone behind a wall.
        const exposedTarget = targets.find(
          (u) =>
            attackDist(active, u) <= active.move + effectiveRange &&
            (phasingFlourGhost || clearLine(active, u)),
        );
        const preferredBarrier =
          villageBattle && !villageBreached && intactEntrances.length && !exposedTarget
            ? active.role === "Werewolf"
              ? intactEntrances.find((b) => b.kind === "door") ||
                intactEntrances[0]
              : [...intactEntrances].sort(
                  (a, b) => dist(active, a) - dist(active, b),
                )[0]
            : null;
        const cubeTarget = active.role === "Gelatinous Cube"
          ? units
              .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed && canEnemySeeHero(active, unit))
              .sort((a, b) => dist(active, a) - dist(active, b))[0]
          : undefined;
        const target =
          cubeTarget ||
          exposedTarget ||
          (!preferredBarrier ? targets[0] : targets.find((u) => !u.npc)) ||
          livingVillagers[0];
        if (!target) {
          setAiBusy(false);
          setLog((lines) => [`${active.name} cannot find a valid target and loses the turn.`, ...lines].slice(0, 6));
          finishTurnRef.current();
          return;
        }
        if (active.role === "Gelatinous Cube") {
          const route = routeTo(active, target.x, target.y, true, dust2MapActive ? target : undefined);
          const movement = moveAlongRoute(active, route.path, active.move, units);
          const moved = movement.mover;
          const engulfed = moved.x === target.x && moved.y === target.y && (!dust2MapActive || dust2SamePosition(moved, target));
          const cubeUnits = engulfed
            ? movement.units.map((unit) => {
                if (unit.id !== target.id) return unit;
                const cubeAttack = moved.skills[0];
                const damage = damageAfterProtection(target, cubeAttack?.power || 0, cubeAttack?.damageType || "acid");
                return { ...unit, ...combatDamageOutcome(unit, damage), lastDamagerId: moved.id };
              })
            : movement.units;
          const travelMs = animateComputedMove(active, route.path, moved, cubeUnits, 320);
          if (engulfed) {
            setAbilityVfx({ name: "Engulf", from: { x: active.x, y: active.y }, to: { x: target.x, y: target.y }, tiles: unitFootprintAt(target), nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), 1800);
            const cubeAttack = moved.skills[0];
            const damage = damageAfterProtection(target, cubeAttack?.power || 0, cubeAttack?.damageType || "acid");
            scheduleCutscene(() => setLog((lines) => [`The Gelatinous Cube flows over ${target.name} for ${damage} unavoidable damage.`, ...movement.logs, ...lines].slice(0, 6)), travelMs);
          } else {
            scheduleCutscene(() => setLog((lines) => [`The Gelatinous Cube slides toward ${target.name}.`, ...movement.logs, ...lines].slice(0, 6)), travelMs);
          }
          scheduleCutscene(() => { setAiBusy(false); finishTurnRef.current(); }, travelMs + 420);
          return;
        }
        let moved = { ...active };
        let travelMs = 0;
        const objective = breachPoint || preferredBarrier || target;
        const attackSquares: Array<{
          x: number;
          y: number;
          cost: number;
          path: { x: number; y: number; surfaceId?: string; elevationFt?: number }[];
        }> = [];
        // Search only useful firing/striking squares around the target. The old
        // implementation routed to every tile on the 40×120 dungeon map, which
        // could lock the browser when an elemental, cube, or boss took a turn.
        const attackCandidates: { x: number; y: number }[] = [];
        if (!phasingFlourGhost) {
          for (let y = Math.max(0, objective.y - effectiveRange); y <= Math.min(boardRows - 1, objective.y + effectiveRange); y++)
            for (let x = Math.max(0, objective.x - effectiveRange); x <= Math.min(boardCols - 1, objective.x + effectiveRange); x++) {
              if (attackDist({ x, y }, objective) > effectiveRange) continue;
              if (currentBlocked.has(key(x, y)) || (!dust2MapActive && occupied(x, y) && !(x === active.x && y === active.y))) continue;
              // An intact entrance blocks sight through the wall, but wolves
              // must still route beside that entrance so they can tear it down.
              if (!preferredBarrier && !dust2MapActive && !clearLine({ x, y }, objective)) continue;
              attackCandidates.push({ x, y });
            }
          attackCandidates
            .sort((a, b) => dist(active, a) - dist(active, b))
            .slice(0, 32)
            .forEach(({ x, y }) => {
              const route = routeTo(active, x, y, active.role === "Club Hostess");
              const landing = route.path[route.path.length - 1] || active;
              if (route.cost < 99 && (preferredBarrier || clearLine(landing, objective))) attackSquares.push({ x, y, ...route });
            });
        }
        const bridgeArcherHolding =
          campaignScene === 6 &&
          active.role === "Bandit Archer" &&
          effectiveRange > 1 &&
          attackDist(active, target) >= 3 &&
          attackDist(active, target) <= effectiveRange &&
          clearLine(active, target);
        const breachRoute = breachPoint ? routeTo(active, breachPoint.x, breachPoint.y, active.role === "Club Hostess") : null;
        const destination = breachRoute && breachRoute.cost < 99
          ? { ...breachPoint!, ...breachRoute }
          : bridgeArcherHolding
          ? { x: active.x, y: active.y, cost: 0, path: [] as { x: number; y: number }[] }
          : attackSquares.sort((a, b) => {
          if (preferredBarrier) return a.cost - b.cost;
          if (active.role === "Bandit Archer" && effectiveRange > 1) {
            const preferredDistance = Math.min(6, effectiveRange);
            const rangeDifference =
              Math.abs(attackDist(a, target) - preferredDistance) -
              Math.abs(attackDist(b, target) - preferredDistance);
            return rangeDifference || a.cost - b.cost;
          }
          // Rear positioning is a preference, never a reason to circle the map.
          // Permit at most one extra step for a flank; otherwise close by the
          // shortest reachable route and attack from the available side.
          const routeDifference = a.cost - b.cost;
          if (Math.abs(routeDifference) > 1) return routeDifference;
          const rearDifference =
            rearPositionScore(b.x, b.y, target) -
            rearPositionScore(a.x, a.y, target);
          return rearDifference || routeDifference;
          })[0];
        // A destination's route may be longer than this turn's movement; the
        // movement-budget helper advances along it and keeps pursuing next turn.
        const advanceDestination = destination;
        if (phasingFlourGhost) {
          const path: { x: number; y: number }[] = [];
          let ghostX = active.x;
          let ghostY = active.y;
          for (let step = 0; step < active.move && attackDist({ x: ghostX, y: ghostY }, target) > 1; step++) {
            ghostX += Math.sign(target.x - ghostX);
            ghostY += Math.sign(target.y - ghostY);
            path.push({ x: ghostX, y: ghostY });
          }
          moved = { ...active, x: ghostX, y: ghostY };
          const phasedUnits = units.map((unit) => unit.id === active.id ? moved : unit);
          travelMs = animateComputedMove(active, path, moved, phasedUnits, 210);
          scheduleCutscene(() => setLog((lines) => [
            `${active.name} takes the straight path through stone toward ${target.name}.`,
            ...lines,
          ].slice(0, 6)), travelMs);
        } else if (advanceDestination) {
          const movement = moveAlongRoute(
            active,
            advanceDestination.path,
            active.move,
            units,
          );
          moved = movement.mover;
          travelMs = animateComputedMove(active, advanceDestination.path, moved, movement.units, 260);
          if (movement.logs.length)
            scheduleCutscene(() => setLog((lines) => [...movement.logs, ...lines].slice(0, 6)), travelMs);
        }
        scheduleCutscene(() => {
          if (moved.downed) {
            if (moved.team === "enemy") awardDungeonXp(moved.xpReward || xpForCr(moved.cr), moved.lastDamagerId, moved.id);
            setAiBusy(false);
            finishTurnRef.current();
            return;
          } else if (
            preferredBarrier &&
            attackDist(moved, preferredBarrier) <= moved.range
          ) {
            attackBarrier(preferredBarrier, moved);
          } else if (
            attackDist(moved, target) <= effectiveRange &&
            (phasingFlourGhost || clearLine(moved, target))
          ) {
            const refreshedSkills = rechargeMonsterSkills(moved.skills, () => 1 + Math.floor(randomUnit() * 6));
            if (refreshedSkills.some((skill, index) => skill.charges !== moved.skills[index]?.charges)) {
              moved = { ...moved, skills: refreshedSkills };
              setUnits((current) => current.map((unit) => unit.id === moved.id ? moved : unit));
            }
            const enemySkill = chooseEnemyAbility(refreshedSkills, attackDist(moved, target));
            if (enemySkill && isMagicalAbility(enemySkill) && conditionPreventsSpeech(moved)) { setLog((lines) => [`${moved.name} cannot use ${enemySkill.name} while Silenced.`, ...lines].slice(0, 6)); setAiBusy(false); finishTurnRef.current(); return; }
            if (enemySkill && isMagicalAbility(enemySkill) && hasEffect(moved, "counterspell")) {
              setUnits((current) => current.map((unit) => unit.id === moved.id ? removeEffect({ ...unit, skills: unit.skills.map((skill) => skill.id === enemySkill.id && !skill.unlimited ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) }, "counterspell") : unit));
              setAbilityVfx({ name: "Counterspell", from: target, to: moved, nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), 1600);
              setLog((lines) => [`${moved.name}'s ${enemySkill.name} is countered before it resolves.`, ...lines].slice(0, 6)); setAiBusy(false); finishTurnRef.current(); return;
            }
            const monsterEffect = enemySkill ? monsterActionEffect(moved.role, enemySkill.name) : undefined;
            if (monsterEffect) {
              const areaTiles = monsterEffect === "Whirlwind Slam" ? Array.from({ length: 9 }, (_, index) => ({ x: moved.x + (index % 3) - 1, y: moved.y + Math.floor(index / 3) - 1 })) : undefined;
              setAbilityVfx({ name: monsterEffect, from: { x: moved.x, y: moved.y }, to: { x: target.x, y: target.y }, tiles: areaTiles, nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), areaTiles?.length ? 1800 : 1600);
            }
            const attackRange = enemySkill?.range || moved.range;
            const actionAnimation = actorActionAnimation(moved.role, enemySkill?.name);
            animateSprite(moved.id, actionAnimation.pose, actionAnimation.duration);
            const save = enemySkill?.saveAbility && enemySkill.saveDc
              ? resolveSavingThrow(target, enemySkill.saveAbility, enemySkill.saveDc, GAME_RUNTIME.rollD20())
              : null;
            const projectileDeflected = !save && isOrdinaryProjectileAttack(attackRange, enemySkill?.damageType || moved.damageType, isMagicalAbility(enemySkill)) && ordinaryProjectileBlocked(abilityZones, moved, target);
            const packAdvantage = monsterTraitEffects(moved).some((trait) => trait.grantsAdvantageNearAlly) && units.some((unit) => unit.id !== moved.id && unit.team === moved.team && !unit.downed && attackDist(unit, target) <= 1);
            const checks = save || projectileDeflected ? [] : Array.from({ length: enemySkill?.attackCount || 1 }, () => rollAttack(moved, target, 0, attackRange, enemySkill?.attackBonus, packAdvantage));
            const check = checks[0] || null;
            if (enemySkill && !enemySkill.unlimited) setUnits((current) => current.map((unit) => unit.id === moved.id ? { ...unit, skills: unit.skills.map((skill) => skill.id === enemySkill.id ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) } : unit));
            if (attackRange > 1 && !projectileDeflected)
              setProjectile({
                from: { x: moved.x, y: moved.y },
                to: { x: target.x, y: target.y },
                nonce: runtimeNow(),
              });
            const hitChecks = checks.filter((result) => result.hit);
            const landed = save ? !save.success || Boolean(enemySkill?.halfDamageOnSave) : hitChecks.length > 0;
            if (landed) {
              const baseDamage = save?.success
                ? Math.floor((enemySkill?.power || 0) / 2)
                : hitChecks.reduce((total, result) => total + criticalDamage(enemySkill?.power || 0, result.critical), 0);
              const typedDamage = damageAfterProtection(target, baseDamage, enemySkill?.damageType || moved.damageType);
              const extraDamage = save ? 0 : hitChecks.reduce((total) => total + (enemySkill?.additionalDamage || []).reduce((sum, part) => sum + damageAfterProtection(target, part.damage, part.damageType), 0), 0);
              const dmg = Math.min(enemySkill?.damageCap ?? Number.POSITIVE_INFINITY, typedDamage + extraDamage);
              const reaction = reactiveDefense(moved, target, dmg, attackRange <= 1);
              const conditions = (enemySkill?.inflictedConditions || []).filter((condition) => !condition.saveAbility || !condition.saveDc || !resolveSavingThrow(target, condition.saveAbility, condition.saveDc, GAME_RUNTIME.rollD20()).success);
              const feedback = reaction.preempted ? statusFloat("COUNTERED") : damageFloat(reaction.defenderDamage);
              pushCombatFloat(target.id, feedback.text, feedback.tone);
              if (reaction.defenderDamage) animateSprite(target.id, "damage", 520);
              setUnits((us) => us.map((u) => {
                if (u.id === target.id) {
                  let defended: Unit = { ...u, ...combatDamageOutcome(u, reaction.defenderDamage), lastDamagerId: reaction.defenderDamage ? moved.id : u.lastDamagerId, lastDamageType: enemySkill?.damageType || moved.damageType, bleeding: reaction.preempted ? u.bleeding : u.npc && !u.conditionImmunities?.includes("bleeding") ? true : u.bleeding, skills: reaction.rebukeSkillId ? u.skills.map((skill) => (skill.id || skill.name) === reaction.rebukeSkillId ? { ...skill, charges: Math.max(0, skill.charges - 1) } : skill) : u.skills };
                  if (!reaction.preempted) for (const condition of conditions) defended = applyCondition(defended, condition.condition, { sourceId: moved.id, durationRounds: condition.durationRounds, saveAbility: condition.saveAbility, saveDc: condition.saveDc, saveTiming: condition.repeatSave ? "end-of-turn" : undefined });
                  return defended;
                }
                return u.id === moved.id && reaction.attackerDamage ? { ...u, ...combatDamageOutcome(u, reaction.attackerDamage), lastDamagerId: target.id } : u;
              }));
              if (reaction.attackerDamage >= moved.hp) awardDungeonXp(moved.xpReward || xpForCr(moved.cr), target.id, moved.id);
              if (reaction.rebukeSkillId) { setAbilityVfx({ name: "Hellish Rebuke", from: target, to: moved, nonce: runtimeNow() }); scheduleCutscene(() => setAbilityVfx(null), 1600); }
              setLog((l) =>
                [`${active.name}${enemySkill ? ` uses ${enemySkill.name} and` : ""} ${reaction.preempted ? "is stopped before the hit lands" : `hits ${target.name} for ${reaction.defenderDamage}`}. ${save ? `${save.ability.toUpperCase()} save ${save.total} vs DC ${save.dc}${save.success ? " succeeds" : " fails"}` : checks.map(rollLabel).join(" · ")}.${hitChecks.some((result) => result.critical) ? " Critical hit!" : ""}${reaction.counterLabel ? ` ${reaction.counterLabel}` : ""}${reaction.attackerDamage ? ` ${active.name} takes ${reaction.attackerDamage} reactive damage.` : ""}`, ...l].slice(
                  0,
                  6,
                ),
              );
            } else {
              setLog((l) =>
                [projectileDeflected ? `Wind Wall deflects ${active.name}'s ${enemySkill?.name || "projectile"}. The attack is spent.` : `${active.name}${enemySkill ? ` uses ${enemySkill.name} but` : ""} misses ${target.name}. ${save ? `${save.ability.toUpperCase()} save ${save.total} vs DC ${save.dc} succeeds` : rollLabel(check!)}.`, ...l].slice(0, 6),
              );
              const feedback = missFloat();
              pushCombatFloat(target.id, feedback.text, feedback.tone);
            }
            if (attackRange > 1)
              scheduleCutscene(() => setProjectile(null), 520);
          }
          const f: Facing =
            Math.abs(target.x - moved.x) > Math.abs(target.y - moved.y)
              ? target.x > moved.x
                ? "e"
                : "w"
              : target.y > moved.y
                ? "s"
                : "n";
          setUnits((us) =>
            us.map((u) => (u.id === active.id ? { ...u, facing: f } : u)),
          );
          setAiBusy(false);
          finishTurnRef.current();
        }, travelMs + ENEMY_ATTACK_READ_DELAY_MS);
      },
      active.role === "Werewolf" ? 1500 : ENEMY_TURN_READ_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [
    active?.id,
    active?.bossHead,
    active?.team,
    active?.downed,
    active?.stunned,
    turn,
    round,
    stage,
    encounterMode,
    barriers,
    campaignScene,
    chapterIntro,
    poisonCutscene,
    encounterSequenceLabel,
    victory,
    defeat,
  ]);
  // A new authored scene or encounter begins with a full movement budget.
  // Leftover movement, Dash, and a selected action must not cross that seam.
  useDeferredEffect(() => {
    setMovementSpent(0);
    setDashActive(false);
    setPhase("move");
    setChosen(null);
    setInventoryOpen(false);
  }, [campaignScene, encounterMode]);
  const restart = () => {
    clearTransientTimers();
    const savedCampaignExists = !!localStorage.getItem(CAMPAIGN_SAVE_KEY);
    awardedXpSourcesRef.current.clear();
    setStage("mode");
    setCampaign(false);
    setDust2FreeplayTeam(null);
    setDust2FreeplayMatch(null);
    setHasSave(savedCampaignExists);
    setHeroIds([]);
    setLeaderId(null);
    setEnemyTypes([]);
    setUnits([]);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setAiBusy(false);
    setLog([]);
    setLevel(1);
    setCampaignScene(1);
    setRoute(null);
    setStoryChoice(null);
    setMapVariant("forest");
    setTrainingMap("woodland");
    setRitualActive(false);
    setFiredMapEvents([]);
    setPendingDungeonRoomId(null);
    setRoomEntryPresentation(null);
    setRitualSelected(false);
    setBarriers([]);
    setVillageWave(1);
    setVillageWaveBreakUntil(null);
    setVillageAftermath(false);
    setVillageCelebrating(false);
    setPotions({});
    setDungeonItems({});
    setDungeonStatBonuses({});
    setEquippedItems({});
    setHeroCombatStats({});
    setBurningZone(null);
    setAbilityZones([]);
    setChargedSpells([]);
    setBossShockwave(null);
    setBossSpellBurst(null);
    setInventoryOpen(false);
    setAchievements([]);
    setClaimedAchievementIds([]);
    setNoticeQueue([]);
    setWanderingGuardian(null);
    setDownCounts({});
    achievementIds.current.clear();
    downCountsRef.current = {};
    previousDownedState.current = {};
    previousEnemyDownedState.current = {};
    previousHeroHp.current = {};
    roomTriggerPosition.current = "";
    setGuardSpeakerId(null);
    setGuardHatDecision(null);
    setHeroDisguises({});
    setWayfarerSpeakerId(null);
    setSocialScene(null);
    setGoblinShirtClaim(false);
    setWayfarerReady(false);
    setBonusSkills({});
    setAbilityQueue([]);
    setDeferredAbilityQueue([]);
    setLevelBeforeGain(1);
    setLevelReturn("story");
    setMapCompletions({});
    setChapterIntro(false);
    setBoonAbilityFlow(false);
    setProjectile(null);
    setEncounterMode("combat");
    setExitReached(false);
    invalidateSequence();
    completeEncounterSequenceRef.current = null;
    setEncounterSequenceLabel(null);
  };
  const beginNewCampaign = () => {
    localStorage.removeItem(CAMPAIGN_SAVE_KEY);
    setHasSave(false);
    restart();
    setCampaign(true);
    setStage("heroes");
  };
  const allAbilities = Object.entries(kits).flatMap(([role, kit]) =>
    kit.skills.map((skill, i) => ({
      key: `${role}:${i}`,
      role,
      skill: { ...skill },
    })),
  );
  const abilityLibrary = [...new Map([
    ...allAbilities,
    ...Object.entries(progressionSkills).flatMap(([role, skills]) =>
      skills.map((skill, i) => ({
        key: `${role}:progression:${i}`,
        role,
        skill: { ...skill },
      })),
    ),
  ].map((ability) => [ability.skill.name, ability])).values()];
  const galleryAbilityLibrary = [...new Map(Object.entries(kits).flatMap(([role, kit]) => [...kit.skills, ...(progressionSkills[role] || [])].map((skill) => [`${role}:${skill.name}`, { role, skill: { ...skill } }] as const))).values()]
    .sort((a, b) => a.role.localeCompare(b.role) || a.skill.name.localeCompare(b.skill.name));
  const addTester = () => {
    const tester = {
      id: "custom-hero",
      name: "Tester",
      role: "Barbarian",
      templateId: "Barbarian-0",
      skills: [
        { ...kits.Cleric.skills.find((skill) => skill.name === "Sanctuary")! },
        { ...kits.Wizard.skills.find((skill) => skill.name === "Fireball")! }, { ...playtestMapWideRevive },
        { ...playtestKillingCurse },
      ],
    };
    setCustom(tester);
    setHeroIds((ids) => ids.includes(tester.id) || ids.length >= 4 ? ids : [...ids, tester.id]);
    if (campaign && !leaderId) setLeaderId(tester.id);
  };
  const nextScene = () => {
    setUnits([]);
    setChargedSpells([]);
    setEnemyTypes([]);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setStage("story");
  };
  const finishLevelFlow = (destination = levelReturn) => {
    setAbilityQueue([]);
    setBoonAbilityFlow(false);
    if (destination === "story") nextScene();
    else if (destination === "poison") startPoisonBaitScene();
    else if (destination === "dungeon") startDungeonScene(false);
    else {
      setStage("battle");
      if (campaignScene === 6) {
        if (bridgeSequenceGateRef.current.has("guards-approach")) return;
        bridgeSequenceGateRef.current.add("guards-approach");
        setEncounterMode("exploration");
        setChapterIntro(true);
        setAiBusy(false);
        setFiredMapEvents((events) => [...new Set([...events, "bridge-guards-approaching"])]);
        setLog(["Boots scrape stone on the north bank. The toll collectors walk out to meet the company."]);
        const currentHeroes = units.filter((unit) => unit.team === "hero" && !unit.npc);
        const capHolder = currentHeroes.find((hero) => heroHasItem(hero.id, "Ball Cap of Bad Ideas"));
        setUnits((current) => current.map((unit) =>
          unit.team === "hero" && !unit.npc ? { ...unit, facing: "n" } : unit,
        ));
        const swordOne = units.find((unit) => unit.id === "bridge-bandit-0");
        const swordTwo = units.find((unit) => unit.id === "bridge-bandit-1");
        const guardWalkEnds = [
          swordOne ? animateSceneWalk(swordOne.id, scenePath(swordOne, { x: 4, y: 2 }, bridgeBlocked, COLS, ROWS), 350, 420) : 0,
          swordTwo ? animateSceneWalk(swordTwo.id, scenePath(swordTwo, { x: 5, y: 2 }, bridgeBlocked, COLS, ROWS), 350, 420) : 0,
        ];
        scheduleCutscene(() => {
          showDialogueBubble("bridge-bandit-0", "Bridge toll. Coin first, crossing second. No coin means steel.", () => {
            setFiredMapEvents((events) => [...new Set([...events, "bridge-toll-open"])]);
            setChapterIntro(false);
            const speaker = capHolder || [...currentHeroes].sort((a, b) => (b.investigation || 0) - (a.investigation || 0))[0];
            if (speaker) setSocialScene({
              kind: "bridge-bandits",
              roomLabel: "bridge",
              title: "The Toll Collectors",
              speaker: "Bandit Swordsman",
              text: "Bridge toll. Coin first, crossing second. No coin means steel.",
              heroId: speaker.id,
            });
          });
        }, Math.max(1450, ...guardWalkEnds) + 180);
      }
    }
  };
  const grantCompanyLevels = (
    _amount: number,
    destination: "story" | "battle" | "poison",
  ) => {
    setLevelReturn(destination);
    finishLevelFlow(destination);
  };
  const completeCampaignScene = (choice: string, nextRoute: string) => {
    setStoryChoice(choice);
    setRoute(nextRoute);
    // The first-map routes continue directly into playable maps. Sending them
    // through the generic story stage left no matching story panel and produced
    // a black screen while React still held the previous route value.
    if (nextRoute === "deeper_forest") startRitualScene(level);
    else if (nextRoute === "return_to_town") startVillageScene(level);
    else if (nextRoute === "poison_bait") startPoisonBaitScene(level);
  };
  const chooseGuardSpeaker = (heroId: string) => {
    const hero = units.find((unit) => unit.id === heroId);
    if (!hero || guardDialogueStartedRef.current) return;
    guardDialogueStartedRef.current = true;
    showDialogueBubble("forest-wounded-guard", FOREST_GUARD_WARNING, () => {
      setGuardSpeakerId(heroId);
      setSocialScene({
        kind: "forest-guard",
        roomLabel: "forest-guard",
        title: "The Missing Guard",
        speaker: "Wounded Guard",
        text: FOREST_GUARD_CAP_OFFER,
        heroId,
      });
      setLog((lines) => [
        `The dying guard tells ${hero.name} what happened, then offers up his battered ball cap.`,
        ...lines,
      ].slice(0, 6));
    });
  };
  const decideGuardHat = (decision: "take" | "decline") => {
    if (!guardSpeakerId) return;
    const hero = units.find((unit) => unit.id === guardSpeakerId);
    if (!hero) return;
    setGuardHatDecision(decision);
    if (decision === "take") {
      setDroppedDungeonItems((items) => items.filter((item) => item.id !== "fallen-guard-ballcap"));
      setDungeonItems((items) => ({
        ...items,
        [hero.id]: (items[hero.id] || []).includes("Ball Cap of Bad Ideas")
          ? items[hero.id]
          : [...(items[hero.id] || []), "Ball Cap of Bad Ideas"],
      }));
      setEquippedItems((current) => ({
        ...current,
        [hero.id]: { ...(current[hero.id] || {}), head: "Ball Cap of Bad Ideas" },
      }));
    } else {
      setDroppedDungeonItems((items) => items.some((item) => item.id === "fallen-guard-ballcap")
        ? items
        : [...items, { id: "fallen-guard-ballcap", name: "Ball Cap of Bad Ideas", ...woundedGuardTile }]);
    }
    setLog((lines) => [decision === "take"
      ? `${hero.name} accepts the Ball Cap of Bad Ideas. “Take care of it,” the guard says.`
      : `${hero.name} leaves the battered ball cap with the fallen guard.`, ...lines].slice(0, 6));
    setSocialScene((scene) => scene ? {
      ...scene,
      speaker: "Fallen Guard",
      text: decision === "take"
        ? `${hero.name} accepts the cap. The guard gives one faint nod, then falls still.`
        : `${hero.name} leaves the cap with him. The guard falls still.`,
    } : scene);
  };
  const startForestScene = () => {
    clearTransientTimers();
    guardDialogueStartedRef.current = false;
    setEncounterMode("exploration");
    setAiBusy(false);
    setExitReached(false);
    setLeaderAbandoned(false);
    setForestWarningRound(null);
    setEnemyTypes([]);
    setDiscoveredPoi([]);
    setGuardSpeakerId(null);
    setGuardHatDecision(null);
    setCampaignScene(2);
    setMapVariant("forest");
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    const heroes = heroIds.map((id) => heroFromRoster(id));
    openingForestPartyStarts.forEach(({ x, y }, i) => {
      if (heroes[i]) {
        heroes[i].x = x;
        heroes[i].y = y;
      }
    });
    setUnits(heroes);
    setLog([
      "The guards' trail disappears beneath the pines. Move forward and watch for signs.",
    ]);
    setStage("battle");
  };
  const campaignHeroes = (heroLevel = level) => heroIds.map((id) => heroFromRoster(id, heroLevel));
  const startRitualScene = (heroLevel = level) => {
    clearTransientTimers();
    setEncounterMode("combat");
    setChapterIntro(true);
    setExitReached(false);
    const heroes = campaignHeroes(heroLevel);
    const foes = [
      spawnIntroWolf("Werewolf", "ritual-werewolf-1", "Moonfang"),
      spawnIntroWolf("Werewolf", "ritual-werewolf-2", "Bloodmane"),
    ];
    heroes.sort((a, b) => a.range - b.range).forEach((u, i) => {
      const start = ritualPartyStarts[i] || ritualPartyStarts[0] || { x: 7, y: 15 };
      u.x = start.x;
      u.y = start.y;
    });
    foes.forEach((u, i) => {
      const start = ritualEnemyStarts[i + 1] || ritualEnemyStarts[i] || { x: 11 + i, y: 5 };
      u.x = start.x;
      u.y = start.y;
    });
    setCampaignScene(3);
    setMapVariant("forest");
    setRitualActive(true);
    setRitualSelected(false);
    setEnemyTypes(["Werewolf", "Werewolf"]);
    setUnits([...heroes, ...foes]);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setLog([
      "Two werewolves guard a pulsing ritual. It will restore 5 HP to each of them every round.",
    ]);
    setStage("battle");
    scheduleCutscene(() => {
      showDialogueBubble(foes[0].id, "Sniff...", () => {
        showDialogueBubble(foes[0].id, "Smells like fresh meat.", () => {
          setChapterIntro(false);
        });
      });
    }, 250);
  };
  const startPoisonBaitScene = (heroLevel = level) => {
    clearTransientTimers();
    setEncounterMode("combat");
    setPoisonCutscene(true);
    setExitReached(false);
    const heroes = campaignHeroes(heroLevel);
    const wolves = POISON_BAIT_ENEMY_TYPES.map(
      (type, i) => {
        const wolf = spawnIntroWolf(type, `poison-bait-wolf-${i}`, poisonBaitEnemyName(type, i));
        wolf.poisoned = false;
        // This route is an ambush, so the party must receive the first turn.
        wolf.initiativeRoll = -100;
        return wolf;
      },
    );
    heroes.forEach((hero, i) => {
      const start = ritualPartyStarts[i] || ritualPartyStarts[0] || { x: 7, y: 15 };
      hero.x = start.x;
      hero.y = start.y;
    });
    wolves.forEach((wolf, i) => {
      const start = ritualEnemyStarts[i] || ritualEnemyStarts[0] || { x: 11 + (i % 2), y: 4 + Math.floor(i / 2) };
      wolf.x = start.x;
      wolf.y = start.y;
    });
    setCampaignScene(8);
    setMapVariant("forest");
    setRitualActive(true);
    setRitualSelected(false);
    setEnemyTypes([...POISON_BAIT_ENEMY_TYPES]);
    setUnits(wolves);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setAiBusy(false);
    setChosen(null);
    setLog([
      "The blood-moon ritual still pulses while the hidden company watches the pack return to the dead guard.",
    ]);
    setStage("battle");
    const feedingSquares = [
      { x: poisonBodyTile.x - 1, y: poisonBodyTile.y },
      { x: poisonBodyTile.x + 1, y: poisonBodyTile.y },
      { x: poisonBodyTile.x, y: poisonBodyTile.y - 1 },
      { x: poisonBodyTile.x, y: poisonBodyTile.y + 1 },
    ].filter((point) => !ritualSceneryBlocked.has(key(point.x, point.y)));
    const homeSquares = wolves.map((wolf) => ({ x: wolf.x, y: wolf.y }));
    const outwardPaths = wolves.map((wolf, i) => scenePath(wolf, feedingSquares[i % feedingSquares.length], ritualSceneryBlocked, RITUAL_COLS, RITUAL_ROWS));
    // Claim the sequence before scheduling movement. Starting a new generation
    // afterward would cancel every walking frame and make the wolves teleport.
    const poisonSequenceGeneration = beginSequence();
    let combatStarted = false;
    const beginPoisonCombat = () => {
      if (combatStarted) return;
      combatStarted = true;
      setUnits((current) => {
        const returnedWolves = current.filter((unit) => unit.team === "enemy").map((unit) => {
          const index = wolves.findIndex((wolf) => wolf.id === unit.id);
          const home = homeSquares[index] || { x: unit.x, y: unit.y };
          return { ...unit, ...home, poisoned: true };
        });
        return [...heroes, ...returnedWolves];
      });
      setPoisonCutscene(false);
      setAiBusy(false);
      setTurn(0);
      setPhase("move");
      setLog([
        "Every wolf begins combat poisoned. At each round's end it must pass a DC 12 CON save or take 10 damage; success ends the poison.",
        "The company steps from hiding after watching the poisoned pack return to its ground.",
      ]);
    };
    const feedStart = Math.max(...outwardPaths.map((path, i) => animateSceneWalk(wolves[i].id, path, 800, 140)), 800) + 180;
    const finishPoisonSequence = () => {
      completeEncounterSequenceRef.current = null;
      setEncounterSequenceLabel(null);
      beginPoisonCombat();
    };
    const sendWolvesHome = () => {
      if (!isSequenceCurrent(poisonSequenceGeneration)) return;
      setUnits((current) => current.map((unit) => unit.team === "enemy" ? { ...unit, poisoned: true } : unit));
      const returnEnds = wolves.map((wolf, i) => {
        const reversePath = scenePath(feedingSquares[i % feedingSquares.length], homeSquares[i], ritualSceneryBlocked, RITUAL_COLS, RITUAL_ROWS);
        return animateSceneWalk(wolf.id, reversePath, 120, 140);
      });
      scheduleCutscene(finishPoisonSequence, Math.max(...returnEnds, 120) + 180);
    };
    completeEncounterSequenceRef.current = finishPoisonSequence;
    setEncounterSequenceLabel("Spring the Ambush Now");
    scheduleCutscene(() => {
      setLog((lines) => ["The pack feeds on the poisoned guard.", ...lines].slice(0, 6));
      const speakingWerewolf = wolves.find((unit) => unit.role === "Werewolf")!;
      showDialogueBubble(speakingWerewolf.id, POISON_BAIT_DIALOGUE.scent, () => {
        showDialogueBubble(speakingWerewolf.id, POISON_BAIT_DIALOGUE.reaction, sendWolvesHome);
      });
    }, feedStart);
  };
  const startVillageScene = (heroLevel = level) => {
    clearTransientTimers();
    setEncounterMode("combat");
    setAiBusy(false);
    setChapterIntro(true);
    setPoisonCutscene(false);
    invalidateSequence();
    completeEncounterSequenceRef.current = null;
    setEncounterSequenceLabel(null);
    setExitReached(false);
    const heroes = campaignHeroes(heroLevel);
    [
      [villagePartyCenter.x, villagePartyCenter.y],
      [villagePartyCenter.x - 1, villagePartyCenter.y],
      [villagePartyCenter.x + 1, villagePartyCenter.y],
      [villagePartyCenter.x, villagePartyCenter.y + 1],
    ].forEach(([x, y], i) => {
      if (heroes[i]) {
        heroes[i].x = x;
        heroes[i].y = y;
      }
    });
    const villagers = ["Mara", "Old Fen", "Tomas", "Elsi"].map((name, i) => {
      const u = makeUnit(`villager-${i}`, name, "Villager", "neutral", {
        ...kits.Cleric,
        hp: 24,
        attack: 0,
        defense: 0,
        initiative: 0,
        skills: [],
      });
      u.npc = true;
      const start = villageVillagerStarts[i];
      u.x = start?.x ?? 10 + (i % 2);
      u.y = start?.y ?? 9 + Math.floor(i / 2);
      return u;
    });
    const partyLeader = heroes.find((hero) => hero.id === leaderId) || heroes[0]!;
    setBarriers([
      ...villageBarricadeStarts.map((point, i) => ({
        id: `inn-door-${i + 1}`, name: "barricaded doorway", ...point,
        hp: 50, maxHp: 50, kind: "door" as const,
      })),
      ...villageWindowStarts.map((point, i) => ({
        id: `inn-window-${i + 1}`, name: "shuttered window", ...point,
        hp: 30, maxHp: 30, kind: "window" as const,
      })),
    ]);
    setCampaignScene(4);
    setMapVariant("village");
    setRitualActive(false);
    setRitualSelected(false);
    setVillageWave(1);
    setVillageWaveBreakUntil(null);
    setVillageAftermath(false);
    setVillageCelebrating(false);
    setEnemyTypes([]);
    setFiredMapEvents((events) => events.filter((event) => !event.startsWith("village-wave")));
    setUnits([...heroes, ...villagers]);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setLog([
      "Four villagers huddle in the center of the inn. Howls close in—you have one round to move.",
    ]);
    setStage("battle");
    scheduleCutscene(() => {
      playSound("howl");
      showDialogueBubble(partyLeader.id, "I can hear the howls getting closer. Better get ready.", () => {
        showDialogueBubble(villagers[0].id, "We've barricaded ourselves in here! Protect us! They already got Jim!", () => {
          setChapterIntro(false);
        });
      });
    }, 250);
  };
  const startVillageReinforcement = () => {
    clearTransientTimers();
    setEncounterMode("combat");
    setExitReached(false);
    const heroes = campaignHeroes();
    [
      [villagePartyCenter.x, villagePartyCenter.y],
      [villagePartyCenter.x - 1, villagePartyCenter.y],
      [villagePartyCenter.x + 1, villagePartyCenter.y],
      [villagePartyCenter.x, villagePartyCenter.y + 1],
    ].forEach(([x, y], i) => {
      if (heroes[i]) {
        heroes[i].x = x;
        heroes[i].y = y;
      }
    });
    const villagers = units
      .filter((u) => u.npc && !u.downed)
      .map((u) => ({ ...u, hp: u.maxHp, bleeding: false, downed: false }));
    const foes = [
      spawnIntroWolf("Werewolf", `hold-werewolf-${runtimeNow()}`, "Pack Alpha"),
      ...[1, 2, 3].map((i) =>
        spawnIntroWolf("Dire Wolf", `hold-wolf-${runtimeNow()}-${i}`, `Wolf ${i}`),
      ),
    ];
    const approaches = [
      ...villageWolfCenters.map(({ x, y }) => ({ x, y })),
      { x: villagePartyCenter.x, y: VILLAGE_ROWS - 1 },
    ];
    foes.forEach((foe, i) => {
      const point = approaches[i % approaches.length];
      foe.x = point.x;
      foe.y = point.y;
    });
    setBarriers([
      ...villageBarricadeStarts.map((point, i) => ({
        id: `inn-door-${i + 1}`, name: "barricaded doorway", ...point,
        hp: 50, maxHp: 50, kind: "door" as const,
      })),
      ...villageWindowStarts.map((point, i) => ({
        id: `inn-window-${i + 1}`, name: "shuttered window", ...point,
        hp: 30, maxHp: 30, kind: "window" as const,
      })),
    ]);
    setCampaignScene(5);
    setMapVariant("village");
    setVillageWave(2);
    setVillageWaveBreakUntil(null);
    setVillageAftermath(false);
    setEnemyTypes(["Werewolf", "Dire Wolf", "Dire Wolf", "Dire Wolf"]);
    setUnits([...heroes, ...villagers, ...foes]);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setStoryChoice("hold");
    setLog(["The company remains in town. Another pack descends on the inn!"]);
    setStage("battle");
  };
  const cleanseRitual = () => {
    if (
      !active ||
      active.team !== "hero" ||
      !["Cleric", "Wizard"].includes(active.role) ||
      attackDist(active, ritualTile) > 1 ||
      (encounterMode !== "exploration" && phase !== "action") ||
      !ritualActive
    )
      return;
    setRitualActive(false);
    awardAchievement(active.id, {
      key: "cleanse-ritual",
      title: "Bad Moon Declining",
      description: "Broke the Blood-Moon ritual before it could renew the pack.",
      tier: "Gold",
      boxName: "Moonbreaker",
    });
    setRitualSelected(false);
    showCombatBark(
      active.id,
      active.role === "Cleric"
        ? "The profane bond is broken!"
        : "The forest rejects this curse!",
    );
    setLog((l) =>
      [
        `${active.name} spends an action to cleanse the ritual. Its regeneration ends.`,
        ...l,
      ].slice(0, 6),
    );
    if (encounterMode === "combat") setPhase("facing");
  };
  const acceptWolfTouch = () => {
    if (
      !active ||
      active.team !== "hero" ||
      attackDist(active, ritualTile) > 1 ||
      (encounterMode !== "exploration" && phase !== "action") ||
      !ritualActive
    )
      return;
    const unlocked = firedMapEvents.includes("wolf-touch-unlocked");
    if (!unlocked && !heroHasItem(active.id, "Ball Cap of Bad Ideas")) return;
    if (heroHasItem(active.id, "Werewolf Lycanthropy")) return;
    grantDungeonLoot(active.id, ["Werewolf Lycanthropy"]);
    if (!unlocked)
      setFiredMapEvents((events) => [...new Set([...events, "wolf-touch-unlocked"])]);
    if (!unlocked) awardBallCapDialogue(active.id);
    setRitualSelected(false);
    showDialogueBubble(active.id, "Wait. I can understand dogs now?");
    setLog((lines) => [
      unlocked
        ? `${active.name} accepts a fraction of the wolf curse and can now speak with dogs and wolves.`
        : `${active.name}'s Ball Cap inspires the first terrible touch. The fraction of wolf curse unlocks the ritual for willing companions.`,
      ...lines,
    ].slice(0, 6));
    if (encounterMode === "combat") setPhase("facing");
  };
  const stopBleeding = (target: Unit) => {
    if (
      !active ||
      phase !== "action" ||
      !active.skills.some((q) => q.kind === "heal") ||
      !target.npc ||
      !target.bleeding ||
      attackDist(active, target) > 1
    )
      return;
    awardAchievement(active.id, {
      key: "stop-bleeding",
      title: "No Time to Bleed",
      description: `Stabilized ${target.name} while the village was under attack.`,
      tier: "Bronze",
      boxName: "Field Dressing",
    });
    setUnits((us) =>
      us.map((u) => (u.id === target.id ? { ...u, bleeding: false } : u)),
    );
    showCombatBark(active.id, "The bleeding is stopped!");
    setLog((l) =>
      [`${active.name} stabilizes ${target.name}.`, ...l].slice(0, 6),
    );
    setPhase("facing");
    setInspect(null);
  };
  const drinkPotion = (target: Unit) => {
    if (
      !active ||
      phase !== "action" ||
      !(potions[active.id] > 0) ||
      target.team !== "hero" ||
      attackDist(active, target) > 1
    )
      return;
    if (target.downed) awardAchievement(active.id, {
      key: "potion-revival",
      title: "Drink—Quickly!",
      description: `Revived ${target.name} with a Healing Potion.`,
      tier: "Bronze",
      boxName: "Hair of the Dog",
    });
    setUnits((us) =>
      us.map((u) =>
        u.id === target.id
          ? {
              ...u,
              hp: Math.min(u.maxHp, Math.max(0, u.hp) + 50),
              downed: false,
              stunned: false,
            }
          : u,
      ),
    );
    setPotions((items) => ({
      ...items,
      [active.id]: Math.max(0, (items[active.id] || 0) - 1),
    }));
    showCombatBark(active.id, "Drink—quickly!");
    setPhase("facing");
    setInspect(null);
  };
  const villageSurvivors = units.filter((u) => u.npc && !u.downed).length;
  const tutorialPartyTotals = companyHeroes.reduce((totals, hero) => {
    const stats = heroCombatStats[hero.id];
    return {
      attacks: totals.attacks + (stats?.attacks || 0),
      hits: totals.hits + (stats?.hits || 0),
      abilitiesUsed: totals.abilitiesUsed + (stats?.abilitiesUsed || 0),
      damageDealt: totals.damageDealt + (stats?.damageDealt || 0),
      damageTaken: totals.damageTaken + (stats?.damageTaken || 0),
    };
  }, { attacks: 0, hits: 0, abilitiesUsed: 0, damageDealt: 0, damageTaken: 0 });
  const combatAccuracy = (stats: Pick<HeroCombatStats, "attacks" | "hits">) =>
    stats.attacks ? `${Math.round((stats.hits / stats.attacks) * 100)}%` : "—";
  const tutorialRecapChecklist = [
    bridgeCleared ? "✓ Toll collectors cleared" : "✓ Bridge fight survived",
    resolvedPoi.includes("bridge-supply-cache") ? "✓ Bridge cache opened" : "○ Bridge cache left unopened",
    "✓ Prologue complete — Delver Orientation awaits",
  ];
  const ritualAlreadyResolved =
    route?.startsWith("poison_") ||
    route === "poison_ambush" ||
    route === "deeper_forest" ||
    firedMapEvents.includes("ritual-cleansed");
  const villageIntel =
    ritualAlreadyResolved
      ? "The poisoned pack and its ritual are already finished. The survivors point the company toward the bridge and the road beyond."
      : villageSurvivors === 4
      ? "All four survivors mark the ritual's exact location. Their blessing grants the entire company one bonus level."
      : villageSurvivors === 3
        ? "The survivors mark the ritual's exact location beneath the old boundary stones."
        : villageSurvivors === 2
          ? "They know one of the dead villagers found the ritual area—but its location died with him."
          : villageSurvivors === 1
            ? "The last survivor can only whisper: Head deeper into the woods."
            : "No one remains to tell the company what the guards discovered.";
  const finishVillage = (choice: "pursue" | "heal") => {
    const villageHero = units.find((unit) => unit.id === leaderId && !unit.downed) ||
      units.find((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
    if (villageSurvivors === 4 && villageHero) awardAchievement(villageHero.id, {
      key: "all-villagers-survive",
      title: "Nobody Ate the Villagers",
      description: "Defended the inn with all four villagers alive.",
      tier: "Gold",
      boxName: "Local Hero",
    });
    setMapCompletions((counts) => ({
      ...counts,
      village_defense: (counts.village_defense || 0) + 1,
    }));
    setStoryChoice(choice);
    setRoute(
      ritualAlreadyResolved
        ? choice === "heal" ? "poison_healed_village" : "poison_bridge_bound"
        : choice === "heal" ? "healed_village" : "pursued_pack",
    );
    if (choice === "heal") {
      const livingHeroes = units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
      const giftSpots = [
        { x: 9, y: 6 },
        { x: 10, y: 6 },
        { x: 11, y: 6 },
        { x: 12, y: 6 },
      ];
      setDroppedDungeonItems((items) => [
        ...items.filter((item) => !item.id.startsWith("village-healing-potion-")),
        ...livingHeroes.map((hero, index) => ({
          id: `village-healing-potion-${hero.id}`,
          name: "Healing Potion",
          ...(giftSpots[index] || giftSpots[0]),
        })),
      ]);
      setVillageAftermath(true);
      setVillageCelebrating(false);
      setExitReached(false);
      setEncounterMode("exploration");
      const thankfulVillager = units.find((unit) => unit.npc && !unit.downed);
      if (thankfulVillager) {
        showDialogueBubble(thankfulVillager.id, "Take these. You kept us alive.", () => {
          grantCompanyLevels(villageSurvivors === 4 ? 2 : 1, "battle");
        });
      } else {
        grantCompanyLevels(1, "battle");
      }
      return;
    }
    setVillageAftermath(true);
    setVillageCelebrating(true);
    const survivors = units.filter((unit) => unit.npc && !unit.downed);
    const happyLines = [
      "We made it! We actually made it!",
      "Heroes! Proper, wall-saving heroes!",
      "The village still stands!",
      "Thank you. All of you!",
    ];
    runEncounterSequence(
      "Finish the Celebration",
      survivors.map((villager, index) => ({
        at: 250 + index * 1300,
        run: () => showCombatBark(villager.id, happyLines[index % happyLines.length], 1150),
      })),
      Math.max(900, 450 + survivors.length * 1300),
      () => {
        setVillageCelebrating(false);
        grantCompanyLevels(villageSurvivors === 4 ? 2 : 1, "battle");
      },
    );
  };
  const finishRepeatedVillageDefense = (stay: boolean) => {
    setMapCompletions((counts) => ({
      ...counts,
      village_defense: (counts.village_defense || 0) + 1,
    }));
    if (stay) startVillageReinforcement();
    else startBridgeScene();
  };
  const resolveWayfarer = (montyPython = false) => {
    const heroes = units.filter((unit) => unit.team === "hero" && !unit.npc);
    const wayfarer = units.find((unit) => unit.id === "bridge-wayfarer");
    const hatHolder = heroes.find((hero) => heroHasItem(hero.id, "Ball Cap of Bad Ideas"));
    const montySpeaker = hatHolder || heroes.find((hero) => hero.id === active?.id) || heroes[0];
    if (montyPython && hatHolder) awardBallCapDialogue(hatHolder.id);
    const banditTypes = [
      "Bandit Swordsman",
      "Bandit Swordsman",
      "Bandit Archer",
      "Bandit Archer",
    ];
    const bandits = banditTypes.map((type, i) => {
      const bandit = spawnActor(type, `bridge-bandit-${i}`, "neutral", type === "Bandit Archer" ? `Archer ${i - 1}` : `Swordsman ${i + 1}`);
      const positions = [[4, 0], [5, 0], [3, 1], [6, 1]];
      bandit.x = positions[i][0];
      bandit.y = positions[i][1];
      bandit.facing = "s";
      bandit.npc = true;
      bandit.encounterGroup = "bridge";
      return bandit;
    });
    setWayfarerReady(false);
    const finishWayfarerBoon = () => {
      setFiredMapEvents((events) => [...new Set([...events, "bridge-wayfarer-departed"])]);
      setUnits((current) => [
        ...current.filter((unit) => unit.team === "hero" && !unit.npc),
        ...bandits,
      ]);
      setChapterIntro(false);
      setWayfarerSpeakerId(null);
      setBoonAbilityFlow(true);
      setAbilityQueue(heroes.map((hero) => hero.id));
      setLevelBeforeGain(level);
      setLevelReturn("battle");
      setLog(["The Wayfarer's boon settles over the company. Bandits block the far bank."]);
      setStage("levelup");
    };
    if (!wayfarer) {
      finishWayfarerBoon();
      return;
    }
    const teleportThenOfferBoon = () => {
      setLog((lines) => ["The Wayfarer vanishes in a flash of blue light.", ...lines].slice(0, 6));
      playTeleportAway(wayfarer.id, finishWayfarerBoon);
    };
    if (montyPython) {
      showDialogueBubble(wayfarer.id, "Heh. I like that hat.", () => {
        if (!montySpeaker) {
          teleportThenOfferBoon();
          return;
        }
        setWayfarerLaunchedUnitId(montySpeaker.id);
        setLog((lines) => [`${montySpeaker.name} is catapulted onto the enemy side of the bridge.`, ...lines].slice(0, 6));
        scheduleCutscene(() => {
          setUnits((current) => current.map((unit) => unit.id === montySpeaker.id
            ? { ...unit, x: 4, y: 3, facing: "n" }
            : unit));
          setWayfarerLaunchedUnitId(null);
          teleportThenOfferBoon();
        }, 1050);
      });
      return;
    }
    teleportThenOfferBoon();
  };
  const startBridgeScene = (abandonedVillage = false) => {
    clearTransientTimers();
    bridgeSequenceGateRef.current.clear();
    setEncounterMode("exploration");
    setExitReached(false);
    setDiscoveredPoi([]);
    setResolvedPoi([]);
    setFiredMapEvents(["room-1"]);
    const survivingIds = heroIds.filter(
      (id) => !units.find((u) => u.id === id)?.downed,
    );
    const heroes = survivingIds.map((id) => heroFromRoster(id));
    [
      [4, 7],
      [5, 7],
      [3, 7],
      [6, 7],
    ].forEach(([x, y], i) => {
      if (heroes[i]) {
        heroes[i].x = x;
        heroes[i].y = y;
        heroes[i].facing = "n";
      }
    });
    const banditTypes = [
      "Bandit Swordsman",
      "Bandit Swordsman",
      "Bandit Archer",
      "Bandit Archer",
    ];
    const abandonedRouteBandits = banditTypes.map((type, i) => {
      const bandit = spawnActor(type, `bridge-bandit-${i}`, "neutral", type === "Bandit Archer" ? `Archer ${i - 1}` : `Swordsman ${i + 1}`);
      const positions = [[4, 0], [5, 0], [3, 1], [6, 1]];
      bandit.x = positions[i][0];
      bandit.y = positions[i][1];
      bandit.facing = "s";
      bandit.npc = true;
      bandit.encounterGroup = "bridge";
      return bandit;
    });
    setCampaignScene(6);
    setMapVariant("bridge");
    setEnemyTypes(banditTypes);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setChapterIntro(true);
    setLog([
      "Dawn breaks over a narrow stone bridge. The road ahead is quiet.",
    ]);
    setStage("battle");
    if (abandonedVillage) setRoute("abandoned_village_for_bridge");
    setWayfarerSpeakerId(null);
    setWayfarerReady(false);
    const wayfarer = makeUnit("bridge-wayfarer", "Wayfarer", "Wizard", "neutral", kits.Wizard);
    wayfarer.npc = true;
    wayfarer.x = 4;
    wayfarer.y = 1;
    wayfarer.facing = "s";
    setUnits([...heroes, wayfarer]);
    const wayfarerApproach = scenePath(wayfarer, { x: 4, y: 5 }, bridgeBlocked, COLS, ROWS);
    const wayfarerArrival = animateSceneWalk(wayfarer.id, wayfarerApproach, 900, 720);
    setLog(["The blue-hatted Wayfarer walks slowly down the left side of the bridge toward the company."]);
    if (!abandonedVillage) {
      scheduleCutscene(() => {
        showDialogueBubble(wayfarer.id, "Congratulations on saving the village. There's makings of a hero in you. Take this.", () => {
          setWayfarerSpeakerId(wayfarer.id);
          setWayfarerReady(true);
        });
      }, wayfarerArrival + 650);
      return;
    }
    scheduleCutscene(() => {
      showDialogueBubble(wayfarer.id, "I can hear the screams of the villagers. Why didn't you save them?", () => {
        playTeleportAway(wayfarer.id, () => {
        if (bridgeSequenceGateRef.current.has("guards-approach")) return;
        bridgeSequenceGateRef.current.add("guards-approach");
        setFiredMapEvents((events) => [...new Set([...events, "bridge-wayfarer-departed", "bridge-guards-approaching"])]);
        setUnits([...heroes, ...abandonedRouteBandits]);
        const swordOne = abandonedRouteBandits[0];
        const swordTwo = abandonedRouteBandits[1];
        const guardWalkEnds = [
          animateSceneWalk(swordOne.id, scenePath(swordOne, { x: 4, y: 2 }, bridgeBlocked, COLS, ROWS), 250, 420),
          animateSceneWalk(swordTwo.id, scenePath(swordTwo, { x: 5, y: 2 }, bridgeBlocked, COLS, ROWS), 250, 420),
        ];
        setLog(["The Wayfarer vanishes toward the village. The toll collectors advance while the company holds the south bank."]);
        scheduleCutscene(() => {
          showDialogueBubble("bridge-bandit-0", "Bridge toll. Coin first, crossing second. No coin means steel.", () => {
            setFiredMapEvents((events) => [...new Set([...events, "bridge-toll-open"])]);
            setChapterIntro(false);
            setEncounterMode("exploration");
            const speaker = heroes.find((hero) => heroHasItem(hero.id, "Ball Cap of Bad Ideas")) ||
              [...heroes].sort((a, b) => (b.investigation || 0) - (a.investigation || 0))[0];
            if (speaker) setSocialScene({
              kind: "bridge-bandits",
              roomLabel: "bridge",
              title: "The Toll Collectors",
              speaker: "Bandit Swordsman",
              text: "Bridge toll. Coin first, crossing second. No coin means steel.",
              heroId: speaker.id,
            });
          });
        }, Math.max(1200, ...guardWalkEnds) + 180);
        });
      });
    }, wayfarerArrival + 650);
  };
  const startDungeonScene = (playtest = false) => {
    clearTransientTimers();
    const consequenceEcho = playtest
      ? "Playtest company assembled. Campaign consequences are bypassed."
      : mapCompletions.village_defense
        ? `Word of ${mapCompletions.village_defense} village defense${mapCompletions.village_defense === 1 ? "" : "s"} follows the company underground.`
        : storyChoice === "deeper" || route === "pursued_pack"
          ? "The broken forest ritual leaves the company carrying the smell of moonlit ash."
          : "No grateful villagers know where the company disappeared to.";
    setDungeonPlaytest(playtest);
    setAiBusy(false);
    setChapterIntro(false);
    setPoisonCutscene(false);
    invalidateSequence();
    completeEncounterSequenceRef.current = null;
    setEncounterSequenceLabel(null);
    setBossShockwave(null);
    setBossSpellBurst(null);
    setChargedSpells([]);
    setBarriers((current) => current.filter((barrier) => barrier.id !== floodRoomHazard?.barrier.id));
    setWanderingGuardian(null);
    setTeleportMode(false);
    const dungeonHeroIds = playtest
      ? ["Barbarian-0"]
      : heroIds.length
        ? heroIds
        : ["Barbarian-0", "Cleric-0", "Rogue-0", "Wizard-0"];
    if (playtest || !heroIds.length) {
      setHeroIds(dungeonHeroIds);
      setLeaderId(dungeonHeroIds[0]);
      setCampaign(true);
    }
    const existingHeroes = new Map(
      (playtest && campaignScene === 7 ? units : [])
        .filter((unit) => unit.team === "hero" && !unit.npc)
        .map((unit) => [unit.id, unit]),
    );
    const heroes = dungeonHeroIds.map((id) => {
      const existing = existingHeroes.get(id);
      const hero = !existing ? heroFromRoster(id) : {
        ...existing,
        hp: existing.maxHp,
        downed: false,
        bleeding: false,
        poisoned: false,
        stunned: false,
      };
      if (playtest && id === "Barbarian-0") {
        hero.name = "Walker";
        hero.skills = [
          { ...playtestKillingCurse },
          { ...kits.Cleric.skills.find((skill) => skill.name === "Sanctuary")! },
          { ...kits.Wizard.skills.find((skill) => skill.name === "Fireball")! },
        ];
      }
      return hero;
    });
    const halleth = makeUnit("halleth", "Halleth", "Bard-Cartographer", "neutral", kits.Fighter);
    halleth.npc = true;
    halleth.encounterGroup = "37";
    halleth.x = DUNGEON_LANDMARKS.hallethPit.point.x;
    halleth.y = DUNGEON_LANDMARKS.hallethPit.point.y;
    halleth.facing = "s";
    setTeleportHeroId(heroes[0]?.id || null);
    [[18, 56], [19, 56], [20, 56], [19, 57]].forEach(([x, y], i) => {
      if (!heroes[i]) return;
      heroes[i].x = x;
      heroes[i].y = y;
      heroes[i].facing = "s";
    });
    const initialReveal = new Set<string>();
    heroes.forEach((hero) => {
      for (let y = hero.y - 5; y <= hero.y + 5; y++)
        for (let x = hero.x - 5; x <= hero.x + 5; x++)
          if (x >= 0 && y >= 0 && x < DUNGEON_COLS && y < DUNGEON_ROWS && dist(hero, { x, y }) <= 5 && playerView.hasLineOfSight(hero, { x, y }, true))
            initialReveal.add(key(x, y));
    });
    setCampaignScene(7);
    setMapVariant("dungeon");
    setRoute("undermountain_level_1");
    setUnits([...heroes, halleth]);
    setEnemyTypes([]);
    setEncounterMode("exploration");
    setExitReached(false);
    setDiscoveredPoi(["question-statue"]);
    setResolvedPoi([]);
    // Reset Map resets the board, not the party. Inventory and earned rewards
    // survive; the starting ration is only added if it is not already present.
    setDungeonItems((items) => Object.fromEntries(
      heroes.map((hero) => [
        hero.id,
        [...new Set([
          ...(items[hero.id] || []),
          ...(playtest ? ["Ball Cap of Bad Ideas", "5 gp", "Werewolf Lycanthropy"] : []),
          "Ration",
        ])],
      ]),
    ));
    if (playtest) {
      setPotions((current) => ({ ...current, "Barbarian-0": Math.max(2, current["Barbarian-0"] || 0) }));
      setEquippedItems((current) => ({
        ...current,
        "Barbarian-0": { ...(current["Barbarian-0"] || {}), head: "Ball Cap of Bad Ideas" },
      }));
    }
    const partyOwnsBlueLightsaber = Object.values(dungeonItems)
      .some((items) => items.includes("Blue Lightsaber"));
    setDroppedDungeonItems([...(partyOwnsBlueLightsaber ? [] : [{ id: "room-loot-28b-0", name: "Blue Lightsaber", ...blueLightsaberPoint }]), { id: "pantry-bag-of-flour", name: "Bag of Flour", ...DUNGEON_LANDMARKS.pantryTeleportTrap.feastPoint }]);
    setSocialScene(null);
    setPendingDungeonRoomId(null);
    setNoticeQueue([]);
    roomTriggerPosition.current = "";
    setSchoolQuizStep(null);
    setSchoolQuizMistakes(0);
    setThroneClaimPrompt(false);
    setFiredMapEvents(["room-1"]);
    setRevealedTiles([...initialReveal]);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setChosen(null);
    setLog([
      `Entry Well: ${ROOM_BLUEPRINTS["1"].description}`,
      consequenceEcho,
      "From somewhere down the passage: GOBLIN WAAAAAHHH!",
    ]);
    setAmbientMessage("From somewhere down the passage: GOBLIN WAAAAAHHH!");
    scheduleCutscene(() => setAmbientMessage(null), 3600);
    setStage("battle");
  };
  const continuePastBridge = () => {
    if (!deferredAbilityQueue.length) {
      startDungeonScene(false);
      return;
    }
    setAbilityQueue(deferredAbilityQueue);
    setDeferredAbilityQueue([]);
    setLevelReturn("dungeon");
    setStage("levelup");
  };
  const startLevelTwo = () => {
    clearTransientTimers(); setNoticeQueue([]);
    const heroes = units.filter((unit) => unit.team === "hero" && !unit.npc).map((unit) => {
      return grantDust2ItemLoadout({ ...unit, hp:unit.maxHp, downed:false, skills:unit.skills.map((skill) => skill.dailyCharges ? { ...skill, charges:skill.dailyCharges } : skill) }); });
    heroes.forEach((hero, index) => {
      const [x, y] = dust2PartyStarts[index] || dust2PartyStarts[index % dust2PartyStarts.length];
      Object.assign(hero, { x, y, facing: "n" as Facing }, dust2PositionState({ x, y }));
    });
    setCampaignScene(9);
    setDust2FreeplayTeam(null); setDust2FreeplayMatch(null);
    setRoute("dust_2"); setTrainingMap("dust2");
    setUnits([...heroes, ...buildCounterDungeoneerSquad({ includeJohnWick:false })]);
    setDungeonItems((items) => ({ ...items, ...Object.fromEntries(heroes.map((hero) => [hero.id, mergeDust2ItemLoadout(items[hero.id])])) }));
    setEquippedItems((current) => ({ ...current, ...Object.fromEntries(heroes.map((hero) => [hero.id, { ...(current[hero.id] || {}), weapon:"Dragon Glass AWP", quick1:"Emerald Frag Grenade", quick2:"Runic Smoke Grenade" }])) }));
    setEnemyTypes(COUNTER_DUNGEONEER_ACTOR_IDS.filter((name) => name !== "John Wick")); setDust2Objective(createDust2ObjectiveState());
    setEncounterMode("exploration");
    setExitReached(false);
    setRound(1);
    setTurn(0);
    setPhase("move");
    setMovementSpent(0);
    setDashActive(false);
    setChosen(null);
    setInspect(null);
    setSocialScene(null);
    setPendingDungeonRoomId(null);
    setOpenChestId(null);
    setThroneClaimPrompt(false);
    setTeleportMode(false);
    setWanderingGuardian(null);
    setMapZoom(1);
    setDust2FreeClimb(false);
    setLog([
      "The throne route opens into Dust 2 at the southern Terrorist spawn.",
      "The One True Flag waits behind the company. Carry it to Site A at G6 or Site B at AA7.",
      "Plant the Flag and hold the site for three complete rounds. The red-rock secret exit opens when the countdown reaches zero.",
    ]);
    setStage("battle");
  };
  if (stage === "editor") return <MapEditor initialDust2={editorStartDust2} onExit={() => { setEditorStartDust2(false); setStage("mode"); }} />; if (stage === "dialogue-editor") return <DialogueEditor onExit={() => setStage("mode")} />;
  if (stage === "dust2-freeplay-setup") return <Dust2FreeplaySetup
    dungeoneers={baseRoster.map((hero) => ({ id:hero.id, name:hero.name, detail:hero.role }))}
    counterDungeoneers={COUNTER_DUNGEONEER_ACTOR_IDS.filter((name) => name !== "John Wick").map((name) => ({ id:name, name, detail:counterDungeoneerWeaponFinish(name)?.label || "Counter-Dungeoneer" }))}
    onBack={() => setStage("mode")} onStart={startDust2Freeplay} />;
  if (stage === "mode")
    return (
      <Setup
        title="Choose a Mode"
        step="START"
        note="Build free battles or continue the choice-driven mercenary campaign."
      >
        <div className="deployment-choice">
          {hasSave && (
            <button onClick={continueCampaign}>
              <b>Continue Campaign</b>
              <small>
                Resume from the latest automatically saved turn or story choice.
              </small>
            </button>
          )}
          <button
            onClick={() => {
              setCampaign(false);
              setStage("heroes");
            }}
          >
            <b>Training Battle</b>
            <small>Build any teams and test combat freely.</small>
          </button>
          <button
            onClick={beginNewCampaign}
          >
            <b>New Campaign</b>
            <small>
              Choose a permanent leader. This immediately replaces the previous
              autosave.
            </small>
          </button>
          <button onClick={() => startDungeonScene(true)}>
            <b>Playtest Level 1</b>
            <small>
              Start with Walker alone, every pre-Level-1 item, and the Avada Kedavra, Sanctuary, and Fireball test loadout.
            </small>
          </button>
          <button onClick={() => { setEditorStartDust2(false); setStage("editor"); }}>
            <b>Level Forge</b>
            <small>
              Trace, paint, label, and export a dungeon map for the game.
            </small>
          </button>
          <button onClick={startDust2MapLab}><b>Dust 2 Map Lab</b><small>Open Dust 2 immediately with Koko, no monster selection, and visible map-debug tools.</small></button>
          <button onClick={() => setStage("dust2-freeplay-setup")}><b>Dust 2 Freeplay</b><small>Choose either side and play Search &amp; Destroy. First to three wins; sides switch every round.</small></button>
          <button onClick={() => setStage("dialogue-editor")}><b>Dialogue Forge</b><small>Build, review, import, and export branching conversations for the game.</small></button>
        </div>
      </Setup>
    );
  if (stage === "story") {
    const leader = units.find((unit) => unit.id === leaderId)?.name ||
      roster.find((hero) => hero.id === leaderId)?.name ||
      "The leader";
    if (campaignScene === 1)
      return (
        <Setup
          title="Missing on the North Road"
          step={`LEVEL ${level}`}
          note="The opening objective is simple: find the missing guards."
        >
          <div className="story-card">
            <p className="eyebrow">
              SIX GUARDS MISSING
            </p>
            <h2>The Guards Never Returned</h2>
            <p>
              Six guards followed clawed tracks into the forest and never returned.
              Find them and learn what happened.
            </p>
            <p className="story-memory">
              The trail is quiet. Move the company forward and let the nearest
              hero inspect what the forest reveals.
            </p>
            <button onClick={startForestScene}>Enter the Forest →</button>
          </div>
        </Setup>
      );
    return (
      <Setup
        title={storyChoice === "deeper" ? "The Trail Continues" : storyChoice === "poison" ? "A Terrible Plan" : "Back to the Walls"}
        step={`LEVEL ${level}`}
        note="This choice now loads a different campaign encounter."
      >
        <div className="story-card">
          <p className="eyebrow">
            ROUTE SAVED · {route?.replaceAll("_", " ").toUpperCase()}
          </p>
          <h2>
            {storyChoice === "deeper" ? "Deeper Into the Forest" : storyChoice === "poison" ? "Dinner Is Served" : "Return to Town"}
          </h2>
          <p>
            {storyChoice === "deeper"
              ? `${leader} orders the company onward. Beyond the old boundary stones, two werewolves draw strength from a pulsing ritual.`
              : storyChoice === "poison"
                ? `${leader} poisons the dead guard and waits. Before long, the pack returns. It circles the body, sniffs once, then begins to monch.`
                : `${leader} calls the company back. The town must hear what hunts beyond its walls before nightfall.`}
          </p>
          <p className="story-memory">
            {storyChoice === "deeper"
              ? "A Cleric or Wizard can cleanse the ritual while standing beside it."
              : storyChoice === "poison"
                ? "The wolves begin combat poisoned. Each makes a DC 12 CON save at round's end; failure deals 10 damage and success ends the poison."
                : "The villagers are gathered in the center. You will have one round to move before the pack arrives."}
          </p>
          <button onClick={() => storyChoice === "deeper" ? startRitualScene() : storyChoice === "poison" ? startPoisonBaitScene() : startVillageScene()}>
            {storyChoice === "deeper" ? "Follow the Ritual's Light →" : storyChoice === "poison" ? "Let Them Feed →" : "Enter the Village →"}
          </button>
        </div>
      </Setup>
    );
  }
  if (stage === "levelup") {
    const choosingId = abilityQueue[0];
    const choosingHero = roster.find((r) => r.id === choosingId);
    const startingNames =
      choosingId === custom?.id
        ? custom.skills.map((skill) => skill.name)
        : choosingHero
          ? kits[choosingHero.role].skills.map((skill) => skill.name)
          : [];
    const knownSkills = [
      ...startingNames,
      ...(choosingId ? (bonusSkills[choosingId] || []).map((skill) => skill.name) : []),
    ];
    const learnedSkill = (name: string) => choosingId
      ? [...(choosingId === custom?.id ? custom.skills : choosingHero ? kits[choosingHero.role].skills : []), ...(bonusSkills[choosingId] || [])].find((skill) => skill.name === name)
      : undefined;
    const choices = abilityLibrary.filter(
      (a) => {
        if (!knownSkills.includes(a.skill.name)) return true;
        const known = learnedSkill(a.skill.name);
        return !!known && a.key.includes(":progression:") && (known.power !== a.skill.power || known.range !== a.skill.range || known.charges !== a.skill.charges);
      },
    );
    const gains = heroIds.map((id) => {
      const r = roster.find((x) => x.id === id)!;
      return {
        r,
        before: kitAtLevel(r.role, levelBeforeGain),
        after: kitAtLevel(r.role, level),
      };
    });
    const handleAbilityChoice = (event: ReactMouseEvent<HTMLButtonElement>) => {
      const skill = choices[Number(event.currentTarget.dataset.choiceIndex)];
      if (!skill) return;
      if (choosingId)
        setBonusSkills((v) => ({
          ...v,
          [choosingId]: [...(v[choosingId] || []).filter((known) => known.name !== skill.skill.name), { ...skill.skill }],
        }));
      if (choosingId)
        setUnits((current) => current.map((unit) => unit.id === choosingId
          ? { ...unit, skills: [...unit.skills.filter((known) => known.name !== skill.skill.name), { ...skill.skill }] }
          : unit));
      const remaining = abilityQueue.slice(1);
      setAbilityQueue(remaining);
      if (!remaining.length) finishLevelFlow();
    };
    const skipEmptyChoice = () => {
      const remaining = abilityQueue.slice(1);
      setAbilityQueue(remaining);
      if (!remaining.length) finishLevelFlow();
    };
    return (
      <Setup
        className="levelup-setup"
        title={
          boonAbilityFlow ? "The Wayfarer's Boon" : `Level ${level} Reached`
        }
        step={boonAbilityFlow ? "SPECIAL REWARD" : "PROGRESSION"}
        note={
          boonAbilityFlow
            ? "Every surviving company member receives one additional ability before the bridge battle."
            : "The entire surviving company gains class-based stats. New abilities unlock at levels 3, 5, 7, and beyond."
        }
      >
        <div className="story-card level-card">
          {!boonAbilityFlow && (
            <>
              <h2>Company growth</h2>
              <div className="level-gains">
                {gains.map(({ r, before, after }) => (
                  <div key={r.id}>
                    <b>{r.name}</b>
                    <small>
                      {r.role} · Level {levelBeforeGain} → {level}
                    </small>
                    <span>
                      HP {before.hp}→{after.hp}
                    </span>
                    <span>
                      Damage {before.attack}→{after.attack}
                    </span>
                    <span>AC unchanged: {before.armorClass}</span>
                    <span>PROF +{proficiencyBonus(levelBeforeGain)}→+{proficiencyBonus(level)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {choosingId ? <><h2>{choosingHero?.name}, choose a new ability</h2>
          <p>
            {abilityQueue.length} company ability choice
            {abilityQueue.length === 1 ? "" : "s"} remaining.
            {choosingId === custom?.id
              ? " Custom characters may choose from every class."
              : ""}
          </p>
          <div className="ability-pool">
            {choices.length ? choices.map((a, choiceIndex) => (
              <button data-choice-index={choiceIndex} onClick={handleAbilityChoice} key={a.key}>
                <b>{a.skill.name}</b>
                <small>
                  {a.role} · {a.skill.kind === "heal" ? "Healing" : "Damage"}{" "}
                  {a.skill.power} · Range {a.skill.range} · {a.skill.charges}{" "}
                  charges · {a.skill.description}
                </small>
              </button>
            )) : (
              <button onClick={skipEmptyChoice}>
                <b>Continue</b>
                <small>This character already knows every available ability. No choice is lost, and the campaign can continue.</small>
              </button>
            )}
          </div></> : (
            <div className="ability-pool levelup-continue">
              <button onClick={() => finishLevelFlow()}>
                <b>Continue</b>
                <small>The company has gained its new level.</small>
              </button>
            </div>
          )}
        </div>
      </Setup>
    );
  }
  if (stage === "heroes")
    return (
      <Setup
        title={campaign ? "Found Your Company" : "Choose Your Company"}
        step="1 of 3"
        note={
          campaign
            ? "Select 1–4 heroes, then appoint the permanent leader who will drive the story."
            : "Select 1–4 named heroes. Every hero shares the abilities of their class."
        }
      >
        <button className="create-custom" onClick={addTester} disabled={!!custom && heroIds.includes(custom.id)}>
          <b>{custom && heroIds.includes(custom.id) ? "Tester Added" : "＋ Add Tester"}</b>
          <small>Walker animation · Sanctuary · Fireball · Run it Back, Turbo · Avada Kedavra · infinite movement</small>
        </button>
        <div className="class-roster">
          {Object.entries(heroNames).map(([role, names]) => (
            <section className="class-card" key={role}>
              <h2>{role}</h2>
              <p>{kits[role].skills.map((x) => x.name).join(" · ")}</p>
              <p>HP {kits[role].hp} · Damage {kits[role].attack} · Move {kits[role].move}</p>
              <AbilityScoreGrid abilities={kits[role].abilities} armorClass={kits[role].armorClass || 10} primaryAbility={kits[role].primaryAbility} className="class-stats ability-score-grid" />
              <p>Saves {kits[role].saveProficiencies?.map((ability) => ABILITY_LABELS[ability]).join(" · ")} · Skills {kits[role].skillProficiencies?.join(" · ")}</p>
              {role === "Ranger" && <p className="class-feature-highlight"><b>TRACK SENSE</b>{RANGER_TRACK_FEATURE}</p>}
              <div>
                {names.map((name, i) => {
                  const id = `${role}-${i}`;
                  return (
                    <button
                      className={heroIds.includes(id) ? "selected" : ""}
                      onClick={() => toggleHero(id)}
                      key={id}
                    >
                      <b>{name}</b>
                      <small>{name === "Koko" ? `${role} TEST · ALL SKILLS · 20+ DAMAGE` : role}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {custom && (
            <section className="class-card custom-card">
              <h2>Custom Tester</h2>
              <p>{custom.skills.map((x) => x.name).join(" · ")}</p>
              <div>
                <button
                  className={heroIds.includes(custom.id) ? "selected" : ""}
                  onClick={() => toggleHero(custom.id)}
                >
                  <b>{custom.name}</b>
                  <small>
                    {custom.role}
                    {leaderId === custom.id ? " · LEADER" : ""}
                  </small>
                </button>
              </div>
            </section>
          )}
        </div>
        {campaign && heroIds.length > 0 && (
          <div className="leader-picker">
            <span>Permanent leader:</span>
            {heroIds.map((id) => {
              const r = roster.find((x) => x.id === id)!;
              return (
                <button
                  className={leaderId === id ? "selected" : ""}
                  onClick={() => setLeaderId(id)}
                  key={id}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        )}
        <div className="setup-bar">
          <span>{heroIds.length}/4 heroes</span>
          <button
            disabled={!heroIds.length || (campaign && !leaderId)}
            onClick={() =>
              campaign ? startForestScene() : setStage("enemies")
            }
          >
            {campaign ? "Enter the Woods →" : "Choose Enemies →"}
          </button>
        </div>
      </Setup>
    );
  if (stage === "enemies")
    return (
      <Setup
        title="Build the Opposition"
        step="2 of 3"
        note="Choose up to 6 monsters, or choose a count and keep the random result a surprise until deployment."
      >
        <div className="monster-list">
          {Object.entries(ACTOR_REGISTRY).map(([name, actor]) => (
            <button
              disabled={enemyTypes.length >= 6}
              onClick={() => addEnemy(name)}
              key={name}
            >
              <span
                className={`monster-glyph m-${name.toLowerCase().replaceAll(" ", "-")}`}
              >
                {name[0]}
              </span>
              <b>{name}</b>
              <small>
                CR {actor.cr} · HP {actor.statBlock.hitPoints} ·{" "}
                {actor.statBlock.attacks.some((attack) => attack.reach > 1) ? "Ranged" : "Melee"}
              </small>
            </button>
          ))}
        </div>
        <div className="enemy-tray">
          <h3>
            Enemy Team <small>{enemyTypes.length}/6</small>
          </h3>
          {hiddenRandom ? (
            <p>
              Unknown opposition selected — revealed when deployment begins.
            </p>
          ) : enemyTypes.length ? (
            <div>
              {enemyTypes.map((t, i) => (
                <button
                  onClick={() =>
                    setEnemyTypes((e) => e.filter((_, j) => j !== i))
                  }
                  key={`${t}-${i}`}
                >
                  {t} ×
                </button>
              ))}
            </div>
          ) : (
            <p>No monsters selected yet.</p>
          )}
          {!hiddenRandom && (
            <><p>
              Total CR <b>{enemyCr}</b> ·{" "}
              <strong>{difficulty(enemyCr, heroIds.length, level)}</strong>
              {` · ${encounterBalance.totalXp} XP · ${encounterBalance.expectedRoundDamage} expected damage/round`}
            </p>
            {encounterBalance.warnings.map((warning) => <p className="bleed-label" key={warning}>{warning}</p>)}
            </>
          )}
          <p className="hint">
            CR is the familiar D&amp;D creature rating used as a reference; the
            difficulty label also considers party size and level.
          </p>
        </div>
        <div className="random-box">
          <label>
            Random enemy count{" "}
            <select
              value={randomCount}
              onChange={(e) => setRandomCount(+e.target.value)}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button onClick={randomize}>Hide a Random Team</button>
        </div>
        <div className="setup-bar">
          <button className="ghost" onClick={() => setStage("heroes")}>
            ← Heroes
          </button>
          <span>{enemyTypes.length}/6 enemies</span>
          <button
            onClick={() => setStage("maps")}
          >
            {enemyTypes.length ? "Choose Map →" : "Continue Without Enemies →"}
          </button>
        </div>
      </Setup>
    );
  if (stage === "maps") {
    const maps = TRAINING_MAPS;
    return (
      <Setup
        title="Choose a Battlefield"
        step="3 of 4"
        note="Select any current map for the Training Battle. Campaign mechanics and objectives are disabled here."
      >
        <div className="map-choice">
          {maps.map((m) => (
            <button
              className={trainingMap === m.id ? "selected" : ""}
              onClick={() => setTrainingMap(m.id)}
              key={m.id}
            >
              <span className={`map-thumb map-${m.id}`}>
                <i />
              </span>
              <b>{m.name}</b>
              <small>{m.detail}</small>
            </button>
          ))}
        </div>
        <div className="setup-bar">
          <button className="ghost" onClick={() => setStage("enemies")}>
            ← Enemies
          </button>
          <span>{maps.find((m) => m.id === trainingMap)?.name}</span>
          <button onClick={() => trainingMap === "gallery" ? buildUnits(false) : setStage("deploy")}>{trainingMap === "gallery" ? "Enter Gallery →" : "Deployment →"}</button>
        </div>
      </Setup>
    );
  }
  if (stage === "deploy" && !units.length)
    return (
      <Setup
        title="Choose Deployment"
        step="4 of 4"
        note="Manual deployment allows placement on any passable tile of the selected map."
      >
        <div className="deployment-choice">
          <button
            onClick={() => {
              setManual(false);
              buildUnits(false);
            }}
          >
            <b>Automatic Deployment</b>
            <small>Melee units forward; ranged and support units behind.</small>
          </button>
          <button
            onClick={() => {
              setManual(true);
              buildUnits(true);
            }}
          >
            <b>Manual Deployment</b>
            <small>Place every hero and monster anywhere on the map.</small>
          </button>
        </div>
        <div className="setup-bar">
          <button className="ghost" onClick={() => setStage("maps")}>
            ← Maps
          </button>
          <span>
            {heroIds.length} vs {enemyTypes.length} · CR {enemyCr}
          </span>
        </div>
      </Setup>
    );
  const aimedSkill = chosen?.kind === "skill" ? active?.skills[chosen.i!] : null;
  const wantsTileHover = phase === "move" || !!chosen;
  const segmentPreviewState = aimedSkill && hoverTile && wallStart?.skillIndex === chosen?.i && mechanicFor(aimedSkill.name)?.placement ? segmentPlacement(wallStart, hoverTile, mechanicFor(aimedSkill.name)!.placement!.maxLengthSquares) : null;
  const segmentPreview = segmentPreviewState ? { ...segmentPreviewState.segment, valid: segmentPreviewState.valid } : null, aimedPreviewTiles = segmentPreviewState ? segmentPreviewState.valid ? segmentPreviewState.tiles : [] : aimedSkill?.area && hoverTile ? areaTiles(aimedSkill, hoverTile.x, hoverTile.y) : [];
  const aimedPreviewTileSet = new Set(aimedPreviewTiles.map((tile) => key(tile.x, tile.y)));
  const revealedTileSet = new Set(revealedTiles);
  const discoveredPoiSet = new Set(discoveredPoi);
  const resolvedPoiSet = new Set(resolvedPoi);
  const firedMapEventSet = new Set(firedMapEvents);
  const manticoreShowActive = socialScene?.kind === "manticore-show" && manticoreShow.round > 0;
  const burningTileSet = new Set((burningZone?.tiles || []).map((tile) => key(tile.x, tile.y)));
  const burningOrigin = burningZone?.tiles.length ? { x: Math.min(...burningZone.tiles.map((tile) => tile.x)), y: Math.min(...burningZone.tiles.map((tile) => tile.y)) } : null;
  const livingUnitsByTile = new Map<string, Unit[]>();
  const downedUnitsByTile = new Map<string, Unit>();
  units.forEach((unit) => {
    const unitKey = key(unit.x, unit.y);
    if (unit.downed) downedUnitsByTile.set(unitKey, unit);
    else livingUnitsByTile.set(unitKey, [...(livingUnitsByTile.get(unitKey) || []), unit]);
  });
  const dropsByTile = new Map<string, DroppedDungeonItem[]>();
  droppedDungeonItems.forEach((drop) => dropsByTile.set(key(drop.x, drop.y), [...(dropsByTile.get(key(drop.x, drop.y)) || []), drop]));
  const poiByTile = new Map(pointsOfInterest.map((poi) => [key(poi.x, poi.y), poi]));
  const professorGrinVisible = schoolTransformationFlash || units.some((unit) => unit.id === SCHOOL_TEACHER_ID && unit.name === "Professor Grin");
  const persistentDialogueSpeaker = bubble?.persistent
    ? units.find((unit) => unit.id === bubble.unitId)
    : undefined;
  const persistentDialogueIsWoundedGuard = bubble?.persistent && bubble.unitId === "forest-wounded-guard";
  const persistentDialogueSpeakerName = persistentDialogueIsWoundedGuard
    ? "Wounded Guard"
    : persistentDialogueSpeaker?.name || "Unknown";
  const persistentDialoguePortrait = persistentDialogueIsWoundedGuard
    ? "/guard-sprites.png"
    : persistentDialogueSpeaker?.id === SCHOOL_TEACHER_ID
      ? (professorGrinVisible ? "/professor-grin.png" : "/professor-vale.png")
    : persistentDialogueSpeaker?.id === "bridge-bandit-0"
      ? "/bandit-swordsman-portrait.png"
    : persistentDialogueSpeaker
      ? spriteSheetForUnit(persistentDialogueSpeaker)
      : null;
  const persistentDialoguePortraitMode = persistentDialogueSpeaker?.id === SCHOOL_TEACHER_ID || persistentDialogueSpeaker?.id === "bridge-bandit-0"
    ? "illustration" as const
    : "sprite-sheet" as const;
  const socialDialogueSpeaker = resolveSocialDialogueSpeaker(units, socialScene);
  const socialDialoguePortrait = socialScene?.kind === "forest-guard"
    ? "/guard-sprites.png"
    : socialScene?.kind === "kelim"
      ? (resolvedPoi.includes("kelim-closet") ? "/kelim-sprite.png" : "/kelim-closet-door.png")
    : socialScene?.kind === "schoolteacher"
      ? (professorGrinVisible || socialScene.speaker === "Professor Grin" ? "/professor-grin.png" : "/professor-vale.png")
    : socialScene?.kind === "bridge-bandits"
      ? "/bandit-swordsman-portrait.png"
    : socialDialogueSpeaker
      ? spriteSheetForUnit(socialDialogueSpeaker)
      : null;
  const socialDialoguePortraitMode = socialScene?.kind === "kelim" || socialScene?.kind === "schoolteacher" || socialScene?.kind === "bridge-bandits"
    ? "illustration" as const
    : "sprite-sheet" as const;
  const wayfarerDialoguePortrait = units.find((unit) => unit.id === wayfarerSpeakerId || unit.id === "bridge-wayfarer");
  const chargedIntentByTile = new Map<string, ChargedSpell>();
  chargedSpells.forEach((charge) => charge.tiles.forEach((tile) => {
    if (!chargedIntentByTile.has(key(tile.x, tile.y))) chargedIntentByTile.set(key(tile.x, tile.y), charge);
  }));
  const barrierByTile = new Map(barriers.filter((barrier) => barrier.hp > 0).map((barrier) => [key(barrier.x, barrier.y), barrier]));
  const hoveredTarget = hoverTile ? units.find((unit) => !unit.downed && playerView.isUnitVisible(unit) && unitOccupiesTile(unit, hoverTile.x, hoverTile.y)) : undefined;
  const currentRoomEntry = dungeonMode && active
    ? [...dungeonRoomPoints.entries()]
        .filter(([roomId]) => firedMapEvents.includes(`room-${roomId}`))
        .sort(([, a], [, b]) => attackDist(active, a) - attackDist(active, b))[0]
    : undefined;
  const currentRoomId = currentRoomEntry?.[0];
  const currentRoom = currentRoomId ? ROOM_BLUEPRINTS[currentRoomId] : undefined;
  const currentRoomState = currentRoomId ? roomLifecycle(currentRoomId, firedMapEvents) : "unseen";
  const currentEncounterState = encounterLifecycle({
    roomEntered: !!currentRoom,
    socialChoiceOpen: !!socialScene,
    combatActive: encounterMode === "combat" && units.some((unit) => unit.team === "enemy" && !unit.downed),
    resolved: currentRoomState === "resolved" || currentRoomState === "looted" || currentRoomState === "exhausted",
    rewarded: currentRoomState === "looted" || currentRoomState === "exhausted",
  });
  const unresolvedDiscoveries = pointsOfInterest.filter((poi) =>
    discoveredPoiSet.has(poi.id) && !resolvedPoiSet.has(poi.id)).length;
  const contentIssues = dungeonPlaytest ? GAME_CONTENT_ISSUES : [];
  const turnResources = turnResourceSummary({
    phase,
    moveRemaining: infinitePlaytestMovement ? 9999 : (active ? effectiveMovement(active) : 0) * (dashActive ? 2 : 1) - movementSpent,
    dashActive,
    encounterMode,
  });
  const targetPreview = active && hoveredTarget && hoveredTarget.team !== active.team
    ? chosen?.kind === "attack" && activeWeapon && isOrdinaryProjectileAttack(activeWeapon.range, activeWeapon.damageType) && ordinaryProjectileBlocked(abilityZones, active, hoveredTarget) ? "WIND WALL · PROJECTILE DEFLECTED" : hitPreviewLabel(hit(active, hoveredTarget, aimedSkill?.accuracy || 0, aimedSkill?.range || activeWeapon?.range || active.range, aimedSkill ? undefined : activeWeapon?.attackBonus), aimedSkill?.power || activeWeapon?.damage || active.attack, aimedSkill ? attackBonusOf(active, aimedSkill.accuracy || 0) : activeWeapon?.attackBonus || attackBonusOf(active), armorClassOf(hoveredTarget))
    : null;
  const movementPreview = active && hoverTile && phase === "move" && reachable(hoverTile.x, hoverTile.y)
    ? [
        dust2MapActive ? `MOVE ${Math.round(moveCost(hoverTile.x, hoverTile.y) * 5)} FT / ${Math.round(movementBudget * 5)} FT` : `MOVE ${moveCost(hoverTile.x, hoverTile.y)}/${movementBudget}`,
        dungeonMode && pukeTunnelAreaTileKeys.has(key(hoverTile.x, hoverTile.y)) && !heroHasItem(active.id, "Ring of Puke Immunity") ? "SEWAGE: 1 DAMAGE PER STEP" : "",
        dungeonMode && firedMapEvents.includes("proximity-bomb-armed") && !resolvedPoi.includes("proximity-bomb") &&
          inProximityBombRoom(active) && !inProximityBombRoom(hoverTile) ? "LEAVING J64 BOMB ROOM: DETONATION" : "",
        units.some((unit) => unit.team === "enemy" && meleeThreatens(unit, active) && !meleeThreatens(unit, hoverTile)) ? "OPPORTUNITY ATTACK" : "",
      ].filter(Boolean).join(" · ")
    : null;
  const knockPreview = aimedSkill?.knockback && hoveredTarget && active ? pushResult(active, hoveredTarget, aimedSkill.knockback, false) : null;
  const knockLandingKey = knockPreview && (knockPreview.x !== hoveredTarget?.x || knockPreview.y !== hoveredTarget?.y)
    ? key(knockPreview.x, knockPreview.y)
    : null;
  const renderedCellIndices = buildRenderedCellIndices(dungeonMode, dungeonViewport, boardCols, boardRows);
  const { sceneryOverlays: elevatedSceneryOverlays, poiOverlays: elevatedPoiOverlays } = selectDungeonObjectOverlays({ dungeonMode, viewport: dungeonViewport, playtest: dungeonPlaytest, revealed: revealedTileSet, points: pointsOfInterest, discovered: discoveredPoiSet, resolved: resolvedPoiSet, units });
  const runPoiPanelAction = (actionId: PoiPanelActionId, poi: PointOfInterest) => {
    const resolve = () => setResolvedPoi((ids) => [...new Set([...ids, poi.id])]);
    const close = () => setInspectPoi(null);
    const consciousActive = active && active.team === "hero" && !active.npc && !active.downed ? active : null;
    switch (actionId) {
      case "crawl-sewer-to-flood":
      case "crawl-flood-to-sewer": {
        if (!consciousActive || attackDist(consciousActive, poi) > 1 || !heroHasItem(consciousActive.id, "Ring of Puke Immunity")) return;
        const enteringFloodRoom = actionId === "crawl-sewer-to-flood", destination = enteringFloodRoom ? sewerFloodSecretPassage.flood : sewerFloodSecretPassage.sewer;
        setUnits((current) => current.map((unit) => unit.id === consciousActive.id ? { ...unit, ...destination } : unit));
        setFiredMapEvents((events) => [...new Set([...events.filter((event) => enteringFloodRoom || event !== "room-33-secret-arrival-safe"), "sewer-flood-secret-discovered", ...(enteringFloodRoom ? ["room-33-secret-arrival-safe"] : [])])]);
        setAmbientMessage(enteringFloodRoom ? "THE SEWER GRATE OPENS INTO THE FLOODED BARRACKS" : "THE RUNOFF CRAWL RETURNS TO THE CERTAIN DEATH SEWER");
        scheduleCutscene(() => setAmbientMessage(null), 2600);
        setLog((lines) => [`${consciousActive.name}'s ring turns the sewage harmless. ${enteringFloodRoom ? "The crawl emerges behind the grate at JJ64; the flood mechanism remains dormant." : "The crawl returns to the grate at Q70."}`, ...lines].slice(0, 6));
        close(); return;
      }
      case "clear-dwarven-cave-in":
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["A conscious hero must stand beside the cave-in at R78.", ...lines].slice(0, 6));
          return;
        }
        if (!heroHasItem(consciousActive.id, "Dwarven Mining Pick")) return;
        setFiredMapEvents((events) => [...new Set([...events, "dwarven-cave-in-clearing"])]);
        animateSprite(consciousActive.id, "attack", 850); playSound("impact");
        scheduleCutscene(() => { grantDungeonLoot(consciousActive.id, ["Potion of Speed"]); resolve(); setFiredMapEvents((events) => events.filter((event) => event !== "dwarven-cave-in-clearing")); setLog((lines) => [`${consciousActive.name} calls the mining pick to hand and clears the cave-in with one ringing blow. A Potion of Speed survives inside.`, ...lines].slice(0, 6)); }, 700);
        close();
        return;
      case "swap-relic-with-sand":
        if (!consciousActive || attackDist(consciousActive, poi) > 1 || (consciousActive.id !== "custom-hero" && !/rogue/i.test(consciousActive.role))) return;
        { const check = rollSkill(consciousActive, "Thieves' Tools", 13); if (!check.success) { setLog((lines) => [`${consciousActive.name} cannot match the nuke's pressure cleanly. ${check.label}. The mechanism remains intact.`, ...lines].slice(0, 6)); close(); return; } }
        grantDungeonLoot(consciousActive.id, ["Stolen Proximity Bomb"]); resolve();
        setFiredMapEvents((events) => events.filter((event) => event !== "proximity-bomb-armed"));
        setLog((lines) => [`${consciousActive.name} matches the little nuke's weight with sand and lifts it from the stable platform.`, ...lines].slice(0, 6)); close(); return;
      case "open-poster":
        openCertainDeathPoster(poi);
        return;
      case "take-shrine-gold":
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["A conscious hero must stand beside the broken shrine to collect the coins.", ...lines].slice(0, 6));
          return;
        }
        setDungeonItems((items) => ({ ...items, [consciousActive.id]: [...(items[consciousActive.id] || []), "5 gp"] }));
        resolve();
        setLog((lines) => [`${consciousActive.name} recovers 5 gp from beneath the broken shrine.`, ...lines].slice(0, 6));
        showDialogueBubble(consciousActive.id, "Bar money.");
        close();
        return;
      case "touch-black-statue":
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["A conscious hero must stand beside the statue to touch it.", ...lines].slice(0, 6));
          return;
        }
        resolve();
        setFiredMapEvents((events) => [...new Set([...events, "black-pudding-triggered"])]);
        showDialogueBubble(consciousActive.id, "It has a face.");
        setAmbientMessage("The black skin launches from the statue and rises into a hulking shape.");
        scheduleCutscene(() => setAmbientMessage(null), 3000);
        setLog((lines) => [`${consciousActive.name} touches the statue. Its black skin lashes around a humanoid shape and bares a pale, impossible grin.`, ...lines].slice(0, 6));
        close();
        return;
      case "bond-black-statue":
        if (!consciousActive || attackDist(consciousActive, poi) > 1 || !heroHasItem(consciousActive.id, "Ball Cap of Bad Ideas")) return;
        awardBallCapDialogue(consciousActive.id);
        grantDungeonLoot(consciousActive.id, ["Emo Outfit"]);
        setUnits((current) => current.map((unit) => unit.id === consciousActive.id ? { ...unit, stealthBonus: Math.max(10, unit.stealthBonus || 0) } : unit));
        resolve();
        showDialogueBubble(consciousActive.id, "We understand each other.");
        setFiredMapEvents((events) => [...new Set([...events, "black-goo-emo-bond"]) ]);
        setAmbientMessage(`${consciousActive.name} bonds with the living darkness. Their outfit is emo now.`);
        scheduleCutscene(() => setAmbientMessage(null), 3200);
        setLog((lines) => [`The black coating abandons the statue, settles over ${consciousActive.name}'s clothes, and makes the entire outfit dramatically emo. Emo Bonding grants +10 Stealth.`, ...lines].slice(0, 6));
        close();
        return;
      case "turn-coin-lord":
        showDialogueBubble(consciousActive?.id || active?.id || "", "Coin buys silence. It does not keep it.");
        setLog((lines) => ["The Lord of Coin turns a quarter-circle, clicks, and returns to face forward. The hidden door stays shut.", ...lines].slice(0, 6));
        return;
      case "turn-sword-lord":
        showDialogueBubble(consciousActive?.id || active?.id || "", "A sword can enforce silence. It cannot keep a secret.");
        setLog((lines) => ["The Lord of Swords grinds half an inch, locks, and resets. The hidden door stays shut.", ...lines].slice(0, 6));
        return;
      case "turn-silent-lord":
        playSound("door");
        if (consciousActive) awardAchievement(consciousActive.id, {
          key: "undertaker-secret-door", title: "Speak Easy",
          description: "Solved the Three-Lord wall panel and opened the hidden velvet club.",
          tier: "Gold", boxName: "Secret Knock",
        });
        setFiredMapEvents((events) => [...new Set([...events, "undertaker-statue-solved", "undertaker-secret-door-open"])]);
        resolve();
        setLog((lines) => ["The silent lord turns. The wall at O47 slides aside and violet light pulses through the opening.", ...lines].slice(0, 6));
        close();
        setRevealedTiles((tiles) => [...new Set([...tiles, ...undertakerClubTiles, key(14, 46), key(15, 46)])]);
        return;
      case "fill-tankard": {
        const owner = partyItemOwner("Copper Tankard");
        if (!owner) return;
        setPotions((current) => ({ ...current, [owner]: (current[owner] || 0) + 1 }));
        setFiredMapEvents((events) => [...new Set([...events, "dwarven-water-bottled"])]);
        resolve();
        setLog((lines) => ["The copper tankard carries one extra dose of healing water as a Healing Potion. The spigot coughs and runs dry.", ...lines].slice(0, 6));
        close();
        return;
      }
      case "heal-at-spigot": {
        const canFillTankard = !!partyItemOwner("Copper Tankard");
        setUnits((current) => current.map((unit) => unit.team === "hero" && !unit.npc && !unit.downed
          ? restoreRestCharges({ ...unit, hp: unit.maxHp, bleeding: false, poisoned: false })
          : unit));
        setFiredMapEvents((events) => [...new Set([...events, "dwarven-party-healed"])]);
        if (canFillTankard)
          setLog((lines) => ["The party drinks and washes their wounds. Every conscious hero returns to full HP. One final measure remains for the copper tankard.", ...lines].slice(0, 6));
        else {
          resolve();
          setLog((lines) => ["The party drinks and washes their wounds. Every conscious hero returns to full HP. The spigot runs dry.", ...lines].slice(0, 6));
          close();
        }
        return;
      }
      case "take-bridge-potion":
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["Move a conscious hero beside the roadside cache before opening it.", ...lines].slice(0, 6));
          return;
        }
        grantDungeonLoot(consciousActive.id, ["Healing Potion"]);
        resolve();
        setLog((lines) => [`${consciousActive.name} takes one Healing Potion from the roadside cache.`, ...lines].slice(0, 6));
        close();
        return;
      case "disable-heart-acid": disableHeartAcid(); return;
      case "force-heart-acid": forceHeartAcid(); return;
      case "break-halleth-bars":
      case "pick-halleth-lock": {
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["A conscious hero must stand beside the barred pit before freeing Halleth.", ...lines].slice(0, 6));
          return;
        }
        if (actionId === "pick-halleth-lock" && !/rogue/i.test(consciousActive.role)) { setLog((lines) => [`${consciousActive.name} studies the lock, but only a Rogue can pick it cleanly.`, ...lines].slice(0, 6)); return; }
        if (actionId === "pick-halleth-lock") { const check = rollSkill(consciousActive, "Thieves' Tools", 12); if (!check.success) { setLog((lines) => [`${consciousActive.name}'s pick catches in the rusted grate. ${check.label}. The lock remains closed.`, ...lines].slice(0, 6)); close(); return; } setLog((lines) => [`${check.label}. Success.`, ...lines].slice(0, 6)); }
        const alreadyRescued = firedMapEvents.includes("halleth-rescued");
        if (alreadyRescued && actionId === "break-halleth-bars" && consciousActive.x === poi.x && consciousActive.y === poi.y) { setLog((lines) => [`${consciousActive.name} cannot force the grate from inside the pit. A Rogue can pick the lock; anyone else needs help from outside.`, ...lines].slice(0, 6)); return; }
        if (!alreadyRescued && !firedMapEvents.includes("halleth-bard-met")) {
          close();
          openScriptedEncounter("halleth-bard");
          return;
        }
        setFiredMapEvents((events) => [...new Set([...events, "halleth-bars-open"])]);
        if (alreadyRescued) {
          animateSprite(consciousActive.id, "attack", 850);
          setLog((lines) => [actionId === "pick-halleth-lock" ? `${consciousActive.name} opens the resetting grate with a quick turn of the lock.` : `${consciousActive.name} spends a long, exhausting stretch forcing the resetting grate open.`, ...lines].slice(0, 6));
          close(); return;
        }
        const point = DUNGEON_LANDMARKS.hallethPit.point;
        const throne = dungeonRoomPoints.get("39a");
        const route = throne ? scenePath(point, throne, dungeonBlocked, DUNGEON_COLS, DUNGEON_ROWS) : [];
        const revealedRoute = route.flatMap((step) => [
          step, { x: step.x + 1, y: step.y }, { x: step.x - 1, y: step.y },
          { x: step.x, y: step.y + 1 }, { x: step.x, y: step.y - 1 },
        ]).filter((step) => step.x >= 0 && step.y >= 0 && step.x < DUNGEON_COLS && step.y < DUNGEON_ROWS);
        setRevealedTiles((tiles) => [...new Set([...tiles, ...revealedRoute.map((step) => key(step.x, step.y))])]);
        const rescuer = consciousActive;
        if (rescuer) grantDungeonLoot(rescuer.id, ["Halleth's Guidance"]);
        resolve();
        setFiredMapEvents((events) => advanceRoomState(
          [...new Set([...events, "halleth-rescued", "halleth-guided-route", "halleth-bars-open"])],
          "37",
          "resolved",
        ));
        setAmbientMessage("HALLETH RESCUED · THE CARTOGRAPHER OWES THE COMPANY A DEBT");
        scheduleCutscene(() => setAmbientMessage(null), 4200);
        const release = actionId === "pick-halleth-lock"
          ? `${rescuer.name} picks the grate's rusted lock.`
          : `${rescuer.name} smashes the iron bars loose.`;
        setLog((lines) => [`${release} Halleth climbs out, marks a route toward the throne hall, and names the three members of his expedition he is still hunting. His rescuer gains +2 Investigation. The threshold at HH67 awakens.`, ...lines].slice(0, 6));
        close();
        setChapterIntro(true);
        showDialogueBubble("halleth", "Halleth. Bard, cartographer, survivor of one terrible venue. I owe you. I know a route toward the throne.", () => {
          showDialogueBubble("halleth", "Copper Stormforge. Midna Tauberth. Rex the Hammer. If they're still below, I'm finding them.", () => {
            const halleth = units.find((unit) => unit.id === "halleth");
            const exit = { x: 20, y: 92 }; // U93, south through the corridor
            const departurePath = halleth ? scenePath(halleth, exit, currentBlocked, boardCols, boardRows) : [];
            const departureMs = halleth ? animateSceneWalk(halleth.id, departurePath, 0, 520) : 0;
            scheduleCutscene(() => {
              setUnits((current) => current.filter((unit) => unit.id !== "halleth"));
              setFiredMapEvents((events) => [...new Set([...events.filter((event) => event !== "halleth-bars-open"), "halleth-bars-reset"])]);
              setChapterIntro(false);
              if (rescuer) showCombatBark(rescuer.id, "He said he'd find us again.", 1800);
            }, departureMs + 240);
          });
        });
        return;
      }
      case "take-gold-cache":
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["A conscious hero must stand at R62 to lift the hollow tile.", ...lines].slice(0, 6));
          return;
        }
        grantDungeonLoot(consciousActive.id, ["25 gp"]); resolve();
        setLog((lines) => [`${consciousActive.name} lifts the hollow tile at R62 and takes 25 gp from the pocket beneath it.`, ...lines].slice(0, 6));
        close(); return;
      case "take-question-glasses":
        if (!consciousActive) return;
        grantDungeonLoot(consciousActive.id, ["Glasses of Good Questions"]); resolve();
        setLog((lines) => [`${consciousActive.name} takes the Glasses of Good Questions.`, ...lines].slice(0, 6));
        close(); return;
      case "leave-question-glasses": close(); return;
      case "talk-dead-mage":
        close(); openSocialScene("dead-mage", "24b", "Nimraith's Academic Suspension", "Nimraith", "Five questions. Ask carefully."); return;
      case "look-hall-mirror":
        if (!consciousActive || attackDist(consciousActive, poi) > 1) {
          setLog((lines) => ["A conscious hero must stand beside the mirror to read its plaque.", ...lines].slice(0, 6));
          return;
        }
        setUnits((current) => current.map((unit) => unit.id === consciousActive.id ? { ...unit, hp: Math.max(1, unit.hp - 1) } : unit));
        resolve();
        setAmbientMessage(`THE DUMBEST DELVER IN THE DUNGEON: ${consciousActive.name}`);
        scheduleCutscene(() => setAmbientMessage(null), 3400);
        showDialogueBubble(consciousActive.id, "Hey. That's just me.");
        setLog((lines) => [`The final portrait is a mirror. Its plaque updates to “THE DUMBEST DELVER IN THE DUNGEON: ${consciousActive.name}.” The realization deals 1 psychic damage.`, ...lines].slice(0, 6));
        close(); return;
      case "talk-kelim":
        clearSequence();
        encounterChoiceBusyRef.current = false;
        completeEncounterSequenceRef.current = null;
        setEncounterSequenceLabel(null);
        setChapterIntro(false);
        setAiBusy(false);
        close(); openSocialScene("kelim", "36b", "Kelim", "Kelim", "Are they gone? Please—get me out of here."); return;
    }
  };
  const handlePoiPanelAction = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const actionId = event.currentTarget.dataset.poiAction as PoiPanelActionId | undefined;
    const poi = pointsOfInterest.find((point) => point.id === inspectPoi);
    if (actionId && poi) runPoiPanelAction(actionId, poi);
  };
  const inspectedWolfInterpreter = inspected && (inspected.role === "Dire Wolf" || inspected.role === "Werewolf")
    ? units.find((unit) => unit.team === "hero" && !unit.npc && heroHasItem(unit.id, "Werewolf Lycanthropy"))
    : undefined;
  const inspectedWolfTranslation = inspectedWolfInterpreter && inspected
    ? {
        interpreterName: inspectedWolfInterpreter.name,
        text: inspected.role === "Werewolf"
          ? "The little curse inside you recognizes its elder. Kneel, or prove it has teeth."
          : "The moon-bitten one smells like us. Do not bite that one first.",
      }
    : undefined;
  const unitInspectorActions = inspected ? {
    talk: inspected.role === "Villager" && encounterMode === "exploration"
      ? () => {
          showDialogueBubble(inspected.id, VILLAGER_QUOTES[Math.floor(randomUnit() * VILLAGER_QUOTES.length)]);
          setInspect(null);
        }
      : undefined,
    resumeClub: inspected.role === "Club Hostess" && inspected.encounterGroup === "6c" && encounterMode === "exploration" &&
      active?.team === "hero" && !active.npc && !active.downed && attackDist(active, inspected) <= 1 &&
      !firedMapEvents.includes("undertaker-club-tour-complete") && !firedMapEvents.includes("undertaker-hostile-6c")
      ? () => {
          encounterChoiceBusyRef.current = false;
          setSocialScene({ kind: "secret-club", roomLabel: "6c", title: "The Extremely Secret Club", speaker: inspected.name, text: "Back already? Pay, join the party, or criticize the music at your own risk.", heroId: active.id });
          setInspect(null);
        }
      : undefined,
    resumeConversation: inspected.npc && inspected.role !== "Club Hostess" && encounterMode === "exploration" &&
      active?.team === "hero" && !active.npc && !active.downed && attackDist(active, inspected) <= 4 &&
      !(inspected.id === SCHOOL_TEACHER_ID && firedMapEvents.includes("schoolteacher-hostile")) &&
      (inspected.id === SCHOOL_TEACHER_ID || inspected.encounterGroup === "bridge" || !!(inspected.encounterGroup && ROOM_BLUEPRINTS[inspected.encounterGroup]?.entry.encounter))
      ? () => resumeEncounterConversation(inspected)
      : undefined,
    stopBleeding: villageBattle && active?.team === "hero" && phase === "action" && inspected.npc && inspected.bleeding &&
      active.skills.some((skill) => skill.kind === "heal") && attackDist(active, inspected) <= 1
      ? () => stopBleeding(inspected)
      : undefined,
    drinkPotion: active?.team === "hero" && phase === "action" && (potions[active.id] || 0) > 0 &&
      inspected.team === "hero" && attackDist(active, inspected) <= 1
      ? () => drinkPotion(inspected)
      : undefined,
  } : {};
  return (
    <main className="game-shell">
      <header>
        <div>
          <p className="eyebrow">
            {dungeonMode ? "UNDERMOUNTAIN · LEVEL 1" : levelTwoMode ? "UNDERMOUNTAIN · LEVEL 2" : campaign ? "TACTICAL RPG · CAMPAIGN" : "TACTICAL RPG · TRAINING BATTLE"}
          </p>
          <h1>Tactics of the Shattered Crown</h1>
        </div>
        <div className="objective">
          <span>
            {stage === "deploy"
              ? "DEPLOYMENT"
              : encounterMode === "exploration"
                ? "EXPLORATION"
                : `ROUND ${round}`}
          </span>
          <b>
            {stage === "deploy"
              ? `Place ${units[placing]?.name}`
              : encounterMode === "exploration"
                ? levelTwoMode
                  ? "The Black Room"
                : dungeonMode
                  ? bossHuntStarted && !bossHasArrived && !throneClaimable
                    ? `Explore Level 1 · ${dungeonExplorationPercent}% / 90%${activeDungeonThreats ? ` · ${activeDungeonThreats} Active Threat${activeDungeonThreats === 1 ? "" : "s"}` : " · Halls Quiet"}`
                    : "Explore Undermountain"
                : encounterCleared
                  ? `Reach Exit · ${exitTile.label}`
                  : "Explore · attack to begin combat"
              : villageBattle
                ? campaignScene === 5
                  ? "Defend the Inn · New Assault"
                  : `Defend the Inn · Wave ${villageWave}/2`
                : `${heroIds.length} Heroes vs ${enemyTypes.length} Monsters`}
          </b>
        </div>
        {dungeonMode && (
          <button
            className={`new-battle ${dungeonPlaytest ? "active" : ""}`}
            onClick={() => {
              setDungeonPlaytest((enabled) => !enabled);
              setTeleportMode(false);
            }}
            title="Playtest Mode removes dungeon fog and enables teleport controls."
          >
            Playtest {dungeonPlaytest ? "ON" : "OFF"}
          </button>
        )}
        {dust2MapPlaytest && <button className="new-battle active" disabled title="Dust 2 Map Lab is always in playtest mode.">Playtest ON</button>}
        {mapPlaytest && (
          <button
            className={`new-battle ${showGridCoordinates ? "active" : ""}`}
            onClick={() => setShowGridCoordinates((visible) => !visible)}
            title="Show or hide square coordinates."
            aria-pressed={showGridCoordinates}
          >
            Grid {showGridCoordinates ? "ON" : "OFF"}
          </button>
        )}
        {dungeonMode && dungeonPlaytest && (
          <>
            <button
              className="new-battle playtest-reset"
              onClick={() => startDungeonScene(true)}
              title="Reset Level 1 map progress, encounters, traps, and positions. Character inventory and progression are preserved."
            >
              {resetButtonLabel("map")}
            </button>
            <LevelOneRegressionRunner
              snapshot={buildLevelOneRegressionSnapshot({
                flags: firedMapEvents, resolvedPoi, discoveredPoi, dungeonItems,
                droppedItemIds: droppedDungeonItems.map((item) => item.id), bonusSkills,
                achievementIds: achievements.map((award) => award.id), route, mapCompletions, campaignScene,
              })}
              onStage={(checkpoint) => stageLevelOneRegressionCheckpoint(checkpoint, {
                encounterMode, units, selectedHeroId: teleportHeroId, blocked: currentBlocked,
                boardCols, boardRows, mapZoom, board: battlefieldRef.current,
                setAmbientMessage, clearAmbientLater: (delay) => scheduleCutscene(() => setAmbientMessage(null), delay),
                setTeleportMode, setSelectedHeroId: setTeleportHeroId, setUnits, setRevealedTiles,
                setViewport: setDungeonViewport, updateViewport: updateDungeonViewport, setLog,
              })}
            />
            <div className="debug-layer-controls" aria-label="Playtest map overlays">
              {DEBUG_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  className={debugLayers.has(layer.id) ? "active" : ""}
                  aria-pressed={debugLayers.has(layer.id)}
                  onClick={() => setDebugLayers((current) => {
                    const next = new Set(current);
                    if (next.has(layer.id)) next.delete(layer.id);
                    else next.add(layer.id);
                    return next;
                  })}
                >{layer.label}</button>
              ))}
              <small>{contentIssues.length ? `${contentIssues.length} blueprint warning${contentIssues.length === 1 ? "" : "s"}` : "Blueprints valid"}</small>
            </div>
          </>
        )}
        {dust2MapPlaytest && (
          <>
            <button className="new-battle playtest-reset" onClick={startDust2MapLab} title="Reset Koko, the flag, objective clock, and map test layers.">{resetButtonLabel("map")}</button>
            <div className="debug-layer-controls dust2-playtest-controls" aria-label="Dust 2 playtest map overlays">
              <button className={playerView.viewEnabled ? "active" : ""} onClick={() => playerView.setViewEnabled(!playerView.viewEnabled)}>Player View {playerView.viewEnabled ? "ON" : "GM"}</button>
              <button onClick={() => playerView.setScope(playerView.scope === "party" ? "selected" : "party")}>Vision {playerView.scope === "party" ? "PARTY" : "SELECTED"}</button>
              <button onClick={() => playerView.setRange(PLAYER_VIEW_RANGES[(PLAYER_VIEW_RANGES.indexOf(playerView.range) + 1) % PLAYER_VIEW_RANGES.length])}>Range {playerView.range === "daylight" ? "DAYLIGHT" : `${playerView.range} FT`}</button>
              <button className={dust2ShowWalls ? "active" : ""} onClick={() => setDust2ShowWalls((visible) => !visible)}>Walls {dust2ShowWalls ? "ON" : "OFF"}</button>
              <button className={dust2ShowElevation ? "active" : ""} onClick={() => setDust2ShowElevation((visible) => !visible)}>Elevation {dust2ShowElevation ? "ON" : "OFF"}</button>
              <button className={dust2ShowGridLines ? "active" : ""} onClick={() => setDust2ShowGridLines((visible) => !visible)}>Grid Lines {dust2ShowGridLines ? "ON" : "OFF"}</button>
              <button className={dust2FreeClimb ? "active" : ""} onClick={() => setDust2FreeClimb((enabled) => !enabled)}>Free Climb {dust2FreeClimb ? "ON" : "OFF"}</button>
              <button onClick={playerView.resetMemory}>Reset Vision</button>
              <button onClick={() => { setEditorStartDust2(true); setStage("editor"); }}>Edit Elevation</button>
              <small>{playerView.observerLabel} · {playerView.elevationLabel}</small>
            </div>
          </>
        )}
        <button
          className={`new-battle sound-toggle ${soundEnabled ? "active" : ""}`}
          onClick={() => setSoundEnabled((enabled) => {
            if (enabled) stopVoiceLine();
            return !enabled;
          })}
          title={soundEnabled ? "Mute game sounds" : "Enable game sounds"}
          aria-pressed={soundEnabled}
        >
          Sound {soundEnabled ? "ON" : "OFF"}
        </button>
        <button className="new-battle" onClick={restart}>
          Menu
        </button>
        {encounterSequenceLabel && (
          <button
            className="new-battle active"
            onClick={() => completeEncounterSequenceRef.current?.()}
          >
            {encounterSequenceLabel}
          </button>
        )}
      </header>
      <div className={`game-status-row ${stage === "battle" ? "" : "multiplayer-only"}`} aria-label="Game status and two player controls">
      {stage === "battle" && (
        <ObjectiveTracker open={objectiveTrackerOpen} onToggle={() => setObjectiveTrackerOpen((open) => !open)}
          dust2={dust2MapActive ? { state:dust2Objective, roundsRemaining:dust2RoundsRemaining, carrierName:units.find((unit) => unit.id === dust2Objective.flagCarrierId)?.name || "HERO" } : undefined}
          standard={{ headline:dungeonMode ? "Explore Undermountain" : encounterCleared ? `Reach ${exitTile.label}` : "Complete the encounter", room:currentRoom ? `${currentRoomId} · ${currentRoom.title}` : "Uncharted passage", status:currentEncounterState.toUpperCase(), discoveries:unresolvedDiscoveries ? `${unresolvedDiscoveries} unresolved` : "Nothing pending", floor:dungeonMode ? `${dungeonExplorationPercent}% explored` : undefined }} />
      )}
      <MultiplayerDock multiplayer={multiplayer} heroes={multiplayerHeroes} activeHeroId={active?.id || null} /></div>
      <section className={`battle-layout ${hostWaitingForPlayerTwo ? "host-watching-player-two" : ""}`}>
        <aside className="panel initiative">
          <h2>Turn Order</h2>
          {initiativeOrder.filter((u) => u.team === "hero" || playerView.isUnitVisible(u)).map((u) => (
            (() => {
              const charging = chargedSpells.find((charge) => chargedCasterKey(charge) === chargedCasterKey(u));
              return (
            <button
              key={`${u.id}-${u.bossHead || "unit"}`}
              onClick={() => {
                if (mapPlaytest && u.team === "hero") {
                  setTeleportHeroId(u.id);
                  setTeleportMode(false);
                } else setInspect(u.id);
              }}
              className={`turn-card ${u.id === active?.id && u.bossHead === active?.bossHead && stage === "battle" ? "active" : ""} ${mapPlaytest && u.id === teleportHeroId ? "playtest-selected" : ""} ${u.team}`}
            >
              <span className="portrait">{u.name[0]}</span>
              <span>
                <b>{u.name}</b>
                <small>
                  {u.role} · INIT d20 {u.initiativeRoll ?? 0} {initiativeModifierOf(u) >= 0 ? "+" : ""}{initiativeModifierOf(u)} ={" "}
                  {initiativeTotal(u)}
                </small>
              </span>
              <i>{u.hp}</i>
              {charging && <strong className="turn-charge" title={`${charging.name} fires in round ${charging.resolvesRound}`}>CHARGING</strong>}
            </button>
              );
            })()
          ))}
        </aside>
        <div
          ref={battlefieldRef}
          onScroll={dungeonMode ? (event) => updateDungeonViewport(event.currentTarget) : undefined}
          className={`battlefield ${dungeonMode ? "dungeon-board" : ""} ${levelTwoMode && !dust2MapActive ? "level-two-black-room" : ""} ${dust2MapActive ? "dust2-map-board village-map-board" : ""} ${dust2MapPlaytest ? "dust2-map-playtest" : ""} ${vfxGalleryMode ? "vfx-gallery-board" : ""} ${mapPlaytest && showGridCoordinates ? "show-grid-coordinates" : ""} ${villageMapActive || ritualMapActive || openingForestMapActive ? "village-map-board" : ""} ${forestVisualMapActive ? "forest-visual-board" : ""} ${paintedMapFacadeActive ? "painted-map-facade" : ""} ${campaign ? "campaign-map" : ""} ${paintedMapFacadeActive ? "has-map-art" : ""}`}
          style={{ "--board-cols": boardCols, "--board-rows": boardRows, "--map-zoom": mapZoom, "--tile-pixels": `${boardTilePixels}px` } as React.CSSProperties}
        >
          {(dungeonMode || dust2MapActive) && (
            <div className="map-zoom-controls" aria-label="Map zoom controls">
              <button onClick={() => setMapZoom((zoom) => Math.max(0.75, Number((zoom - 0.25).toFixed(2))))} disabled={mapZoom <= 0.75} aria-label="Zoom map out">−</button>
              <span>{Math.round(mapZoom * 100)}%</span>
              <button onClick={() => setMapZoom((zoom) => Math.min(2.25, Number((zoom + 0.25).toFixed(2))))} disabled={mapZoom >= 2.25} aria-label="Zoom map in">+</button>
              <button className="find-character" onClick={snapToCharacter} aria-label="Center map on active character">◎ Find Character</button>
            </div>
          )}
          {roomEntryPresentation && <RoomEntryModal entry={roomEntryPresentation} onDismiss={dismissRoomEntry} />}
          {(targetPreview || movementPreview) && hoverTile && (
            <div className="target-preview" role="status">{targetPreview || movementPreview}</div>
          )}
          <div className="board-surface">
          {dust2MapActive && <Dust2DebugOverlay debug={dust2MapPlaytest} walls={dust2ShowWalls} elevation={dust2ShowElevation} grid={dust2ShowGridLines} />}
          <BattlefieldVisionOverlay view={playerView} />
          <div
            className="scene"
            style={paintedMapFacade ? { backgroundImage: `url(${paintedMapFacade})` } : undefined}
          />
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${boardCols}, ${levelTwoMode || dungeonMode || villageMapActive || ritualMapActive || openingForestMapActive ? `${boardTilePixels}px` : "1fr"})`,
              gridTemplateRows: `repeat(${boardRows}, ${levelTwoMode || dungeonMode || villageMapActive || ritualMapActive || openingForestMapActive ? `${boardTilePixels}px` : "1fr"})`,
            }}
          >
            <SegmentSpellOverlay zones={abilityZones} start={wallStart?.skillIndex === chosen?.i ? wallStart : null} preview={segmentPreview} columns={boardCols} rows={boardRows} />
            {renderedCellIndices.map((i) => {
              const x = i % boardCols,
                y = Math.floor(i / boardCols),
                secretDoorRender = dungeonMode
                  ? closedDungeonSecretDoors.renderByPublicTile.get(key(x, y))
                  : undefined,
                secretHallConcealed = dungeonMode && !firedMapEvents.includes(westernSecretDoorEvent) && WESTERN_SECRET_CONCEAL_KEYS.has(key(x, y)), tileRevealed = (!dungeonMode || dungeonPlaytest || storyVisionDisabled || revealedTileSet.has(key(x, y))) && !secretHallConcealed,
                cellUnits = tileRevealed ? (livingUnitsByTile.get(key(x, y)) || []).filter((unit) => playerView.isUnitVisible(unit)) : [],
                u = cellUnits.find((q) => q.role === "Gelatinous Cube") || cellUnits[0],
                engulfed = u?.role === "Gelatinous Cube"
                  ? cellUnits.find((q) => q.team === "hero" && q.id !== u.id)
                  : undefined,
                downCandidate = tileRevealed ? downedUnitsByTile.get(key(x, y)) : undefined,
                down = downCandidate && playerView.isUnitVisible(downCandidate) ? downCandidate : undefined,
                inPreview = aimedPreviewTileSet.has(key(x, y)),
                isKnockLanding = knockLandingKey === key(x, y),
                isBurning = burningTileSet.has(key(x, y)),
                abilityZone = abilityZones.find((zone) => zoneContains(zone, { x, y })),
                abilityZoneArt = abilityZone ? abilityZoneSliceStyle(abilityZone, { x, y }) : undefined,
                chargedIntent = chargedIntentByTile.get(key(x, y)),
                chargedIntentSource = chargedIntent
                  ? units.find((unit) => unit.id === chargedIntent.unitId)
                  : undefined,
                guardianHere = !!wanderingGuardian && wanderingGuardian.path[wanderingGuardian.step]?.x === x && wanderingGuardian.path[wanderingGuardian.step]?.y === y,
                eyeHologramHere = x === eyeHologramPoint.x && y === eyeHologramPoint.y && firedMapEvents.includes("eye-hologram-awakened"),
                orientationHologramHere = dungeonMode && x === ORIENTATION_HOLOGRAM_POINT.x && y === ORIENTATION_HOLOGRAM_POINT.y,
                orientationHologramSpeaking = noticeQueue[0]?.kind === "halaster" && noticeQueue[0].text === DELVER_ORIENTATION_MESSAGE,
                mapHologram = eyeHologramHere
                  ? { kind: "princess" as const, speaking: eyeHologramSpeaking, title: "Blue Princess Hologram — replay message", text: "Help us, adventurers. You’re our only hope." }
                  : orientationHologramHere
                    ? { kind: "halaster" as const, speaking: orientationHologramSpeaking, title: "Halaster Hologram — replay voiced orientation sample", text: DELVER_ORIENTATION_MESSAGE }
                    : null,
                dropsHere = dropsByTile.get(key(x, y)) || [],
                poi = poiByTile.get(key(x, y)),
                poiProp = poi ? dungeonPoiProp[poi.id] : undefined,
                poiVisibleFromParty = !poiProp?.visibleFrom || units.some((unit) =>
                  unit.team === "hero" && !unit.downed &&
                  unit.x >= poiProp.visibleFrom!.left && unit.x <= poiProp.visibleFrom!.right &&
                  unit.y >= poiProp.visibleFrom!.top && unit.y <= poiProp.visibleFrom!.bottom &&
                  (!playerView.enabled || playerView.hasLineOfSight(unit, poi!, true))
                ),
                rangerTrackVisible = !!poi && isAnimalTracks(poi) && units.some((unit) => unit.role === "Ranger" && unit.team === "hero" && !unit.npc && !unit.downed && attackDist(unit, poi) <= RANGER_TRACK_SIGHT && clearLine(unit, poi)), poiVisible = !!poi && poiVisibleFromParty && getPoiDefinition(poi.id).mapRepresentation !== "structural" && (rangerTrackVisible || shouldRenderPoi(poi.id, discoveredPoiSet, resolvedPoiSet)),
                trapStateHere = poi?.kind === "trap" ? trapVisualState({
                  id: poi.id,
                  flags: firedMapEventSet,
                  discovered: discoveredPoiSet,
                  resolved: resolvedPoiSet,
                }) : null,
                wallMountsHere = dungeonMode ? (DUNGEON_WALL_MOUNTS_BY_TILE.get(key(x, y)) || []).filter((mount) => {
                  const event = mount.secretDoorEdge && dungeonSecretDoorEventByEdge.get(dungeonEdgeKey(mount.secretDoorEdge)); return !event || !firedMapEvents.includes(event);
                }) : [],
                visibleWallMountsHere = wallMountsHere.filter((mount) => units.some((unit) => unit.team === "hero" && !unit.npc && !unit.downed && dist(unit, mount.host) <= 5 && (!playerView.enabled || playerView.hasLineOfSight(unit, mount.host, true)) && (mount.side === "n" ? unit.y >= mount.host.y : mount.side === "s" ? unit.y <= mount.host.y : mount.side === "e" ? unit.x <= mount.host.x : unit.x >= mount.host.x))),
                staticDungeonPropsHere = dungeonMode
                  ? dungeonSceneryPropsByTile.get(key(x, y)) || []
                  : [],
                staticVillagePropsHere = villageMapActive
                  ? villageSceneryPropsByTile.get(key(x, y)) || []
                  : [],
                terrainKind = currentTerrain[y][x],
                villageInteriorArt = villageMapActive && x >= 8 && x <= 13 && y >= 7 && y <= 11,
                barrierHere = barrierByTile.get(key(x, y)),
                dungeonOpeningArt = dungeonMode && terrainKind === "dungeon-floor" && inDungeonOpeningArtZone(x, y),
                undertakerClubArt = dungeonMode && terrainKind === "dungeon-floor" && inUndertakerClubArtZone(x, y),
                classroomFloor = dungeonMode && terrainKind === "dungeon-floor" && inSchoolFloorZone(x, y),
                schoolArt = classroomFloor && inSchoolArtZone(x, y) && dungeonRoomLabels.get(key(x, y)) !== "24b",
                schoolDoorwayTile = dungeonMode && y === schoolDoorwayY &&
                  (x === schoolArtZone.left + schoolArtZone.width - 1 || x === schoolArtZone.left + schoolArtZone.width),
                classroomEastWall = dungeonMode && x === schoolArtZone.left + schoolArtZone.width - 1 &&
                  y >= schoolArtZone.top && y < schoolArtZone.top + schoolArtZone.height && y !== schoolDoorwayY,
                fightClubArt = dungeonMode && terrainKind === "dungeon-floor" && inFightClubArtZone(x, y),
                manticoreStageTile = dungeonMode && x >= manticoreStageZone.left && x < manticoreStageZone.left + manticoreStageZone.width &&
                  y >= manticoreStageZone.top && y < manticoreStageZone.top + manticoreStageZone.height,
                flourCirclePoint = dungeonRoomPoints.get("19c"),
                flourCircleHere = dungeonMode && !!flourCirclePoint && x === flourCirclePoint.x && y === flourCirclePoint.y,
                floodRoomTile = dungeonMode && floodRoomTileKeys.has(key(x, y)),
                proximityBombThreatTile = dungeonMode && firedMapEvents.includes("proximity-bomb-armed") &&
                  !resolvedPoi.includes("proximity-bomb") && inProximityBombRoom({ x, y }),
                desecratedTempleTile = dungeonMode && x >= 20 && x <= 22 && y >= 43 && y <= 51,
                terrainEdgeClasses = forestVisualMapActive || (dungeonMode && terrainKind === "dungeon-floor")
                  ? [
                      currentTerrain[y - 1]?.[x] !== terrainKind ? `${dungeonMode ? "dungeon" : "terrain"}-edge-n` : "",
                      currentTerrain[y]?.[x + 1] !== terrainKind ? `${dungeonMode ? "dungeon" : "terrain"}-edge-e` : "",
                      currentTerrain[y + 1]?.[x] !== terrainKind ? `${dungeonMode ? "dungeon" : "terrain"}-edge-s` : "",
                      currentTerrain[y]?.[x - 1] !== terrainKind ? `${dungeonMode ? "dungeon" : "terrain"}-edge-w` : "",
                      classroomEastWall ? "dungeon-edge-e" : "",
                    ].filter((edgeClass) => edgeClass && !wallMountsHere.some((mount) =>
                      mount.suppressWallEdge && edgeClass === `dungeon-edge-${mount.side}`)).join(" ")
                  : "",
                terrainVariant = (x * 17 + y * 31) % 4,
                bossArenaTile = dungeonMode && terrainKind === "dungeon-floor" && firedMapEvents.includes("room-39a") && attackDist({ x, y }, twoHeadedKingPoint) <= 4,
                bossSpellFieldTile = dungeonMode && terrainKind === "dungeon-floor" && !!twoHeadedKing &&
                  encounterMode === "combat" && active?.bossHead === "spellcaster" && attackDist({ x, y }, twoHeadedKing) <= BOSS_SPELL_RANGE,
                bossShockwaveTile = !!bossShockwave && attackDist({ x, y }, bossShockwave) <= 3,
                bossSpellTile = !!bossSpellBurst && attackDist({ x, y }, bossSpellBurst) <= 1,
                bossThroneHere = dungeonMode && tileRevealed && firedMapEvents.includes("room-39a") &&
                  x === bossThronePoint.x && y === bossThronePoint.y,
                debugRoomMarker = dungeonMode && dungeonRoomLabels.has(key(x, y)),
                debugSpawn = dungeonMode && dungeonEncounterSpawnKeys.has(key(x, y)),
                // Clickable POIs are interactions, not walk-over triggers.
                debugTrigger = dungeonMode && dungeonAuthoredTriggerKeys.has(key(x, y)),
                debugArt = dungeonMode && tileRevealed && (terrainKind === "dungeon-floor" || dungeonOpeningArt || undertakerClubArt || schoolArt || fightClubArt || manticoreStageTile || sewerSceneAreaTileKeys.has(key(x, y)) || staticDungeonPropsHere.length > 0 || wallMountsHere.length > 0 || !!poiProp),
                dust2SiteHere = dust2MapActive ? dust2FlagSiteAt(x, y) : undefined,
                dust2LooseFlag = dust2LooseFlagPosition(dust2Objective), dust2LooseFlagHere = dust2MapActive && !!dust2LooseFlag && !dust2Objective.secured && x === dust2LooseFlag.x && y === dust2LooseFlag.y,
                dust2PlantedFlagHere = !!dust2SiteHere && dust2Objective.plantedSite === dust2SiteHere.id,
                dust2SecretExitHere = dust2MapActive && dust2Objective.secured && (!levelTwoMode || levelTwoExitIsOpen(firedMapEvents)) && x === DUST2_SECRET_EXIT.x && y === DUST2_SECRET_EXIT.y,
                dungeonTheme = dungeonMode ? dungeonVisualThemeMap[y]?.[x] || "ancient" : "ancient";
              return (
                <button
                  data-coordinate={`${gridColumnLabel(x)}${y + 1}`}
                  onClick={() => { if (!hostWaitingForPlayerTwo) tileClick(x, y); }}
                  disabled={dungeonMode && (!tileRevealed || !dungeonOpen.has(key(x, y)))}
                  aria-label={dungeonMode && !tileRevealed ? "Unexplored" : dungeonMode && !dungeonOpen.has(key(x, y)) ? "Outside dungeon" : undefined}
                  onMouseEnter={wantsTileHover ? () => setHoverTile({ x, y }) : undefined}
                  onMouseLeave={wantsTileHover ? () => setHoverTile(null) : undefined}
                  key={i}
                  className={`cell terrain-${terrainKind} terrain-variant-${terrainVariant} ${x < 2 ? "board-edge-left" : x >= boardCols - 2 ? "board-edge-right" : ""} ${y < 2 ? "board-edge-top" : ""} ${dungeonMode ? `dungeon-theme-${dungeonTheme}` : ""} ${desecratedTempleTile ? "desecrated-temple-tile" : ""} ${dungeonOpeningArt ? "dungeon-art-opening" : ""} ${undertakerClubArt ? "dungeon-art-undertaker-club" : ""} ${classroomFloor ? "dungeon-classroom-floor" : ""} ${schoolArt ? professorGrinVisible ? "dungeon-art-school-nightmare" : "dungeon-art-school" : ""} ${schoolDoorwayTile ? x === 6 ? "classroom-doorway classroom-doorway-room" : "classroom-doorway classroom-doorway-hall" : ""} ${classroomEastWall ? "classroom-east-wall" : ""} ${fightClubArt ? "dungeon-art-fight-club" : ""} ${manticoreStageTile ? "manticore-judges-stage" : ""} ${dungeonMode && sewerSceneAreaTileKeys.has(key(x, y)) ? "puke-crawl-tile" : ""} ${floodRoomTile && floodRoomActive ? "flood-room-active" : floodRoomTile && firedMapEvents.includes("room-33-flood-drained") ? "flood-room-drained" : ""} ${proximityBombThreatTile ? "proximity-bomb-threat" : ""} ${villageInteriorArt ? "village-interior-art" : ""} ${barrierHere && chosen?.kind === "attack" ? "barrier-targetable" : ""} ${debugLayers.has("collision") && terrainKind !== "void" && currentBlocked.has(key(x, y)) ? "debug-collision" : ""} ${debugLayers.has("triggers") && debugTrigger ? "debug-trigger" : ""} ${debugLayers.has("rooms") && debugRoomMarker ? "debug-room" : ""} ${debugLayers.has("spawns") && debugSpawn ? "debug-spawn" : ""} ${debugLayers.has("art") && debugArt ? "debug-art" : ""} ${terrainEdgeClasses} elevation-${Math.round(currentHeight[y][x] / 5)} ${!tileRevealed ? "fogged" : ""} ${reachable(x, y) ? "reachable" : ""} ${maxReach(x, y) ? "max-reach" : ""} ${abilityZone ? `ability-zone ability-zone-${abilityZone.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""} ${chosen?.kind === "skill" && active?.skills[chosen.i!]?.area && attackDist(active, { x, y }) <= effectiveSkillRange(active, active.skills[chosen.i!]) && (active.skills[chosen.i!].area !== "line" || isLineAim(active, { x, y })) ? "area-aim" : ""} ${inPreview ? "area-preview" : ""} ${isKnockLanding ? "knock-preview" : ""} ${chargedIntent ? `charged-intent ${chargedIntentSource?.team === "hero" ? "friendly-intent" : "enemy-intent"}` : ""} ${bossArenaTile ? "two-headed-boss-arena" : ""} ${bossSpellFieldTile ? "boss-spell-field" : ""} ${bossShockwaveTile ? "boss-shockwave" : ""} ${bossSpellTile ? "boss-spell-burst" : ""} ${currentBlocked.has(key(x, y)) ? "blocked" : ""} ${(campaignScene === 3 || campaignScene === 8) && x === ritualTile.x && y === ritualTile.y ? "ritual-cell" : ""}`}
                  style={{
                    gridColumnStart: x + 1,
                    gridRowStart: y + 1,
                    ...(villageInteriorArt ? {
                    "--village-interior-x": `${-(x - 8) * 52}px`,
                    "--village-interior-y": `${-(y - 7) * 52}px`,
                  } : {}),
                  } as React.CSSProperties}
                >
                  {dungeonPlaytest && ((debugRoomMarker && debugLayers.has("rooms")) || (debugSpawn && debugLayers.has("spawns")) || (debugTrigger && debugLayers.has("triggers")) || (debugArt && debugLayers.has("art"))) && (
                    <span className="debug-tile-label" aria-hidden="true">
                      {debugRoomMarker && debugLayers.has("rooms") ? `ROOM ${dungeonRoomLabels.get(key(x, y))}` : debugSpawn && debugLayers.has("spawns") ? "SPAWN" : debugTrigger && debugLayers.has("triggers") ? "TRIGGER" : debugArt && debugLayers.has("art") ? "ART" : ""}
                    </span>
                  )}
                  {forestVisualMapActive && <span className="forest-tile-detail" aria-hidden="true" />}
                  {floodRoomTile && floodRoomActive && <span className="flood-water-surface" aria-hidden="true" />}
                  {abilityZone && <span className={`ability-zone-surface ${abilityZoneArt ? "has-zone-art" : ""}`} style={abilityZoneArt as React.CSSProperties | undefined} aria-hidden="true" />}
                  {isBurning && burningOrigin && <span className="fireball-ground-slice" style={{ "--fireball-slice-x": `${-(x - burningOrigin.x) * 52}px`, "--fireball-slice-y": `${-(y - burningOrigin.y) * 52}px` } as React.CSSProperties} aria-hidden="true" />}
                  {flourCircleHere && (
                    <span className={`flour-circle-ground ${firedMapEvents.includes("flour-ghost-trapped") ? "ghost-trapped" : firedMapEvents.includes("flour-ghost-empowered") ? "ghost-empowered" : "unfinished"}`} aria-hidden="true" />
                  )}
                  {tileRevealed && staticVillagePropsHere.map((prop) => (
                    <span
                      key={prop.id}
                      className={`map-scenery-prop visual-kind-${prop.visualKind || "room-plate"} prop-atlas-${prop.atlas} prop-slot-${prop.slot} prop-id-${prop.id}`}
                      style={{
                        "--prop-scale": prop.scale || 1,
                        "--prop-rotate": `${prop.rotate || 0}deg`,
                      } as React.CSSProperties}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="tile-info">
                    {gridColumnLabel(x)}{y + 1}
                    {!dungeonMode && <b>{currentHeight[y][x]} ft</b>}
                  </span>
                  <Dust2ObjectiveMarkers site={dust2SiteHere} planted={dust2PlantedFlagHere} looseFlag={dust2LooseFlagHere} secretExit={dust2SecretExitHere} />
                  {tileRevealed && visibleWallMountsHere.map((wallMount) => (
                    <span key={wallMount.id} className={`wall-mount-anchor wall-side-${wallMount.side}`}>
                      {wallMount.panelTiles && <span className="wall-mounted-panel" style={{ "--wall-panel-tiles": wallMount.panelTiles, "--wall-panel-depth": wallMount.panelDepthTiles || 1 } as React.CSSProperties} aria-hidden="true" />}
                      {!wallMount.panelOnly && wallMount.poiId && wallMount.frame && <span
                        className={`wall-mounted-frame frame-${wallMount.frame}`}
                        style={{ "--wall-art-rotate": `${wallMount.rotate || 0}deg`,
                          "--wall-mount-offset-x": `${wallMount.offsetX || 0}px`, "--wall-mount-offset-y": `${wallMount.offsetY || 0}px`,
                          "--wall-mount-width": `${wallMount.width || 30}px`, "--wall-mount-height": `${wallMount.height || 42}px` } as React.CSSProperties}
                        role="button"
                        tabIndex={0}
                        title={pointsOfInterest.find((point) => point.id === wallMount.poiId)?.name || "Wall display"}
                        aria-label={`Inspect ${pointsOfInterest.find((point) => point.id === wallMount.poiId)?.name || "wall display"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setInspectPoi(wallMount.poiId);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          event.stopPropagation();
                          setInspectPoi(wallMount.poiId);
                        }}
                      >
                        {wallMount.image
                          ? <img src={wallMount.image} alt="" aria-hidden="true" loading="eager" decoding="async" draggable={false} />
                          : <span aria-hidden="true" />}
                      </span>}
                    </span>
                  ))}
                  {chargedIntent && (
                    <span className="charged-intent-icon" title={`${chargedIntent.name} fires next round`} aria-label={`${chargedIntent.name} danger area`}>
                      {chargedIntent.damageType === "radiant" ? "☀" : chargedIntent.name === "Tailstorm" ? "✣" : "✦"}
                    </span>
                  )}
                  {villageMapActive && villageDefenseMap.edges
                    .filter((edge) => edge.x === x && edge.y === y)
                    .map((edge, edgeIndex) => {
                      const edgeKey = `${edge.x},${edge.y},${edge.side}`;
                      const visualKind = villageWindowEdgeKeys.has(edgeKey) ? "window" : edge.kind;
                      const barrier = barriers.find((candidate) => candidate.edgeKey === edgeKey);
                      const state = !barrier || !villageBattle
                        ? "intact"
                        : barrier.hp <= 0
                          ? "broken"
                          : barrier.hp <= barrier.maxHp * .4
                            ? "critical"
                            : barrier.hp < barrier.maxHp
                              ? "damaged"
                              : "intact";
                      return (
                        <span
                          key={`${edge.side}-${edgeIndex}`}
                          className={`village-edge edge-${edge.side} edge-${visualKind} state-${state} ${barrier?.hp ? "interactive-barrier" : ""} ${barrier?.hp && chosen?.kind === "attack" ? "attack-ready" : ""}`}
                          title={barrier?.hp ? `${barrier.name} ${barrier.hp}/${barrier.maxHp} — choose Attack, then click here` : undefined}
                          aria-hidden={barrier?.hp ? undefined : true}
                          onClick={barrier?.hp ? (event) => {
                            event.stopPropagation();
                            attackBarrierTarget(barrier);
                          } : undefined}
                        />
                      );
                    })}
                  {dungeonMode && tileRevealed && secretDoorRender && !wallMountBySecretDoorEdge.has(dungeonEdgeKey(secretDoorRender.edge)) && (() => {
                    const edgeKey = dungeonEdgeKey(secretDoorRender.edge);
                    const poiId = dungeonSecretDoorPoiByEdge.get(edgeKey);
                    const threeLordsEntrance = poiId === "three-lords-statues";
                    return (
                      <span className={`dungeon-structure-kit dungeon-kit-${dungeonTheme} dungeon-secret-door-trigger ${threeLordsEntrance ? "three-lords-secret-door-trigger" : ""}`}>
                        <span
                          className={`dungeon-structure-edge structure-edge-${secretDoorRender.side} secret-door-click-target`}
                          title={threeLordsEntrance ? "The Three Lords relief" : "Ordinary wall panel"}
                          role="button"
                          tabIndex={0}
                          aria-label={threeLordsEntrance ? "Inspect the Three Lords relief" : "Inspect the ordinary wall panel"}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (poiId) setInspectPoi(poiId);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            event.stopPropagation();
                            if (poiId) setInspectPoi(poiId);
                          }}
                        />
                        {threeLordsEntrance && <span className={`secret-wall-decoration three-lords wall-side-${secretDoorRender.side}`} aria-hidden="true" />}
                      </span>
                    );
                  })()}
                  {dungeonMode && tileRevealed && terrainKind === "dungeon-floor" && terrainEdgeClasses && (
                    <span className={`dungeon-structure-kit dungeon-kit-${dungeonTheme}`} aria-hidden="true">
                      {terrainEdgeClasses.split(" ").map((edgeClass) => (
                        <span key={edgeClass} className={`dungeon-structure-edge ${edgeClass.replace("dungeon-edge-", "structure-edge-")}`} />
                      ))}
                    </span>
                  )}
                  {dungeonMode && tileRevealed && dungeonRoomLabels.has(key(x, y)) && !bossThroneHere && (
                    <span className="dungeon-room-label">
                      {dungeonRoomLabels.get(key(x, y))}
                    </span>
                  )}
                  {u && (
                    <span
                      data-unit-id={u.id}
                      className={`token ${u.team} player-view-visible-token ${u.npc ? "npc" : ""} ${dust2Objective.flagCarrierId === u.id ? "flag-relic-bearer" : ""} ${hasCondition(u, "invisible") ? "condition-invisible" : ""} ${hasCondition(u, "prone") ? "condition-prone" : ""} ${hasCondition(u, "paralyzed") ? "condition-paralyzed" : ""} ${hasCondition(u, "frightened") ? "condition-frightened" : ""} ${u.id === "halleth" ? "halleth-token" : ""} ${teleportingUnitId === u.id ? "teleporting-away" : ""} ${wayfarerLaunchedUnitId === u.id ? "wayfarer-launched" : ""} ${u.encounterGroup === "23c" ? "spectral-camper-token" : ""} ${u.id === "flour-bound-ghost" ? "flour-bound-ghost-token" : ""} ${u.id === "empowered-flour-ghost" ? "empowered-flour-ghost-token" : ""} ${u.role === "Black Dragon" && !firedMapEvents.includes("black-dragon-awake") ? "black-dragon-sleeping" : ""} ${u.role === "Manticore" ? "manticore-large-token" : ""} ${u.role === "Manticore" && manticoreShowActive ? "manticore-show-spotlight" : ""} ${u.role === "Ettin" && u.encounterGroup === "39a" ? `two-headed-boss-token ${firedMapEvents.includes("two-headed-king-engaged") ? "king-standing" : "king-seated"}` : ""} ${engulfed ? "cube-engulfing" : ""} ${u.id === active?.id && stage === "battle" ? "active-unit" : ""}`}
                      style={wayfarerLaunchedUnitId === u.id ? {
                        "--wayfarer-launch-x": `${(4 - u.x) * 52}px`,
                        "--wayfarer-launch-y": `${(2 - u.y) * 52}px`,
                        "--wayfarer-launch-half-x": `${(4 - u.x) * 26}px`,
                        "--wayfarer-launch-half-y": `${(2 - u.y) * 26}px`,
                      } as React.CSSProperties : undefined}
                    >
                      {engulfed && (
                        <span className="engulfed-victim" aria-label={`${engulfed.name} engulfed by Gelatinous Cube`}>
                          {usesHeroSprite(engulfed) ? (
                            <span
                              className={`walker-sprite ${actorVisualClass(engulfed)} pose-damage facing-${engulfed.facing}`}
                              style={{ backgroundImage: `url(${spriteSheetForUnit(engulfed)})` }}
                            />
                          ) : <span className="figure">{engulfed.name[0]}</span>}
                        </span>
                      )}
                      {teleportingUnitId === u.id && <span className="teleport-away-effect" aria-hidden="true" />}
                      {!!u.rageRounds && <span className="rage-ability-vfx" aria-hidden="true" />}
                      {hasEffect(u, "flame-arrows") && <span className="flame-arrows-status-vfx" aria-hidden="true" />}
                      {dust2Objective.flagCarrierId === u.id && <span className="dust2-carried-flag"><i className="one-true-flag" aria-hidden="true" /><small>FLAG</small></span>}
                      <PassiveAbilityBadges skills={u.skills} />
                      {u.role === "Training Dummy" ? (
                        <span className="vfx-sandbag-sprite" aria-label="Targetable training sandbag" />
                      ) : u.id === SCHOOL_TEACHER_ID ? (
                        <span
                          className={`schoolteacher-sprite ${professorGrinVisible ? "nightmare" : "normal"}`}
                          style={{ backgroundImage: `url(${professorGrinVisible ? "/professor-grin.png" : "/professor-vale.png"})` }}
                          aria-label={professorGrinVisible ? "Professor Grin" : "Professor Vale"}
                        />
                      ) : usesHeroSprite(u) ? (
                        <>
                          <span
                            className={`walker-sprite ${actorVisualClass(u)} pose-${spritePose[u.id] || "idle"} facing-${u.facing} ${heroEquipmentVisuals(u.id).filter((visual) => visual.visualMode === "sprite-filter").map((visual) => visual.visualClass).join(" ")}`}
                            style={{ backgroundImage: `url(${spriteSheetForUnit(u)})` }}
                            aria-label={`${u.name} ${spritePose[u.id] || "idle"}`}
                          />
                          {heroEquipmentVisuals(u.id).filter((visual) => visual.visualMode === "overlay").map((visual) => (
                            <span
                              key={`${visual.slot}-${visual.item}`}
                              className={`equipped-item-visual slot-${visual.slot} ${visual.visualClass} pose-${spritePose[u.id] || "idle"} facing-${u.facing}`}
                              aria-label={`${visual.label} equipped`}
                            />
                          ))}
                        </>
                      ) : creatureSpriteClass(u) ? (
                        <span
                          className={`creature-sprite ${creatureSpriteClass(u)} pose-${spritePose[u.id] || "idle"} facing-${u.facing}`}
                          aria-label={`${u.name} ${spritePose[u.id] || "idle"}`}
                        />
                      ) : (
                        <span className="figure">{u.name[0]}</span>
                      )}
                      {u.stunned && (
                        <span
                          className="status-icon"
                          title="Stunned: loses next turn"
                        >
                          ✦
                        </span>
                      )}
                      {u.poisoned && (
                        <span className="status-icon" title="Poisoned: loses 10 HP each round">
                          ☠
                        </span>
                      )}
                      {hasEffect(u, "marked-target") && <span className="persistent-effect-icon hunters-mark-effect" title="Hunter's Mark: the Ranger deals bonus damage to this target" aria-label="Hunter's Mark" />}{hasEffect(u, "flame-arrows") && <span className="persistent-effect-icon flame-arrows-effect" title={`Flame Arrows: +${FLAME_ARROWS_DAMAGE} fire on the next ${flameArrowShotsRemaining(u)} standard ranged attack${flameArrowShotsRemaining(u) === 1 ? "" : "s"}`} aria-label={`Flame Arrows, ${flameArrowShotsRemaining(u)} shots remaining`} />}{!!u.temporaryHp && hasEffect(u, "armor-of-agathys") && <span className="persistent-effect-icon armor-of-agathys-effect" title={`Armor of Agathys: ${u.temporaryHp} temporary HP and cold retaliation`} aria-label="Armor of Agathys" />}{u.skills.some((skill) => skill.name === "Hellish Rebuke" && skill.automatic && skill.charges > 0) && <span className="persistent-effect-icon hellish-rebuke-effect" title="Hellish Rebuke armed: automatically retaliates against the next damaging attacker in range" aria-label="Hellish Rebuke armed" />}
                      {!!u.rageRounds && (
                        <span className="status-icon rage-status" title={`Rage: +5 Attack for ${u.rageRounds} more round${u.rageRounds === 1 ? "" : "s"}`}>
                          🔥
                        </span>
                      )}
                      <em>{faceIcon[u.facing]}</em>
                      <i>
                        <b style={{ width: `${(100 * u.hp) / u.maxHp}%` }} />
                      </i>
                      <small>{u.name}</small>
                    </span>
                  )}
                  {down &&
                    (usesHeroSprite(down) ? (
                      <span className="walker-ko">
                        <span
                          className={`walker-sprite ${actorVisualClass(down)} pose-ko`}
                          style={{ backgroundImage: `url(${spriteSheetForUnit(down)})` }}
                          aria-label={`${down.name} knocked out`}
                        />
                      </span>
                    ) : (
                      <span className="downed">✦</span>
                    ))}
                  {combatFloats
                    .filter((combatFloat) => combatFloat.unitId === u?.id || combatFloat.unitId === down?.id)
                    .map((combatFloat) => (
                      <span
                        key={combatFloat.id}
                        className={`combat-float tone-${combatFloat.tone}`}
                        aria-label={combatFloat.text}
                      >
                        {combatFloat.text}
                      </span>
                    ))}
                  {mapHologram && (
                    <span
                      className={`eye-princess-hologram ${mapHologram.speaking ? "speaking" : ""}`}
                      role="button"
                      tabIndex={0}
                      title={mapHologram.title}
                      data-map-hologram={mapHologram.kind}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (mapHologram.kind === "princess") replayEyeHologram();
                        else if (mapHologram.speaking) dismissNotice();
                        else enqueueHalaster(DELVER_ORIENTATION_MESSAGE);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        if (mapHologram.kind === "princess") replayEyeHologram();
                        else if (mapHologram.speaking) dismissNotice();
                        else enqueueHalaster(DELVER_ORIENTATION_MESSAGE);
                      }}
                    >
                      <span className={`eye-princess-hologram-figure ${mapHologram.kind === "halaster" ? "halaster-hologram-figure" : ""}`} aria-hidden="true" />
                      {mapHologram.speaking && <em>“{mapHologram.text}”</em>}
                    </span>
                  )}
                  {guardianHere && (
                    <span
                      className="wandering-guardian"
                      title="A nonviolent shield guardian convinced it is a wizard's apprentice."
                      onClick={(event) => {
                        event.stopPropagation();
                        const pass = wanderingGuardian?.pass || 1;
                        setLog((lines) => [shieldGuardianPassText[pass - 1].inspect, ...lines].slice(0, 6));
                      }}
                    >
                      <span className="wandering-guardian-sprite" aria-hidden="true" />
                      <small>Shield Guardian</small>
                      <em>“{shieldGuardianPassText[(wanderingGuardian?.pass || 1) - 1].speech}”</em>
                    </span>
                  )}
                  {dropsHere.map((drop) => (
                    <span
                      key={drop.id}
                      className={drop.contents ? "dungeon-chest-token" : `dropped-item-token ${drop.name === "Potion of Speed" ? "speed-potion-token" : ""} ${drop.name === "Healing Potion" ? "healing-potion-token" : ""} ${drop.name === "Bag of Flour" ? "flour-bag-token" : ""} ${drop.id === "puke-immunity-ring" ? "puke-immunity-ring-token" : ""} ${drop.name === "Blue Lightsaber" ? "blue-lightsaber-token" : ""} ${drop.id.startsWith("portable-proximity-bomb:") ? "portable-proximity-bomb-token" : ""}`}
                      data-chest-state={drop.contents ? (openChestId === drop.id ? "open" : "closed") : undefined}
                      role="button"
                      tabIndex={0}
                      title={drop.contents
                        ? `Open chest · ${drop.contents.length} items`
                        : `Pick up ${drop.id === "fallen-guard-ballcap" ? "a dirty ballcap" : drop.name} · ${describeItem(drop.name, active?.name || "this hero")}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (drop.contents) setOpenChestId(drop.id);
                        else if (!drop.id.startsWith("portable-proximity-bomb:")) pickUpDungeonItem(drop);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          if (drop.contents) setOpenChestId(drop.id);
                          else if (!drop.id.startsWith("portable-proximity-bomb:")) pickUpDungeonItem(drop);
                        }
                      }}
                    >
                      <span>{drop.contents || drop.id === "puke-immunity-ring" || drop.name === "Blue Lightsaber" || drop.name === "Healing Potion" || drop.name === "Bag of Flour" ? "" : drop.name === "Potion of Speed" ? "⚗" : "◆"}</span>
                      {drop.name !== "Blue Lightsaber" && (
                        <small>{drop.contents ? `Chest · ${drop.contents.length}` : drop.id === "puke-immunity-ring" ? "Gleaming Ring" : drop.id === "fallen-guard-ballcap" ? "a dirty ballcap" : drop.name}</small>
                      )}
                    </span>
                  ))}
                  {poiVisible &&
                    !(poi!.id === "golden-spear-mimic" && resolvedPoi.includes(poi!.id)) && (
                    <span
                      className={`poi-token visual-kind-${getPoiDefinition(poi!.id).visualKind} poi-${poi!.kind} poi-id-${poi!.id} ${poiProp ? "poi-has-scenery-art" : ""} ${poiProp?.offsetX || poiProp?.offsetY ? "poi-offset-mounted" : ""} ${poi!.id.startsWith("hall-portrait-") ? "poi-hall-portrait" : ""} ${isAnimalTracks(poi!) ? "poi-ground-clue" : ""} ${rangerTrackVisible ? "ranger-track-visible" : ""} ${trapStateHere ? `trap-state-${trapStateHere}` : ""} ${poi!.id === "spiked-pit-28d" && firedMapEvents.includes("spiked-pit-28d-triggered") ? "triggered" : ""} ${poi!.id === "proximity-bomb" && firedMapEvents.includes("proximity-bomb-armed") ? "armed" : ""} ${resolvedPoi.includes(poi!.id) ? "resolved" : ""}`}
                      style={poiProp?.offsetX || poiProp?.offsetY ? {
                        "--poi-offset-x": `${poiProp.offsetX || 0}px`,
                        "--poi-offset-y": `${poiProp.offsetY || 0}px`,
                      } as React.CSSProperties : undefined}
                      role="button"
                      tabIndex={0}
                      title={`${poi!.name} — ${trapStateHere ? trapStateHere.toUpperCase() : resolvedPoi.includes(poi!.id) ? "SAFE / RESOLVED" : "click to inspect"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        activatePoi(poi!, x, y);
                      }}
                      onKeyDown={(event) => {
                        if (!isPoiActivationKey(event.key)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        activatePoi(poi!, x, y);
                      }}
                    >
                      {poi!.id === "bridge-waystone" ? (
                        <span className="bridge-toll-projector" aria-label="Inspect the out-of-order toll projector">
                          <span className="bridge-projector-machine" aria-hidden="true" />
                          <span className="bridge-projector-sign" aria-hidden="true" />
                        </span>
                      ) : poi!.id === "bridge-supply-cache" ? (
                        <span
                          className="dungeon-chest-token bridge-default-chest"
                          data-chest-state={resolvedPoi.includes(poi!.id) ? "open" : "closed"}
                          aria-label={resolvedPoi.includes(poi!.id) ? "An open and empty wooden treasure chest" : "A closed wooden treasure chest"}
                        >
                          <span />
                          <small>{resolvedPoi.includes(poi!.id) ? "Open · Empty" : "Chest"}</small>
                        </span>
                      ) : poi!.id === "spike-pit-lure-28d" ? (
                        <>
                          <span className="golden-magnifying-glass" aria-hidden="true">⌕</span>
                          <small>Inspect</small>
                        </>
                      ) : poi!.id === "forest-ruin-marker" ? (
                        <span className="forest-ruin-marker-prop" aria-hidden="true" />
                      ) : getPoiDefinition(poi!.id).visualKind === "room-plate" ? (
                        <span className="last-camp-clue-hitbox" aria-label={`Inspect ${poi!.name}`} />
                      ) : poi!.id === "gold-cache" ? (
                        <span className="hollow-floor-tile-art" aria-label="A loose hollow floor tile" />
                      ) : poi!.id === "dwarven-cave-in" ? (
                        <span className={`dwarven-cave-in-art ${firedMapEvents.includes("dwarven-cave-in-clearing") ? "clearing" : ""}`} aria-label="A cave-in blocking a dwarven supply niche" />
                      ) : poi!.id === "broom-closet-message" ? (
                        <span className="floor-message-art" aria-label="Broom closet ahead"><b>BROOM</b><b>CLOSET</b><b>AHEAD</b></span>
                      ) : poi!.id === "sewer-secret-grate" || poi!.id === "flood-room-secret-grate" ? (
                        <span className="secret-sewer-grate-art" aria-label="A rusted dungeon runoff grate" />
                      ) : poi!.id === "proximity-bomb" ? (() => {
                        const spriteState: ProximityBombVisualState =
                          proximityBombAnimation === "exploding" || proximityBombAnimation === "resetting"
                            ? proximityBombAnimation
                            : resolvedPoi.includes("proximity-bomb")
                              ? "disabled"
                              : firedMapEvents.includes("proximity-bomb-armed")
                                ? "armed"
                                : "dormant";
                        return <span
                          className={`proximity-bomb-platform proximity-bomb-${spriteState}`}
                          aria-label="A small nuke on a stable stone platform"
                        ><i className="proximity-bomb-base" /><i className="proximity-bomb-nuke" /><i className="proximity-bomb-cloud" /></span>;
                      })() : poi!.id === "halleth-pit" ? (
                        <span
                          className={`halleth-pit-visual ${firedMapEvents.includes("halleth-bars-open") ? "opened" : "locked"}`}
                          aria-label={firedMapEvents.includes("halleth-bars-open") ? "An opened iron-barred pit" : "A locked iron-barred pit"}
                        />
                      ) : poiProp ? (
                        null
                      ) : (
                        <>
                          <span className={isAnimalTracks(poi!) ? "animal-tracks-icon" : undefined}>{isAnimalTracks(poi!) ? "🐾︎" : poi!.id === "ten-thousand-steps-message" ? "…" : resolvedPoi.includes(poi!.id) ? "✓" : poi!.kind === "trap" ? "⚠" : "⌕"}</span>
                          <small>{resolvedPoi.includes(poi!.id) ? `${poi!.name} · Safe` : poi!.name}</small>
                        </>
                      )}
                    </span>
                  )}
                  {barriers.find((b) => b.x === x && b.y === y) &&
                    (() => {
                      const b = barriers.find((q) => q.x === x && q.y === y)!;
                      return (
                        <span
                          className={`barrier-token kind-${b.kind} ${b.id === floodRoomHazard?.barrier.id ? "floodgate-barrier" : ""} orientation-${b.edgeKey?.endsWith(",w") ? "vertical" : "horizontal"} ${b.hp <= 0 ? "broken" : b.hp <= b.maxHp * 0.4 ? "critical" : b.hp < b.maxHp ? "damaged" : "intact"}`}
                        >
                          <small>
                            {b.hp > 0
                              ? `${b.name} ${b.hp}/${b.maxHp}`
                              : `Broken ${b.kind}`}
                          </small>
                        </span>
                      );
                    })()}
                  {(campaignScene === 3 || campaignScene === 8) &&
                    x === ritualTile.x &&
                    y === ritualTile.y &&
                    !u && (
                      <span
                        className={`ritual-focus-glow ${ritualActive ? "active" : "cleansed"}`}
                        title={
                          ritualActive
                            ? "Blood-Moon ritual: heals each living werewolf 5 HP every round"
                            : "Cleansed ritual"
                        }
                        aria-hidden="true"
                      />
                    )}
                  {campaignScene === 8 &&
                    x === poisonBodyTile.x &&
                    y === poisonBodyTile.y &&
                    !u && (
                      <span className="poison-guard-body" title="The poisoned body of the missing guard">
                        <span className="walker-sprite pose-ko facing-e" style={{ backgroundImage: 'url("/guard-sprites.png")' }} />
                        <small>Poisoned Guard</small>
                      </span>
                    )}
                  {campaignScene === 2 && encounterCleared && x === woundedGuardTile.x && y === woundedGuardTile.y && !u && (
                    <span className={`forest-guard-token ${guardHatDecision !== null ? "fallen" : "alive"}`} title={guardHatDecision !== null ? "The missing guard has fallen" : "The missing guard still breathes"}>
                      <span className={`walker-sprite ${guardHatDecision !== null ? "pose-ko" : "pose-damage"} facing-e`} style={{ backgroundImage: 'url("/guard-sprites.png")' }} />
                      <small>{guardHatDecision !== null ? "Fallen Guard" : "Wounded Guard"}</small>
                    </span>
                  )}
                </button>
              );
            })}
            {dungeonMode && proximityBombAnimation === "exploding" && (
              <div
                className="proximity-bomb-room-explosion"
                aria-hidden="true"
                style={{
                  gridColumn: `${DUNGEON_LANDMARKS.proximityBomb.room.left + 1} / ${DUNGEON_LANDMARKS.proximityBomb.room.right + 2}`,
                  gridRow: `${DUNGEON_LANDMARKS.proximityBomb.room.top + 1} / ${DUNGEON_LANDMARKS.proximityBomb.room.bottom + 2}`,
                }}
              />
            )}
            {portableBombBlast && <div key={portableBombBlast.nonce} className="proximity-bomb-room-explosion portable-bomb-explosion" aria-hidden="true" style={{ gridColumn: `${portableBombBlast.x} / ${portableBombBlast.x + 3}`, gridRow: `${portableBombBlast.y} / ${portableBombBlast.y + 3}` }} />}
            {elevatedSceneryOverlays.map((prop) => <DungeonObjectOverlay key={prop.id} prop={prop} />)}
            {elevatedPoiOverlays.map(({ prop, extraClass }) => <DungeonObjectOverlay key={prop.id} prop={prop} extraClass={extraClass} />)}
            {pointsOfInterest.some((point) => point.id === "kelim-closet") && <KelimClosetOverlay {...KELIM_CLOSET_POINT} bark={kelimFirstPleaOpen ? "Help! I'm trapped and they're trying to eat me!" : kelimClosetBark} onInspect={() => setInspectPoi("kelim-closet")} />}
            {releasedKelimPoint && <DungeonObjectOverlay prop={{ id: "released-kelim", ...releasedKelimPoint, atlas: "dungeon-e", slot: 0, asset: "/kelim-sprite.png", width: 34, height: 50, anchor: "bottom", bottom: 0, filter: "drop-shadow(0 3px 3px #000d)" }} />}
            {kelimCorpsePoint && <><DungeonObjectOverlay prop={{ id: "kelim-corpse", ...kelimCorpsePoint, atlas: "dungeon-e", slot: 0, asset: "/kelim-sprite.png", width: 34, height: 50, anchor: "bottom", bottom: 0 }} extraClass="kelim-corpse" />{firedMapEvents.includes("kelim-death-cry") && <DungeonOverlaySlot {...kelimCorpsePoint} className="kelim-death-cry-slot"><span className="kelim-closet-bark kelim-death-cry">“AHHHHH!”</span></DungeonOverlaySlot>}</>}
            {dungeonMode && (dungeonPlaytest || revealedTileSet.has(key(bossThronePoint.x, bossThronePoint.y))) && (
              <DungeonOverlaySlot x={bossThronePoint.x} y={bossThronePoint.y}>
                <span
                  className={`boss-throne-scenery ${throneClaimable ? "throne-unlocked" : ""}`}
                  aria-label={throneClaimable ? "Claim the throne and finish Level 1" : "The Two-Headed King's throne"}
                  role={throneClaimable ? "button" : undefined}
                  tabIndex={throneClaimable ? 0 : undefined}
                  onClick={throneClaimable ? (event) => {
                    event.stopPropagation();
                    setThroneClaimPrompt(true);
                  } : undefined}
                  onKeyDown={throneClaimable ? (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    setThroneClaimPrompt(true);
                  } : undefined}
                />
              </DungeonOverlaySlot>
            )}
            <AbilityEffects effect={abilityVfx} lightning={lightningBoltEffect} cols={boardCols} rows={boardRows} />
          </div>
          {projectile &&
            (() => {
              const dx = (projectile.to.x - projectile.from.x) * (100 / boardCols),
                dy = (projectile.to.y - projectile.from.y) * (100 / boardRows);
              return (
                <span
                  key={projectile.nonce}
                  className="arrow-projectile"
                  style={{
                    left: `${projectile.from.x * (100 / boardCols) + 50 / boardCols}%`,
                    top: `${projectile.from.y * (100 / boardRows) + 50 / boardRows}%`,
                    width: `${Math.hypot(dx, dy)}%`,
                    transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
                  }}
                >
                  <i>➤</i>
                </span>
              );
            })()}
          </div>
          {bubble?.persistent ? (
            <DialoguePanel
              key={bubble.nonce}
              ariaLabel={`${persistentDialogueSpeakerName} dialogue`}
              speaker={persistentDialogueSpeakerName}
              text={bubble.text}
              portrait={persistentDialoguePortrait}
              portraitMode={persistentDialoguePortraitMode}
              onContinue={() => {
                suppressBoardClicksUntilRef.current = runtimeNow() + 600;
                continueDialogueBubble();
              }}
            />
          ) : bubble && !socialScene ? (
            <div
              className={`global-speech-bubble ${bubblePlacement?.below ? "below-speaker" : "above-speaker"} transient`}
              key={bubble.nonce}
              role="status"
              style={bubblePlacement
                ? { left: bubblePlacement.left, top: bubblePlacement.top }
                : { visibility: "hidden", left: 8, top: 8 }}
            >
              <span>{bubble.text}</span>
            </div>
          ) : null}
          {(((victory || defeat) && !villageCelebrating) || (levelOneComplete && !villageCelebrating)) && (
            <div className={`result ${tutorialRecapVisible ? "tutorial-recap-result" : ""} ${levelOneComplete ? "level-one-completion-result" : ""}`}>
              {tutorialRecapVisible ? (
                <div className="level-complete-summary tutorial-completion-recap">
                  <p>PROLOGUE COMPLETE</p>
                  <h2>Delver Orientation Awaits</h2>
                  <small>Review the road so far. Level 1 will teach the company how Undermountain expects delvers to die.</small>
                  <div className="completion-stats">
                    <span><b>{combatAccuracy(tutorialPartyTotals)}</b> Party Hit Rate</span>
                    <span><b>{tutorialPartyTotals.abilitiesUsed}</b> Abilities Used</span>
                    <span><b>{tutorialPartyTotals.damageDealt}</b> Damage Dealt</span>
                    <span><b>{tutorialPartyTotals.damageTaken}</b> Damage Taken</span>
                  </div>
                  <ul className="recap-checklist" aria-label="Tutorial outcome checklist">
                    {tutorialRecapChecklist.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <div className="character-recap">
                    {companyHeroes.map((hero) => (
                      <article key={hero.id} className={hero.downed ? "downed" : ""}>
                        <b>{hero.name}</b>
                        <small>{hero.role} · Level {hero.level || level} · {hero.downed ? "Down" : `${hero.hp}/${hero.maxHp} HP`}</small>
                        <div className="combat-stat-grid">
                          <span><b>{combatAccuracy(heroCombatStats[hero.id] || { attacks: 0, hits: 0 })}</b>Hit Rate</span>
                          <span><b>{heroCombatStats[hero.id]?.abilitiesUsed || 0}</b>Abilities</span>
                          <span><b>{heroCombatStats[hero.id]?.damageDealt || 0}</b>Damage dealt</span>
                          <span><b>{heroCombatStats[hero.id]?.damageTaken || 0}</b>Damage taken</span>
                          <span><b>{downCounts[hero.id] || 0}</b>Downs</span>
                        </div>
                        <span>{achievements.filter((award) => award.heroId === hero.id).length} reward boxes earned</span>
                      </article>
                    ))}
                  </div>
                  <div className="completion-boxes">
                    <b>REWARD BOXES</b>
                    {achievements.length ? achievements.map((award) => (
                        <article key={award.id} className={`tier-${award.tier.toLowerCase()} sealed`}>
                          <span><strong>{award.tier} · {award.boxName}</strong><small>{companyHeroes.find((unit) => unit.id === award.heroId)?.name || "Hero"}</small></span>
                          <button onClick={() => openAchievementBox(award.id)}>Open Box</button>
                        </article>
                      )) : <small>Every reward box has been opened.</small>}
                  </div>
                  {!!achievements.length && (
                    <button className="open-all-boxes" onClick={() => achievements.forEach((award) => openAchievementBox(award.id))}>
                      Open All {achievements.length} Boxes
                    </button>
                  )}
                  <button
                    disabled={!!unopenedAchievementBoxes.length}
                    onClick={() => {
                      setFiredMapEvents((events) => [...new Set([...events, "tutorial-recap-reviewed"])]);
                      continuePastBridge();
                    }}
                  >
                    {unopenedAchievementBoxes.length ? "Open Every Box to Continue" : "Continue"}
                  </button>
                </div>
              ) : dust2FreeplayMatch?.winner && dust2FreeplayTeam ? <Dust2FreeplayResult match={dust2FreeplayMatch} team={dust2FreeplayTeam} onRematch={() => startDust2Freeplay(dust2FreeplayTeam, units.filter((unit) => unit.team === "hero" && !unit.npc).map((unit) => dust2FreeplayTeam === "dungeoneers" ? unit.id : unit.name))} onChangeTeam={() => { setExitReached(false); setStage("dust2-freeplay-setup"); }} onMenu={restart} /> : campaign && (victory || levelOneComplete) ? (
                campaignScene === 1 ? (
                  <>
                    <p>THE GUARDS ARE STILL MISSING</p>
                    <small>
                      The road fight is over. The guards&apos; trail continues into the forest.
                    </small>
                    <button onClick={startForestScene}>Follow the Missing Guards&apos; Trail</button>
                  </>
                ) : campaignScene === 7 ? (
                  <div className="level-complete-summary">
                    <p>DELVER ORIENTATION COMPLETE</p>
                    <h2>The Floor Remembers the Company</h2>
                    <small>The final practical is over. The Hall has accepted its newest nomination, and the road to Level 2 is clear.</small>
                    <div className="completion-stats">
                      <span><b>{companyHeroes.filter((unit) => !unit.downed).length}</b> Survivors</span>
                      <span><b>{firedMapEvents.filter((event) => event.startsWith("room-") && !event.startsWith("room-loot")).length}</b> Rooms Found</span>
                      <span><b>{unopenedAchievementBoxes.length}</b> Boxes To Open</span>
                    </div>
                    <div className="character-recap">
                      {companyHeroes.map((hero) => (
                        <article key={hero.id} className={hero.downed ? "downed" : ""}>
                          <b>{hero.name}</b>
                          <small>{hero.role} · Level {hero.level || level} · {hero.downed ? "Down" : `${hero.hp}/${hero.maxHp} HP`}</small>
                          <span>DMG {hero.attack} · AC {armorClassOf(hero)} · MOVE {hero.move} · XP {hero.xp || 0}</span>
                          <span>{achievements.filter((award) => award.heroId === hero.id).length} boxes waiting · {downCounts[hero.id] || 0} times downed</span>
                        </article>
                      ))}
                    </div>
                    <div className="completion-decisions">
                      <b>THE FLOOR REMEMBERS</b>
                      <span>{mapCompletions.village_defense ? `The company defended the village ${mapCompletions.village_defense} time${mapCompletions.village_defense === 1 ? "" : "s"}.` : "The village received no defense from this company."}</span>
                      <span>{route?.startsWith("poison_") || route === "poison_ambush" ? "The returning wolf pack ate the poisoned bait." : firedMapEvents.includes("ritual-cleansed") ? "The Blood-Moon ritual was cleansed." : "The company survived the Blood-Moon clearing without cleansing its altar."}</span>
                      <span>{firedMapEvents.includes("undertaker-club-tour-complete") ? "Someone completed the Extremely Secret Tour." : "The velvet club kept some of its secrets."}</span>
                      <span>{firedMapEvents.includes("troll-hostile") ? "The hungry troll chose violence." : firedMapEvents.includes("room-18") ? "The hungry troll was handled without a battle." : "The troll never met the company."}</span>
                      <span>{firedMapEvents.includes("manticore-show-must-go-on-awarded") ? "The company survived Halaster's Three Questions and closed the show." : firedMapEvents.includes("manticore-den-intro-complete") ? "The Manticore judges submitted a hostile scorecard." : "The judges never received contestants."}</span>
                      <span>{firedMapEvents.includes("flour-ghost-trapped") ? "The repaired flour ward holds the spirit beside its circle." : firedMapEvents.includes("flour-ghost-empowered") ? "The company drew the ward hilariously wrong and opened a second route." : "The flour circle remains unfinished."}</span>
                      <span>{firedMapEvents.includes("black-goo-emo-bond") ? "Living darkness declared one company outfit permanently emo." : "The black-coated statue found no one willing to bond."}</span>
                      <span>{firedMapEvents.includes("last-camp-throne-revelation") ? "The Last Camp revealed that the Two-Headed King's throne opens the route to Level 2." : firedMapEvents.includes("last-camp-solved") ? "The spectral expedition finally recognized its own remains." : "The Last Camp kept the ending of its story."}</span>
                      <span>NEW HALL NOMINATION: {companyHeroes.map((hero) => hero.name).join(", ")} — delvers dumb enough to continue.</span>
                    </div>
                    {!!achievements.length && (
                      <div className="completion-boxes">
                        <b>REWARD BOXES</b>
                        {achievements.map((award) => (
                          <article key={award.id} className={`tier-${award.tier.toLowerCase()} ${award.openedAt ? "opened" : "sealed"}`}>
                            <span><strong>{award.tier} · {award.boxName}</strong><small>{units.find((unit) => unit.id === award.heroId)?.name || "Hero"}</small></span>
                            {award.openedAt
                              ? <em>CLAIMED · {award.reward}</em>
                              : <button onClick={() => openAchievementBox(award.id)}>Open Box</button>}
                          </article>
                        ))}
                      </div>
                    )}
                    <small>{unopenedAchievementBoxes.length
                      ? `Open ${unopenedAchievementBoxes.length} remaining box${unopenedAchievementBoxes.length === 1 ? "" : "es"} before proceeding.`
                      : "All rewards are collected and saved. The company is ready for Level 2."}</small>
                    <button disabled={!!unopenedAchievementBoxes.length} onClick={startLevelTwo}>Continue to Level 2</button>
                  </div>
                ) : campaignScene === 6 ? (
                  <></>
                ) : campaignScene === 8 ? (
                  <>
                    <p>THE PACK IS DEAD</p>
                    <small>
                      The poisoned wolves lie still. With the trail briefly
                      quiet, the company can still reach the village before
                      the next pack arrives.
                    </small>
                    <div className="story-options">
                      <button onClick={() => startVillageScene()}>Go to the village →</button>
                      <button onClick={() => startBridgeScene(true)}>Go to the bridge — leave the village behind</button>
                    </div>
                  </>
                ) : campaignScene === 3 ? (
                  <>
                    <p>THE TRAIL FORKS</p>
                    <small>
                      The werewolves are dead. The clearing remains open behind you,
                      but this road leads either back to the threatened village or onward to the bridge.
                    </small>
                    <div className="story-options">
                      <button onClick={() => startVillageScene()}>Go to the village</button>
                      <button onClick={() => startBridgeScene(true)}>Go to the bridge — leave the village behind</button>
                    </div>
                  </>
                ) : villageBattle ? (
                  villageAftermath ? (
                    campaignScene === 5 ? (
                      <>
                        <p>THE VILLAGE HOLDS AGAIN</p>
                        <small>
                          The company has completed{" "}
                          {mapCompletions.village_defense || 1} village defense
                          {(mapCompletions.village_defense || 1) === 1
                            ? ""
                            : "s"}
                          . More beasts can still be heard beyond the walls.
                        </small>
                        <div className="story-options">
                          <button
                            onClick={() => finishRepeatedVillageDefense(false)}
                          >
                            {ritualAlreadyResolved ? "Continue to the bridge" : "Follow the trail to the ritual"}
                          </button>
                          <button
                            onClick={() => finishRepeatedVillageDefense(true)}
                          >
                            Stay in town — face another wave
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>THE HUNT CONTINUES</p>
                        <small>
                          {ritualAlreadyResolved
                            ? `The ritual is already broken and the poisoned pack is dead. The company leaves the cheering village for the bridge. ${villageSurvivors} villagers survived.`
                            : `The company follows the retreating pack toward the ritual. ${villageSurvivors} villagers survived to pass on what they knew.`}
                        </small>
                        <div className="story-options">
                          <button onClick={() => startBridgeScene()}>Continue to the bridge</button>
                          {!ritualAlreadyResolved && <button onClick={() => completeCampaignScene("deeper", "deeper_forest")}>Find and cleanse the forest ritual</button>}
                          {!ritualAlreadyResolved && <button onClick={() => completeCampaignScene("poison", "poison_bait")}>Poison the wolves with the fallen guard or Jim</button>}
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <p>
                        {villageSurvivors} SURVIVOR
                        {villageSurvivors === 1 ? "" : "S"}
                      </p>
                      <small>{villageIntel}</small>
                      <div className="story-options">
                        <button onClick={() => finishVillage("pursue")}>
                          {ritualAlreadyResolved ? "Take the road to the bridge" : "Pursue the retreating pack"}
                        </button>
                        <button onClick={() => finishVillage("heal")}>
                          Stay and heal the survivors
                        </button>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    {!guardSpeakerId ? (
                      <>
                        <small>He will not last. Who approaches him?</small>
                        <div className="story-options">
                          {units
                            .filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed)
                            .map((hero) => (
                              <button key={hero.id} onClick={() => chooseGuardSpeaker(hero.id)}>
                                {hero.name}
                              </button>
                            ))}
                        </div>
                      </>
                    ) : guardHatDecision === null ? (
                      <>
                        <small>
                          “{FOREST_GUARD_WARNING}”
                          <br />
                          {FOREST_GUARD_CAP_OFFER}
                        </small>
                        <div className="story-options">
                          <button onClick={() => decideGuardHat("take")}>Take the Ball Cap</button>
                          <button onClick={() => decideGuardHat("decline")}>Leave It With Him</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <small>
                          {guardHatDecision === "take"
                            ? `${units.find((unit) => unit.id === guardSpeakerId)?.name} accepts the cap. The guard gives one faint nod, then falls still.`
                            : `${units.find((unit) => unit.id === guardSpeakerId)?.name} leaves the cap with him. The guard falls still.`}
                        </small>
                        <div className="story-options">
                          <button onClick={() => completeCampaignScene("deeper", "deeper_forest")}>
                            Follow the tracks deeper
                          </button>
                          <button onClick={() => completeCampaignScene("town", "return_to_town")}>
                            Warn the village
                          </button>
                          {heroHasItem(guardSpeakerId, "Ball Cap of Bad Ideas") && (
                            <button onClick={() => {
                              awardBallCapDialogue(guardSpeakerId);
                              completeCampaignScene("poison", "poison_bait");
                            }}>
                              {FOREST_POISON_BAIT_CHOICE}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )
              ) : (
                <>
                  <p>{victory ? "VICTORY" : leaderAbandoned ? "THE THREAD OF FATE HAS BEEN SEVERED" : "CAMPAIGN ENDED"}</p>
                  <small>
                    {victory
                      ? "The enemy company is down."
                      : leaderAbandoned
                        ? "The company departed while its leader still lay fallen."
                      : campaign
                        ? "Your company has fallen."
                        : "Your company has fallen."}
                  </small>
                  <button onClick={restart}>
                    {campaign ? "Start Again" : "Build Another Battle"}
                  </button>
                </>
              )}
            </div>
          )}
          {throneClaimPrompt && !victory && !levelOneComplete && !defeat && (
            <div
              className="level2-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="level2-modal-title"
              onClick={() => setThroneClaimPrompt(false)}
            >
              <div className="level2-modal-card" onClick={(event) => event.stopPropagation()}>
                <p id="level2-modal-title">CLAIM THE THRONE?</p>
                <small>The throne recognizes the victors. Claiming it ends Level 1 and opens the company summary.</small>
                <div className="story-options">
                  <button onClick={() => { clearTransientTimers(); setNoticeQueue([]); setSocialScene(null); playSound("door"); setFiredMapEvents((events) => [...new Set([...events, "level-one-complete"])]); setThroneClaimPrompt(false); setExitReached(true); }}>
                    Claim Throne &amp; Finish Level 1
                  </button>
                  <button onClick={() => setThroneClaimPrompt(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {wayfarerReady && !socialScene && !victory && !defeat && (
            <div className="dialogue-overlay" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
              <DialoguePanel
                ariaLabel="The Wayfarer dialogue"
                sceneTitle="Bridge · The Wayfarer"
                speaker="The Wayfarer"
                text="The road ahead is yours. How do you answer?"
                portrait={wayfarerDialoguePortrait ? spriteSheetForUnit(wayfarerDialoguePortrait) : null}
              >
                <button className="encounter-choice tone-peace" onClick={() => resolveWayfarer(false)}><small className="choice-tag">PEACE</small><span>“Thank you.”</span></button>
                <button className="encounter-choice tone-item" onClick={() => resolveWayfarer(true)}><small className="choice-tag">MONTY</small><span>“Blue. No—yellow!”</span></button>
              </DialoguePanel>
            </div>
          )}
          {socialScene && !bubble?.persistent && !victory && !defeat && (
            <div className="dialogue-overlay" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
              <DialoguePanel
                ariaLabel={`${socialScene.speaker} dialogue`}
                sceneTitle={socialScene.title}
                speaker={socialScene.speaker}
                text={socialScene.text}
                portrait={socialDialoguePortrait}
                portraitMode={socialDialoguePortraitMode}
              >
                  {socialScene.kind === "kelim" && (
                    resolvedPoi.includes("kelim-closet") ?
                    <button onClick={() => { setSocialScene(null); setReleasedKelimPoint(null); }}>“Good luck, Kelim.”</button> : <>
                      <button onClick={rescueKelim}>“Come on. We’ll get you out.”</button>
                      <button onClick={() => { speakSocialLine("Stay quiet. We'll come back."); setSocialScene(null); }}>“Not yet. Stay hidden.”</button>
                    </>
                  )}
                  {socialScene.kind === "dead-mage" && (
                    <>
                      {NIMRAITH_QUESTIONS.filter((question) =>
                        !firedMapEvents.includes(`nimraith-question-${question.id}`) &&
                        (!question.item || !!socialHeroWithItem(question.item))
                      ).map((question) => {
                        const speaker = question.item ? socialHeroWithItem(question.item) : undefined;
                        return <button key={question.id} className="encounter-choice tone-peace" onClick={() => askNimraith(question.id, question.answer, speaker?.id)}>
                          {question.hint && <small className="choice-tag">{question.hint}</small>}
                          <span>“{question.prompt}”</span>
                        </button>;
                      })}
                      <button onClick={leaveSocialConversation}>Leave</button>
                    </>
                  )}
                  {socialScene.kind === "schoolteacher" && (
                    <>
                      {(socialScene.speaker === "Professor Grin" || schoolTransformationFlash) && (
                        <p className="school-question"><b>Something underneath Vale’s smile looks back.</b></p>
                      )}
                      {schoolQuizStep === null ? (
                        chapterIntro ? (
                          <p className="school-question"><b>Professor Vale stops smiling. The class is starting.</b></p>
                        ) : <>
                          <button onClick={() => {
                            startSchoolQuiz(0);
                          }}>“Start the class.”</button>
                          <button onClick={questionProfessorValeCurriculum}>“What have you taught us?”</button>
                          <button className="encounter-choice tone-risk" onClick={() => triggerSchoolNightmare("This is not a class. You're a terrible teacher.")}>“This is not a class. You’re a terrible teacher.”</button>
                          <button className="secondary" onClick={leaveSocialConversation}>Leave the classroom</button>
                        </>
                      ) : (
                        <>
                          <p className="school-question"><b>Question {schoolQuizStep + 1} of {SCHOOL_QUIZ_QUESTIONS.length}</b> · Answer all three correctly to pass the class.</p>
                          {SCHOOL_QUIZ_QUESTIONS[schoolQuizStep].answers.map((answer, index) => (
                            <button key={answer} className="encounter-choice tone-risk" disabled={schoolTransformationFlash} onClick={() => answerSchoolQuiz(index)}>
                              “{answer}”
                              {socialHeroWithItem("Glasses of Good Questions") && index === SCHOOL_QUIZ_QUESTIONS[schoolQuizStep].correct && <small>Glasses: Professor Vale expects this answer</small>}
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  {socialScene.kind === "manticore-show" && (
                    <>
                      {manticoreShow.round === 0 ? (
                        <button className="encounter-choice tone-risk" onClick={startManticoreShow}>“Start the show.”</button>
                      ) : (
                        <>
                          <p className="manticore-question"><b>Question {manticoreShow.round} of 3</b> · Party score: {manticoreShow.score}</p>
                          {MANTICORE_SHOW_QUESTIONS[manticoreShow.round - 1].answers.map((answer, index) => (
                            <button key={answer} className="encounter-choice tone-risk" onClick={() => answerManticoreQuestion(index)}>
                              “{answer}”
                              {socialHeroWithItem("Glasses of Good Questions") && index === MANTICORE_SHOW_QUESTIONS[manticoreShow.round - 1].correct && <small>Glasses: this answer rings true</small>}
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  {socialScene.kind === "starving-goblins" && (
                    <>
                      {goblinShirtClaim && (
                        <div className="goblin-shirt-choice">
                          <small>Who gets the shirt?</small>
                          {nearbySocialHeroes(socialScene.roomLabel).map((hero) => (
                            <button key={hero.id} onClick={() => claimGoblinShirt(hero.id)}>
                              Give it to {hero.name}
                            </button>
                          ))}
                          <button className="secondary" onClick={() => setGoblinShirtClaim(false)}>Never mind</button>
                        </div>
                      )}
                    </>
                  )}
                  {socialScene.kind === "forest-guard" && guardHatDecision === null && (
                    <>
                      <button className="encounter-choice tone-item" onClick={() => decideGuardHat("take")}>
                        <small className="choice-tag">LOOT</small><span>Take a dirty ballcap</span>
                      </button>
                      <button className="encounter-choice tone-peace" onClick={() => decideGuardHat("decline")}>
                        <span>Leave It With Him</span>
                      </button>
                    </>
                  )}
                  {socialScene.kind === "forest-guard" && guardHatDecision !== null && (
                    <>
                      {!heroHasItem(socialScene.heroId, "Ball Cap of Bad Ideas") && (
                        <button className="encounter-choice tone-item" onClick={() => decideGuardHat("take")}>
                          <small className="choice-tag">LOOT BODY</small><span>Take a dirty ballcap</span>
                        </button>
                      )}
                      <button onClick={() => { setSocialScene(null); completeCampaignScene("deeper", "deeper_forest"); }}>
                        Follow the tracks deeper
                      </button>
                      <button onClick={() => { setSocialScene(null); completeCampaignScene("town", "return_to_town"); }}>
                        Warn the village
                      </button>
                      {heroHasItem(socialScene.heroId, "Ball Cap of Bad Ideas") && (
                        <button className="encounter-choice tone-item" onClick={() => {
                          awardBallCapDialogue(socialScene.heroId);
                          setSocialScene(null);
                          completeCampaignScene("poison", "poison_bait");
                        }}>
                          {FOREST_POISON_BAIT_CHOICE}
                        </button>
                      )}
                    </>
                  )}
                  {socialScene.kind !== "manticore-show" && scriptedEncounter?.choices.filter(encounterRequirementMet).map((choice) => {
                    return (
                      <button
                        key={choice.id}
                        className={`encounter-choice tone-${choice.tone}`}
                        onClick={() => void chooseSharedEncounterResponse(choice)}
                        disabled={multiplayer.dialogueClaimPending || !!multiplayer.dialogueClaim || (multiplayer.role !== "solo" && !onlineDialogueHero())}
                      >
                        <small className="choice-tag">{choiceTag(choice)}</small>
                        <span>“{choice.label}”</span>
                      </button>
                    );
                  })}
              </DialoguePanel>
            </div>
          )}
          {gameFeedback && (
            <div className={`game-feedback feedback-${gameFeedback.kind} ${gameFeedback.image ? "has-image" : ""}`} role="status" aria-live="polite" title="Click to dismiss" onClick={() => setGameFeedback(null)}>
              {gameFeedback.image && <Image src={gameFeedback.image} width={64} height={64} alt={gameFeedback.title} />}
              <b>{gameFeedback.title}</b><span>{gameFeedback.detail}</span>
            </div>
          )}
          {overlapSelection && !victory && !defeat && (
            <div className="social-modal" role="dialog" aria-modal="true" aria-labelledby="overlap-title" onClick={() => setOverlapSelection(null)}>
              <div className="social-card overlap-card" onClick={(event) => event.stopPropagation()}>
                <p className="eyebrow">OCCUPIED SPACE</p>
                <h2 id="overlap-title">Select a unit</h2>
                <div className="story-options social-options">
                  {overlapSelection.unitIds.map((unitId) => {
                    const unit = units.find((candidate) => candidate.id === unitId);
                    if (!unit) return null;
                    return <button key={unit.id} onClick={() => {
                      setOverlapSelection(null);
                      if (phase === "action" && chosen && active) {
                        const skill = chosen.kind === "skill" ? active.skills[chosen.i!] : null;
                        const valid = skill?.kind === "heal" ? unit.team === active.team : unit.team !== active.team;
                        if (valid && (vfxGalleryMode || skill?.mapWide || attackDist(active, unit) <= (skill ? effectiveSkillRange(active, skill) : activeWeapon?.range || active.range)) && (vfxGalleryMode || skill?.mapWide || (skill ? effectiveSkillRange(active, skill) : activeWeapon?.range || active.range) > 1 || !dust2MapActive || dust2MeleeSpaceCompatible(active, unit)) && (vfxGalleryMode || skill?.mapWide || clearLine(active, unit))) resolve(unit);
                        else setInspect(unit.id);
                      } else setInspect(unit.id);
                    }}>Select {unit.name}</button>;
                  })}
                </div>
              </div>
            </div>
          )}
          {ambientMessage && <div className="ambient-echo" role="status">{ambientMessage}</div>}
          {noticeQueue[0]?.kind === "halaster" && noticeQueue[0].text !== DELVER_ORIENTATION_MESSAGE && !socialScene && !bubble && (
            <div
              className="halaster-apparition halaster-speech-bubble queued-notice"
              role="button"
              tabIndex={0}
              onClick={dismissNotice}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") dismissNotice();
              }}
            >
              <Image
                className="halaster-portrait"
                src="/halaster-hologram-visible.png"
                alt="Halaster's holographic projection"
                width={256}
                height={384}
                sizes="64px"
                draggable={false}
              />
              <b>HALASTER</b>
              <span>“{noticeQueue[0].text}”</span>
              <small>Click to continue</small>
            </div>
          )}
          {noticeQueue[0]?.kind === "narration" && (
            <div className="narration-notice queued-notice" role="dialog" aria-modal="true" aria-labelledby="narration-notice-title">
              <button aria-label="Continue" onClick={dismissNotice}>×</button>
              <p>UNDERMOUNTAIN</p>
              <h2 id="narration-notice-title">{noticeQueue[0].title}</h2>
              <span>{noticeQueue[0].text}</span>
              <button className="inspect-action" onClick={dismissNotice}>Continue</button>
            </div>
          )}
          {noticeQueue[0]?.kind === "achievement" && (() => {
            const achievementToast = noticeQueue[0].award;
            return (
            <div className={`achievement-toast queued-notice tier-${achievementToast.tier.toLowerCase()}`} role="status" onClick={dismissNotice}>
              <button aria-label="Dismiss achievement" onClick={(event) => { event.stopPropagation(); dismissNotice(); }}>×</button>
              <p>ACHIEVEMENT UNLOCKED</p>
              <h2>{achievementToast.title}</h2>
              <span>{units.find((unit) => unit.id === achievementToast.heroId)?.name || "A hero"} · {achievementToast.description}</span>
              <b>{achievementToast.tier} Box: {achievementToast.boxName}</b>
              <small>Click to dismiss · Open it from Boxes or the level recap.</small>
            </div>
            );
          })()}
        </div>
        {!hostWaitingForPlayerTwo && <aside className="panel command">
          {stage === "deploy" ? (
            <>
              <p className="phase">MANUAL DEPLOYMENT</p>
              <h2>{units[placing]?.name}</h2>
              <p className="hint">
                Choose any unoccupied, walkable tile. {placing + 1} of{" "}
                {units.length}
              </p>
            </>
          ) : (
            <>
              <p className="phase">
                {encounterMode === "exploration"
                  ? `EXPLORATION · ${phase.toUpperCase()}`
                  : `${phase.toUpperCase()} PHASE`}
              </p>
              <ActiveUnitHud name={active?.name} role={active?.role} hp={active?.hp || 0} maxHp={active?.maxHp || 0}
                move={infinitePlaytestMovement ? "∞" : dust2MapActive ? `${Math.round(Math.max(0, (active ? effectiveMovement(active) : 0) * (dashActive ? 2 : 1) - movementSpent) * 5)}ft` : Math.max(0, (active ? effectiveMovement(active) : 0) * (dashActive ? 2 : 1) - movementSpent)}
                elevation={dust2MapActive ? active ? dust2PositionState(active).elevationFt : 0 : undefined}
                armorClass={active ? armorClassOf(targetWithShield(active)) : 10} proficiency={proficiencyBonus(active?.level || level)}
                investigation={active ? `${skillCheckBonus(active, "Investigation") >= 0 ? "+" : ""}${skillCheckBonus(active, "Investigation")}` : "+0"}
                resources={turnResources} infiniteMovement={infinitePlaytestMovement} />
              {dust2MapActive && (
                <Dust2ObjectivePanel state={dust2Objective} roundsRemaining={dust2RoundsRemaining}
                  carrierName={units.find((unit) => unit.id === dust2Objective.flagCarrierId)?.name || "A hero"} defuserName={units.find((unit) => unit.id === dust2Objective.defusingActorId)?.name} sideLabel={dust2FreeplayMatch && dust2ActiveFaction ? `${dust2TeamSide(dust2FreeplayMatch, dust2ActiveFaction).toUpperCase()}ING` : undefined}
                  plantSite={dust2SiteUnderActive && dust2Objective.flagCarrierId === active?.id ? dust2SiteUnderActive.id : undefined}
                  canDefuse={dust2ActiveCanDefuse}
                  matchScore={dust2FreeplayMatch ? `ROUND ${dust2FreeplayMatch.round} · DUNGEONEERS ${dust2FreeplayMatch.scores.dungeoneers} — ${dust2FreeplayMatch.scores["counter-dungeoneers"]} COUNTER-DUNGEONEERS` : undefined}
                  onPlant={plantActiveDust2Flag} onDefuse={defuseActiveDust2Flag} />
              )}
              {!!chargedSpells.length && (
                <div className="intent-panel" role="status">
                  <b>CHARGED ATTACKS</b>
                  {chargedSpells.map((charge) => {
                    const source = units.find((unit) => unit.id === charge.unitId);
                    return (
                      <span key={charge.id} className={source?.team === "hero" ? "friendly" : "hostile"}>
                        <strong>{charge.name}</strong>
                        <small>{source?.name || "Unknown caster"} · fires round {charge.resolvesRound}</small>
                      </span>
                    );
                  })}
                </div>
              )}
              {(campaignScene === 3 || campaignScene === 8) && ritualSelected && (
                <div className="ritual-panel">
                  <p className="phase">RITUAL TOKEN</p>
                  <h3>
                    {ritualActive ? "Blood-Moon Rite" : "Ritual Cleansed"}
                  </h3>
                  <p className="hint">
                    {ritualActive
                      ? "At round end it heals each living werewolf for 5 HP. Its deeper curse is spreading through the forest."
                      : "The werewolves can no longer regenerate."}
                  </p>
                  {ritualActive && active?.team === "hero" && attackDist(active, ritualTile) <= 1 && (encounterMode === "exploration" || phase === "action") ? (
                    <>
                      {["Cleric", "Wizard"].includes(active.role) && (
                        <button onClick={cleanseRitual}>
                          Cleanse the Ritual{encounterMode === "combat" ? " — Spend Action" : ""}
                        </button>
                      )}
                      {!heroHasItem(active.id, "Werewolf Lycanthropy") &&
                        (firedMapEvents.includes("wolf-touch-unlocked") || heroHasItem(active.id, "Ball Cap of Bad Ideas")) && (
                        <button className="danger" onClick={acceptWolfTouch}>Accept a Fraction of the Wolf Curse</button>
                      )}
                      {heroHasItem(active.id, "Werewolf Lycanthropy") && (
                        <small>{active.name} is Wolf-Touched and can speak with dogs and wolves.</small>
                      )}
                    </>
                  ) : ritualActive ? (
                    <small>
                      Stand adjacent to interact. A Cleric or Wizard can cleanse it.
                    </small>
                  ) : null}
                </div>
              )}
              {active?.team === "hero" && phase === "move" && !vfxGalleryMode && (
                <>
                  {mapPlaytest && (
                    <div className="playtest-controls">
                      <p className="phase">{dust2MapPlaytest ? `MAP PLAYTEST · PLAYER VIEW ${playerView.viewEnabled ? "ON" : "GM"}` : "PLAYTEST MODE · NO FOG"}</p>
                      <label>
                        Teleport hero
                        <select
                          value={teleportHeroId || ""}
                          onChange={(event) => {
                            setTeleportHeroId(event.target.value);
                            setTeleportMode(false);
                          }}
                        >
                          {units.filter((unit) => unit.team === "hero" && !unit.npc).map((hero) => (
                            <option key={hero.id} value={hero.id}>{hero.name}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className={teleportMode ? "active" : "secondary"}
                        onClick={() => setTeleportMode((enabled) => !enabled)}
                      >
                        {teleportMode ? "Resume Normal Movement" : "Teleport"}
                      </button>
                    </div>
                  )}
                  <p className="hint">
                    Move in stages or hold position. Attacking ends any movement left.
                  </p>
                  <button className="secondary dash-action" disabled={dashActive} onClick={() => setDashActive(true)}>
                    {dashActive ? "Dash Active — Double Movement" : `Dash — Double Movement${encounterMode === "combat" ? " · Spends Action" : ""}`}
                  </button>
                  <button
                    className="secondary multiplayer-allowed"
                    onClick={() => setPhase("action")}
                  >
                    End Movement
                  </button>
                  {encounterMode === "exploration" && (
                    <button className="secondary" onClick={finish}>
                      Done / End Turn
                    </button>
                  )}
                </>
              )}
              {active?.team === "hero" && (phase === "action" || vfxGalleryMode) && (
                <>
                  <p className="hint">
                    {vfxGalleryMode ? chosen ? "Select the sandbag or a valid target square." : "Choose an ability to preview its effect."
                      : chosen ? chosen.kind === "skill" && active.skills[chosen.i!]?.movement === "teleport" ? "Choose a visible, unoccupied tile within 30 feet."
                        : (villageBattle || dungeonMode) && chosen.kind === "attack" ? "Click an enemy or a glowing door/window edge." : "Choose a valid target."
                        : "Choose an attack or charged ability."}
                  </p>
                  <div className={`actions ${vfxGalleryMode ? "vfx-gallery-actions" : ""}`}>
                    {!vfxGalleryMode && <button
                      className="multiplayer-allowed"
                      onClick={() => {
                        setInspect(null);
                        setInspectPoi(null);
                        setOverlapSelection(null);
                        setOpenChestId(null);
                        setChosen({ kind: "attack" });
                        setInventoryOpen(false);
                      }}
                    >
                      <b>Attack</b>
                      <small>
                        Range {activeWeapon?.range || active.range} · Damage {activeWeapon?.damage || active.attack}{hasEffect(active, "flame-arrows") && (activeWeapon?.range || active.range) > 1 ? ` · Flame Arrows +${FLAME_ARROWS_DAMAGE} fire (${flameArrowShotsRemaining(active)} left)` : ""}
                      </small>
                    </button>}
                    {!vfxGalleryMode && canTwinStrike && <button onClick={() => {
                      setChosen({ kind: "twin" });
                      setInventoryOpen(false);
                    }}>
                      <b>Twin Strike</b>
                      <small>Two attacks · {activeWeapon?.name} + {activeOffhand?.name}</small>
                    </button>}
                    {active.skills.map((q, i) => ({ q, i })).filter(({ q }) => !q.automatic).map(({ q, i }, visibleIndex, visibleSkills) => (
                      <Fragment key={`${q.galleryGroup || "ability"}:${q.name}:${i}`}>
                      {vfxGalleryMode && q.galleryGroup !== visibleSkills[visibleIndex - 1]?.q.galleryGroup && <div className="gallery-ability-heading">{q.galleryGroup || "Other"}</div>}
                      <button
                        disabled={!q.unlimited && !q.charges}
                        onClick={() => {
                          if (vfxGalleryMode) setUnits((current) => current.map((unit) => unit.id === "vfx-gallery-monster-performer" ? q.galleryActorRole ? Object.assign(spawnActor(q.galleryActorRole, unit.id, "neutral", `${q.galleryActorRole} Performer`), { x: 4, y: 2, npc: true }) : { ...unit, x: -10, y: -10 } : unit.id === "vfx-gallery-tester" && !q.galleryActorRole && q.galleryGroup && kits[q.galleryGroup] ? { ...unit, role: q.galleryGroup } : unit));
                          setWallStart(null); setChosen({ kind: "skill", i });
                          setInventoryOpen(false);
                        }}
                      >
                        <b>{q.name}</b>
                        <small>
                          {q.name === "Flame Arrows" ? `Enhancement · Next ${FLAME_ARROWS_ATTACKS} standard attacks · +${FLAME_ARROWS_DAMAGE} fire` : q.instakill ? "Instant defeat" : q.movement === "teleport" ? "Movement" : `${q.kind === "heal" ? "Healing" : "Damage"} ${q.power}`} ·
                          Range {q.name === "Flame Arrows" ? "Self" : q.name === "Wind Wall" || q.movement === "teleport" ? "30 feet" : q.unlimited ? "Unlimited" : q.range}
                          {q.area === "square"
                            ? " · 3×3 AREA"
                            : q.area === "line"
                              ? " · ANY-ANGLE LINE"
                              : ""}
                          {q.chargeRounds ? " · CHARGE 1 ROUND" : ""}
                          {q.name !== "Flame Arrows" && q.damageType ? ` · ${q.damageType.toUpperCase()}` : ""}
                          {q.knockback ? ` · PUSH ${q.knockback}` : ""}
                          {q.stunChance
                            ? ` · ${q.stunChance}% STUN`
                            : ""} · {q.name === "Flame Arrows" ? "Arms the standard Attack button" : q.movement === "teleport" ? "Ignores intervening movement" : q.kind === "heal" ? "Automatic healing" : `d20 ${attackBonusOf(active, q.accuracy ?? 0) >= 0 ? "+" : ""}${attackBonusOf(active, q.accuracy ?? 0)} attack`} · {q.dailyCharges ? `${q.charges}/${q.dailyCharges} use per day` : q.unlimited ? "∞ uses" : `${q.charges} charges`}
                        </small>
                        <small>{vfxGalleryMode && q.name === "Hellish Rebuke" ? "Automatic in combat. Select the sandbag only to force a gallery preview of the retaliation." : q.description}</small>
                      </button>
                      </Fragment>
                    ))}
                    <button className={vfxGalleryMode ? "gallery-hidden-control" : undefined}
                      onClick={() => {
                        setInventoryOpen((v) => !v);
                        setChosen(null);
                      }}
                    >
                      <b>Inventory</b>
                      <small>
                        {active.name}&apos;s items · {potions[active.id] || 0} potion
                        {(potions[active.id] || 0) === 1 ? "" : "s"}
                        {dungeonItems[active.id]?.length ? ` · ${dungeonItems[active.id].length} dungeon item${dungeonItems[active.id].length === 1 ? "" : "s"}` : ""}
                      </small>
                    </button>
                    {!vfxGalleryMode && inventoryOpen && (
                      <div className="inventory-menu">
                        <div className="equipment-slots" aria-label={`${active.name}'s equipped items`}>
                          <b>Equipped</b>
                          {([
                            ["weapon", "Main hand"], ["offhand", "Off hand"], ["armor", "Armor"],
                            ["head", "Head"], ["body", "Body"], ["accessory1", "Accessory 1"],
                            ["accessory2", "Accessory 2"], ["quick1", "Quick item 1"], ["quick2", "Quick item 2"],
                          ] as [EquipmentSlot, string][]).map(([slot, label]) => {
                            const item = equippedItems[active.id]?.[slot];
                            return <div className="equipment-slot" key={slot}>
                              <span>{label}</span>
                              <strong>{item || "Empty"}</strong>
                              {item && <button className="drop-item" onClick={() => setEquippedItems((current) => {
                                const slots = { ...(current[active.id] || {}) };
                                delete slots[slot];
                                return { ...current, [active.id]: slots };
                              })}>Unequip</button>}
                            </div>;
                          })}
                        </div>
                        {(potions[active.id] || 0) > 0 ? (
                          <button onClick={() => setInspect(active.id)}>
                            <b>Healing Potion ×{potions[active.id]}</b>
                            <small>
                              Use on yourself or inspect an adjacent ally.
                              Restores 50 HP.
                            </small>
                          </button>
                        ) : !dungeonItems[active.id]?.length ? (
                          <small>Inventory empty.</small>
                        ) : null}
                        {dungeonItems[active.id]?.map((item, i) =>
                          item === "Delver's Compass" ? (
                            <div className="inventory-treasure" key={`${item}-${i}`}>
                              <button onClick={useDelversCompass}>
                                <b>{item}</b>
                                <small>Use: points generally toward the throne hall. Unlimited uses.</small>
                              </button>
                              <button className="drop-item" onClick={() => dropDungeonItem(active.id, item, i)}>Drop</button>
                            </div>
                          ) : (
                            <div className="inventory-treasure" key={`${item}-${i}`}>
                              <b className="inventory-item-name">{getItemDefinition(item).icon && <img className="inventory-item-icon" src={getItemDefinition(item).icon} alt="" />}{item}</b>
                              <small>{describeItem(item, active.name)}</small>
                              {item === "Disguise Kit" && (
                                <div className="heart-actions">
                                  {DISGUISE_FORMS.map((form) => (
                                    <button className="drop-item" key={form} onClick={() => {
                                      setHeroDisguises((current) => ({ ...current, [active.id]: form }));
                                      setLog((lines) => [`${active.name} disguises themself as a ${form}. Ordinary enemies will let them pass.`, ...lines].slice(0, 6));
                                    }}>{heroDisguises[active.id] === form ? `Wearing: ${form}` : `Disguise as ${form}`}</button>
                                  ))}
                                  {heroDisguises[active.id] && (
                                    <button className="drop-item" onClick={() => setHeroDisguises((current) => {
                                      const next = { ...current };
                                      delete next[active.id];
                                      return next;
                                    })}>Remove Disguise</button>
                                  )}
                                </div>
                              )}
                              {getItemDefinition(item).special === "spellbook" && (
                                <button className="drop-item" onClick={() => openSpellbook(active.id)}>Learn Kelim&apos;s Shortcut</button>
                              )}
                              {getItemDefinition(item).cleanseConditions && (
                                <button className="drop-item" onClick={() => useBarOfSoap(active.id)}>Use Soap</button>
                              )}
                              {getItemDefinition(item).equipment && (() => {
                                const equipment = getItemDefinition(item).equipment!;
                                const weapon = getItemDefinition(item).weapon;
                                const slotChoices: EquipmentSlot[] = equipment.slot === "accessory" ? ["accessory1", "accessory2"] : equipment.slot === "quick" ? ["quick1", "quick2"] : [equipment.slot];
                                const equippedSlot = slotChoices.find((slot) => equippedItems[active.id]?.[slot] === item);
                                const equipped = !!equippedSlot;
                                if (weapon) {
                                  const mainEquipped = equippedItems[active.id]?.weapon === item;
                                  const offhandEquipped = equippedItems[active.id]?.offhand === item;
                                  return <div className="heart-actions">
                                    <button className="drop-item" onClick={() => setEquippedItems((current) => {
                                      const slots = { ...(current[active.id] || {}) };
                                      if (mainEquipped) delete slots.weapon;
                                      else { slots.weapon = item; if (weapon.hands === 2) delete slots.offhand; }
                                      return { ...current, [active.id]: slots };
                                    })}>{mainEquipped ? `Unequip ${item}` : `Equip ${item} — Main Hand`}</button>
                                    {weapon.hands === 1 && <button className="drop-item" onClick={() => setEquippedItems((current) => {
                                      const slots = { ...(current[active.id] || {}) };
                                      if (offhandEquipped) delete slots.offhand;
                                      else {
                                        slots.offhand = item;
                                        const mainWeapon = slots.weapon && getItemDefinition(slots.weapon).weapon;
                                        if (mainWeapon?.hands === 2) delete slots.weapon;
                                      }
                                      return { ...current, [active.id]: slots };
                                    })}>{offhandEquipped ? `Unequip ${item} — Off Hand` : `Equip ${item} — Off Hand`}</button>}
                                  </div>;
                                }
                                return (
                                  <button className="drop-item" onClick={() => setEquippedItems((current) => {
                                    const slots = { ...(current[active.id] || {}) };
                                    if (equippedSlot) delete slots[equippedSlot];
                                    else slots[slotChoices.find((slot) => !slots[slot]) || slotChoices[0]] = item;
                                    return { ...current, [active.id]: slots };
                                  })}>{equipped ? `Unequip ${item}` : `Equip ${item}`}</button>
                                );
                              })()}
                              <button className="drop-item" onClick={() => dropDungeonItem(active.id, item, i)}>Drop</button>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  {!vfxGalleryMode && <button
                    className="secondary"
                    onClick={() => setPhase("facing")}
                  >
                    Skip Action
                  </button>}
                </>
              )}
              {active?.team === "hero" && phase === "facing" && !vfxGalleryMode && (
                <>
                  <p className="hint">
                    Choose facing. Rear attacks gain advantage.
                  </p>
                  <div className="facings">
                    {(["n", "w", "e", "s"] as Facing[]).map((f) => (
                      <button onClick={() => face(f)} key={f}>
                        {faceIcon[f]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {active?.team === "hero" && encounterMode === "combat" && (
                <button className="secondary skip-turn" onClick={finish}>Done / End Turn</button>
              )}
            </>
          )}
        </aside>}
      </section>
      <footer>
        <div className="terrain-key">
          <span>Attacks: d20 + modifier vs AC</span>
          <span>Ranged high ground: +2 attack</span>
          <span>Rear attacks: advantage</span>
        </div>
        <div className="combat-log">
          {log.slice(0, 4).map((x, i) => (
            <p key={i}>{x}</p>
          ))}
        </div>
      </footer>
      {inspected && (inspected.team === "hero" || playerView.isUnitVisible(inspected)) && (
        <UnitInspectorOverlay
          unit={inspected}
          fallbackLevel={level}
          equippedWeapon={equippedItems[inspected.id]?.weapon}
          equippedOffhand={equippedItems[inspected.id]?.offhand}
          wolfTranslation={inspectedWolfTranslation}
          actions={unitInspectorActions}
          onClose={() => setInspect(null)}
        />
      )}
      {inspectPoi && (() => {
        const poi = pointsOfInterest.find((point) => point.id === inspectPoi);
        if (!poi) return null;
        const tankardOwner = partyItemOwner("Copper Tankard");
        const stoneKeyOwner = partyItemOwner("Stone-box Key");
        const panel = getPoiPanelModel(poi.id, {
          resolved: resolvedPoiSet.has(poi.id),
          activeHero: !!active && active.team === "hero" && !active.npc && !active.downed,
          activeId: active?.id,
          activeRole: active?.role,
          adjacent: !!active && attackDist(active, poi) <= 1,
          flags: new Set(firedMapEvents),
          hasBallCap: !!active && heroHasItem(active.id, "Ball Cap of Bad Ideas"),
          hasStoneBoxKey: !!stoneKeyOwner,
          hasMiningPick: !!active && heroHasItem(active.id, "Dwarven Mining Pick"),
          hasPukeRing: !!active && heroHasItem(active.id, "Ring of Puke Immunity"),
          tankardOwnerName: units.find((unit) => unit.id === tankardOwner)?.name,
          kind: poi.kind,
        });
        return (
          <div className="inspect" onClick={() => setInspectPoi(null)}>
            <div className={`panel ${panel.image && ["poster-inspection-art", "hall-hero-inspection-art", "three-lords-inspection-art"].includes(panel.image.className || "") ? "dungeon-wall-art-panel" : ""}`} onClick={(event) => event.stopPropagation()}>
              <button className="close" onClick={() => setInspectPoi(null)}>×</button>
              <p className="eyebrow">POINT OF INTEREST</p>
              <h2>{poi.name}</h2>
              {panel.image && (
                <Image
                  className={panel.image.className}
                  src={panel.image.src}
                  alt={panel.image.alt}
                  width={panel.image.width}
                  height={panel.image.height}
                  sizes="(max-width: 600px) 90vw, 560px"
                />
              )}
              <p className={panel.descriptionClassName}>{poi.text}</p>
              {panel.hint && <small>{panel.hint}</small>}
              {panel.notices.map((notice) => (
                <small className="missing-requirement" key={notice}>{notice}</small>
              ))}
              {!!panel.actions.length && (
                <div className="heart-actions">
                  {panel.actions.map((action) => (
                    <button
                      className={action.style === "secondary" ? "secondary" : "inspect-action"}
                      data-poi-action={action.id}
                      key={action.id}
                      onClick={handlePoiPanelAction}
                    >
                      {action.id === "disable-heart-acid" && stoneKeyOwner
                        ? `${action.label} — carried by ${units.find((unit) => unit.id === stoneKeyOwner)?.name || "party member"}`
                        : action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {openChestId && (() => {
        const chest = droppedDungeonItems.find((object) => object.id === openChestId && object.contents);
        if (!chest) return null;
        return (
          <div className="inspect" onClick={() => setOpenChestId(null)}>
            <div className="panel treasure-chest-panel" onClick={(event) => event.stopPropagation()}>
              <button className="close" onClick={() => setOpenChestId(null)}>×</button>
              <p className="eyebrow">TREASURE CHEST</p>
              <h2>Iron-Banded Chest</h2>
              <p>Choose what {active?.name || "the active hero"} takes. The chest remains on the map until it is empty.</p>
              <div className="heart-actions">
                {(chest.contents || []).map((item, index) => (
                  <button className="inspect-action" key={`${item}-${index}`} onClick={() => claimChestItem(chest, index)}>Take {item}</button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
function Setup({
  title,
  step,
  note,
  children,
  className = "",
}: {
  title: string;
  step: string;
  note: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`setup-shell ${className}`}>
      <header>
        <div>
          <p className="eyebrow">TACTICS OF THE SHATTERED CROWN</p>
          <h1>{title}</h1>
          <p className="setup-note">{note}</p>
        </div>
        <div className="step">
          BATTLE SETUP
          <br />
          <b>{step}</b>
        </div>
      </header>
      {children}
    </main>
  );
}
