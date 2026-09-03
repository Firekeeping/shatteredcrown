import type { ScriptedEncounterKind } from "./encounter-engine";
import type { TimedCombatEffect } from "./ability-runtime";

export type Team = "hero" | "enemy" | "neutral";
export type Facing = "n" | "e" | "s" | "w";
export type Ability = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type AbilityScores = Record<Ability, number>;
export type DamageType = "physical" | "bludgeoning" | "piercing" | "slashing" | "fire" | "cold" | "lightning" | "poison" | "radiant" | "necrotic" | "psychic" | "force" | "thunder" | "acid" | "arcane";
export type ConditionName = "bleeding" | "blinded" | "charmed" | "deafened" | "exhaustion" | "frightened" | "grappled" | "incapacitated" | "invisible" | "paralyzed" | "petrified" | "poisoned" | "prone" | "restrained" | "silenced" | "stunned" | "unconscious";
export type ConditionState = { sourceId?: string; durationRounds?: number; stacks?: number; saveAbility?: Ability; saveDc?: number; saveTiming?: "end-of-turn" };
export type SkillProficiency = "Acrobatics" | "Animal Handling" | "Arcana" | "Athletics" | "Deception" | "History" | "Insight" | "Intimidation" | "Investigation" | "Nature" | "Perception" | "Performance" | "Persuasion" | "Religion" | "Stealth" | "Survival" | "Thieves' Tools";

export type HeroCombatStats = {
  attacks: number;
  hits: number;
  abilitiesUsed: number;
  damageDealt: number;
  damageTaken: number;
};

export type Stage =
  | "mode"
  | "heroes"
  | "enemies"
  | "maps"
  | "deploy"
  | "battle"
  | "story"
  | "levelup"
  | "editor"
  | "dialogue-editor"
  | "dust2-freeplay-setup";

export type Phase = "move" | "action" | "facing";
export type EncounterMode = "exploration" | "combat";

export type Skill = {
  id?: string;
  name: string;
  range: number;
  power: number;
  accuracy?: number;
  attackBonus?: number;
  saveAbility?: Ability;
  saveDc?: number;
  halfDamageOnSave?: boolean;
  attackCount?: number;
  damageCap?: number;
  additionalDamage?: { damage: number; damageType: DamageType }[];
  rechargeRoll?: { min: number; max: number };
  inflictedConditions?: { condition: ConditionName; saveAbility?: Ability; saveDc?: number; durationRounds?: number; repeatSave?: boolean }[];
  charges: number;
  maxCharges?: number;
  recharge?: "never" | "rest" | "encounter";
  kind: "damage" | "heal";
  area?: "square" | "line";
  chargeRounds?: number;
  damageType?: DamageType;
  knockback?: number;
  stunChance?: number;
  unlimited?: boolean;
  mapWide?: boolean;
  instakill?: boolean;
  movement?: "teleport";
  dailyCharges?: number;
  automatic?: boolean;
  wardAcBonus?: number;
  source?: string;
  /** VFX Gallery-only label; normal character skills leave this unset. */
  galleryGroup?: string;
  /** VFX Gallery-only actor that performs this monster-owned action. */
  galleryActorRole?: string;
  description: string;
};

export type ChargedSpell = {
  id: string;
  unitId: string;
  bossHead?: Unit["bossHead"];
  name: string;
  abilityId?: string;
  tiles: { x: number; y: number }[];
  power: number;
  accuracy: number;
  damageType: NonNullable<Skill["damageType"]>;
  resolvesRound: number;
};

export type AchievementTier = "Beginner" | "Bronze" | "Silver" | "Gold" | "Legendary";

export type AchievementAward = {
  id: string;
  heroId: string;
  title: string;
  description: string;
  tier: AchievementTier;
  boxName: string;
  awardedAt: number;
  reward?: string;
  openedAt?: number;
};

export type GameNotice =
  | { id: string; kind: "achievement"; award: AchievementAward }
  | { id: string; kind: "halaster"; text: string }
  | { id: string; kind: "narration"; title: string; text: string; onDismiss?: () => void };

export type Unit = {
  id: string;
  name: string;
  role: string;
  team: Team;
  x: number;
  y: number;
  /** Authored walkable layer when multiple surfaces share one map square. */
  surfaceId?: string;
  /** Exact current elevation; maps may author non-five-foot values. */
  elevationFt?: number;
  hp: number;
  maxHp: number;
  move: number;
  /** @deprecated Hero compatibility only. Monster combat reads combatProfile/statBlock. */
  attack: number;
  /** @deprecated Hero compatibility only. Monster AC comes from its stat block. */
  defense: number;
  /** @deprecated Hero compatibility only. Monster attacks use explicit bonuses/saves. */
  accuracy: number;
  /** @deprecated Hero compatibility only. Monster defense uses AC and saves. */
  evasion: number;
  range: number;
  initiative: number;
  initiativeRoll?: number;
  facing: Facing;
  skills: Skill[];
  downed?: boolean;
  cr?: number;
  npc?: boolean;
  bleeding?: boolean;
  bleedingSaveDc?: number;
  stunned?: boolean;
  poisoned?: boolean;
  poisonSaveDc?: number;
  investigation?: number;
  stealthBonus?: number;
  encounterGroup?: string;
  level?: number;
  xp?: number;
  xpReward?: number;
  attackBonus?: number;
  proficiencyBonusOverride?: number;
  damageType?: DamageType;
  resistances?: DamageType[];
  immunities?: DamageType[];
  vulnerabilities?: DamageType[];
  conditionImmunities?: ConditionName[];
  conditions?: Partial<Record<ConditionName, ConditionState>>;
  lastDamagerId?: string;
  lastDamageType?: DamageType;
  bossHead?: "bruiser" | "spellcaster";
  rageRounds?: number;
  abilities?: AbilityScores;
  armorClass?: number;
  primaryAbility?: Ability;
  saveProficiencies?: Ability[];
  skillProficiencies?: SkillProficiency[];
  actorId?: string;
  combatProfile?:
    | { kind: "hero"; classRole: string }
    | { kind: "monster"; actorId: string };
  movementMode?: "walk" | "fly" | "swim" | "climb" | "burrow";
  /** Ability/item-granted safe falling distance, combined by maximum. */
  safeFallFt?: number;
  temporaryHp?: number;
  combatEffects?: TimedCombatEffect[];
  favoredEnemyKills?: Record<string, number>;
  introDamageCap?: number;
};

export type PointOfInterest = {
  id: string;
  name: string;
  x: number;
  y: number;
  text: string;
  kind: "clue" | "trap";
};

export type SocialScene = {
  kind: ScriptedEncounterKind | "kelim" | "dead-mage" | "schoolteacher" | "forest-guard";
  roomLabel: string;
  title: string;
  speaker: string;
  text: string;
  heroId: string;
};

export type GameFeedback = {
  kind: "item" | "trap" | "encounter" | "room";
  title: string;
  detail: string;
  image?: string;
  nonce: number;
};

export type ManticoreShowState = { round: number; score: number };
export type WanderingGuardian = { path: { x: number; y: number }[]; step: number; pass?: number };
export type DroppedDungeonItem = { id: string; name: string; x: number; y: number; contents?: string[] };
export type OverlapSelection = { x: number; y: number; unitIds: string[] };

export type Barrier = {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kind: "door" | "window";
  edgeKey?: string;
};

export type Kit = {
  hp: number;
  move: number;
  attack: number;
  defense: number;
  accuracy: number;
  evasion: number;
  range: number;
  initiative: number;
  skills: Skill[];
  abilities?: AbilityScores;
  armorClass?: number;
  primaryAbility?: Ability;
  saveProficiencies?: Ability[];
  skillProficiencies?: SkillProficiency[];
};

export type Growth = Pick<Kit, "hp" | "attack">;
