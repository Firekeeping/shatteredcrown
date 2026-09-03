import type { ScriptedEncounterKind } from "./encounter-engine";

export type DungeonVisualTheme = "entry" | "undertaker" | "cavern" | "temple" | "flooded" | "goblin" | "arcane" | "ancient";

export type RoomActorBlueprint = {
  actorId: string;
  name?: string;
  team?: "enemy" | "neutral";
  spawn?: { x: number; y: number };
};

export type RoomEntryBlueprint = {
  radius?: number;
  presentation?: "modal" | "ambient" | "silent";
  requiresFlags?: string[];
  excludesFlags?: string[];
  encounter?: ScriptedEncounterKind;
  action?: "boss-gate" | "schoolteacher";
  triggerTiles?: { x: number; y: number }[];
};

export type RoomHazardBlueprint = {
  kind: "flood-room";
  trigger: { x: number; y: number };
  tiles: { left: number; top: number; width: number; height: number };
  barrier: { id: string; name: string; x: number; y: number; hp: number; maxHp: number; kind: "door" };
  baseDamage: number;
};

export type DungeonRoomBlueprint = {
  id: string;
  title: string;
  description: string;
  theme: DungeonVisualTheme;
  actors?: RoomActorBlueprint[];
  rewards?: { items: string[]; presentation?: "loose" | "chest" };
  entry: RoomEntryBlueprint;
  scenery?: string[];
  bubble?: string;
  hazard?: RoomHazardBlueprint;
  arrival?: { starts: { x: number; y: number }[]; line: string; stepMs?: number };
};

type RoomContent = Omit<DungeonRoomBlueprint, "id" | "theme" | "entry" | "actors" | "rewards"> & {
  monsters?: string[];
  loot?: string[];
};

// Level 1 is deliberately translated into the systems this game supports:
// arrival text, local encounters, and character-owned loot.
const ROOM_CONTENT: Record<string, RoomContent> = {
  "1": { title: "Entry Well", description: "Cold air rises from the well. A silent brass projector overlooks the landing.", bubble: "So this is Undermountain." },
  "2a": { title: "Western Hall", description: "A bare corridor bends west between several branching passages." },
  "2b": { title: "Broken Pillar Toll", description: "Two armed bugbears step from behind broken pillars and block the hall.", monsters: ["Bugbear", "Bugbear"], bubble: "Move. We're coming through." },
  "5": { title: "Grell Hideout", description: "Five pillars of fused bones rise beneath a ceiling lost in shadow.", monsters: ["Grell", "Grell"], bubble: "Something above the pillars is breathing." },
  "6a": { title: "Hall of Three Lords", description: "Three noble faces stare from a circular wall relief. One covers his mouth.", loot: ["Undertaker Coin Purse"] },
  "6c": { title: "The Extremely Secret Club", description: "Violet light, velvet furniture, theatrical chains, and deafening rave music fill one absurdly large hidden club.", monsters: ["Club Hostess", "Club Hostess", "Club Hostess", "Club Hostess"], loot: ["Dwarven Signet Ring", "Stone-box Key"] },
  "6e": { title: "Secret Door", description: "The disguised stone panel now stands open." },
  "7a": { title: "Empty Passage", description: "Pale mounting marks show where something once hung." },
  "7b": { title: "Crypt", description: "A weathered coffin rests beneath a film of grave dust.", loot: ["Holy Water"] },
  "8a": { title: "Outer Chamber", description: "Old bones lie scattered across the threshold." },
  "8b": { title: "Harria's Room", description: "A severe dwarf woman watches from a theatrical storeroom beside her hulking stitched servant.", monsters: ["Harria", "Flesh Golem"], loot: ["Disguise Kit"] },
  "11": { title: "Room of Secrets", description: "A corroded throne sits beneath a green copper helm.", loot: ["Delver's Compass"] },
  "12": { title: "Hall of Heroes", description: "Four elaborate portraits and a dark mirror line one wall." },
  "14b": { title: "Heart in a Box", description: "A petrified four-armed creature holds a stone box beneath a motionless sheet of green liquid." },
  "15": { title: "Armory", description: "Rotten weapon racks sag against the walls.", loot: ["Handaxe"] },
  "16": { title: "Manticore Den", description: "Theatrical lights illuminate a raised stage and three waiting manticores.", monsters: ["Manticore", "Manticore", "Manticore"] },
  "17b": { title: "Desecrated Temple", description: "Dark stone swallows the light around petrified explorers. Something scaled is breathing in the gloom.", monsters: ["Black Dragon"] },
  "18": { title: "Troll's Den", description: "A broad troll squats among gnawed bones and watches the doorway.", monsters: ["Troll"], loot: ["Trollblood Flask"] },
  "19a": { title: "Servants' Feast Hall", description: "Long tables sag beneath heaps of impossibly fresh meat.", loot: ["Fresh Meat"] },
  "19b": { title: "Guards' Feast Hall", description: "Dust blankets abandoned tables and benches.", loot: ["Copper Tankard"] },
  "19c": { title: "Nobles' Feast Hall", description: "Flour lines and empty plates surround a long table. Something moves beneath it.", monsters: ["Dwarf Survivor"] },
  "23c": { title: "The Last Camp", description: "Three delvers celebrate around a strangely cold fire. Their mugs never seem to empty.", monsters: ["Spectral Delver", "Spectral Delver", "Spectral Delver"] },
  "24a": { title: "Dweomercore Remedial Classroom", description: "Battered student desks face a cracked board crowded with impossible spell diagrams." },
  "24b": { title: "Nimraith's Academic Suspension", description: "A tiefling mage hangs in the detention alcove like a marionette. The strings twitch as anyone approaches." },
  "25a": { title: "Dead Goblin", description: "A goblin corpse lies beside abandoned digging tools.", loot: ["Dwarven Mining Pick"] },
  "26a": { title: "Clean Stone Hall", description: "The corridor is unnaturally spotless." },
  "26b": { title: "Empty Closet", description: "The stone closet is completely empty." },
  "26c": { title: "Ooze Your Janitor?", description: "A transparent shape rounds the spotless corner.", monsters: ["Gelatinous Cube"] },
  "28a": { title: "Bugbear Watch Post", description: "Two bugbear guards abandon their posts and reach for their weapons.", monsters: ["Bugbear", "Bugbear"] },
  "28b": { title: "Obelisk of the Eye", description: "A black stone obelisk carved with an open eye watches the alcove." },
  "28d": { title: "The Hinged Floor", description: "The final floor slab sits too perfectly within the dust." },
  "29": { title: "Empty Watch Hall", description: "Old mounting holes scar the empty corridor." },
  "30": { title: "Mad Elemental", description: "Wind screams through the zigzag hall.", monsters: ["Air Elemental"], bubble: "The wind is choosing where to throw us." },
  "31": { title: "Delvers' Hall", description: "Dusty dwarf statues face one another across a stripped chamber." },
  "32a": { title: "Steam Hall", description: "Warm mist rolls through a cracked dwarven washroom." },
  "32b": { title: "Dwarven Bath", description: "Steam curls from an ancient stone basin." },
  "33": { title: "Drowned Barracks", description: "Condensation beads across sealed stonework. The chamber is unnaturally watertight." },
  "34": { title: "Dwarven Pantry", description: "Produce crates, grain sacks, bread, cheese, and small provision barrels fill the compact pantry." },
  "35": { title: "Hall of Rats", description: "Dozens of red eyes watch from beneath broken furniture.", monsters: ["Flyndol", "Giant Rat", "Giant Rat", "Giant Rat", "Giant Rat", "Giant Rat", "Giant Rat"] },
  "36a": { title: "Gricks!", description: "Debris shifts in the collapsed hall.", monsters: ["Grick", "Grick"], bubble: "Those stones have beaks." },
  "36b": { title: "Trapped Fellow", description: "A frightened voice calls from behind a closet door. Something scratches from the other side.", monsters: ["Grick", "Grick", "Grick", "Grick", "Grick"] },
  "36c": { title: "Upside-Down Throne", description: "An upside-down throne clings to the ceiling above a mound of rubble.", monsters: ["Grick Alpha"] },
  "37": { title: "Map Room", description: "A wall carving charts twenty-three descending levels. Singing echoes from somewhere below.", monsters: ["Dwarf Survivor"] },
  "38": { title: "Goblin Passage", description: "Boot prints and goblin tracks cross the corridor." },
  "39a": { title: "The Final Practical", description: "A colossal empty throne faces the hall. Dark crown-runes trace its arms.", monsters: ["Ettin"] },
  "39c": { title: "Goblin Hall", description: "Two starving goblins guard a few scraps beside the body of one of their own. One wears the dungeon's least convincing armor.", monsters: ["Goblin", "Goblin"] },
  "40": { title: "Fearful Mimicry", description: "The southern display stands silent.", monsters: ["Large Mimic"] },
  "41": { title: "The First Rule", description: "A bare bulb swings above a chalked square. Bruised men crowd the damp basement walls while one fighter waits in the ring.", monsters: ["Tyler Durden", "The Narrator", "Fight Club Regular", "Fight Club Regular", "Fight Club Regular", "Fight Club Regular", "Fight Club Regular", "Fight Club Regular"], loot: ["Bar of Soap"] },
};

const SILENT_ROOM_ENTRIES = new Set(["2a", "6e", "7a", "8a", "26a", "26b", "29", "31", "38", "40"]);
const AMBIENT_ROOM_ENTRIES = new Set(["6a", "7b", "11", "12", "14b", "15", "19a", "19b", "24b", "25a", "28b", "28d", "32a", "32b", "34"]);

const presentationForRoom = (id: string): RoomEntryBlueprint["presentation"] =>
  SILENT_ROOM_ENTRIES.has(id) ? "silent" : AMBIENT_ROOM_ENTRIES.has(id) ? "ambient" : "modal";

const THEME_ROOMS: Record<DungeonVisualTheme, readonly string[]> = {
  entry: ["1", "2a", "2b"],
  undertaker: ["6a", "6c", "6e", "7a", "7b", "8a", "8b"],
  cavern: ["5", "16", "18", "25a", "35", "36a", "36b", "36c", "41"],
  temple: ["12", "17b", "39a", "40"],
  flooded: ["21", "32a", "32b"],
  goblin: ["28a", "28b", "28d", "38", "39c"],
  arcane: ["14b", "24a", "24b", "26a", "26b", "26c", "29", "30", "37"],
  ancient: [],
};

const themeForRoom = (id: string): DungeonVisualTheme =>
  (Object.entries(THEME_ROOMS).find(([, roomIds]) => roomIds.includes(id))?.[0] as DungeonVisualTheme | undefined) || "ancient";

const ENCOUNTERS: Partial<Record<string, ScriptedEncounterKind>> = {
  "2b": "pillar-bugbears",
  "5": "grell-hideout",
  "6c": "secret-club",
  "8b": "undertakers-harria",
  "16": "manticore-show",
  "18": "troll",
  "19c": "paranoid-dwarf",
  "23c": "spectral-camp",
  "35": "flyndol",
  "37": "halleth-bard",
  "39c": "starving-goblins",
};

const ENTRY_OVERRIDES: Partial<Record<string, RoomEntryBlueprint>> = {
  // Keep the quiet Western Hall marker from claiming the deserters' doorway.
  "2a": { radius: 0, triggerTiles: [{ x: 15, y: 60 }] }, // P61
  "2b": { radius: 0, triggerTiles: [{ x: 12, y: 59 }, { x: 12, y: 60 }], encounter: "pillar-bugbears" }, // M60/M61
  "5": { radius: 0, triggerTiles: [{ x: 5, y: 48 }, { x: 5, y: 50 }, { x: 6, y: 49 }], encounter: "grell-hideout" }, // F49/F51/G50
  "6c": { radius: 0, triggerTiles: [{ x: 14, y: 46 }], requiresFlags: ["undertaker-secret-door-open"], encounter: "secret-club" }, // O47, immediately inside the opened wall
  "6e": { requiresFlags: ["undertaker-secret-door-open"] },
  "8b": {
    radius: 0,
    // Catch both legal approaches: the north passage at K32/K33 and the
    // eastern doorway at M34/M35. K33 alone was too deep inside the room.
    triggerTiles: [{ x: 10, y: 31 }, { x: 10, y: 32 }, { x: 12, y: 33 }, { x: 12, y: 34 }],
    excludesFlags: ["undertaker-hostile-8b"],
    encounter: "undertakers-harria",
  },
  "16": { radius: 0, triggerTiles: [{ x: 20, y: 25 }, { x: 20, y: 26 }, { x: 20, y: 27 }], encounter: "manticore-show" }, // U26-U28
  "17b": { radius: 0, triggerTiles: [{ x: 21, y: 39 }] }, // V40: reveal the sleeping wyrmling without waking it
  "18": { radius: 0, triggerTiles: [{ x: 26, y: 22 }, { x: 26, y: 24 }, { x: 27, y: 23 }], excludesFlags: ["troll-hostile"], encounter: "troll" }, // AA23/AA25/AB24
  "19c": { radius: 0, triggerTiles: [{ x: 26, y: 48 }], encounter: "paranoid-dwarf" }, // AA49 doorway
  "23c": { radius: 0, triggerTiles: [{ x: 8, y: 70 }], encounter: "spectral-camp" }, // I71
  "24a": { action: "schoolteacher" },
  "35": { radius: 0, triggerTiles: [{ x: 26, y: 64 }, { x: 26, y: 66 }, { x: 27, y: 65 }], excludesFlags: ["flyndol-hostile"], encounter: "flyndol" }, // AA65/AA67/AB66
  "37": { radius: 0, triggerTiles: [{ x: 19, y: 85 }, { x: 21, y: 85 }, { x: 19, y: 92 }, { x: 20, y: 92 }], encounter: "halleth-bard" }, // T86/V86/T93/U93 entrances
  "39a": { action: "boss-gate" },
  "39c": { radius: 0, triggerTiles: [{ x: 23, y: 86 }, { x: 23, y: 88 }], excludesFlags: ["starving-goblins-hostile"], encounter: "starving-goblins" }, // X87/X89
  "40": { requiresFlags: ["mimic-triggered"] },
  "41": { radius: 0, triggerTiles: [{ x: 28, y: 100 }], encounter: "fight-club" }, // AC101, western entrance
};

const SPAWNS: Partial<Record<string, { x: number; y: number }[]>> = {
  "17b": [{ x: 20, y: 48 }], // U49, with the sleeping sprite extending across U50
  "2b": [{ x: 11, y: 58 }, { x: 12, y: 58 }],
  "5": [{ x: 5, y: 47 }, { x: 6, y: 47 }],
  "8b": [{ x: 9, y: 32 }, { x: 10, y: 32 }],
  "16": [{ x: 21, y: 28 }, { x: 23, y: 28 }, { x: 22, y: 26 }],
  // Keep I71 clear as the room's walk-in lane; the first camper stands beside
  // their corpse rather than occupying the threshold.
  "23c": [{ x: 9, y: 70 }, { x: 9, y: 71 }, { x: 8, y: 72 }],
  "37": [{ x: 20, y: 86 }],
  "39c": [{ x: 23, y: 87 }, { x: 23, y: 88 }],
  "39a": [{ x: 21, y: 100 }],
  "40": [{ x: 26, y: 81 }],
  "41": [
    { x: 33, y: 98 }, // Tyler at HH99, alone in the ring
    { x: 29, y: 100 }, // Narrator, speaking from its edge
    { x: 29, y: 96 }, { x: 31, y: 96 }, { x: 34, y: 96 },
    { x: 35, y: 98 }, { x: 34, y: 101 }, { x: 30, y: 101 },
  ],
};

const ACTOR_NAMES: Partial<Record<string, string[]>> = {
  "2b": ["Pillar Bugbear", "Pillar Bugbear"],
  "6c": ["Countess Velvet", "Lady Fangirl", "Mistress Maybe", "DJ Bitey"],
  "19c": ["Gromm, Paranoid Survivor"],
  "39c": ["Goblin in a White Shirt", "Hungry Goblin"],
  "23c": ["Brell, Expedition Leader", "Marda, Celebrant", "Osric, Cartographer"],
  "37": ["Halleth"],
  "41": ["Tyler Durden", "The Narrator", "Club Regular", "Club Regular", "Club Regular", "Club Regular", "Club Regular", "Club Regular"],
};

const SCENERY: Partial<Record<string, string[]>> = {
  "28b": ["discarded-bathrobe"],
  "5": ["bone-pillars"],
  "7b": ["crypt-coffin"],
  "15": ["ruined-armory"],
  "19a": ["fresh-meat-table"],
  "19b": ["dusty-feast-table"],
  "23c": ["failed-expedition-camp"],
  "25a": ["excavation-corpse"],
};

export const ROOM_BLUEPRINTS: Record<string, DungeonRoomBlueprint> = Object.fromEntries(
  Object.entries(ROOM_CONTENT).map(([id, room]) => {
    const spawns = SPAWNS[id] || [];
    const encounter = ENCOUNTERS[id];
    return [id, {
      id,
      title: room.title,
      description: room.description,
      theme: themeForRoom(id),
      actors: room.monsters?.map((actorId, index) => ({
        actorId,
        name: ACTOR_NAMES[id]?.[index],
        spawn: spawns[index],
        team: id === "16" || id === "23c" ? "neutral" : "enemy",
      })),
      rewards: room.loot?.length ? {
        items: room.loot,
        presentation: room.loot.length > 1 ? "chest" : "loose",
      } : undefined,
      entry: { radius: 2, presentation: presentationForRoom(id), ...(encounter ? { encounter } : {}), ...ENTRY_OVERRIDES[id] },
      scenery: SCENERY[id],
      bubble: room.bubble,
      hazard: id === "33" ? {
        kind: "flood-room",
        trigger: { x: 34, y: 62 }, // AI63
        tiles: { left: 33, top: 61, width: 3, height: 3 }, // AH62-AJ64
        barrier: { id: "room-33-floodgate", name: "sealed floodgate", x: 33, y: 62, hp: 40, maxHp: 40, kind: "door" }, // AH63
        baseDamage: 8,
      } : undefined,
      arrival: id === "2b" ? {
        starts: [{ x: 8, y: 58 }, { x: 9, y: 58 }], // I59/J59
        line: "Easy! We're running off, not running at you!",
        stepMs: 240,
      } : undefined,
    } satisfies DungeonRoomBlueprint];
  }),
);

export const getRoomBlueprint = (id: string) => ROOM_BLUEPRINTS[id];

/** @deprecated Use ROOM_BLUEPRINTS. Kept temporarily for save/build compatibility. */
export const DUNGEON_ROOMS = ROOM_BLUEPRINTS;
