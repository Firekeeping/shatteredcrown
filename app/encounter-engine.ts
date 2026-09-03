export type ScriptedEncounterKind =
  | "bridge-bandits"
  | "flyndol"
  | "troll"
  | "paranoid-dwarf"
  | "manticore-show"
  | "starving-goblins"
  | "pillar-bugbears"
  | "grell-hideout"
  | "spectral-camp"
  | "secret-club"
  | "fight-club"
  | "halleth-bard"
  | "undertakers-harria";

export const HOSTILE_FLAG_BY_ENCOUNTER_GROUP: Partial<Record<string, string>> = {
  "6c": "undertaker-hostile-6c",
  "8b": "undertaker-hostile-8b",
  "18": "troll-hostile",
  "35": "flyndol-hostile",
  "39c": "starving-goblins-hostile",
};

export type EncounterRequirement =
  | { kind: "hero-item"; item: string }
  | { kind: "party-item"; item: string }
  | { kind: "hero-class"; role: string }
  | { kind: "hero-archetype"; archetype: "spellcaster" }
  | { kind: "investigation"; minimum: number }
  | { kind: "flag-present"; flag: string }
  | { kind: "flag-absent"; flag: string };

export type EncounterEffect =
  | { kind: "bubble"; text: string; speaker: "hero" | "npc" | "npc-2" | "npc-3" | "golem" }
  | { kind: "narration"; title: string; text: string }
  | { kind: "log"; text: string }
  | { kind: "consume-hero-item"; item: string }
  | { kind: "consume-party-item"; item: string }
  | { kind: "grant-hero-item"; item: string }
  | { kind: "grant-skill-proficiency"; proficiency: SkillProficiency }
  | { kind: "choose-goblin-shirt" }
  | { kind: "secret-club-tour"; stations: readonly ClubTourStation[]; completion: SecretClubTourCompletion }
  | { kind: "award-peace-xp" }
  | { kind: "set-flag"; flag: string }
  | { kind: "clear-flag"; flag: string }
  | { kind: "reopen-encounter"; text: string; speaker?: "npc" | "golem" }
  | { kind: "trap-flour-ghost" }
  | { kind: "empower-flour-ghost" }
  | { kind: "walk-away"; speaker: "golem"; destination: { x: number; y: number }; stepMs?: number }
  | { kind: "start-combat" }
  | { kind: "dismiss-group"; delay?: number; retain?: boolean };

export type EncounterItemCallback = { item: string; effects: EncounterEffect[] };

export type EncounterChoice = {
  id: string;
  label: string;
  tone: "peace" | "item" | "class" | "risk" | "combat" | "retreat";
  requirements?: EncounterRequirement[];
  effects: EncounterEffect[];
  conditionalEffects?: {
    id: string;
    label: string;
    when: "village-abandoned";
    effects: EncounterEffect[];
  }[];
  sharedSequence?: string;
};

export type ScriptedEncounter = {
  id: string;
  kind: ScriptedEncounterKind;
  roomLabel: string;
  title: string;
  speaker: string;
  opening: string;
  entryVariants?: EncounterEntryVariant[];
  quiz?: EncounterQuiz;
  itemCallbacks?: EncounterItemCallback[];
  sharedSequences?: EncounterSharedSequence[];
  completionFlag?: string;
  choices: EncounterChoice[];
};

export const HALLETH_DIALOGUE_FLAGS = [
  "halleth-ooze-song-heard",
  "halleth-hash-brown-song-heard",
  "halleth-heard-something-below",
] as const;

export const scriptedEncounterNeedsRecovery = (
  kind: ScriptedEncounterKind,
  flags: ReadonlySet<string>,
) => {
  const completionFlag = SCRIPTED_DUNGEON_ENCOUNTERS[kind].completionFlag;
  return !completionFlag || !flags.has(completionFlag);
};

export type EncounterSharedSequence = { id: string; title: string; effects: EncounterEffect[] };

export type EncounterEntryVariant = {
  id: string;
  label: string;
  opening: string;
  prelude: EncounterEffect[];
};

export type EncounterQuizQuestion = { prompt: string; answers: readonly string[]; correct: number };
export type EncounterQuiz = {
  startLabel: string;
  intro: string;
  questions: readonly EncounterQuizQuestion[];
  correctResponse: string;
  incorrectResponse: string;
  winningOutcome: string;
  losingOutcome: string;
};

export type ClubTourStation = {
  point: { x: number; y: number };
  host: number;
  line: string;
  aside: string;
  reply: string;
};

export type SecretClubTourCompletion = {
  achievement: { key: string; title: string; description: string; tier: "Gold"; boxName: string };
  items: string[];
  proficiency: SkillProficiency;
  flags: string[];
  awardPeaceXp: boolean;
  actorDisposition: "retain";
};

export const SECRET_CLUB_TOUR_TIMING = {
  openingDelay: 320,
  stepMilliseconds: 190,
} as const;

export const SECRET_CLUB_HOST_POSITIONS = [{ x: 10, y: 42 }, { x: 12, y: 44 }, { x: 11, y: 47 }, { x: 10, y: 48 }];
export const SECRET_CLUB_EXIT = { x: 15, y: 46 };
export const SECRET_CLUB_TOUR: readonly ClubTourStation[] = [
  { point: { x: 9, y: 42 }, host: 0, line: "Station one: wrists up.", aside: "Velvet closes the curtains. Four leather cuffs click shut, followed by the unmistakable sound of a riding crop being tested on an empty palm.", reply: "Nobody writes this in the official record." },
  { point: { x: 12, y: 42 }, host: 1, line: "Station two is posture correction. Safe word is 'initiative.' If you forget it, the paddle has the notes written on the back.", aside: "The padded bench creaks. Lady Fangirl adjusts three straps and critiques the party's form with devastating professionalism.", reply: "What was the safe word again?" },
  { point: { x: 9, y: 47 }, host: 2, line: "Station three: the cage. Little piggy goes in. Click. He does not come out.", aside: "The brass door shuts. Chains rattle overhead while Mistress Maybe slowly circles the cage with a feather. It tickles.", reply: "This comes off, right?!" },
  { point: { x: 12, y: 47 }, host: 3, line: "Station four: obedience.", aside: "The throne reclines. DJ Bitey lowers a jeweled mask, turns up the bass, and raises a riding crop.", reply: "It's normally not this small." },
  { point: { x: 10, y: 45 }, host: 0, line: "Final station: earn your release.", aside: "Violet lights pulse. The bass drops.", reply: "We will never speak of this." },
];

export const SECRET_CLUB_TOUR_COMPLETION: SecretClubTourCompletion = {
  achievement: { key: "undertaker-club-tour", title: "What Happens in Undermountain", description: "Completed every station of the Extremely Secret Tour.", tier: "Gold", boxName: "Aftercare" },
  items: ["Dwarven Signet Ring", "Stone-box Key"],
  proficiency: "Acrobatics",
  flags: ["undertaker-club-joined", "undertaker-club-tour-complete"],
  awardPeaceXp: true,
  actorDisposition: "retain",
};

export const MANTICORE_SHOW_QUESTIONS: readonly EncounterQuizQuestion[] = [
  { prompt: "First question. I contain cities without houses, mountains without stone, and roads without travelers. What am I?", answers: ["A map", "A tomb", "Undermountain"], correct: 0 },
  { prompt: "Second question. The more you take, the more you leave behind. What are they?", answers: ["Victims", "Footsteps", "Tail spikes"], correct: 1 },
  { prompt: "Final question. I speak without a mouth and answer without knowing. What am I?", answers: ["An echo", "Halaster", "A dead mage"], correct: 0 },
];

const grellHideoutEncounter: ScriptedEncounter = {
  id: "level1-grell-hideout",
  kind: "grell-hideout",
  roomLabel: "5",
  title: "The Breathing Pillars",
  speaker: "Something Above",
  opening: "Five pillars made from fused bones hum at different pitches. Wet tentacles tighten in the darkness overhead.",
  choices: [
    {
      id: "glasses-roost",
      label: "Which pillar has fresh blood on it?",
      tone: "item",
      requirements: [{ kind: "hero-item", item: "Glasses of Good Questions" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "The third pillar is a feeding perch. There—above it." },
        { kind: "set-flag", flag: "grell-ambush-spotted" },
        { kind: "log", text: "The Glasses expose both Grell before they can drop. The party has the first move." },
        { kind: "start-combat" },
      ],
    },
    {
      id: "watch-ceiling",
      label: "Stay under the arch and watch the ceiling.",
      tone: "risk",
      requirements: [{ kind: "investigation", minimum: 2 }],
      effects: [
        { kind: "bubble", speaker: "npc", text: "A beak clicks directly above the bone pillars." },
        { kind: "set-flag", flag: "grell-ambush-spotted" },
        { kind: "log", text: "Careful observation reveals the Grell roost. The party has the first move." },
        { kind: "start-combat" },
      ],
    },
    {
      id: "break-pillar",
      label: "Kick the nearest bone pillar and draw them out.",
      tone: "combat",
      effects: [
        { kind: "bubble", speaker: "hero", text: "Come down here and defend your furniture." },
        { kind: "log", text: "The bone pillar cracks. Two furious Grell descend into reach." },
        { kind: "start-combat" },
      ],
    },
    {
      id: "leave",
      label: "Back out before they drop.",
      tone: "retreat",
      effects: [{ kind: "log", text: "The party backs away. The shapes continue breathing above the pillars." }],
    },
  ],
};

const harriaUndertakerEncounter: ScriptedEncounter = {
  id: "level1-undertakers-harria",
  kind: "undertakers-harria",
  roomLabel: "8b",
  title: "Undertakers",
  speaker: "Harria",
  opening: "Harria steps into the corridor and points to the stitched giant beside her. ‘Corridor tax. Hand over the Undertaker's purse, or explain to him why you didn't.’ The golem does not look at the party. It is studying its own hands.",
  choices: [
    {
      id: "pass",
      label: "Give Harria the Undertaker Coin Purse.",
      tone: "item",
      requirements: [{ kind: "party-item", item: "Undertaker Coin Purse" }, { kind: "flag-absent", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "consume-party-item", item: "Undertaker Coin Purse" },
        { kind: "bubble", speaker: "hero", text: "Take the purse. We pass in peace." },
        { kind: "bubble", speaker: "npc", text: "Professional courtesy. See? Nobody had to become spare parts." },
        { kind: "bubble", speaker: "golem", text: "Not spare." },
        { kind: "bubble", speaker: "npc", text: "Quiet." },
        { kind: "award-peace-xp" },
        { kind: "log", text: "Harria accepts the Undertaker Coin Purse and permits the company to pass. The golem watches them leave without receiving another order." },
        { kind: "dismiss-group", delay: 900 },
      ],
    },
    {
      id: "pay-gold",
      label: "Give Harria 25 gp.",
      tone: "item",
      requirements: [{ kind: "party-item", item: "25 gp" }, { kind: "flag-absent", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "consume-party-item", item: "25 gp" },
        { kind: "bubble", speaker: "hero", text: "Would twenty-five gold make this go away?" },
        { kind: "bubble", speaker: "npc", text: "It usually does." },
        { kind: "bubble", speaker: "golem", text: "Bought?" },
        { kind: "bubble", speaker: "npc", text: "Quiet." },
        { kind: "award-peace-xp" },
        { kind: "log", text: "Harria accepts 25 gp and permits the company to pass." },
        { kind: "dismiss-group", delay: 900 },
      ],
    },
    {
      id: "spellcaster-inspection",
      label: "Examine the magic binding the golem to Harria.",
      tone: "class",
      requirements: [{ kind: "hero-archetype", archetype: "spellcaster" }, { kind: "flag-absent", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "There is no command seal. No binding. He does not belong to you." },
        { kind: "bubble", speaker: "npc", text: "He absolutely works for me." },
        { kind: "bubble", speaker: "golem", text: "No." },
        { kind: "set-flag", flag: "harria-golem-inspection-bluff" },
        { kind: "set-flag", flag: "harria-speaking-to-golem" },
        { kind: "reopen-encounter", speaker: "golem", text: "The golem looks down at its hands. It is waiting for you to speak to it." },
      ],
    },
    {
      id: "glasses-seal",
      label: "What command seal is actually binding him?",
      tone: "item",
      requirements: [{ kind: "hero-item", item: "Glasses of Good Questions" }, { kind: "flag-absent", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "What command seal is actually binding him?" },
        { kind: "bubble", speaker: "npc", text: "The official one." },
        { kind: "bubble", speaker: "golem", text: "No seal." },
        { kind: "set-flag", flag: "harria-golem-inspection-bluff" },
        { kind: "set-flag", flag: "harria-speaking-to-golem" },
        { kind: "reopen-encounter", speaker: "golem", text: "Harria has no seal and no command. The golem turns toward you." },
      ],
    },
    {
      id: "address-golem",
      label: "Ask the golem what it wants.",
      tone: "peace",
      requirements: [{ kind: "flag-absent", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "What do you want?" },
        { kind: "bubble", speaker: "npc", text: "You are negotiating with the property now?" },
        { kind: "bubble", speaker: "golem", text: "Want first. Before pieces." },
        { kind: "set-flag", flag: "harria-speaking-to-golem" },
        { kind: "reopen-encounter", speaker: "golem", text: "The golem waits. Harria looks furious that anyone asked it a question." },
      ],
    },
    {
      id: "ask-golem-memories",
      label: "What do you remember?",
      tone: "peace",
      requirements: [{ kind: "flag-present", flag: "harria-speaking-to-golem" }, { kind: "flag-absent", flag: "harria-golem-memories-heard" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "What do you remember?" },
        { kind: "bubble", speaker: "golem", text: "This hand remembers bread." },
        { kind: "bubble", speaker: "golem", text: "This chest remembers singing." },
        { kind: "bubble", speaker: "golem", text: "This face remembers nothing." },
        { kind: "set-flag", flag: "harria-golem-memories-heard" },
        { kind: "set-flag", flag: "golem-strange-memory" },
        { kind: "reopen-encounter", speaker: "golem", text: "Several lives are still dreaming inside the stitched body." },
      ],
    },
    {
      id: "free-golem",
      label: "Then go find out who came first.",
      tone: "peace",
      requirements: [{ kind: "flag-present", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "Then go find out who came first." },
        { kind: "bubble", speaker: "golem", text: "No more orders." },
        { kind: "bubble", speaker: "npc", text: "You cannot simply walk away from me." },
        { kind: "award-peace-xp" },
        { kind: "grant-hero-item", item: "Disguise Kit" },
        { kind: "set-flag", flag: "harria-golem-chose-home" },
        { kind: "set-flag", flag: "golem-strange-memory" },
        { kind: "log", text: "The golem leaves to discover who existed before the pieces. Harria follows it out." },
        { kind: "walk-away", speaker: "golem", destination: { x: 10, y: 28 }, stepMs: 280 },
        { kind: "narration", title: "No More Orders", text: "Harria stomps after the departing golem in frustration." },
        { kind: "bubble", speaker: "npc", text: "Get back here!" },
        { kind: "dismiss-group", delay: 300 },
      ],
    },
    {
      id: "call-golem-monster",
      label: "He sounds like a monster.",
      tone: "combat",
      requirements: [{ kind: "flag-present", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "He sounds like a monster." },
        { kind: "bubble", speaker: "npc", text: "Finally, something sensible." },
        { kind: "bubble", speaker: "golem", text: "Still here." },
        { kind: "set-flag", flag: "undertaker-hostile-8b" },
        { kind: "log", text: "The accusation ends the conversation. Combat begins." },
        { kind: "start-combat" },
      ],
    },
    {
      id: "return-to-harria",
      label: "Turn back to Harria.",
      tone: "retreat",
      requirements: [{ kind: "flag-present", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "clear-flag", flag: "harria-speaking-to-golem" },
        { kind: "reopen-encounter", speaker: "npc", text: "Harria folds her arms. The corridor tax remains unpaid." },
      ],
    },
    {
      id: "fight",
      label: "No deal.",
      tone: "combat",
      requirements: [{ kind: "flag-absent", flag: "harria-speaking-to-golem" }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "No deal." },
        { kind: "bubble", speaker: "golem", text: "Must I?" },
        { kind: "bubble", speaker: "npc", text: "Yes." },
        { kind: "bubble", speaker: "golem", text: "I remember before." },
        { kind: "set-flag", flag: "golem-strange-memory" },
        { kind: "set-flag", flag: "undertaker-hostile-8b" },
        { kind: "log", text: "Talk is over. The Undertakers draw steel." },
        { kind: "start-combat" },
      ],
    },
  ],
};

const secretClubEncounter: ScriptedEncounter = {
  id: "level1-secret-club",
  kind: "secret-club",
  roomLabel: "6c",
  title: "The Extremely Secret Club",
  speaker: "Countess Velvet",
  opening: "The bass stops. Countess Velvet checks a reservation card and smiles. Apparently they have room for a few more.",
  entryVariants: [
    {
      id: "normal",
      label: "If the secret door opens normally",
      opening: "The bass stops. Countess Velvet checks a reservation card and smiles. Apparently they have room for a few more.",
      prelude: [
        { kind: "narration", title: "A Secret Opens", text: "The wall opens. Loud rave music spills into the hall as four glamorous trans vampires inspect the party." },
        { kind: "bubble", speaker: "npc", text: "Nobody was supposed to find our club... and now we have guests." },
      ],
    },
    {
      id: "alerted",
      label: "If someone trips over the power cable",
      opening: "Someone tripped over the club's power cable, killed the music, and sent the entire room charging into the hall. Four furious trans vampires want an explanation.",
      prelude: [
        { kind: "narration", title: "The Music Dies", text: "You trip over the power cable. Heels, chains, and furious shouting thunder toward the hidden exit." },
        { kind: "bubble", speaker: "npc", text: "WHO PULLED THE ALARM?" },
        { kind: "bubble", speaker: "npc-3", text: "The beat was about to drop!" },
      ],
    },
  ],
  choices: [
    {
      id: "pay",
      label: "Pay 25 gp and leave quietly.",
      tone: "item",
      requirements: [{ kind: "party-item", item: "25 gp" }],
      effects: [
        { kind: "consume-party-item", item: "25 gp" },
        { kind: "bubble", speaker: "hero", text: "Sorry, we'll be on our way." },
        { kind: "bubble", speaker: "npc", text: "Adorable. The exit is behind you." },
        { kind: "set-flag", flag: "undertaker-club-paid" },
        { kind: "log", text: "The club accepts the gold and lets the party leave. No key, no souvenirs, no questions." },
        { kind: "dismiss-group", delay: 900 },
      ],
    },
    {
      id: "join",
      label: "We're here to party.",
      tone: "risk",
      effects: [
        { kind: "bubble", speaker: "hero", text: "We're here to party." },
        { kind: "bubble", speaker: "npc", text: "Make sure you have a safe word..." },
        { kind: "bubble", speaker: "hero", text: "A safe what?!" },
        { kind: "secret-club-tour", stations: SECRET_CLUB_TOUR, completion: SECRET_CLUB_TOUR_COMPLETION },
      ],
    },
    {
      id: "fight",
      label: "Turn down the music. Permanently.",
      tone: "combat",
      effects: [
        { kind: "bubble", speaker: "npc", text: "Girls, we have a critic." },
        { kind: "set-flag", flag: "undertaker-hostile-6c" },
        { kind: "log", text: "Velvet snaps her fingers. The club turns into a battlefield." },
        { kind: "start-combat" },
      ],
    },
  ],
};

const spectralCampRevelation: EncounterEffect[] = [
  { kind: "bubble", speaker: "hero", text: "How long have you been down here?" },
  { kind: "bubble", speaker: "npc", text: "Long enough. What year do you think it is?" },
  { kind: "bubble", speaker: "npc-3", text: "It is... What year is it?" },
  { kind: "bubble", speaker: "npc-2", text: "The firewood has not burned down." },
  { kind: "bubble", speaker: "npc-3", text: "And none of us cast a shadow." },
  { kind: "bubble", speaker: "npc", text: "That bedroll has a skeleton under it." },
  { kind: "bubble", speaker: "npc", text: "...That's my buckle." },
  { kind: "bubble", speaker: "npc-2", text: "Oh." },
  { kind: "bubble", speaker: "npc-2", text: "Well. That explains why the stew has not gotten any better." },
  { kind: "bubble", speaker: "npc-3", text: "We kept searching for stairs. There are none. The King's throne is the way down." },
  { kind: "bubble", speaker: "npc", text: "Kill him, claim it, and the dungeon opens the next lesson." },
  { kind: "bubble", speaker: "npc", text: "Suppose we've kept tomorrow waiting long enough." },
  { kind: "bubble", speaker: "npc-2", text: "Take the living route. Better scenery." },
  { kind: "set-flag", flag: "last-camp-solved" },
  { kind: "set-flag", flag: "last-camp-throne-revelation" },
  { kind: "award-peace-xp" },
  { kind: "log", text: "The spectral expedition finally recognizes its own remains. Before fading together, the ghosts reveal that the Two-Headed King's throne opens the way to Level 2." },
  { kind: "dismiss-group" },
];

const spectralCampEncounter: ScriptedEncounter = {
  id: "level1-spectral-camp",
  kind: "spectral-camp",
  roomLabel: "23c",
  title: "The Last Camp",
  speaker: "Brell, Expedition Leader",
  opening: "One of three translucent delvers waves the party toward a cheerful camp. ‘Travelers! Fire's warm, stew's terrible, company’s worse. Sit down.’ Another raises a mug. ‘To Level Two! Tomorrow we finally find the stairs.’",
  itemCallbacks: [
    { item: "Ball Cap of Bad Ideas", effects: [{ kind: "bubble", speaker: "npc", text: "Now that is expedition gear. We had helmets. Look how that worked out." }] },
    { item: "Wife-Beater of Questionable Resilience", effects: [{ kind: "bubble", speaker: "npc-2", text: "Gods. You're actually wearing it. I thought the stories were a warning." }] },
    { item: "Dweomercore Remedial Diploma", effects: [{ kind: "bubble", speaker: "npc-3", text: "A scholar! Tell Professor Vale we said— ...How long ago was that class?" }] },
    { item: "Glasses of Good Questions", effects: [{ kind: "bubble", speaker: "npc-3", text: "Those glasses are showing you, aren't they? The fire gives no heat, and our mugs never empty." }] },
  ],
  sharedSequences: [{ id: "realization", title: "The Camp Realizes the Truth", effects: spectralCampRevelation }],
  choices: [
    {
      id: "join-toast",
      label: "Accept the toast.",
      tone: "peace",
      effects: [
        { kind: "bubble", speaker: "hero", text: "To Level Two." },
        { kind: "bubble", speaker: "npc-2", text: "See? Wonderful expedition. We leave first thing tomorrow." },
      ],
      sharedSequence: "realization",
    },
    {
      id: "refuse-toast",
      label: "Refuse the toast.",
      tone: "retreat",
      effects: [
        { kind: "bubble", speaker: "hero", text: "No toast. Something is wrong with this camp." },
        { kind: "bubble", speaker: "npc", text: "Nonsense. We found the safe route. Tomorrow we find the stairs." },
      ],
      sharedSequence: "realization",
    },
  ],
};

const hallethBardEncounter: ScriptedEncounter = {
  id: "level1-halleth-bard",
  kind: "halleth-bard",
  roomLabel: "37",
  title: "Halleth, Bard of the Hole",
  speaker: "Halleth",
  completionFlag: "halleth-bard-met",
  opening: "♪ Master Splinter raised his sons, Raph, Mikey, Leo, Don, and from their lips they drew the cowabunga... ♪ Oh. Audience. Requests cost extra, although if you rescue me I'd be willing to waive the cover charge.",
  choices: [
    {
      id: "halleth-turtles",
      label: "Turtles?",
      tone: "peace",
      requirements: [{ kind: "flag-absent", flag: HALLETH_DIALOGUE_FLAGS[0] }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "Turtles?" },
        { kind: "bubble", speaker: "npc", text: "You don't really care for turtles, do you? Fine. From the top." },
        { kind: "bubble", speaker: "npc", text: "I heard there was a secret ooze that turned four reptiles into dudes, but you don't really care for turtles, do you? ♪ Master Splinter raised his sons, Raph, Mikey, Leo, Don, and from their lips they drew the cowabunga... ♪" },
        { kind: "bubble", speaker: "hero", text: "I..." },
        { kind: "set-flag", flag: "halleth-bard-met" },
        { kind: "set-flag", flag: "halleth-ooze-song-heard" },
        { kind: "log", text: "Halleth performs his secret-ooze ballad. It is based on one Gelatinous Cube and several unsupported conclusions about reptiles." },
      ],
    },
    {
      id: "halleth-romantic",
      label: "Do you know anything romantic?",
      tone: "risk",
      requirements: [{ kind: "flag-absent", flag: HALLETH_DIALOGUE_FLAGS[1] }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "Do you know anything romantic?" },
        { kind: "bubble", speaker: "npc", text: "Of course. ♪ I want you smothered, want you covered, like Waffle House hash browns... ♪" },
        { kind: "bubble", speaker: "hero", text: "Bad touch, bard. Bad touch." },
        { kind: "bubble", speaker: "npc", text: "Tough crowd." },
        { kind: "set-flag", flag: "halleth-bard-met" },
        { kind: "set-flag", flag: "halleth-hash-brown-song-heard" },
        { kind: "log", text: "Halleth's romantic request ends after one alarming comparison to diner potatoes." },
      ],
    },
    {
      id: "halleth-why-singing",
      label: "Why are you singing in a pit?",
      tone: "class",
      requirements: [{ kind: "flag-absent", flag: HALLETH_DIALOGUE_FLAGS[2] }],
      effects: [
        { kind: "bubble", speaker: "hero", text: "Why are you singing in a pit?" },
        { kind: "bubble", speaker: "npc", text: "Morale. Also, if I stop playing, I can hear what is moving underneath me." },
        { kind: "bubble", speaker: "npc", text: "The grate is locked. Find someone strong to push it open or find someone who can work the lock. Preferably before the harmony joins in." },
        { kind: "set-flag", flag: "halleth-bard-met" },
        { kind: "set-flag", flag: "halleth-heard-something-below" },
        { kind: "log", text: "Halleth keeps playing so neither he nor the party has to listen to whatever is shifting beneath the pit." },
      ],
    },
  ],
};

export const SCRIPTED_DUNGEON_ENCOUNTERS: Record<ScriptedEncounterKind, ScriptedEncounter> = {
  "spectral-camp": spectralCampEncounter,
  "halleth-bard": hallethBardEncounter,
  "grell-hideout": grellHideoutEncounter,
  "bridge-bandits": {
    id: "chapter2-bridge-toll",
    kind: "bridge-bandits",
    roomLabel: "bridge",
    title: "The Toll Collectors",
    speaker: "Bandit Swordsman",
    opening: "Bridge toll. Coin first, crossing second. No coin means steel.",
    choices: [
      {
        id: "wayfarer-bluff",
        label: "The wizard over there said he'd cover our fare.",
        tone: "item",
        effects: [
          { kind: "bubble", speaker: "hero", text: "The wizard over there said he'd cover our fare." },
          { kind: "bubble", speaker: "npc", text: "Nice reward for a hero." },
          { kind: "set-flag", flag: "bridge-bandits-cleared" },
          { kind: "award-peace-xp" },
          { kind: "log", text: "The toll collectors decide arguing with the Wayfarer is above their pay grade and abandon the bridge." },
          { kind: "dismiss-group", delay: 1200 },
        ],
        conditionalEffects: [
          {
            id: "village-abandoned",
            label: "If the village was abandoned",
            when: "village-abandoned",
            effects: [
              { kind: "bubble", speaker: "hero", text: "The wizard over there said he'd cover our fare." },
              { kind: "bubble", speaker: "npc", text: "Nice try, we can hear the villagers screaming from here. You're a monster." },
              { kind: "log", text: "The guards know the village was abandoned. The bluff fails, and the toll collectors attack." },
              { kind: "start-combat" },
            ],
          },
        ],
      },
      {
        id: "ball-cap-child-support",
        label: "Child support is getting expensive in the kingdom.",
        tone: "item",
        requirements: [{ kind: "hero-item", item: "Ball Cap of Bad Ideas" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "Child support is getting expensive in the kingdom." },
          { kind: "bubble", speaker: "npc", text: "Then this should feel familiar." },
          { kind: "narration", title: "An Uncomfortable Pause", text: "The swordsman slowly pulls off his belt." },
          { kind: "bubble", speaker: "hero", text: "Daddy?..." },
          { kind: "log", text: "The toll collectors draw steel. Apparently there is no hardship exemption." },
          { kind: "start-combat" },
        ],
      },
      {
        id: "refuse",
        label: "I'm not going to pay.",
        tone: "combat",
        effects: [
          { kind: "bubble", speaker: "hero", text: "I'm not going to pay." },
          { kind: "bubble", speaker: "npc", text: "Then pay in blood." },
          { kind: "log", text: "The swordsmen draw steel while the archers spread along the north bank." },
          { kind: "start-combat" },
        ],
      },
    ],
  },
  "secret-club": secretClubEncounter,
  "undertakers-harria": harriaUndertakerEncounter,
  troll: {
    id: "level1-hungry-troll",
    kind: "troll",
    roomLabel: "18",
    title: "Hungry Troll",
    speaker: "Troll",
    opening: "Meat. Give me meat, or become meat.",
    choices: [
      {
        id: "feed",
        label: "Give it the fresh meat.",
        tone: "item",
        requirements: [{ kind: "party-item", item: "Fresh Meat" }],
        effects: [
          { kind: "consume-party-item", item: "Fresh Meat" },
          { kind: "bubble", speaker: "npc", text: "Good meat. Hot water south. Makes hurts stop." },
          { kind: "award-peace-xp" },
          { kind: "log", text: "The troll accepts the meat and lumbers away. It mentions healing water in the dwarven bath." },
          { kind: "dismiss-group", delay: 1000 },
        ],
      },
      {
        id: "fight",
        label: "We're not on the menu.",
        tone: "combat",
        effects: [
          { kind: "bubble", speaker: "hero", text: "We're not on the menu." },
          { kind: "bubble", speaker: "npc", text: "Get in my belly." },
          { kind: "set-flag", flag: "troll-hostile" },
          { kind: "log", text: "The troll roars and charges." },
          { kind: "start-combat" },
        ],
      },
    ],
  },
  "paranoid-dwarf": {
    id: "level1-paranoid-dwarf",
    kind: "paranoid-dwarf",
    roomLabel: "19c",
    title: "Gromm and the Flour",
    speaker: "Gromm, Paranoid Survivor",
    opening: "Stay back! The circle cannot be disturbed, or the spirit will break free!",
    choices: [
      {
        id: "offer-flour-help",
        label: "I understand! What can I do to help?",
        tone: "peace",
        requirements: [{ kind: "flag-absent", flag: "gromm-requested-flour" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "I understand! What can I do to help?" },
          { kind: "set-flag", flag: "gromm-requested-flour" },
          { kind: "log", text: "Gromm needs the Bag of Flour from the Dwarven Pantry to finish the ward." },
          { kind: "reopen-encounter", text: "I need one more bag of flour, and the circle will be complete." },
        ],
      },
      {
        id: "give-gromm-flour",
        label: "Give Gromm the Bag of Flour.",
        tone: "item",
        requirements: [{ kind: "flag-present", flag: "gromm-requested-flour" }, { kind: "party-item", item: "Bag of Flour" }],
        effects: [
          { kind: "consume-party-item", item: "Bag of Flour" },
          { kind: "bubble", speaker: "npc", text: "Yes. Right there—carefully." },
          { kind: "trap-flour-ghost" },
          { kind: "bubble", speaker: "npc", text: "It worked. The spirit is trapped—and I am staying here to make sure it remains that way." },
          { kind: "set-flag", flag: "dungeon-edited-flour-ward" },
          { kind: "award-peace-xp" },
          { kind: "log", text: "The final flour line closes. The ghost remains trapped in the circle, with Gromm standing watch beside it." },
          { kind: "dismiss-group", delay: 1200, retain: true },
        ],
      },
      {
        id: "find-gromm-flour",
        label: "I’ll find some. Stay here.",
        tone: "retreat",
        requirements: [{ kind: "flag-present", flag: "gromm-requested-flour" }, { kind: "flag-absent", flag: "flour-ghost-trapped" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "I’ll find some. Stay here." },
          { kind: "bubble", speaker: "npc", text: "I had not planned on moving." },
          { kind: "log", text: "Gromm remains available while the party searches the pantry for flour." },
        ],
      },
      {
        id: "ball-cap-door",
        label: "I know how to solve this. It just needs a door. — Ball Cap",
        tone: "risk",
        requirements: [{ kind: "hero-item", item: "Ball Cap of Bad Ideas" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "I know how to solve this. You see... it just needed a door." },
          { kind: "bubble", speaker: "npc", text: "Why would you draw a door?!" },
          { kind: "empower-flour-ghost" },
          { kind: "set-flag", flag: "dungeon-edited-flour-ward" },
          { kind: "log", text: "The Ball Cap solution opens the ward. The ghost escapes and eats Gromm whole." },
        ],
      },
      {
        id: "glasses-church-bakery",
        label: "How did you know how to draw this? — Glasses",
        tone: "item",
        requirements: [{ kind: "hero-item", item: "Glasses of Good Questions" }, { kind: "flag-absent", flag: "gromm-circle-recipe-learned" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "How did you know how to draw this?" },
          { kind: "bubble", speaker: "npc", text: "I was raised in a church with a bakery in the basement. I picked up all sorts of tricks." },
          { kind: "grant-hero-item", item: "Magic Circle Recipe" },
          { kind: "set-flag", flag: "gromm-circle-recipe-learned" },
          { kind: "log", text: "The Glasses earn Gromm's Magic Circle Recipe. The remaining approaches are still available." },
        ],
      },
    ],
  },
  "manticore-show": {
    id: "level1-manticore-show",
    kind: "manticore-show",
    roomLabel: "16",
    title: "Welcome to the Show",
    speaker: "Smiling Manticore",
    opening: "Ah. Undermountain's newest students. Welcome to Halaster's Three Questions, your oral examination. Combat is the prize. Your answers decide who gets the first turn.",
    quiz: {
      startLabel: "Start Halaster's Three Questions.",
      intro: "Spotlights snap on above all three manticores.",
      questions: MANTICORE_SHOW_QUESTIONS,
      correctResponse: "Correct. Disappointingly competent.",
      incorrectResponse: "Wrong. The home team appreciates your donation of initiative.",
      winningOutcome: "The party wins Halaster's Three Questions. The heroes act first.",
      losingOutcome: "The manticores win Halaster's Three Questions. The home team acts first.",
    },
    choices: [],
  },
  "fight-club": {
    id: "level1-fight-club",
    kind: "fight-club",
    roomLabel: "41",
    title: "The First Rule",
    speaker: "The Narrator",
    opening: "The bruised man at the edge of the ring points to Tyler, waiting alone beneath the bulb. “If it's your first level... you have to fight.”",
    completionFlag: "fight-club-won",
    choices: [
      {
        id: "enter-the-ring",
        label: "Agree to the bout. Enter the square.",
        tone: "risk",
        requirements: [{ kind: "flag-absent", flag: "fight-club-ring-open" }],
        effects: [
          { kind: "set-flag", flag: "fight-club-ring-open" },
          { kind: "log", text: "The Narrator calls the underground bout. Walk a hero into the outlined square to begin. Tyler remains inside the ring." },
        ],
      },
    ],
  },
  "pillar-bugbears": {
    id: "level1-pillar-bugbears",
    kind: "pillar-bugbears",
    roomLabel: "2b",
    title: "The Broken Pillar Toll",
    speaker: "Two Bugbear Deserters",
    opening: "Two bugbears shoulder into the passage and plant themselves beside the broken pillars. One rests an axe across his chest. ‘Easy. Nobody has to make this stupid. Let us through, or make us an offer.’",
    choices: [
      {
        id: "bribe-for-silence",
        label: "Here's some gold to tell us what to watch out for and to stay quiet about us being here.",
        tone: "item",
        requirements: [{ kind: "party-item", item: "25 gp" }],
        effects: [
          { kind: "consume-party-item", item: "25 gp" },
          { kind: "award-peace-xp" },
          { kind: "bubble", speaker: "hero", text: "Heading out for a smoke? I've got some gold for some information and quiet lips." },
          { kind: "bubble", speaker: "npc", text: "Paid breaks? Now you're speaking our language." },
          { kind: "bubble", speaker: "npc-2", text: "Watch the floor ahead. Bombs, wire traps, and ghosts that don't stay dead." },
          { kind: "bubble", speaker: "npc", text: "And the boss farther in has two faces and twice the temper. You never heard that from us." },
          { kind: "set-flag", flag: "pillar-bugbears-paid-break" },
          { kind: "log", text: "The bugbears pocket the gold, warn the company about the hazards ahead, declare themselves officially on break, and leave without reporting the party." },
          { kind: "dismiss-group", delay: 1400 },
        ],
      },
      {
        id: "ball-cap-first-hit",
        label: "I'll let you hit me first.",
        tone: "item",
        requirements: [{ kind: "hero-item", item: "Ball Cap of Bad Ideas" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "I'm itching for a fight. Tell ya what, I'll let you hit me first." },
          { kind: "bubble", speaker: "npc", text: "Deal." },
          { kind: "log", text: "The bugbears accept the challenge and take the first turn." },
          { kind: "start-combat" },
        ],
      },
      {
        id: "question",
        label: "What are you running from?",
        tone: "item",
        requirements: [{ kind: "hero-item", item: "Glasses of Good Questions" }],
        effects: [
          { kind: "award-peace-xp" },
          { kind: "bubble", speaker: "npc", text: "Ghosts, bombs, monsters, traps..." },
          { kind: "bubble", speaker: "npc-2", text: "Overbearing, two-faced bosses..." },
          { kind: "set-flag", flag: "pillar-bugbears-deserter-clue" },
          { kind: "log", text: "The bugbears list the hazards ahead, then resume their escape." },
          { kind: "dismiss-group", delay: 1400 },
        ],
      },
      {
        id: "fight",
        label: "The only good bugbear is a dead one.",
        tone: "combat",
        effects: [
          { kind: "bubble", speaker: "hero", text: "The only good bugbear is a dead one." },
          { kind: "log", text: "The company blocks the bugbears' escape. Combat begins." },
          { kind: "start-combat" },
        ],
      },
    ],
  },
  flyndol: {
    id: "level1-flyndol",
    kind: "flyndol",
    roomLabel: "35",
    title: "Cornered Wererat",
    speaker: "Flyndol",
    opening: "Let me go. The rats and I want no trouble.",
    choices: [
      {
        id: "release",
        label: "Go. I won't stop you.",
        tone: "peace",
        effects: [
          { kind: "bubble", speaker: "hero", text: "Go. I won't stop you." },
          { kind: "bubble", speaker: "npc", text: "Thank you... Come, children." },
          { kind: "award-peace-xp" },
          { kind: "log", text: "Flyndol and the rats vanish into the dungeon." },
          { kind: "dismiss-group", delay: 900 },
        ],
      },
      {
        id: "bite",
        label: "Could you make me a wererat?",
        tone: "item",
        requirements: [{ kind: "hero-item", item: "Glasses of Good Questions" }],
        effects: [
          { kind: "bubble", speaker: "hero", text: "Could you make me a wererat?" },
          { kind: "narration", title: "The Bite", text: "Flyndol bites the volunteer, then pulls back with a satisfied smile." },
          { kind: "bubble", speaker: "npc", text: "Come, children." },
          { kind: "grant-hero-item", item: "Wererat Lycanthropy" },
          { kind: "award-peace-xp" },
          { kind: "log", text: "Flyndol grants a fraction of the curse, then escapes with the rats. The volunteer is Rat-Touched and can speak with rats." },
          { kind: "dismiss-group", delay: 900 },
        ],
      },
      {
        id: "fight",
        label: "You're not leaving.",
        tone: "combat",
        effects: [
          { kind: "bubble", speaker: "hero", text: "You're not leaving." },
          { kind: "set-flag", flag: "flyndol-hostile" },
          { kind: "log", text: "Flyndol bares his teeth. The rats surge forward." },
          { kind: "start-combat" },
        ],
      },
    ],
  },
  "starving-goblins": {
    id: "level1-starving-goblins",
    kind: "starving-goblins",
    roomLabel: "39c",
    title: "Starving Goblins",
    speaker: "Goblin in a White Shirt",
    opening: "Food. Give us food and we leave.",
    choices: [
      {
        id: "ball-cap-shirt",
        label: "That's a nice shirt... I want it.",
        tone: "item",
        requirements: [
          { kind: "hero-item", item: "Ball Cap of Bad Ideas" },
          { kind: "flag-absent", flag: "goblin-shirt-taken" },
        ],
        effects: [
          { kind: "bubble", speaker: "hero", text: "That's a nice shirt... I want it." },
          { kind: "choose-goblin-shirt" },
        ],
      },
      {
        id: "feed",
        label: "Take my ration and go.",
        tone: "item",
        requirements: [{ kind: "hero-item", item: "Ration" }],
        effects: [
          { kind: "consume-hero-item", item: "Ration" },
          { kind: "bubble", speaker: "hero", text: "Food. No tricks." },
          { kind: "award-peace-xp" },
          { kind: "log", text: "The goblins seize the ration and scatter without a fight." },
          { kind: "dismiss-group", delay: 900 },
        ],
      },
      {
        id: "fight",
        label: "Then come take it.",
        tone: "combat",
        effects: [
          { kind: "bubble", speaker: "hero", text: "Then come take it." },
          { kind: "set-flag", flag: "starving-goblins-hostile" },
          { kind: "log", text: "The hungry goblins rush the company." },
          { kind: "start-combat" },
        ],
      },
    ],
  },
};

export const requirementLabel = (requirement: EncounterRequirement) => {
  if (requirement.kind === "hero-item" || requirement.kind === "party-item") return requirement.item;
  if (requirement.kind === "hero-class") return requirement.role;
  if (requirement.kind === "hero-archetype") return "a spellcaster";
  if (requirement.kind === "investigation") return `Investigation ${requirement.minimum}`;
  return requirement.kind === "flag-present" ? "a previous choice" : "an unfinished outcome";
};
import type { SkillProficiency } from "./game-types";
