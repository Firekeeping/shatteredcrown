import type { EquipmentSlot } from "./item-registry";

export type EquippedItemSlots = Partial<Record<EquipmentSlot, string>>;

export type SpriteIdentity = {
  id: string;
  name: string;
  role: string;
};

const isKokoRanger = (unit: SpriteIdentity) => unit.name === "Koko" && unit.role === "Ranger";

export const HERO_SPRITE_PREFIX_BY_ROLE: Readonly<Record<string, string>> = {
  Barbarian: "walker",
  Bard: "lark",
  Cleric: "gromm",
  Druid: "rowan",
  Fighter: "alric",
  Wizard: "veyra",
  Rogue: "shade",
  Sorcerer: "cinder",
  Monk: "tenzin",
  Paladin: "garran",
  Ranger: "ash",
  Warlock: "vesper",
};

export const EQUIPMENT_VARIANT_SUFFIX = {
  head: "ballcap",
  body: "wifebeater",
  weapon: "lightsaber",
  awp: "awp",
  deagle: "deagle",
} as const;

export const equipmentVariantSuffix = (equipment: EquippedItemSlots = {}) => {
  const cap = equipment.head === "Ball Cap of Bad Ideas";
  const shirt = equipment.body === "Wife-Beater of Questionable Resilience";
  const saber = equipment.weapon === "Blue Lightsaber";
  const awp = equipment.weapon === "Dragon Glass AWP";
  const deagle = equipment.weapon === "Dragonfire Deagle";
  return [
    cap ? EQUIPMENT_VARIANT_SUFFIX.head : null,
    shirt ? EQUIPMENT_VARIANT_SUFFIX.body : null,
    saber ? EQUIPMENT_VARIANT_SUFFIX.weapon : awp ? EQUIPMENT_VARIANT_SUFFIX.awp : deagle ? EQUIPMENT_VARIANT_SUFFIX.deagle : null,
  ].filter(Boolean).join("-");
};

export const baseSpriteForUnit = (
  unit: SpriteIdentity,
  monsterSprites: Readonly<Record<string, string>>,
) => {
  if (monsterSprites[unit.role]) return monsterSprites[unit.role];
  if (monsterSprites[unit.name]) return monsterSprites[unit.name];
  if (unit.name === "Wayfarer") return "/wayfarer-sprites.png";
  if (unit.name === "Halleth") return "/halleth-hermit-sprites.webp";
  if (unit.name === "Dwarf Survivor" || unit.name === "Gromm") return "/gromm-sprites.png";
  if (unit.name === "Veyra") return "/veyra-sprites.png";
  if (unit.name === "Alric") return "/alric-sprites.png";
  if (isKokoRanger(unit)) return "/koko-sprites.png";
  if (unit.role === "Villager") return "/villager-sprites.png";
  if (unit.role === "Club Hostess") return "/undertaker-club-hostess-sprites.png";
  const prefix = HERO_SPRITE_PREFIX_BY_ROLE[unit.role];
  return prefix ? `/${prefix}-sprites.png` : null;
};

export const spriteSheetForEquipment = (
  unit: SpriteIdentity,
  equipment: EquippedItemSlots | undefined,
  monsterSprites: Readonly<Record<string, string>>,
) => {
  const base = baseSpriteForUnit(unit, monsterSprites);
  if (isKokoRanger(unit)) return base;
  const prefix = HERO_SPRITE_PREFIX_BY_ROLE[unit.role];
  const suffix = equipmentVariantSuffix(equipment);
  return prefix && suffix ? `/${prefix}-${suffix}-sprites.png` : base;
};

const FRIENDLY_VISUAL_ROLES = new Set(["Villager", "Club Hostess", "Tyler Durden", "The Narrator", "Club Regular", "Fight Club Regular"]);

export const actorVisualClass = (unit: Pick<SpriteIdentity, "role"> & { team?: string; movementMode?: string }) => {
  const family = HERO_SPRITE_PREFIX_BY_ROLE[unit.role]
    ? "hero-visual"
    : FRIENDLY_VISUAL_ROLES.has(unit.role)
      ? "npc-visual"
      : "monster-visual";
  return `${family} actor-role-${unit.role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${unit.movementMode && unit.movementMode !== "walk" ? ` movement-${unit.movementMode}` : ""}`;
};
