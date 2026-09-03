export type ItemSkill = {
  id?: string;
  name: string;
  range: number;
  power: number;
  accuracy: number;
  charges: number;
  maxCharges?: number;
  recharge?: "never" | "rest" | "encounter";
  source?: string;
  kind: "damage" | "heal";
  description: string;
  area?: "square" | "line";
  knockback?: number;
  stunChance?: number;
  unlimited?: boolean;
  damageType?: "physical" | "bludgeoning" | "piercing" | "slashing" | "fire" | "cold" | "lightning" | "poison" | "radiant" | "necrotic" | "psychic" | "force" | "thunder" | "acid" | "arcane";
};

export type ItemStatBlock = {
  attack: number;
  defense: number;
  investigation: number;
  evasion: number;
  move: number;
};

export type EquipmentSlot = "weapon" | "offhand" | "head" | "body" | "armor" | "accessory" | "accessory1" | "accessory2" | "quick" | "quick1" | "quick2";
export type EquipmentVisualMode = "overlay" | "sprite-filter" | "sprite-variant";
export type ItemHazardImmunity = "proximity-nuke";
export type WeaponProficiency = "simple" | "martial";
export type WeaponTag = "melee" | "finesse" | "bow" | "heavy" | "light" | "thrown" | "magical" | "versatile";
export type WeaponProfile = {
  baseDamage: number;
  modifierBonus?: number;
  damageType: "bludgeoning" | "piercing" | "slashing" | "radiant";
  range: number;
  abilityChoices: ("strength" | "dexterity" | "intelligence" | "wisdom" | "charisma")[];
  proficiency: WeaponProficiency;
  hands: 1 | 2;
  tags: WeaponTag[];
  uniqueEffect?: string;
  versatileBaseDamage?: number;
};

export type ItemEquipment = {
  slot: EquipmentSlot;
  visualClass: string;
  visualMode: EquipmentVisualMode;
  label: string;
};

export type ItemDefinition = {
  id: string;
  description: string | ((heroName: string) => string);
  hiddenEffect?: boolean;
  carry?: boolean;
  potionDelta?: number;
  stats?: Partial<ItemStatBlock>;
  skill?: ItemSkill;
  special?: "spellbook";
  dropPolicy?: "normal" | "returns-to-owner";
  removeStatsOnDrop?: boolean;
  equipment?: ItemEquipment;
  weapon?: WeaponProfile;
  shield?: { acBonus: number };
  hazardImmunities?: readonly ItemHazardImmunity[];
  cleanseConditions?: boolean;
  icon?: string;
};

const skill = (
  name: string,
  range: number,
  power: number,
  accuracy: number,
  charges: number,
  description: string,
  options: Partial<Pick<ItemSkill, "area" | "stunChance" | "unlimited" | "damageType">> = {},
): ItemSkill => ({ id: `item:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`, name, range, power, accuracy, charges, maxCharges: charges, recharge: options.unlimited ? "encounter" : "never", source: "item", kind: "damage", description, ...options });

export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  Flail: { id: "Flail", description: "Martial weapon · 4 + STR bludgeoning damage.", weapon: { baseDamage: 4, damageType: "bludgeoning", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 1, tags: ["melee"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Flail" } },
  Shield: { id: "Shield", description: "Off-hand shield · +2 AC while equipped.", shield: { acBonus: 2 }, equipment: { slot: "offhand", visualClass: "", visualMode: "overlay", label: "Shield" } },
  "Petrified Crown": {
    id: "Petrified Crown",
    description: "Permanent +1 AC and +1 Investigation applied.",
    stats: { defense: 1, investigation: 1 },
  },
  "Halleth's Guidance": {
    id: "Halleth's Guidance",
    description: "Halleth's marked route grants permanent +2 Investigation.",
    stats: { investigation: 2 },
  },
  "Chain Shirt": { id: "Chain Shirt", description: "Permanent +2 AC applied.", stats: { defense: 2 } },
  "Hide Armor": { id: "Hide Armor", description: "Permanent +1 AC applied.", stats: { defense: 1 } },
  "Wife-Beater of Questionable Resilience": {
    id: "Wife-Beater of Questionable Resilience",
    description: "If you’re going to be stupid, you’d better be tough. Grants +1 AC and immunity to the J64 nuke while carried; equip it to wear the battered white shirt.",
    stats: { defense: 1 },
    removeStatsOnDrop: true,
    equipment: { slot: "body", visualClass: "wifebeater-equipped", visualMode: "sprite-variant", label: "Wife-Beater" },
    hazardImmunities: ["proximity-nuke"],
  },
  "Ring of Puke Immunity": {
    id: "Ring of Puke Immunity",
    description: "Permanent +1 AC. Ignores puke, poison-floor, and corrosive-sludge damage, including Level 2 hazards, and permits travel through sewage runoff grates.",
    stats: { defense: 1 },
    removeStatsOnDrop: true,
  },
  "Potion of Speed": {
    id: "Potion of Speed",
    description: "Drink immediately to gain +1 permanent movement range.",
    stats: { move: 1 },
    carry: false,
  },
  "Healing Potion": { id: "Healing Potion", description: "Restores 50 HP.", potionDelta: 1, carry: false },
  "Trollblood Flask": { id: "Trollblood Flask", description: "Counts as one Healing Potion.", potionDelta: 1, carry: false },
  "Circlet of Blasting": {
    id: "Circlet of Blasting",
    description: "Scorching Ray added · 3 charges.",
    skill: skill("Scorching Ray", 5, 18, 5, 3, "Fire one searing ray. Three charges remain in the circlet."),
  },
  "Holy Water": {
    id: "Holy Water",
    description: "Throw Holy Water added · single-use 3×3 radiant splash.",
    skill: skill("Throw Holy Water", 4, 20, 5, 1, "A single-use 3×3 radiant splash.", { area: "square" }),
  },
  Handaxe: {
    id: "Handaxe",
    description: "Repeatable Hurl Handaxe action added.",
    skill: skill("Hurl Handaxe", 4, 16, 0, 1, "Throw the recovered handaxe and retrieve it after the attack.", { unlimited: true }),
    weapon: { baseDamage: 3, damageType: "slashing", range: 4, abilityChoices: ["strength"], proficiency: "simple", hands: 1, tags: ["melee", "light", "thrown"] },
    equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Handaxe" },
  },
  "Dwarven Mining Pick": {
    id: "Dwarven Mining Pick",
    description: "Hooking Strike added · a repeatable melee attack with a chance to stun.",
    skill: skill("Hooking Strike", 1, 15, 0, 1, "Catch armor, limbs, or dungeon masonry with the pick's hooked head.", { stunChance: 25, unlimited: true }),
    weapon: { baseDamage: 4, damageType: "piercing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 1, tags: ["melee"] },
    equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Mining Pick" },
  },
  "Stolen Proximity Bomb": {
    id: "Stolen Proximity Bomb",
    description: "Drop Bomb added · place the single-use nuke at your feet, then move outside its 3×3 blast to detonate it.",
    skill: skill("Drop Proximity Bomb", 0, 35, 100, 1, "Drop the stolen nuke at your feet. It detonates only after you leave its 3×3 blast area, without ending your remaining movement.", { area: "square" }),
  },
  "Emerald Frag Grenade": {
    id: "Emerald Frag Grenade",
    description: "Single-use Dust 2 throwable · 3×3 blast · DEX save for half of 12 piercing damage.",
    skill: skill("Throw Frag Grenade", 8, 12, 100, 1, "Blast a 3×3 area. Targets make a Dexterity save for half damage.", { area:"square", damageType:"piercing" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Frag Grenade" },
    icon: "/dust2-frag-grenade.png",
  },
  "Crystal Flashbang": {
    id: "Crystal Flashbang",
    description: "Single-use Dust 2 throwable · creatures in the 3×3 flash make a DEX save or become Blinded for one round.",
    skill: skill("Throw Flashbang", 8, 0, 100, 1, "Flash a 3×3 area. A failed Dexterity save Blinds for one round.", { area:"square", damageType:"radiant" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Flashbang" },
  },
  "Alchemical Molotov": {
    id: "Alchemical Molotov",
    description: "Single-use Dust 2 throwable · creates a 3×3 burning zone for three rounds.",
    skill: skill("Throw Molotov", 8, 0, 100, 1, "Create a 3×3 fire zone that burns creatures inside each round.", { area:"square", damageType:"fire" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Molotov" },
    icon: "/dust2-molotov.png",
  },
  "Runic Smoke Grenade": {
    id: "Runic Smoke Grenade",
    description: "Single-use Dust 2 throwable · creates a 3×3 smoke cloud that blocks vision for three rounds.",
    skill: skill("Throw Smoke Grenade", 8, 0, 100, 1, "Create a 3×3 smoke cloud that blocks vision for three rounds.", { area:"square" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Smoke Grenade" },
  },
  "Frost Grenade": {
    id: "Frost Grenade",
    description: "Single-use spell grenade · 3×3 cold blast and slippery difficult terrain · failed CON save reduces movement.",
    skill: skill("Throw Frost Grenade", 8, 6, 100, 1, "Deal light cold damage in a 3×3 area and leave slippery difficult terrain. A failed Constitution save also reduces movement.", { area:"square", damageType:"cold" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Frost Grenade" },
  },
  "Teleport Grenade": {
    id: "Teleport Grenade",
    description: "Single-use spell grenade · swap with a creature or teleport to an open impact square.",
    skill: skill("Throw Teleport Grenade", 8, 0, 100, 1, "Swap positions with the creature at the impact point, or teleport to an open impact square.", { movement:"teleport" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Teleport Grenade" },
  },
  "Entangle Grenade": {
    id: "Entangle Grenade",
    description: "Single-use spell grenade · creates a 3×3 restraining plant zone for three rounds.",
    skill: skill("Throw Entangle Grenade", 8, 0, 100, 1, "Create a 3×3 plant zone. Creatures make a Strength save or become Restrained.", { area:"square" }),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Entangle Grenade" },
  },
  "Banishment Grenade": {
    id: "Banishment Grenade",
    description: "Single-use spell grenade · failed CHA save removes one creature for a complete round.",
    skill: skill("Throw Banishment Grenade", 8, 0, 100, 1, "One creature makes a Charisma save or disappears for one complete round, then returns to the same or nearest open square."),
    equipment: { slot:"quick", visualClass:"", visualMode:"overlay", label:"Banishment Grenade" },
  },
  "Dragon Glass AWP": {
    id: "Dragon Glass AWP",
    description: "Two-handed arcane sniper rifle · 10 + DEX piercing damage · 14-square range.",
    weapon: { baseDamage:10, damageType:"piercing", range:14, abilityChoices:["dexterity"], proficiency:"martial", hands:2, tags:["heavy"], uniqueEffect:"Long-range scoped shot" },
    equipment: { slot:"weapon", visualClass:"dragon-glass-awp-equipped", visualMode:"sprite-variant", label:"Dragon Glass AWP" },
    icon: "/dust2-dragon-glass-awp.png",
  },
  "Dragonfire Deagle": {
    id: "Dragonfire Deagle",
    description: "One-handed runic hand cannon · 7 + DEX piercing damage · 10-square range.",
    weapon: { baseDamage:7, damageType:"piercing", range:10, abilityChoices:["dexterity"], proficiency:"martial", hands:1, tags:[], uniqueEffect:"Runic hand cannon" },
    equipment: { slot:"weapon", visualClass:"dragonfire-deagle-equipped", visualMode:"sprite-variant", label:"Dragonfire Deagle" },
    icon: "/dust2-dragonfire-deagle.png",
  },
  "Blue Lightsaber": {
    id: "Blue Lightsaber",
    description: "+1 martial finesse weapon · 7 + STR or DEX +1 radiant damage; +1 to hit. Equip it to display the blue blade.",
    weapon: { baseDamage: 7, modifierBonus: 1, damageType: "radiant", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "martial", hands: 1, tags: ["melee", "finesse", "magical"], uniqueEffect: "Lightblade" },
    skill: skill("Plasma Slash", 1, 24, 8, 1, "Cut through a nearby target with the blue energy blade.", { unlimited: true }),
    equipment: { slot: "weapon", visualClass: "blue-lightsaber-equipped", visualMode: "sprite-variant", label: "Blue Lightsaber" },
  },
  Quarterstaff: {
    id: "Quarterstaff",
    description: "Repeatable Staff Trip action added.",
    skill: skill("Staff Trip", 1, 12, 4, 1, "A repeatable sweeping strike with a chance to stun.", { stunChance: 25, unlimited: true }),
    weapon: { baseDamage: 3, damageType: "bludgeoning", range: 1, abilityChoices: ["strength"], proficiency: "simple", hands: 1, tags: ["melee", "versatile"], versatileBaseDamage: 4 },
    equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Quarterstaff" },
  },
  "Kelim's Spellbook": { id: "Kelim's Spellbook", description: "Read to permanently learn Kelim's Shortcut: teleport up to 30 feet, once per day.", special: "spellbook" },
  "Glasses of Good Questions": {
    id: "Glasses of Good Questions",
    description: "These spectacles reward curiosity, not intelligence. Unlocks special questions for this character.",
  },
  "Ball Cap of Bad Ideas": {
    id: "Ball Cap of Bad Ideas",
    description: "A dirty blue ballcap taken from the fallen guard. Equip it to wear the cap; carrying it still unlocks its terrible ideas. A note inside the sweatband says the patrol split: some ran toward the village, while something bigger dragged the others deeper into the woods.",
    hiddenEffect: true,
    equipment: { slot: "head", visualClass: "ballcap-equipped", visualMode: "sprite-variant", label: "Ball Cap" },
  },
  "Emo Outfit": {
    id: "Emo Outfit",
    description: "Equip the living black goo as an aggressively emo outfit. Emo Bonding grants +10 Stealth.",
    hiddenEffect: true,
    equipment: { slot: "body", visualClass: "emo-outfit-equipped", visualMode: "sprite-filter", label: "Emo Outfit" },
  },
  "5 gp": { id: "5 gp", description: "Five old gold coins recovered from the boundary shrine." },
  "25 gp": { id: "25 gp", description: "A hidden floor cache. Enough to buy off the bugbear deserters or the Undertakers." },
  Ration: { id: "Ration", description: "A simple meal. Some hungry creatures value it more than gold." },
  "Fresh Meat": { id: "Fresh Meat", description: "The troll in Room 18 may prefer this to combat." },
  "Bag of Flour": { id: "Bag of Flour", description: "A sealed pantry sack. Gromm needs it to complete the spirit-binding circle in Room 19c." },
  "Magic Circle Recipe": { id: "Magic Circle Recipe", description: "Gromm's church-bakery method for containing spirits. Permanently unlocks authored spirit-circle solutions." },
  "Undertaker Coin Purse": { id: "Undertaker Coin Purse", description: "Harria and her flesh golem will accept this payment." },
  "Copper Tankard": { id: "Copper Tankard", description: "Can carry one extra dose from the dwarven healing spigot." },
  "Wererat Lycanthropy": { id: "Wererat Lycanthropy", description: "Rat-Touched: this character can speak with rats." },
  "Werewolf Lycanthropy": { id: "Werewolf Lycanthropy", description: "Wolf-Touched: this character can speak with dogs and wolves." },
  "Disguise Kit": {
    id: "Disguise Kit",
    description: (heroName) => `Choose a monster disguise. Ordinary enemies ignore ${heroName}; Manticores and the Two-Headed King can detect disguises. Attacking breaks it.`,
  },
  "Dwarven Signet Ring": { id: "Dwarven Signet Ring", description: "An Undertaker maintenance seal that can open the hidden release in Gromm's flour ward." },
  "Stone-box Key": { id: "Stone-box Key", description: "Fits the narrow keyway beneath the green acid mechanism." },
  "Delver's Compass": { id: "Delver's Compass", description: "Points generally toward the crown-sealed stairs leading deeper into Undermountain." },
  "Dweomercore Remedial Diploma": { id: "Dweomercore Remedial Diploma", description: "A genuine remedial diploma. It may open doors later." },
  "Bar of Soap": {
    id: "Bar of Soap",
    description: "Reusable. Scrub a wound clean to remove poison and bleeding from the carrier. Each use ends that hero's action, but the soap remains in inventory.",
    cleanseConditions: true,
  },
  Dagger: { id: "Dagger", description: "Simple finesse weapon · 2 + STR or DEX piercing damage.", weapon: { baseDamage: 2, damageType: "piercing", range: 4, abilityChoices: ["strength", "dexterity"], proficiency: "simple", hands: 1, tags: ["melee", "finesse", "light", "thrown"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Dagger" } },
  "Golden Spear": { id: "Golden Spear", description: "Simple weapon · 3 + STR piercing damage.", weapon: { baseDamage: 3, damageType: "piercing", range: 4, abilityChoices: ["strength"], proficiency: "simple", hands: 1, tags: ["melee", "thrown", "versatile"], versatileBaseDamage: 4 }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Golden Spear" } },
  Scimitar: { id: "Scimitar", description: "Martial finesse weapon · 3 + STR or DEX slashing damage.", weapon: { baseDamage: 3, damageType: "slashing", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "martial", hands: 1, tags: ["melee", "finesse", "light"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Scimitar" } },
  "Light Crossbow": { id: "Light Crossbow", description: "Simple ranged weapon · 4 + DEX piercing damage.", weapon: { baseDamage: 4, damageType: "piercing", range: 10, abilityChoices: ["dexterity"], proficiency: "simple", hands: 2, tags: [] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Light Crossbow" } },
  Shortsword: { id: "Shortsword", description: "Martial finesse weapon · 3 + STR or DEX piercing damage.", weapon: { baseDamage: 3, damageType: "piercing", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "martial", hands: 1, tags: ["melee", "finesse", "light"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Shortsword" } },
  Longsword: { id: "Longsword", description: "Martial versatile weapon · 4 + STR, or 5 + STR with both hands.", weapon: { baseDamage: 4, versatileBaseDamage: 5, damageType: "slashing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 1, tags: ["melee", "versatile"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Longsword" } },
  Rapier: { id: "Rapier", description: "Martial finesse weapon · 4 + STR or DEX piercing damage.", weapon: { baseDamage: 4, damageType: "piercing", range: 1, abilityChoices: ["strength", "dexterity"], proficiency: "martial", hands: 1, tags: ["melee", "finesse"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Rapier" } },
  Longbow: { id: "Longbow", description: "Martial ranged weapon · 4 + DEX piercing damage.", weapon: { baseDamage: 4, damageType: "piercing", range: 12, abilityChoices: ["dexterity"], proficiency: "martial", hands: 2, tags: ["bow", "heavy"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Longbow" } },
  Greataxe: { id: "Greataxe", description: "Martial heavy weapon · 6 + STR slashing damage.", weapon: { baseDamage: 6, damageType: "slashing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 2, tags: ["melee", "heavy"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Greataxe" } },
  Greatsword: { id: "Greatsword", description: "Martial heavy weapon · 7 + STR slashing damage.", weapon: { baseDamage: 7, damageType: "slashing", range: 1, abilityChoices: ["strength"], proficiency: "martial", hands: 2, tags: ["melee", "heavy"] }, equipment: { slot: "weapon", visualClass: "", visualMode: "overlay", label: "Greatsword" } },
};

export const PURPOSELESS_DUNGEON_LOOT = new Set([
  "Silver Necklace",
  "Traveler's Flute",
  "Manticore Hoard",
  "Burglar's Pack",
  "Minotaur's Treasure",
  "Rescue Supplies",
]);

export const OBSOLETE_DUNGEON_DROP_IDS = new Set([
  "room-loot-16-chest",
  "room-loot-34-chest",
  "puke-tunnel-reward-chest",
  "western-pillar-gold-cache",
  "room-loot-9b-chest",
]);

export const getItemDefinition = (item: string): ItemDefinition => ITEM_REGISTRY[item] || {
  id: item,
  description: "Character-owned dungeon loot.",
};

export const describeItem = (item: string, heroName: string) => {
  const description = getItemDefinition(item).description;
  return typeof description === "function" ? description(heroName) : description;
};

export const itemsGrantHazardImmunity = (items: readonly string[] | undefined, hazard: ItemHazardImmunity) =>
  !!items?.some((item) => getItemDefinition(item).hazardImmunities?.includes(hazard));

export const emptyItemStats = (): ItemStatBlock => ({ attack: 0, defense: 0, investigation: 0, evasion: 0, move: 0 });

export const achievementBoxReward = (award: { id: string; tier: string }) => {
  if (award.id.startsWith("king-slayer:")) return "Circlet of Blasting";
  if (award.id.startsWith("whole-company-survived:")) return "Trollblood Flask";
  if (award.tier === "Gold" || award.tier === "Legendary") return "Holy Water";
  if (award.tier === "Silver") return "Potion of Speed";
  return "Healing Potion";
};
