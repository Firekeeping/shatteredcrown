export type VisualPropKind = "wall" | "floor" | "room-plate" | "creature" | "interactive-object";
export type PoiVisibility = "always" | "discovered" | "hidden";
export type PoiAction = "inspect" | "move-onto" | "trigger-mimic" | "inspect-camp-clue";
export type PoiPanelActionId =
  | "open-poster"
  | "take-shrine-gold"
  | "touch-black-statue"
  | "bond-black-statue"
  | "turn-coin-lord"
  | "turn-sword-lord"
  | "turn-silent-lord"
  | "heal-at-spigot"
  | "fill-tankard"
  | "take-bridge-potion"
  | "disable-heart-acid"
  | "force-heart-acid"
  | "break-halleth-bars"
  | "pick-halleth-lock"
  | "swap-relic-with-sand"
  | "take-gold-cache"
  | "take-question-glasses"
  | "leave-question-glasses"
  | "talk-dead-mage"
  | "look-hall-mirror"
  | "talk-kelim"
  | "clear-dwarven-cave-in"
  | "crawl-sewer-to-flood"
  | "crawl-flood-to-sewer";

export type PoiPanelActionDefinition = {
  id: PoiPanelActionId;
  label: string;
  style?: "primary" | "secondary";
};

export type PoiPanelDefinition = {
  image?: { src: string; alt: string; width: number; height: number; className?: string };
  descriptionClassName?: string;
  hint?: string;
  actions?: PoiPanelActionDefinition[];
};

export type PoiDefinition = {
  id: string;
  visualKind: VisualPropKind;
  visibility: PoiVisibility;
  action: PoiAction;
  hideWhenResolved?: boolean;
  mapRepresentation?: "token" | "structural";
  proximity?: number;
  panel?: PoiPanelDefinition;
};

const defaults: Omit<PoiDefinition, "id"> = {
  visualKind: "interactive-object",
  visibility: "discovered",
  action: "inspect",
  proximity: 1,
};

export const POI_REGISTRY: Record<string, PoiDefinition> = {
  "gold-cache": { id: "gold-cache", ...defaults, visualKind: "floor", visibility: "hidden", hideWhenResolved: true, panel: { actions: [{ id: "take-gold-cache", label: "Lift the Tile — Take 25 gp" }] } },
  "golden-spear-mimic": { id: "golden-spear-mimic", ...defaults, visibility: "always", action: "trigger-mimic", hideWhenResolved: true },
  "spiked-pit-28d": { id: "spiked-pit-28d", ...defaults, visualKind: "floor", action: "move-onto" },
  "spike-pit-lure-28d": { id: "spike-pit-lure-28d", ...defaults, visualKind: "floor", visibility: "always", action: "move-onto" },
  "western-secret-panel-14-61": {
    id: "western-secret-panel-14-61", ...defaults, visualKind: "wall", visibility: "hidden",
    mapRepresentation: "structural",
    panel: {
      image: { src: "/fantasy-prison-poster.png", alt: "A weathered prison poster of a red-haired fantasy heroine in a crimson gown", width: 512, height: 768, className: "poster-inspection-art" },
      actions: [{ id: "open-poster", label: "Fist the Poster" }],
    },
  },
  "heart-acid": {
    id: "heart-acid", ...defaults, visibility: "always",
    panel: {
      actions: [
        { id: "disable-heart-acid", label: "Insert Stone-box Key" },
        { id: "force-heart-acid", label: "Force the Box" },
      ],
    },
  },
  "dwarven-spigot": {
    id: "dwarven-spigot", ...defaults, visibility: "always",
    panel: { actions: [
      { id: "heal-at-spigot", label: "Drink Healing Water — Full Party Heal" },
      { id: "fill-tankard", label: "Fill the Copper Tankard — Gain 1 Healing Potion" },
    ] },
  },
  "bridge-waystone": {
    id: "bridge-waystone",
    ...defaults,
    visibility: "always",
    panel: {
      image: {
        src: "/toll-warning-sign-chainless-v2.png",
        alt: "A rough wooden warning sign reading Pay Toll Ahead or Else",
        width: 754,
        height: 310,
        className: "toll-sign-inspection-art",
      },
      hint: "The projector's eye is missing. The warning sign appears to be doing its job instead.",
      actions: [],
    },
  },
  "bridge-supply-cache": { id: "bridge-supply-cache", ...defaults, visualKind: "floor", visibility: "always", panel: { actions: [{ id: "take-bridge-potion", label: "Open Cache" }] } },
  "forest-ruin-marker": { id: "forest-ruin-marker", ...defaults, visualKind: "floor", visibility: "always", panel: { hint: "", actions: [{ id: "take-shrine-gold", label: "Take the 5 gp" }] } },
  "black-pudding-statue": { id: "black-pudding-statue", ...defaults, visibility: "always", panel: { actions: [
    { id: "touch-black-statue", label: "Touch the Black Coating" },
    { id: "bond-black-statue", label: "Bond With It — Ball Cap" },
  ] } },
  "three-lords-statues": { id: "three-lords-statues", ...defaults, visualKind: "wall", visibility: "hidden", mapRepresentation: "structural", panel: {
    image: { src: "/three-lords-wall-relief.png", alt: "A stone relief of the Lord of Coin, Lord of Swords, and Silent Lord", width: 1536, height: 1024, className: "three-lords-inspection-art" },
    actions: [
    { id: "turn-coin-lord", label: "Turn the Lord of Coin" },
    { id: "turn-sword-lord", label: "Turn the Lord of Swords" },
    { id: "turn-silent-lord", label: "Turn the Silent Lord" },
  ] } },
  "halleth-pit": {
    id: "halleth-pit",
    ...defaults,
    visibility: "always",
    hideWhenResolved: false,
    panel: {
      hint: "Heavy iron bars lock Halleth and his battered instrument inside the pit. Break the grate or work its rusted lock.",
      actions: [
        { id: "break-halleth-bars", label: "Expend a Lot of Time and Energy Forcing It Open" },
        { id: "pick-halleth-lock", label: "Open Bar Lock · Thieves' Tools DC 12" },
      ],
    },
  },
  "question-statue": { id: "question-statue", ...defaults, visibility: "always", panel: { actions: [
    { id: "take-question-glasses", label: "Take the Glasses" },
    { id: "leave-question-glasses", label: "Leave the Glasses", style: "secondary" },
  ] } },
  "dead-mage": { id: "dead-mage", ...defaults, visibility: "always", hideWhenResolved: true, panel: { actions: [{ id: "talk-dead-mage", label: "Talk" }] } },
  "hall-portrait-1": { id: "hall-portrait-1", ...defaults, visibility: "always", mapRepresentation: "structural", panel: { image: { src: "/hall-orvin-mimic-inspector.webp", alt: "Sir Orvin inspecting a mimic from much too close", width: 640, height: 960, className: "hall-hero-inspection-art" } } },
  "hall-portrait-2": { id: "hall-portrait-2", ...defaults, visibility: "always", mapRepresentation: "structural", panel: { image: { src: "/hall-yara-ready.webp", alt: "Yara falling down a shaft with all her equipment", width: 640, height: 960, className: "hall-hero-inspection-art" } } },
  "hall-portrait-3": { id: "hall-portrait-3", ...defaults, visibility: "always", mapRepresentation: "structural", panel: { image: { src: "/hall-pell-precise.webp", alt: "Pell testing both ends of an unidentified wand", width: 639, height: 960, className: "hall-hero-inspection-art" } } },
  "hall-portrait-4": { id: "hall-portrait-4", ...defaults, visibility: "always", mapRepresentation: "structural", panel: { image: { src: "/hall-torvik-torch-snuffer.webp", alt: "Brother Torvik extinguishing the last torch while monsters watch", width: 640, height: 960, className: "hall-hero-inspection-art" } } },
  "hall-portrait-mirror": { id: "hall-portrait-mirror", ...defaults, visibility: "always", mapRepresentation: "structural", panel: { actions: [{ id: "look-hall-mirror", label: "Read the Plaque" }] } },
  "kelim-closet": { id: "kelim-closet", ...defaults, visibility: "always", hideWhenResolved: true, panel: { actions: [{ id: "talk-kelim", label: "Talk Through the Closet Door" }] } },
  "dwarven-cave-in": { id: "dwarven-cave-in", ...defaults, visibility: "always", hideWhenResolved: true, panel: {
    hint: "A cave-in seals a dwarven supply niche. The packed stone will not move by hand.",
    actions: [{ id: "clear-dwarven-cave-in", label: "Clear the Cave-In — Dwarven Mining Pick" }],
  } },
  "broom-closet-message": { id: "broom-closet-message", ...defaults, visualKind: "floor", visibility: "always", panel: { descriptionClassName: "floor-message-inspection-text" } },
  "sewer-secret-grate": { id: "sewer-secret-grate", ...defaults, visibility: "always", panel: { hint: "A submerged crawlway continues behind the bars. The sludge inside is lethally corrosive.", actions: [{ id: "crawl-sewer-to-flood", label: "Crawl Through — Ring of Puke Immunity" }] } },
  "flood-room-secret-grate": { id: "flood-room-secret-grate", ...defaults, visibility: "always", panel: { hint: "The crawlway returns to the Certain Death sewer without crossing the floodgate.", actions: [{ id: "crawl-flood-to-sewer", label: "Crawl Back — Ring of Puke Immunity" }] } },
  "ten-thousand-steps-message": { id: "ten-thousand-steps-message", ...defaults, visualKind: "floor", visibility: "always", action: "move-onto" },
  "watch-hall-spear-trap": { id: "watch-hall-spear-trap", ...defaults, visualKind: "floor", visibility: "hidden" },
  "proximity-bomb": { id: "proximity-bomb", ...defaults, visibility: "always", panel: {
    hint: "A stable stone platform catches a suspiciously small nuke dropped from the ceiling. The room itself is the blast radius.",
    actions: [{ id: "swap-relic-with-sand", label: "Swap Nuke With Sand · Thieves' Tools DC 13" }],
  } },
};

export type PoiPanelContext = {
  resolved: boolean;
  activeHero: boolean;
  activeId?: string;
  activeRole?: string;
  adjacent: boolean;
  flags: ReadonlySet<string>;
  hasBallCap: boolean;
  hasStoneBoxKey: boolean;
  hasMiningPick: boolean;
  hasPukeRing: boolean;
  tankardOwnerName?: string;
  kind: "clue" | "trap";
};

export type PoiPanelModel = {
  image?: PoiPanelDefinition["image"];
  hint: string;
  notices: string[];
  actions: PoiPanelActionDefinition[];
};

export const getPoiPanelModel = (id: string, context: PoiPanelContext): PoiPanelModel => {
  const definition = getPoiDefinition(id);
  const actions = [...(definition.panel?.actions || [])];

  const available = actions.filter((action) => {
    if (context.resolved && action.id !== "talk-dead-mage" && action.id !== "break-halleth-bars" && action.id !== "pick-halleth-lock") return false;
    switch (action.id) {
      case "open-poster": return context.hasBallCap && !context.flags.has("western-secret-door-open");
      case "bond-black-statue": return context.hasBallCap && !context.resolved;
      case "fill-tankard": return context.flags.has("dwarven-party-healed") && !!context.tankardOwnerName && !context.flags.has("dwarven-water-bottled");
      case "heal-at-spigot": return !context.flags.has("dwarven-party-healed");
      case "turn-coin-lord":
      case "turn-sword-lord":
      case "turn-silent-lord": return !context.flags.has("undertaker-statue-solved");
      case "disable-heart-acid": return context.hasStoneBoxKey && !context.resolved;
      case "force-heart-acid": return !context.hasStoneBoxKey && !context.flags.has("heart-acid-dropped") && !context.resolved;
      case "swap-relic-with-sand": return context.adjacent && (context.activeId === "custom-hero" || /rogue/i.test(context.activeRole || ""));
      case "clear-dwarven-cave-in": return context.adjacent && context.hasMiningPick;
      case "crawl-sewer-to-flood":
      case "crawl-flood-to-sewer": return context.adjacent && context.hasPukeRing;
      case "break-halleth-bars": return !context.flags.has("halleth-bars-open");
      case "pick-halleth-lock": return /rogue/i.test(context.activeRole || "") && !context.flags.has("halleth-bars-open");
      default: return true;
    }
  }).map((action) => action.id === "disable-heart-acid"
    ? { ...action, label: "Insert Stone-box Key" }
    : action);

  const notices: string[] = [];
  if (id === "heart-acid" && !context.hasStoneBoxKey) notices.push(
    context.flags.has("heart-acid-dropped")
      ? "The acid has drained, but the Stone-box Key from the hidden club is still required."
      : "Or return with the Stone-box Key from the hidden club to open it safely.",
  );
  if ((id === "sewer-secret-grate" || id === "flood-room-secret-grate") && !context.hasPukeRing)
    notices.push("The runoff would strip the flesh from anyone not protected by the Ring of Puke Immunity.");

  return {
    image: definition.panel?.image,
    descriptionClassName: definition.panel?.descriptionClassName,
    hint: context.resolved
      ? "This interaction is complete. The room remembers the outcome."
      : id === "proximity-bomb" && context.resolved
        ? "A sandbag now holds the stable platform safely in place."
        : definition.panel?.hint !== undefined
          ? definition.panel.hint
        : context.kind === "trap" ? "The mechanism is dangerous, but its exact response is still unknown." : "Choose an action below.",
    notices,
    actions: available,
  };
};

export const getPoiDefinition = (id: string): PoiDefinition => POI_REGISTRY[id] || { id, ...defaults };

export const shouldRenderPoi = (
  id: string,
  discovered: ReadonlySet<string>,
  resolved: ReadonlySet<string>,
) => {
  const definition = getPoiDefinition(id);
  if (definition.mapRepresentation === "structural") return false;
  if (definition.hideWhenResolved && resolved.has(id)) return false;
  if (definition.visibility === "always") return true;
  return discovered.has(id);
};

export const isPoiActivationKey = (key: string) => key === "Enter" || key === " ";
