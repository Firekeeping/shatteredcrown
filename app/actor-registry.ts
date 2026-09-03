import type { Ability, AbilityScores, ConditionName, DamageType, SkillProficiency } from "./game-types";

export type CreatureSize = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";
export type MovementSpeeds = { walk: number; fly?: number; swim?: number; climb?: number; burrow?: number };
export type MonsterAttack = { id: string; name: string; attackBonus?: number; reach: number; damage: number; damageType: DamageType; attacks?: number; additionalDamage?: { damage: number; damageType: DamageType }[]; save?: { ability: Ability; dc: number; halfDamage?: boolean }; recharge?: { min: number; max: number }; conditions?: { condition: ConditionName; saveAbility?: Ability; saveDc?: number; durationRounds?: number; repeatSave?: boolean }[] };
export type MonsterStatBlock = {
  size: CreatureSize;
  creatureType: string;
  alignment?: string;
  armorClass: number;
  hitPoints: number;
  speeds: MovementSpeeds;
  initiativeModifier: number;
  abilities: AbilityScores;
  saveProficiencies: Ability[];
  skills: Partial<Record<SkillProficiency, number>>;
  resistances: DamageType[];
  immunities: DamageType[];
  vulnerabilities: DamageType[];
  conditionImmunities: ConditionName[];
  senses: string[];
  languages: string[];
  challengeRating: number;
  xp: number;
  proficiencyBonus: number;
  traits: { id: string; name: string; description: string }[];
  attacks: MonsterAttack[];
};

export type AbilityDefinition = {
  id: string;
  name: string;
  range: number;
  power: number;
  attackBonus?: number;
  save?: { ability: Ability; dc: number; halfDamage?: boolean };
  charges: number;
  maxCharges?: number;
  recharge?: "never" | "rest" | "encounter";
  source?: string;
  kind: "damage" | "heal";
  area?: "square" | "line";
  chargeRounds?: number;
  damageType?: "physical" | "fire" | "lightning" | "radiant" | "arcane";
  knockback?: number;
  stunChance?: number;
  unlimited?: boolean;
  instakill?: boolean;
  description: string;
};

export type ActorDefinition = {
  id: string;
  name: string;
  role: string;
  visualKind: "monster" | "humanoid" | "noncombat";
  cr: number;
  abilities: AbilityDefinition[];
  primaryAbility: Ability;
  sprite: string;
  ai: "skirmisher" | "controller" | "brute" | "standard";
  footprint?: { width: number; height: number };
  statBlock: MonsterStatBlock;
};

const ability = (
  id: string,
  name: string,
  range: number,
  power: number,
  attackBonus: number,
  charges: number,
  description: string,
): AbilityDefinition => ({ id, name, range, power, attackBonus, charges, maxCharges: charges, recharge: "encounter", source: "monster", kind: "damage", description });

export const ABILITY_REGISTRY: Record<string, AbilityDefinition> = {
  "dirty-slash": ability("dirty-slash", "Dirty Slash", 1, 13, 4, 2, "A vicious low strike."),
  pounce: ability("pounce", "Pounce", 1, 17, 5, 2, "A savage leaping bite."),
  greatclub: ability("greatclub", "Greatclub", 1, 25, 6, 2, "A massive club strike."),
  boulder: ability("boulder", "Boulder", 4, 18, 6, 2, "Hurl a heavy stone."),
  "rending-claws": ability("rending-claws", "Rending Claws", 1, 25, 6, 3, "A brutal two-handed rake."),
  "predators-leap": ability("predators-leap", "Predator's Leap", 1, 21, 6, 2, "A sudden, accurate lunge."),
  "wyrmling-rend": { ...ability("wyrmling-rend", "Rend", 1, 7, 4, 99, "Two attacks: 5 slashing plus 2 acid each."), unlimited: true, damageType: "acid" },
  "wyrmling-acid-breath": { ...ability("wyrmling-acid-breath", "Acid Breath", 3, 22, 0, 1, "DC 11 DEX save in a 3-square line; half damage on success. Recharge 5–6."), save: { ability: "dexterity", dc: 11, halfDamage: true }, area: "line", damageType: "acid", recharge: "never" },
};

const skills = (...ids: string[]) => ids.map((id) => ({ ...ABILITY_REGISTRY[id] }));

const XP_BY_CR: Record<string, number> = {
  "0": 10, "0.125": 25, "0.25": 50, "0.5": 100, "1": 200, "2": 450,
  "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900,
  "9": 5000, "10": 5900,
};
type MonsterInput = {
  cr: number; sprite: string; hp: number; ac: number; move: number; damage: number;
  visualKind: ActorDefinition["visualKind"];
  attackBonus: number; range?: number; initiative?: number; abilities: AbilityScores;
  primary?: Ability; saves?: Ability[]; ai?: ActorDefinition["ai"]; skills?: AbilityDefinition[];
  name?: string; role?: string; footprint?: { width: number; height: number };
  damageType?: DamageType; resistances?: DamageType[]; immunities?: DamageType[];
  vulnerabilities?: DamageType[]; conditionImmunities?: ConditionName[];
  size?: CreatureSize; creatureType?: string; alignment?: string; speeds?: MovementSpeeds;
  skillBonuses?: Partial<Record<SkillProficiency, number>>; senses?: string[]; languages?: string[];
  traits?: MonsterStatBlock["traits"]; attacks?: MonsterAttack[];
};

const proficiencyForCr = (cr: number) => cr >= 9 ? 4 : cr >= 5 ? 3 : 2;
const actorCreatureType = (id: string): string => {
  if (["Giant Rat", "Dire Wolf"].includes(id)) return "beast";
  if (id === "Gelatinous Cube") return "ooze";
  if (["Living Shroud", "Spectral Delver", "Brell, Expedition Leader", "Marda, Celebrant", "Osric, Cartographer", "Halleth"].includes(id)) return "undead";
  if (id === "Black Dragon") return "dragon";
  if (["Grell", "Grick", "Grick Alpha"].includes(id)) return "aberration";
  if (["Troll", "Ettin"].includes(id)) return "giant";
  if (id === "Flesh Golem") return "construct";
  if (id === "Air Elemental") return "elemental";
  if (["Manticore", "Large Mimic", "Nightmare Clown"].includes(id)) return "monstrosity";
  return "humanoid";
};
const actorSize = (id: string, footprint?: { width: number; height: number }): CreatureSize => {
  if (id === "Giant Rat") return "small";
  if (["Gelatinous Cube", "Grick Alpha", "Troll", "Flesh Golem", "Air Elemental", "Manticore", "Ettin", "Large Mimic"].includes(id)) return "large";
  return footprint ? "large" : "medium";
};
const AUTHORED_ATTACK_NAMES: Record<string, string> = {
  "Giant Rat": "Bite", "Gelatinous Cube": "Engulf", "Dire Wolf": "Bite",
  Grell: "Tentacles", Grick: "Beak and Tentacles", "Grick Alpha": "Rending Tentacles", Troll: "Claw",
  "Flesh Golem": "Slam", "Air Elemental": "Whirlwind Slam", Werewolf: "Claws", Manticore: "Tail Spike",
  Flyndol: "Silvered Blade", Ettin: "Two-Headed Assault", "Large Mimic": "Adhesive Pseudopod",
};
const authoredAttackName = (id: string, type: DamageType, range = 1) => AUTHORED_ATTACK_NAMES[id] || `${id} ${range > 1 ? "Shot" : type === "slashing" ? "Slash" : type === "piercing" ? "Thrust" : "Strike"}`;
const authoredAttackCount = (id: string) => ["Werewolf", "Flesh Golem", "Ettin"].includes(id) ? 2 : ["Troll", "Manticore"].includes(id) ? 3 : 1;
const authoredAttackConditions = (id: string): NonNullable<MonsterAttack["conditions"]> => {
  if (id === "Dire Wolf") return [{ condition:"prone", saveAbility:"strength", saveDc:13, durationRounds:1 }];
  if (id === "Grell") return [{ condition:"stunned", saveAbility:"constitution", saveDc:11, durationRounds:1 }];
  if (id === "Large Mimic") return [{ condition:"grappled", saveAbility:"strength", saveDc:13, repeatSave:true }];
  return [];
};
const authoredSenses = (id: string, type: string, wisdom: number) => {
  const passive = 10 + Math.floor((wisdom - 10) / 2);
  const special = ["ooze", "undead", "aberration", "monstrosity", "dragon", "elemental"].includes(type) ? ["darkvision 12 squares"] : [];
  if (["Gelatinous Cube", "Large Mimic"].includes(id)) special.unshift("blindsight 6 squares");
  return [...special, `passive Perception ${passive}`];
};
const authoredLanguages = (type: string) => type === "humanoid" ? ["Common"] : type === "giant" ? ["Giant"] : type === "dragon" ? ["Draconic"] : type === "undead" ? ["understands Common"] : [];
const authoredTraits = (id: string): MonsterStatBlock["traits"] => ({
  "Giant Rat": [{ id:"keen-smell", name:"Keen Smell", description:"Has advantage on Perception checks relying on smell." }],
  "Dire Wolf": [{ id:"pack-tactics", name:"Pack Tactics", description:"Gains advantage while an ally threatens the target." }],
  Troll: [{ id:"regeneration", name:"Regeneration", description:"Regains 10 HP at the start of its turn unless fire stopped it." }],
  "Gelatinous Cube": [{ id:"amorphous", name:"Amorphous", description:"Can move through narrow openings and engulf occupied spaces." }],
  "Large Mimic": [{ id:"false-appearance", name:"False Appearance", description:"Appears to be an ordinary object until it attacks." }],
  "Air Elemental": [{ id:"air-form", name:"Air Form", description:"Can pass through narrow openings and creatures." }],
  "Flesh Golem": [{ id:"lightning-absorption", name:"Lightning Absorption", description:"Lightning damage heals the golem instead of harming it." }],
  Ettin: [{ id:"two-heads", name:"Two Heads", description:"Has heightened perception and resists being blinded or stunned." }],
}[id] || []);
const authoredSpeeds = (id: string, walk: number): MovementSpeeds => {
  if (["Grell", "Air Elemental", "Manticore"].includes(id)) return { walk, fly: id === "Air Elemental" ? 18 : walk * 2 };
  if (id === "Black Dragon") return { walk, fly: 12, swim: 6 };
  if (["Grick", "Grick Alpha"].includes(id)) return { walk, climb: walk };
  return { walk };
};
const monster = (id: string, input: MonsterInput): ActorDefinition => ({
  id, name: input.name || id, role: input.role || id, cr: input.cr, sprite: input.sprite,
  visualKind: input.visualKind, ai: input.ai || "standard", footprint: input.footprint, abilities: input.skills || [], primaryAbility: input.primary || "strength",
  statBlock: {
    size: input.size || actorSize(id, input.footprint), creatureType: input.creatureType || actorCreatureType(id), alignment: input.alignment, armorClass: input.ac, hitPoints: input.hp,
    speeds: input.speeds || authoredSpeeds(id, input.move), initiativeModifier: Math.floor((input.abilities.dexterity - 10) / 2), abilities: input.abilities,
    saveProficiencies: input.saves || [], skills: input.skillBonuses || { Perception: Math.floor((input.abilities.wisdom - 10) / 2) }, resistances: input.resistances || [], immunities: input.immunities || [],
    vulnerabilities: input.vulnerabilities || [], conditionImmunities: input.conditionImmunities || [], senses: input.senses || authoredSenses(id, input.creatureType || actorCreatureType(id), input.abilities.wisdom), languages: input.languages || authoredLanguages(input.creatureType || actorCreatureType(id)),
    challengeRating: input.cr, xp: XP_BY_CR[String(input.cr)] || Math.max(10, Math.round(input.cr * 200)), proficiencyBonus: proficiencyForCr(input.cr), traits: input.traits || authoredTraits(id),
    attacks: input.attacks || [
      { id: `${id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-attack`, name: authoredAttackName(id, input.damageType || "physical", input.range), attackBonus: input.attackBonus, reach: input.range || 1, damage: input.damage, damageType: input.damageType || "physical", attacks: authoredAttackCount(id), conditions: authoredAttackConditions(id) },
      ...(input.skills || []).map((skill) => ({ id: skill.id, name: skill.name, attackBonus: skill.attackBonus, reach: skill.range, damage: skill.power, damageType: skill.damageType || input.damageType || "physical", save: skill.save })),
    ],
  },
});

const stats = (strength: number, dexterity: number, constitution: number, intelligence: number, wisdom: number, charisma: number): AbilityScores =>
  ({ strength, dexterity, constitution, intelligence, wisdom, charisma });

export const ACTOR_REGISTRY: Record<string, ActorDefinition> = {
  Goblin: monster("Goblin", { visualKind:"monster",cr:.25,sprite:"/monster-goblin-sprites.png",hp:14,ac:13,move:5,damage:5,attackBonus:4,abilities:stats(8,14,10,10,8,8),primary:"dexterity",ai:"skirmisher",skills:skills("dirty-slash"),damageType:"slashing" }),
  "Hungry Goblin": monster("Hungry Goblin", { visualKind:"monster",cr:.25,sprite:"/monster-goblin-sprites.png",hp:12,ac:12,move:5,damage:5,attackBonus:4,abilities:stats(9,14,9,8,9,7),primary:"dexterity",ai:"skirmisher",damageType:"slashing" }),
  "Goblin in a White Shirt": monster("Goblin in a White Shirt", { visualKind:"monster",cr:.25,sprite:"/monster-goblin-sprites.png",hp:16,ac:14,move:5,damage:6,attackBonus:4,abilities:stats(10,14,11,9,9,10),primary:"dexterity",ai:"skirmisher",damageType:"piercing" }),
  "Giant Rat": monster("Giant Rat", { visualKind:"monster",cr:.125,sprite:"/monster-giant-rat-sprites.png",hp:7,ac:12,move:6,damage:4,attackBonus:4,abilities:stats(7,15,11,2,10,4),primary:"dexterity",ai:"skirmisher",damageType:"piercing" }),
  "Gelatinous Cube": monster("Gelatinous Cube", { visualKind:"monster",cr:2,sprite:"/monster-gelatinous-cube-sprites.png",hp:84,ac:6,move:3,damage:14,attackBonus:4,abilities:stats(14,3,20,1,6,1),ai:"brute",damageType:"acid",immunities:["poison"],conditionImmunities:["poisoned","bleeding","stunned"] }),
  "Black Dragon": monster("Black Dragon", { visualKind:"monster",cr:2,sprite:"/black-dragon-sprites-v2.png",hp:33,ac:17,move:6,damage:7,attackBonus:4,abilities:stats(15,14,13,10,11,13),primary:"strength",ai:"controller",skills:skills("wyrmling-rend","wyrmling-acid-breath"),damageType:"slashing",immunities:["acid"],saves:["dexterity","wisdom"],size:"medium",creatureType:"dragon",alignment:"chaotic evil",speeds:{walk:6,fly:12,swim:6},skillBonuses:{Perception:4,Stealth:4},senses:["blindsight 2 squares","darkvision 12 squares","passive Perception 14"],languages:["Draconic"],traits:[{id:"amphibious",name:"Amphibious",description:"The dragon can breathe air and water."}],attacks:[{id:"wyrmling-rend",name:"Rend",attackBonus:4,reach:1,damage:5,damageType:"slashing",attacks:2,additionalDamage:[{damage:2,damageType:"acid"}]},{id:"wyrmling-acid-breath",name:"Acid Breath",reach:3,damage:22,damageType:"acid",save:{ability:"dexterity",dc:11,halfDamage:true},recharge:{min:5,max:6}}] }),
  "Nightmare Clown": monster("Nightmare Clown", { visualKind:"monster",cr:3,sprite:"/monster-nightmare-clown-sprites-v1.png",hp:110,ac:17,move:5,damage:19,attackBonus:6,abilities:stats(16,15,16,14,14,18),primary:"charisma",ai:"controller",damageType:"psychic",saves:["wisdom","charisma"] }),
  "Professor Vale": monster("Professor Vale", { visualKind:"humanoid",cr:4,sprite:"/professor-vale.png",hp:52,ac:15,move:5,damage:9,attackBonus:5,range:5,abilities:stats(9,14,14,17,15,16),primary:"intelligence",ai:"controller",damageType:"arcane",saves:["intelligence","wisdom"],creatureType:"humanoid",languages:["Common","Elvish"] }),
  "Living Shroud": monster("Living Shroud", { visualKind:"monster",cr:3,sprite:"/monster-living-shroud-sprites.png",hp:72,ac:15,move:5,damage:15,attackBonus:5,range:3,abilities:stats(12,16,14,8,14,10),primary:"dexterity",ai:"controller",damageType:"necrotic",resistances:["cold","necrotic"],conditionImmunities:["bleeding"] }),
  "Spectral Delver": monster("Spectral Delver", { visualKind:"monster",cr:1,sprite:"/shade-sprites.png",hp:30,ac:13,move:4,damage:9,attackBonus:4,abilities:stats(8,14,12,10,12,14),primary:"dexterity",damageType:"necrotic",resistances:["physical","cold","necrotic"],conditionImmunities:["poisoned","bleeding"] }),
  "Brell, Expedition Leader": monster("Brell, Expedition Leader", { visualKind:"monster",cr:1,sprite:"/shade-sprites.png",hp:36,ac:14,move:4,damage:10,attackBonus:4,abilities:stats(12,14,12,11,13,15),damageType:"necrotic",resistances:["physical","cold","necrotic"],conditionImmunities:["poisoned","bleeding"] }),
  "Marda, Celebrant": monster("Marda, Celebrant", { visualKind:"monster",cr:1,sprite:"/shade-sprites.png",hp:28,ac:13,move:4,damage:8,attackBonus:4,abilities:stats(8,15,11,12,14,16),primary:"dexterity",damageType:"psychic",resistances:["physical","cold","necrotic"],conditionImmunities:["poisoned","bleeding"] }),
  "Osric, Cartographer": monster("Osric, Cartographer", { visualKind:"monster",cr:1,sprite:"/shade-sprites.png",hp:26,ac:12,move:4,damage:9,attackBonus:4,range:4,abilities:stats(8,14,10,16,15,11),primary:"intelligence",damageType:"force",resistances:["physical","cold","necrotic"],conditionImmunities:["poisoned","bleeding"] }),
  "Dire Wolf": monster("Dire Wolf", { visualKind:"monster",cr:1,sprite:"/monster-dire-wolf-sprites.png",hp:19,ac:14,move:7,damage:10,attackBonus:5,abilities:stats(17,15,15,3,12,7),ai:"skirmisher",skills:skills("pounce"),damageType:"piercing" }),
  Grell: monster("Grell", { visualKind:"monster",cr:3,sprite:"/monster-grell-sprites.png",hp:65,ac:12,move:6,damage:14,attackBonus:5,range:2,abilities:stats(15,14,16,12,11,9),ai:"controller",damageType:"lightning",immunities:["lightning"],conditionImmunities:["stunned"] }),
  Grick: monster("Grick", { visualKind:"monster",cr:2,sprite:"/monster-grick-sprites.png",hp:42,ac:14,move:5,damage:11,attackBonus:5,abilities:stats(14,14,14,3,14,5),ai:"skirmisher",damageType:"slashing",resistances:["physical"] }),
  "Grick Alpha": monster("Grick Alpha", { visualKind:"monster",cr:5,sprite:"/monster-grick-alpha-sprites.png",hp:120,ac:16,move:5,damage:20,attackBonus:7,abilities:stats(18,16,17,4,14,7),ai:"brute",damageType:"slashing",resistances:["physical"] }),
  Bugbear: monster("Bugbear", { visualKind:"monster",cr:1,sprite:"/monster-bugbear-sprites.png",hp:35,ac:14,move:5,damage:11,attackBonus:4,abilities:stats(15,14,13,8,11,9),ai:"skirmisher",damageType:"bludgeoning" }),
  "Pillar Bugbear": monster("Pillar Bugbear", { visualKind:"monster",cr:1,sprite:"/monster-bugbear-sprites.png",hp:40,ac:15,move:4,damage:12,attackBonus:5,abilities:stats(16,13,14,8,12,8),ai:"brute",damageType:"bludgeoning" }),
  Troll: monster("Troll", { visualKind:"monster",cr:5,sprite:"/monster-troll-sprites.png",hp:130,ac:15,move:5,damage:18,attackBonus:7,abilities:stats(18,13,20,7,9,7),ai:"brute",damageType:"slashing",vulnerabilities:["fire"] }),
  "Flesh Golem": monster("Flesh Golem", { visualKind:"monster",cr:5,sprite:"/monster-flesh-golem-sprites.png",hp:125,ac:13,move:4,damage:19,attackBonus:7,abilities:stats(20,9,18,6,10,5),ai:"brute",damageType:"bludgeoning",immunities:["poison","lightning"],conditionImmunities:["poisoned","bleeding","stunned"] }),
  "Air Elemental": monster("Air Elemental", { visualKind:"monster",cr:5,sprite:"/monster-air-elemental-sprites.png",hp:100,ac:15,move:8,damage:17,attackBonus:8,abilities:stats(14,20,14,6,10,6),primary:"dexterity",ai:"controller",damageType:"bludgeoning",resistances:["lightning","thunder","physical"],immunities:["poison"],conditionImmunities:["poisoned","bleeding","stunned"] }),
  Werewolf: monster("Werewolf", { visualKind:"monster",cr:3,sprite:"/werewolf-sprites-v3.png",hp:41,ac:15,move:6,damage:15,attackBonus:6,abilities:stats(17,15,16,10,12,10),ai:"brute",skills:skills("rending-claws","predators-leap"),damageType:"slashing",resistances:["physical"] }),
  Manticore: monster("Manticore", { visualKind:"monster",cr:3,sprite:"/monster-manticore-sprites.png",hp:88,ac:14,move:5,damage:14,attackBonus:5,range:6,abilities:stats(17,16,17,7,12,8),primary:"dexterity",ai:"controller",damageType:"piercing",footprint:{width:2,height:1} }),
  "Bandit Swordsman": monster("Bandit Swordsman", { visualKind:"humanoid",cr:.5,sprite:"/monster-bandit-sprites.png",hp:28,ac:13,move:5,damage:7,attackBonus:4,abilities:stats(13,14,12,10,10,10),primary:"dexterity",damageType:"slashing" }),
  Harria: monster("Harria", { visualKind:"humanoid",cr:2,sprite:"/monster-bandit-sprites.png",hp:48,ac:15,move:5,damage:11,attackBonus:5,abilities:stats(13,16,14,14,12,16),primary:"dexterity",ai:"controller",damageType:"piercing" }),
  Flyndol: monster("Flyndol", { visualKind:"monster",cr:2,sprite:"/monster-wererat-sprites.png",hp:45,ac:14,move:6,damage:10,attackBonus:5,abilities:stats(12,17,13,12,14,10),primary:"dexterity",ai:"skirmisher",damageType:"piercing",resistances:["physical"] }),
  "Dwarf Survivor": monster("Dwarf Survivor", { visualKind:"humanoid",cr:.5,sprite:"/monster-bandit-sprites.png",hp:32,ac:14,move:4,damage:7,attackBonus:4,abilities:stats(15,11,16,10,12,9),damageType:"bludgeoning",saves:["constitution"] }),
  Halleth: monster("Halleth", { visualKind:"humanoid",cr:1,sprite:"/halleth-hermit-sprites.webp",hp:40,ac:14,move:5,damage:8,attackBonus:4,abilities:stats(14,12,16,11,14,13),damageType:"bludgeoning",saves:["constitution","wisdom"] }),
  "Gromm, Paranoid Survivor": monster("Gromm, Paranoid Survivor", { visualKind:"humanoid",cr:1,sprite:"/monster-bandit-sprites.png",hp:40,ac:14,move:4,damage:9,attackBonus:4,abilities:stats(14,12,16,11,14,8),damageType:"slashing",saves:["constitution","wisdom"] }),
  "Club Hostess": monster("Club Hostess", { visualKind:"humanoid",cr:1,sprite:"/undertaker-club-hostess-sprites.png",hp:38,ac:14,move:5,damage:9,attackBonus:5,range:5,abilities:stats(10,16,12,12,11,16),primary:"dexterity",ai:"skirmisher",damageType:"psychic" }),
  "Countess Velvet": monster("Countess Velvet", { visualKind:"humanoid",cr:1,sprite:"/undertaker-club-hostess-sprites.png",hp:42,ac:14,move:5,damage:10,attackBonus:5,range:5,abilities:stats(10,16,13,12,12,17),primary:"charisma",ai:"controller",damageType:"psychic" }),
  "Lady Fangirl": monster("Lady Fangirl", { visualKind:"humanoid",cr:1,sprite:"/undertaker-club-hostess-sprites.png",hp:36,ac:15,move:6,damage:9,attackBonus:5,abilities:stats(10,17,12,11,12,16),primary:"dexterity",ai:"skirmisher",damageType:"slashing" }),
  "Mistress Maybe": monster("Mistress Maybe", { visualKind:"humanoid",cr:1,sprite:"/undertaker-club-hostess-sprites.png",hp:40,ac:14,move:5,damage:9,attackBonus:5,range:4,abilities:stats(9,15,13,14,13,16),primary:"charisma",ai:"controller",damageType:"psychic" }),
  "DJ Bitey": monster("DJ Bitey", { visualKind:"humanoid",cr:1,sprite:"/undertaker-club-hostess-sprites.png",hp:44,ac:13,move:5,damage:10,attackBonus:4,range:4,abilities:stats(12,14,14,12,11,15),primary:"charisma",damageType:"thunder" }),
  "Bandit Archer": monster("Bandit Archer", { visualKind:"humanoid",cr:.5,sprite:"/monster-bandit-sprites.png",hp:24,ac:13,move:5,damage:7,attackBonus:4,range:10,abilities:stats(10,15,11,10,12,9),primary:"dexterity",ai:"skirmisher",damageType:"piercing" }),
  "John Wick": monster("John Wick", { visualKind:"humanoid",cr:5,sprite:"/counter-dungeoneer-john-wick-sprites.png",hp:96,ac:17,move:6,damage:7,attackBonus:7,range:8,abilities:stats(12,18,16,14,16,14),primary:"dexterity",ai:"controller",damageType:"piercing",saves:["dexterity","wisdom"],skillBonuses:{Perception:6,Stealth:7},languages:["Common","Thieves' Cant"],traits:[{id:"combat-focus",name:"Combat Focus",description:"Ignores distractions while protecting the objective."}],attacks:[{id:"wick-double-tap",name:"Runed Pistol Double Tap",attackBonus:7,reach:8,damage:7,damageType:"piercing",attacks:2}] }),
  "Vesper Longshot": monster("Vesper Longshot", { visualKind:"humanoid",cr:3,sprite:"/counter-dungeoneer-vesper-longshot-sprites-v2.png",hp:52,ac:15,move:5,damage:16,attackBonus:6,range:14,abilities:stats(10,18,13,13,15,11),primary:"dexterity",ai:"skirmisher",damageType:"piercing",skillBonuses:{Perception:5,Stealth:6},languages:["Common","Elvish"],attacks:[{id:"vesper-awp",name:"AWP Arc Shot",attackBonus:6,reach:14,damage:16,damageType:"piercing"}] }),
  "Brakka Breach": monster("Brakka Breach", { visualKind:"humanoid",cr:3,sprite:"/counter-dungeoneer-brakka-breach-sprites.png",hp:64,ac:16,move:5,damage:11,attackBonus:6,range:3,abilities:stats(16,14,16,10,12,12),primary:"strength",ai:"brute",damageType:"fire",resistances:["fire"],languages:["Common","Draconic"],attacks:[{id:"brakka-breach",name:"Dragonfire Breach",attackBonus:6,reach:3,damage:11,damageType:"fire"}] }),
  "Nix Fusefinger": monster("Nix Fusefinger", { visualKind:"humanoid",cr:2,sprite:"/counter-dungeoneer-nix-fusefinger-sprites-v2.png",hp:42,ac:14,move:6,damage:9,attackBonus:5,range:8,abilities:stats(8,17,13,15,12,10),primary:"dexterity",ai:"controller",damageType:"fire",skillBonuses:{Stealth:6},languages:["Common","Goblin"],attacks:[{id:"nix-grenade",name:"Emerald Grenade",reach:8,damage:9,damageType:"fire",save:{ability:"dexterity",dc:13,halfDamage:true}}] }),
  "Thorne Bastion": monster("Thorne Bastion", { visualKind:"humanoid",cr:3,sprite:"/counter-dungeoneer-thorne-bastion-sprites-v2.png",hp:70,ac:17,move:4,damage:7,attackBonus:6,range:8,abilities:stats(16,14,18,11,14,10),primary:"constitution",ai:"controller",damageType:"piercing",saves:["constitution"],languages:["Common","Dwarvish"],attacks:[{id:"thorne-suppress",name:"Adamant Suppression",attackBonus:6,reach:8,damage:7,damageType:"piercing",attacks:2}] }),
  "Sable Null": monster("Sable Null", { visualKind:"humanoid",cr:3,sprite:"/counter-dungeoneer-sable-null-sprites-v2.png",hp:50,ac:16,move:6,damage:10,attackBonus:7,range:10,abilities:stats(10,18,13,14,14,12),primary:"dexterity",ai:"skirmisher",damageType:"piercing",skillBonuses:{Stealth:7,Perception:5},languages:["Common","Undercommon"],attacks:[{id:"sable-suppressed",name:"Null-Sigil Suppressed Shot",attackBonus:7,reach:10,damage:10,damageType:"piercing"}] }),
  "Mercy Hex": monster("Mercy Hex", { visualKind:"humanoid",cr:2,sprite:"/counter-dungeoneer-mercy-hex-sprites-v2.png",hp:48,ac:15,move:5,damage:8,attackBonus:5,range:6,abilities:stats(9,16,14,15,16,14),primary:"wisdom",ai:"controller",damageType:"force",saves:["wisdom"],languages:["Common","Infernal"],attacks:[{id:"mercy-hex",name:"Trauma Hex Burst",attackBonus:5,reach:6,damage:8,damageType:"force"}] }),
  "Rook Ironjaw": monster("Rook Ironjaw", { visualKind:"humanoid",cr:3,sprite:"/counter-dungeoneer-rook-ironjaw-sprites.png",hp:68,ac:16,move:6,damage:8,attackBonus:6,range:7,abilities:stats(17,15,17,10,12,11),primary:"strength",ai:"skirmisher",damageType:"piercing",saves:["strength","constitution"],languages:["Common","Orc"],attacks:[{id:"rook-carbine",name:"Ironjaw Carbine Rush",attackBonus:6,reach:7,damage:8,damageType:"piercing",attacks:2}] }),
  "Tyler Durden": monster("Tyler Durden", { visualKind:"humanoid",cr:2,sprite:"/fight-club-tyler-sprites.png",hp:58,ac:14,move:5,damage:12,attackBonus:5,abilities:stats(16,15,15,10,12,15),ai:"skirmisher",damageType:"bludgeoning" }),
  "The Narrator": monster("The Narrator", { visualKind:"noncombat",cr:2,sprite:"/fight-club-narrator-sprites.png",hp:62,ac:13,move:4,damage:11,attackBonus:5,abilities:stats(14,13,16,14,14,12),ai:"brute",damageType:"bludgeoning" }),
  "Fight Club Regular": monster("Fight Club Regular", { visualKind:"noncombat",cr:0,sprite:"/monster-bandit-sprites.png",hp:1,ac:10,move:0,damage:0,attackBonus:0,abilities:stats(10,10,10,10,10,10) }),
  "Club Regular": monster("Club Regular", { visualKind:"noncombat",cr:0,sprite:"/monster-bandit-sprites.png",hp:1,ac:10,move:0,damage:0,attackBonus:0,abilities:stats(10,10,10,10,10,10) }),
  Ettin: monster("Ettin", { visualKind:"monster",cr:6,sprite:"/monster-ettin-sprites.png",hp:220,ac:16,move:3,damage:22,attackBonus:8,range:6,abilities:stats(21,8,17,6,10,8),ai:"brute",skills:skills("greatclub","boulder"),damageType:"bludgeoning",name:"The Two-Headed King",footprint:{width:2,height:2},saves:["strength","constitution"] }),
  "Large Mimic": monster("Large Mimic", { visualKind:"monster",cr:4,sprite:"/monster-large-mimic-sprites.png",hp:118,ac:15,move:3,damage:17,attackBonus:7,abilities:stats(19,12,17,5,13,8),ai:"brute",damageType:"bludgeoning",conditionImmunities:["bleeding"] }),
};

const ACTOR_ALIASES = new Map<string, ActorDefinition>();
Object.values(ACTOR_REGISTRY).forEach((definition) => {
  ACTOR_ALIASES.set(definition.id.toLowerCase(), definition);
});

export const getActorDefinition = (id: string) => {
  const definition = ACTOR_ALIASES.get(id.toLowerCase());
  if (!definition) throw new Error(`Unknown actor definition: ${id}`);
  return definition;
};

export const MONSTER_SPRITE_SHEETS: Record<string, string> = Object.fromEntries([
  ...Object.values(ACTOR_REGISTRY).map((definition) => [definition.id, definition.sprite]),
]);
