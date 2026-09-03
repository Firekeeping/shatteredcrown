export type RegressionProbe =
  | { kind: "any"; probes: readonly RegressionProbe[] }
  | { kind: "flag"; value: string }
  | { kind: "flag-prefix"; value: string }
  | { kind: "resolved-poi"; value: string }
  | { kind: "discovered-poi"; value: string }
  | { kind: "item"; value: string }
  | { kind: "dropped-item"; value: string }
  | { kind: "learned-skill"; value: string }
  | { kind: "achievement-prefix"; value: string }
  | { kind: "no-achievement-prefix"; value: string }
  | { kind: "route"; value: string }
  | { kind: "map-completion"; value: string; minimum: number }
  | { kind: "campaign-scene"; value: number };

export type RegressionCheckpoint = {
  id: string;
  group: string;
  area: string;
  setup: string;
  action: string;
  probes: readonly RegressionProbe[];
  manual?: string;
  target?: { x: number; y: number };
  approach?: { x: number; y: number };
};

export type RegressionSnapshot = {
  flags: ReadonlySet<string>;
  resolvedPoi: ReadonlySet<string>;
  discoveredPoi: ReadonlySet<string>;
  itemNames: ReadonlySet<string>;
  droppedItemIds: ReadonlySet<string>;
  learnedSkillNames: ReadonlySet<string>;
  achievementIds: ReadonlySet<string>;
  route: string | null;
  mapCompletions: Readonly<Record<string, number>>;
  campaignScene: number;
};

export const regressionProbeSatisfied = (probe: RegressionProbe, snapshot: RegressionSnapshot) => {
  switch (probe.kind) {
    case "any": return probe.probes.some((candidate) => regressionProbeSatisfied(candidate, snapshot));
    case "flag": return snapshot.flags.has(probe.value);
    case "flag-prefix": return [...snapshot.flags].some((flag) => flag.startsWith(probe.value));
    case "resolved-poi": return snapshot.resolvedPoi.has(probe.value);
    case "discovered-poi": return snapshot.discoveredPoi.has(probe.value);
    case "item": return snapshot.itemNames.has(probe.value);
    case "dropped-item": return snapshot.droppedItemIds.has(probe.value);
    case "learned-skill": return snapshot.learnedSkillNames.has(probe.value);
    case "achievement-prefix": return [...snapshot.achievementIds].some((id) => id.startsWith(probe.value));
    case "no-achievement-prefix": return ![...snapshot.achievementIds].some((id) => id.startsWith(probe.value));
    case "route": return snapshot.route === probe.value;
    case "map-completion": return (snapshot.mapCompletions[probe.value] || 0) >= probe.minimum;
    case "campaign-scene": return snapshot.campaignScene === probe.value;
  }
};

export const checkpointAutomated = (checkpoint: RegressionCheckpoint, snapshot: RegressionSnapshot) =>
  checkpoint.probes.length > 0 && checkpoint.probes.every((probe) => regressionProbeSatisfied(probe, snapshot));

/**
 * Executable Level 1 QA contract. The in-game runner stages a hero beside a
 * target but never resolves the last step, dialogue choice, combat, or reward.
 */
export const LEVEL_ONE_REGRESSION_CHECKPOINTS: readonly RegressionCheckpoint[] = [
  { id: "forest-guard", group: "Tutorial", area: "Opening Woods", setup: "Win the first fight", action: "Approach the missing guard and finish the hat conversation", probes: [], manual: "The guard opens once, the dialogue can be resumed, and the hat choice completes." },
  { id: "village-saved", group: "Tutorial", area: "Village", setup: "Defend both waves", action: "Leave after the final cheer", probes: [{ kind: "map-completion", value: "village_defense", minimum: 1 }] },
  { id: "village-abandoned", group: "Tutorial", area: "Village", setup: "Decline the defense", action: "Reach the bridge on the abandoned-village route", probes: [{ kind: "route", value: "abandoned_village_for_bridge" }] },
  { id: "bridge-peace", group: "Bridge", area: "Bridge", setup: "Reach the toll collectors", action: "Resolve the toll without combat", probes: [{ kind: "flag", value: "bridge-bandits-cleared" }], manual: "The correct saved-village line is present and the toll projector sign remains readable." },
  { id: "bridge-failed-bluff", group: "Bridge", area: "Bridge", setup: "Arrive after abandoning the village", action: "Lie about the wizard and confirm combat begins", probes: [], manual: "The failed bluff enters combat once and the Swordsman portrait is centered on his face." },
  { id: "bridge-cache", group: "Bridge", area: "Bridge", setup: "Resolve the collectors peacefully", action: "Open the roadside cache", probes: [{ kind: "resolved-poi", value: "bridge-supply-cache" }] },
  { id: "bugbears", group: "Dungeon social", area: "Room 2b", setup: "Stage west of M60", action: "Take the final step and resolve the bugbear branch", probes: [{ kind: "flag", value: "encounter-complete:2b" }], target: { x: 12, y: 59 }, approach: { x: 11, y: 59 } },
  { id: "grell", group: "Dungeon combat", area: "Room 5", setup: "Stage west of F49", action: "Enter and defeat the Grell encounter", probes: [{ kind: "flag", value: "encounter-complete:5" }], target: { x: 5, y: 48 }, approach: { x: 4, y: 48 } },
  { id: "three-lords", group: "Dungeon puzzle", area: "Room 6", setup: "Reach the Three Lords relief", action: "Turn the silent lord", probes: [{ kind: "flag", value: "undertaker-secret-door-open" }], target: { x: 14, y: 46 }, approach: { x: 13, y: 46 } },
  { id: "secret-club", group: "Dungeon social", area: "Room 6c", setup: "Open the Three Lords door", action: "Enter and complete the club route", probes: [{ kind: "flag", value: "undertaker-club-tour-complete" }], manual: "Normal and alarmed arrivals each open exactly once.", target: { x: 14, y: 46 }, approach: { x: 13, y: 46 } },
  { id: "harria", group: "Dungeon social", area: "Room 8b", setup: "Stage north of K32", action: "Resolve Harria through payment, seal, golem, or combat", probes: [{ kind: "flag", value: "encounter-complete:8b" }], target: { x: 10, y: 31 }, approach: { x: 10, y: 30 } },
  { id: "manticore", group: "Dungeon combat", area: "Room 16", setup: "Stage north of U26", action: "Answer all three judges and finish the show", probes: [{ kind: "flag", value: "manticore-den-intro-complete" }, { kind: "flag", value: "encounter-complete:16" }, { kind: "flag", value: "manticore-show-must-go-on-awarded" }], manual: "The room card dismisses before the show begins and each question remains readable.", target: { x: 20, y: 25 }, approach: { x: 20, y: 24 } },
  { id: "troll", group: "Dungeon social", area: "Room 18", setup: "Stage west of AA23", action: "Feed, bargain with, or fight the troll", probes: [{ kind: "flag", value: "encounter-complete:18" }], target: { x: 26, y: 22 }, approach: { x: 25, y: 22 } },
  { id: "gromm-safe", group: "Dungeon social", area: "Room 19c", setup: "Collect flour at II67 and meet Gromm", action: "Complete the correct ward", probes: [{ kind: "flag", value: "flour-ghost-trapped" }, { kind: "flag", value: "dungeon-edited-flour-ward" }, { kind: "flag", value: "encounter-complete:19c" }], target: { x: 26, y: 48 }, approach: { x: 25, y: 48 } },
  { id: "gromm-bad", group: "Dungeon social", area: "Room 19c", setup: "Meet Gromm without completing the ward correctly", action: "Spawn the ghost and let it cross the circle before eating Gromm", probes: [{ kind: "flag", value: "flour-ghost-empowered" }], manual: "The ghost starts in the circle, walks to Gromm at readable pacing, and eats him whole.", target: { x: 26, y: 48 }, approach: { x: 25, y: 48 } },
  { id: "last-camp", group: "Dungeon social", area: "Room 23c", setup: "Stage west of I71", action: "Resolve the spectral camp and throne clue", probes: [{ kind: "flag", value: "last-camp-solved" }, { kind: "flag", value: "last-camp-throne-revelation" }], target: { x: 8, y: 70 }, approach: { x: 7, y: 70 } },
  { id: "vale-pass", group: "Dungeon social", area: "Room 24a", setup: "Cross the H76 classroom doorway", action: "Answer all questions correctly", probes: [{ kind: "flag", value: "school-class-started" }, { kind: "flag", value: "school-diploma-earned" }], target: { x: 7, y: 75 }, approach: { x: 7, y: 74 } },
  { id: "vale-wrong", group: "Dungeon social", area: "Room 24a", setup: "Start Professor Vale's class", action: "Give one wrong answer and continue with the next student", probes: [{ kind: "flag", value: "school-grin-teased" }], manual: "Vale flashes back and forth before shifting; the next question begins without freezing.", target: { x: 7, y: 75 }, approach: { x: 7, y: 74 } },
  { id: "vale-combat", group: "Dungeon combat", area: "Room 24a", setup: "Make the class hostile", action: "Survive the class fight and receive the diploma", probes: [{ kind: "flag", value: "school-nightmare" }, { kind: "flag", value: "schoolteacher-hostile" }, { kind: "flag", value: "school-diploma-earned" }], target: { x: 7, y: 75 }, approach: { x: 7, y: 74 } },
  { id: "flyndol", group: "Dungeon social", area: "Room 35", setup: "Stage west of AA65", action: "Resolve Flyndol through dialogue or combat", probes: [{ kind: "flag", value: "encounter-complete:35" }], target: { x: 26, y: 64 }, approach: { x: 25, y: 64 } },
  { id: "kelim-rescue", group: "Dungeon rescue", area: "Rooms 36b and 36c", setup: "Cross Y74, clear the Gricks, then click FF74", action: "Release Kelim onto a safe route", probes: [{ kind: "flag", value: "kelim-rescued" }, { kind: "resolved-poi", value: "kelim-closet" }, { kind: "achievement-prefix", value: "rescue-kelim:" }, { kind: "any", probes: [{ kind: "item", value: "Kelim's Spellbook" }, { kind: "learned-skill", value: "Kelim's Shortcut" }] }], manual: "Kelim pleads above the door, walks out, thanks the party, and remains alive.", target: { x: 24, y: 73 }, approach: { x: 23, y: 73 } },
  { id: "kelim-death", group: "Dungeon rescue", area: "Rooms 36b and 36c", setup: "Leave a spawned or latent Grick on Kelim's route", action: "Open FF74 and watch the full attack", probes: [{ kind: "flag", value: "kelim-eaten" }, { kind: "flag-prefix", value: "kelim-corpse@" }, { kind: "dropped-item", value: "kelim-corpse-spellbook" }, { kind: "no-achievement-prefix", value: "rescue-kelim:" }], manual: "The camera follows Kelim, his scream appears in the dark, and his body remains.", target: { x: 31, y: 73 }, approach: { x: 30, y: 73 } },
  { id: "guardian", group: "Dungeon patrol", area: "M63 corridor", setup: "Cross M63 three separate times", action: "Let all three patrols finish", probes: [{ kind: "flag", value: "wandering-guardian-pass-1-complete" }, { kind: "flag", value: "wandering-guardian-pass-2-complete" }, { kind: "flag", value: "wandering-guardian-pass-3-complete" }, { kind: "flag", value: "wandering-guardian-complete" }, { kind: "achievement-prefix", value: "wandering-guardian:" }], manual: "Each pass keeps its current text visible until the guardian leaves.", target: { x: 12, y: 62 }, approach: { x: 11, y: 62 } },
  { id: "flood", group: "Dungeon traps", area: "Room 33", setup: "Stage west of AI63", action: "Enter, survive rising water, and break the AH63 gate", probes: [{ kind: "flag", value: "room-33-flood-active" }, { kind: "flag", value: "room-33-flood-drained" }], target: { x: 34, y: 62 }, approach: { x: 33, y: 62 } },
  { id: "secret-grate", group: "Dungeon secrets", area: "Q70 and JJ64", setup: "Inspect either matching grate", action: "Travel through the secret passage", probes: [{ kind: "flag", value: "sewer-flood-secret-discovered" }], target: { x: 16, y: 69 }, approach: { x: 15, y: 69 } },
  { id: "bomb-reset", group: "Dungeon traps", area: "J64 nuke room", setup: "Enter I63-K65 without disabling the device", action: "Leave its radius and survive the room-wide blast", probes: [{ kind: "flag", value: "proximity-bomb-reset" }], manual: "The green nuke drops onto the platform and its explosion fills the entire room.", target: { x: 9, y: 63 }, approach: { x: 8, y: 65 } },
  { id: "bomb-disable", group: "Dungeon traps", area: "J64 nuke room", setup: "Bring a Rogue to the platform", action: "Disable and collect the bomb", probes: [{ kind: "resolved-poi", value: "proximity-bomb" }, { kind: "item", value: "Stolen Proximity Bomb" }], target: { x: 9, y: 63 }, approach: { x: 8, y: 63 } },
  { id: "pit-rogue", group: "Dungeon traps", area: "Room 28d", setup: "Approach W76 with a Rogue", action: "Mark the hinged floor without falling", probes: [{ kind: "discovered-poi", value: "spiked-pit-28d" }], target: { x: 22, y: 75 }, approach: { x: 21, y: 75 } },
  { id: "pit-fall", group: "Dungeon traps", area: "Room 28d", setup: "Approach W76 with a non-Rogue", action: "Trigger the pit and verify outside rescue is required", probes: [{ kind: "flag", value: "spiked-pit-28d-triggered" }], manual: "Only a Rogue can escape without outside help.", target: { x: 22, y: 75 }, approach: { x: 21, y: 75 } },
  { id: "halleth", group: "Dungeon rescue", area: "Room 37", setup: "Enter through T86, V86, T93, or U93", action: "Hear the opening song, then break or pick the U87 bars", probes: [{ kind: "flag", value: "halleth-bard-met" }, { kind: "flag", value: "halleth-rescued" }, { kind: "flag", value: "halleth-guided-route" }], manual: "The song starts only after the room card is dismissed and the conversation can be resumed.", target: { x: 19, y: 85 }, approach: { x: 18, y: 85 } },
  { id: "goblins-peace", group: "Dungeon social", area: "Room 39c", setup: "Stage west of X87", action: "Use food or the hat option and finish peacefully", probes: [{ kind: "flag", value: "encounter-complete:39c" }], manual: "The hat option appears when equipped and both goblins speak before leaving.", target: { x: 23, y: 86 }, approach: { x: 22, y: 86 } },
  { id: "goblins-combat", group: "Dungeon combat", area: "Room 39c", setup: "Stage west of X89", action: "Choose hostility and finish combat", probes: [{ kind: "flag", value: "starving-goblins-hostile" }, { kind: "flag", value: "encounter-complete:39c" }], target: { x: 23, y: 88 }, approach: { x: 22, y: 88 } },
  { id: "avada-shirt", group: "Final boss", area: "Room 39a", setup: "Equip the Wife-Beater before entering T98, V98, or W98", action: "Start the king fight", probes: [{ kind: "flag", value: "wife-beater-killing-curse" }, { kind: "achievement-prefix", value: "boy-who-lived:" }], manual: "The wearer is targeted, drops to 1 HP, enters Rage, and the spell fires exactly once.", target: { x: 21, y: 97 }, approach: { x: 21, y: 96 } },
  { id: "avada-party", group: "Final boss", area: "Room 39a", setup: "Remove the Wife-Beater before entering", action: "Start the king fight", probes: [{ kind: "flag", value: "wife-beater-killing-curse" }, { kind: "no-achievement-prefix", value: "boy-who-lived:" }], manual: "A party member is downed and combat continues without duplicate boss initiative.", target: { x: 21, y: 97 }, approach: { x: 21, y: 96 } },
  { id: "boss-defeat", group: "Final boss", area: "Room 39a", setup: "Engage the Two-Headed King", action: "Defeat both initiative heads", probes: [{ kind: "flag", value: "two-headed-king-engaged" }, { kind: "flag", value: "two-headed-king-defeated" }], manual: "Spell and bruiser heads share one body and one HP pool.", target: { x: 21, y: 100 }, approach: { x: 21, y: 97 } },
  { id: "throne-recap", group: "Final boss", area: "V103 throne", setup: "Defeat the king", action: "Claim the throne, open rewards, and continue", probes: [{ kind: "flag", value: "level-one-complete" }, { kind: "campaign-scene", value: 9 }, { kind: "route", value: "undermountain_level_2" }], manual: "The Level 1 recap appears before Level 2 and every earned box can be opened.", target: { x: 21, y: 102 }, approach: { x: 21, y: 101 } },
] as const;

export const LEVEL_ONE_DEFERRED_WRITING: readonly string[] = [];

export const LEVEL_ONE_PRESENTATION_INVARIANTS = [
  "Authored dialogue uses the portrait panel and explicit Continue.",
  "Transient overhead barks are restricted to combat and short status calls.",
  "Room descriptions remain visible until dismissed and preserve map zoom.",
  "No LOOK UP marking or warning exists in Room 28d.",
  "Halaster does not comment on bridge traps.",
  "Level 1 never states that the dungeon or its systems are sentient.",
] as const;
