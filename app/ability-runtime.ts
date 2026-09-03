import type { Ability, ConditionName, DamageType, Skill, Team, Unit } from "./game-types";

export type TimedEffectKind =
  | "ac-bonus" | "damage-bonus" | "move-bonus" | "roll-penalty" | "inspiration"
  | "marked-target" | "suppress-opportunity" | "reckless" | "counterstance"
  | "armor-of-agathys" | "flame-arrows" | "counterspell";

export type TimedCombatEffect = {
  id: string;
  kind: TimedEffectKind;
  sourceId?: string;
  targetId?: string;
  value?: number;
  remainingTurns?: number;
  damageType?: DamageType;
};

export type AbilityZone = {
  id: string;
  name: string;
  sourceId: string;
  sourceTeam: Team;
  tiles: { x: number; y: number }[];
  segment?: { a: { x: number; y: number }; b: { x: number; y: number } };
  remainingRounds: number;
  blocksVision?: boolean;
  blocksRanged?: boolean;
  difficult?: boolean;
  initialDamage?: number;
  movementDamage?: number;
  roundDamage?: number;
  roundHealing?: number;
  damageType?: DamageType;
  condition?: ConditionName;
};

export type AbilityMechanic = {
  weaponRider?: boolean;
  weaponBonus?: number;
  attackCount?: number;
  allAdjacent?: boolean;
  splashDamage?: number;
  save?: { ability: Ability; halfDamage?: boolean; negates?: boolean };
  targetCondition?: { condition: ConditionName; durationRounds?: number; repeatSave?: boolean };
  selfEffect?: Omit<TimedCombatEffect, "id" | "sourceId">;
  targetEffect?: Omit<TimedCombatEffect, "id" | "sourceId">;
  cleanse?: ConditionName[];
  lifeSteal?: number;
  temporaryHp?: number;
  zone?: Omit<AbilityZone, "id" | "sourceId" | "sourceTeam" | "tiles">;
  placement?: { kind: "segment"; castRangeSquares: number; maxLengthSquares: number };
  summon?: "animal-companion";
  automatic?: "hellish-rebuke";
  requiresUnacted?: boolean;
};

export const FLAME_ARROWS_ATTACKS = 3;
export const FLAME_ARROWS_DAMAGE = 6;

export const ABILITY_MECHANICS: Record<string, AbilityMechanic> = {
  "Reckless Blow": { weaponRider: true, weaponBonus: 6, selfEffect: { kind: "reckless", remainingTurns: 2 } },
  "Battle Rush": { weaponRider: true, weaponBonus: 3 },
  "Ground Breaker": { weaponRider: true, weaponBonus: 5 },
  "Crushing Blow": { weaponRider: true, weaponBonus: 5 },
  "Brutal Charge": { weaponRider: true, weaponBonus: 6 },
  "Earthsplitter": { weaponRider: true, weaponBonus: 8 },
  "Reckless Cleave": { weaponRider: true, weaponBonus: 4, allAdjacent: true, selfEffect: { kind: "reckless", remainingTurns: 2 } },
  "Bardic Inspiration": { targetEffect: { kind: "inspiration", value: 6 } },
  "Dissonant Whispers": { save: { ability: "wisdom", negates: true }, targetCondition: { condition: "frightened", durationRounds: 1 } },
  "Sneak Attack": { weaponRider: true },
  "Flurry of Blows": { attackCount: 2 },
  "Patient Defense": { selfEffect: { kind: "ac-bonus", value: 2, remainingTurns: 2 } },
  "Sweeping Kick": { allAdjacent: true },
  "Stunning Strike": { save: { ability: "constitution", negates: true }, targetCondition: { condition: "stunned", durationRounds: 1 } },
  "Divine Smite": { weaponRider: true, weaponBonus: 6 },
  "Branding Smite": { weaponRider: true, weaponBonus: 4 },
  "Shielding Smite": { weaponRider: true, weaponBonus: 3, selfEffect: { kind: "ac-bonus", value: 2, remainingTurns: 2 } },
  "Thunderous Smite": { weaponRider: true, weaponBonus: 3 },
  "Blinding Smite": { weaponRider: true, weaponBonus: 5 },
  "Turn the Unholy": { save: { ability: "wisdom", negates: true }, targetCondition: { condition: "frightened", durationRounds: 2, repeatSave: true }, allAdjacent: true },
  "Lesser Restoration": { cleanse: ["poisoned", "bleeding", "frightened", "blinded", "paralyzed", "restrained"] },
  "Hunter's Mark": { targetEffect: { kind: "marked-target", value: 2 } },
  "Ensnaring Strike": { weaponRider: true, weaponBonus: 3, save: { ability: "strength", negates: true }, targetCondition: { condition: "restrained", durationRounds: 2, repeatSave: true } },
  "Longstrider": { targetEffect: { kind: "move-bonus", value: 2 } },
  "Zephyr Strike": { weaponRider: true, weaponBonus: 3, selfEffect: { kind: "suppress-opportunity", value: 2, remainingTurns: 2 } },
  "Flame Arrows": { selfEffect: { kind: "flame-arrows", value: FLAME_ARROWS_ATTACKS } },
  "Lightning Arrow": { weaponRider: true, weaponBonus: 5, splashDamage: 5 },
  "Animal Companion": { summon: "animal-companion" },
  "Spike Growth": { zone: { name: "Spike Growth", remainingRounds: 3, difficult: true, initialDamage: 10, movementDamage: 3, damageType: "piercing" } },
  "Fog Cloud": { zone: { name: "Fog Cloud", remainingRounds: 3, blocksVision: true } },
  "Throw Smoke Grenade": { zone: { name: "Smoke Grenade", remainingRounds: 3, blocksVision: true } },
  "Throw Molotov": { zone: { name: "Molotov Fire", remainingRounds: 3, initialDamage: 4, roundDamage: 6, damageType:"fire" } },
  "Throw Frag Grenade": { save: { ability:"dexterity", halfDamage:true } },
  "Throw Flashbang": { save: { ability:"dexterity", negates:true }, targetCondition: { condition:"blinded", durationRounds:1 } },
  "Throw Frost Grenade": { save: { ability:"constitution", halfDamage:true }, targetEffect: { kind:"move-bonus", value:-2, remainingTurns:2 }, zone: { name:"Frost Grenade", remainingRounds:3, difficult:true, initialDamage:6, damageType:"cold" } },
  "Throw Entangle Grenade": { save: { ability:"strength", negates:true }, targetCondition: { condition:"restrained", durationRounds:1 }, zone: { name:"Entangle Grenade", remainingRounds:3, difficult:true, condition:"restrained" } },
  "Throw Banishment Grenade": { save: { ability:"charisma", negates:true } },
  "Healing Spirit": { zone: { name: "Healing Spirit", remainingRounds: 3, roundHealing: 5 } },
  "Wind Wall": { zone: { name: "Wind Wall", remainingRounds: 3, blocksRanged: true }, placement: { kind: "segment", castRangeSquares: 6, maxLengthSquares: 6 } },
  "Plant Growth": { zone: { name: "Plant Growth", remainingRounds: 4, difficult: true } },
  "Hex": { targetEffect: { kind: "roll-penalty", value: 2 } },
  "Armor of Agathys": { temporaryHp: 8, selfEffect: { kind: "armor-of-agathys", value: 5, damageType: "cold" } },
  "Hellish Rebuke": { automatic: "hellish-rebuke" },
  "Arms of Hadar": { targetEffect: { kind: "suppress-opportunity", remainingTurns: 2 } },
  "Darkness": { zone: { name: "Darkness", remainingRounds: 3, blocksVision: true } },
  "Invisibility": { targetCondition: { condition: "invisible", durationRounds: 3 } },
  "Counterspell": { targetEffect: { kind: "counterspell", remainingTurns: 2 } },
  "Hunger of Hadar": { zone: { name: "Hunger of Hadar", remainingRounds: 3, blocksVision: true, difficult: true, roundDamage: 7, damageType: "cold" } },
  "Fear": { save: { ability: "wisdom", negates: true }, targetCondition: { condition: "frightened", durationRounds: 2, repeatSave: true }, allAdjacent: true },
  "Vampiric Touch": { lifeSteal: 0.5 },
  "Blight": { save: { ability: "constitution", halfDamage: true } },
  "Pinning Strike": { weaponRider: true, weaponBonus: 3, targetEffect: { kind: "suppress-opportunity", remainingTurns: 2 } },
  "Driving Strike": { weaponRider: true, weaponBonus: 4 },
  "Lunging Thrust": { weaponRider: true, weaponBonus: 5 },
  "Counterstance": { selfEffect: { kind: "counterstance", value: 11, remainingTurns: 2 } },
  "Assassinate": { weaponRider: true, weaponBonus: 8, requiresUnacted: true },
};

export const mechanicFor = (name?: string) => name ? ABILITY_MECHANICS[name] : undefined;
export const effectValue = (unit: Unit, kind: TimedEffectKind) => (unit.combatEffects || []).filter((effect) => effect.kind === kind).reduce((total, effect) => total + (effect.value || 0), 0);
export const hasEffect = (unit: Unit, kind: TimedEffectKind) => (unit.combatEffects || []).some((effect) => effect.kind === kind);
export const flameArrowShotsRemaining = (unit: Unit) => Math.max(0, effectValue(unit, "flame-arrows"));
export const consumeFlameArrowAttack = (unit: Unit): Unit => ({ ...unit, combatEffects: (unit.combatEffects || []).flatMap((effect) => effect.kind !== "flame-arrows" ? [effect] : (effect.value || 0) > 1 ? [{ ...effect, value: (effect.value || 0) - 1 }] : []) });
export const addEffect = (unit: Unit, effect: Omit<TimedCombatEffect, "id">): Unit => ({ ...unit, combatEffects: [...(unit.combatEffects || []).filter((current) => current.kind !== effect.kind || current.targetId !== effect.targetId), { ...effect, id: `${effect.kind}:${effect.sourceId || unit.id}:${effect.targetId || unit.id}` }] });
export const removeEffect = (unit: Unit, kind: TimedEffectKind): Unit => ({ ...unit, combatEffects: (unit.combatEffects || []).filter((effect) => effect.kind !== kind) });
export const advanceTimedEffects = (unit: Unit): Unit => ({ ...unit, combatEffects: (unit.combatEffects || []).flatMap((effect) => effect.remainingTurns === undefined ? [effect] : effect.remainingTurns <= 1 ? [] : [{ ...effect, remainingTurns: effect.remainingTurns - 1 }]) });
export const effectArmorClassBonus = (unit: Unit) => effectValue(unit, "ac-bonus");
export const effectMovementBonus = (unit: Unit) => effectValue(unit, "move-bonus") + effectValue(unit, "suppress-opportunity");
export const favoredEnemyBonus = (attacker: Unit, target?: Unit) => attacker.skills.some((skill) => skill.name === "Favored Enemy") ? Math.floor((attacker.favoredEnemyKills?.[target?.role || ""] || 0) / 5) * 2 : 0;
export const effectDamageBonus = (attacker: Unit, target?: Unit) =>
  (attacker.role === "Barbarian" && attacker.skills.some((skill) => skill.name === "Rage") ? 2 : 0) + effectValue(attacker, "damage-bonus") + favoredEnemyBonus(attacker, target) +
  (target?.combatEffects || []).filter((effect) => effect.kind === "marked-target" && effect.sourceId === attacker.id).reduce((sum, effect) => sum + (effect.value || 0), 0);
export const abilityStrikeProfile = (attacker: Unit, target: Unit, skill: Skill | null, weapon: { damage: number; range: number; damageType: DamageType; attackBonus: number; tags: string[] } | null) => {
  const mechanic = mechanicFor(skill?.name), weaponStrike = !!mechanic?.weaponRider && !!weapon;
  const flameArrows = !skill && !!weapon && weapon.range > 1 && flameArrowShotsRemaining(attacker) ? FLAME_ARROWS_DAMAGE : 0;
  const twinned = !!skill && isMagicalAbility(skill) && attacker.skills.some((known) => known.name === "Twinned Spell");
  return {
    attackCount: Math.max(1, mechanic?.attackCount || skill?.attackCount || 1) * (twinned ? 2 : 1),
    range: weaponStrike ? weapon!.range : skill?.range || weapon?.range || attacker.range,
    attackBonus: weaponStrike ? weapon!.attackBonus : undefined,
    baseDamage: (weaponStrike ? weapon!.damage : skill?.power || weapon?.damage || attacker.attack) + effectDamageBonus(attacker, target),
    riderDamage: weaponStrike ? mechanic?.weaponBonus || 0 : 0,
    bonusDamage: flameArrows,
    damageType: weaponStrike ? weapon!.damageType : skill?.damageType || weapon?.damageType || attacker.damageType || "physical",
    riderDamageType: skill?.damageType || weapon?.damageType || attacker.damageType || "physical",
  };
};
export const cannotMakeOpportunityAttack = (unit: Unit) => hasEffect(unit, "suppress-opportunity");
export const zoneContains = (zone: AbilityZone, point: { x: number; y: number }) => zone.tiles.some((tile) => tile.x === point.x && tile.y === point.y);
export const advanceZones = (zones: AbilityZone[]) => zones.flatMap((zone) => zone.remainingRounds <= 1 ? [] : [{ ...zone, remainingRounds: zone.remainingRounds - 1 }]);
export const applyGrantedEffect = (unit: Unit, effect: AbilityMechanic["selfEffect"] | AbilityMechanic["targetEffect"], sourceId: string, targetId?: string) => effect ? addEffect(unit, { ...effect, sourceId, targetId }) : unit;
export const cleanseConditions = (unit: Unit, conditions: ConditionName[]) => ({ ...unit, bleeding: conditions.includes("bleeding") ? false : unit.bleeding, poisoned: conditions.includes("poisoned") ? false : unit.poisoned, stunned: conditions.includes("stunned") ? false : unit.stunned, conditions: Object.fromEntries(Object.entries(unit.conditions || {}).filter(([name]) => !conditions.includes(name as ConditionName))) });
export const isMagicalAbility = (skill?: Skill | null) => !!skill && skill.source !== "item" && (skill.source === "spellbook" || ["arcane", "cold", "fire", "force", "lightning", "necrotic", "psychic", "radiant", "thunder"].includes(skill.damageType || "") || /spell|bolt|beam|ward|hex|shatter|darkness|hadar|blight|fear|invisibility/i.test(skill.name));
