import { ACTOR_REGISTRY, ABILITY_REGISTRY, getActorDefinition } from "./actor-registry";
import { ROOM_BLUEPRINTS } from "./dungeon-content";
import { SCRIPTED_DUNGEON_ENCOUNTERS } from "./encounter-engine";
import { ITEM_REGISTRY } from "./item-registry";
import { DUNGEON_MAP_TRIGGERS } from "./map-trigger-engine";
import undermountainLevel1 from "./undermountain-level-1.json";
import { MONSTER_TRAIT_HANDLERS } from "./monster-runtime";
import { auditEncounterBalance } from "./encounter-balance";

export type ContentIssue = { path: string; message: string };

const pushDuplicateIds = (issues: ContentIssue[], path: string, ids: string[]) => {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) issues.push({ path, message: `Duplicate id: ${id}` });
    seen.add(id);
  });
};

export const validateGameContent = (): ContentIssue[] => {
  const issues: ContentIssue[] = [];
  const roomIds = new Set(Object.keys(ROOM_BLUEPRINTS));
  const encounterKinds = new Set(Object.keys(SCRIPTED_DUNGEON_ENCOUNTERS));
  const map = undermountainLevel1 as { width: number; height: number; tiles: { kind: string; label?: string; blocked?: boolean }[] };
  const mapRoomIds = new Set(map.tiles.flatMap((tile) => tile.kind === "note" && tile.label
    ? [tile.label === "1 starting point" ? "1" : tile.label]
    : []));
  const mapRoomPoints = new Map(map.tiles.flatMap((tile, index) => tile.kind === "note" && tile.label
    ? [[tile.label === "1 starting point" ? "1" : tile.label, { x: index % map.width, y: Math.floor(index / map.width) }] as const]
    : []));
  const blockedKinds = new Set(["void", "wall", "pillar", "tree", "rock", "barricade", "water", "lava"]);
  const isWalkable = (x: number, y: number) => {
    const tile = map.tiles[y * map.width + x];
    return !!tile && !tile.blocked && !blockedKinds.has(tile.kind);
  };

  Object.entries(ACTOR_REGISTRY).forEach(([id, actor]) => {
    const path = `actors.${id}`;
    if (actor.statBlock.xp < 0) issues.push({ path: `${path}.xpReward`, message: "Enemy XP cannot be negative." });
    const scores = actor.statBlock.abilities;
    if (!scores || Object.values(scores).length !== 6 || Object.values(scores).some((score) => score < 1 || score > 30))
      issues.push({ path: `${path}.abilities`, message: "Every enemy requires six ability scores from 1 to 30." });
    if (actor.statBlock.armorClass < 1) issues.push({ path: `${path}.armorClass`, message: "Enemy AC must be positive." });
    const stat = actor.statBlock;
    if (!stat?.creatureType || !stat?.size) issues.push({ path: `${path}.statBlock`, message: "Every actor requires a size and creature type." });
    if (stat?.creatureType === "creature") issues.push({ path: `${path}.statBlock.creatureType`, message: "Generic creature metadata is forbidden; author a creature type." });
    if (!stat?.speeds || stat.speeds.walk < 0) issues.push({ path: `${path}.statBlock.speeds`, message: "Every actor requires a valid walking speed." });
    if (!stat?.senses.length) issues.push({ path: `${path}.statBlock.senses`, message: "Every actor requires authored senses or passive Perception." });
    if (stat?.challengeRating !== actor.cr) issues.push({ path: `${path}.statBlock.challengeRating`, message: "CR must match the actor definition." });
    if (!stat?.attacks.length && actor.cr > 0) issues.push({ path: `${path}.statBlock.attacks`, message: "Combat actors require at least one registered attack." });
    stat?.attacks.forEach((attack, index) => {
      if (!attack.id || !attack.name || attack.damage < 0 || attack.reach < 0)
        issues.push({ path: `${path}.statBlock.attacks.${index}`, message: "Registered attacks require stable IDs, names, and non-negative damage/reach." });
      if (attack.name === "Basic Attack") issues.push({ path: `${path}.statBlock.attacks.${index}.name`, message: "Generic Basic Attack names are forbidden." });
      if (attack.attackBonus === undefined && !attack.save)
        issues.push({ path: `${path}.statBlock.attacks.${index}`, message: "Every monster attack requires an explicit attack bonus or saving throw." });
      if (attack.attackBonus !== undefined && (attack.attackBonus < -5 || attack.attackBonus > 20))
        issues.push({ path: `${path}.statBlock.attacks.${index}.attackBonus`, message: "Attack bonus must use bounded d20 math, not percentage accuracy." });
      if (attack.save && (attack.save.dc < 5 || attack.save.dc > 30))
        issues.push({ path: `${path}.statBlock.attacks.${index}.save`, message: "Saving throw DC must be between 5 and 30." });
      if (attack.recharge && (attack.recharge.min < 1 || attack.recharge.max > 6 || attack.recharge.min > attack.recharge.max))
        issues.push({ path: `${path}.statBlock.attacks.${index}.recharge`, message: "Recharge must be an ordered d6 range." });
      attack.conditions?.forEach((condition) => {
        if ((condition.saveAbility && !condition.saveDc) || (!condition.saveAbility && condition.saveDc))
          issues.push({ path: `${path}.statBlock.attacks.${index}.conditions`, message: "Condition saves require both an ability and DC." });
      });
    });
    stat?.traits.forEach((trait, index) => {
      if (!MONSTER_TRAIT_HANDLERS[trait.id])
        issues.push({ path: `${path}.statBlock.traits.${index}`, message: `Trait ${trait.id} has no gameplay handler.` });
    });
  });

  Object.entries(ROOM_BLUEPRINTS).forEach(([id, room]) => {
    const path = `rooms.${id}`;
    if (room.id !== id) issues.push({ path, message: `Blueprint id must match registry key (${room.id}).` });
    if (!room.title.trim() || !room.description.trim()) issues.push({ path, message: "Title and description are required." });
    if (!mapRoomIds.has(id) && id !== "40") issues.push({ path, message: "No matching room marker exists in the Level 1 map." });
    if ((room.entry.radius ?? 2) < 0) issues.push({ path: `${path}.entry.radius`, message: "Entry radius cannot be negative." });
    if (room.entry.encounter && !encounterKinds.has(room.entry.encounter))
      issues.push({ path: `${path}.entry.encounter`, message: `Unknown encounter: ${room.entry.encounter}` });
    if (room.entry.encounter && !room.actors?.length)
      issues.push({ path: `${path}.actors`, message: "Scripted encounters require at least one actor to present their scene." });
    if (room.entry.encounter && !room.entry.triggerTiles?.length)
      issues.push({ path: `${path}.entry.triggerTiles`, message: "Scripted encounters require explicit walkable activation tiles." });
    if ((room.entry.encounter || room.entry.action) && room.entry.presentation !== "modal")
      issues.push({ path: `${path}.entry.presentation`, message: "Scripted room handoffs require a modal presentation." });
    room.entry.triggerTiles?.forEach((trigger, index) => {
      if (!isWalkable(trigger.x, trigger.y))
        issues.push({ path: `${path}.entry.triggerTiles.${index}`, message: `Trigger is not on walkable map geometry at ${trigger.x},${trigger.y}.` });
    });
    const marker = mapRoomPoints.get(id);
    if (marker && !isWalkable(marker.x, marker.y))
      issues.push({ path: `${path}.marker`, message: `Room marker is not on walkable map geometry at ${marker.x},${marker.y}.` });
    room.actors?.forEach((actor, index) => {
      if (actor.spawn && (actor.spawn.x < 0 || actor.spawn.y < 0))
        issues.push({ path: `${path}.actors.${index}.spawn`, message: "Spawn coordinates cannot be negative." });
      if (actor.spawn) {
        const definition = getActorDefinition(actor.actorId);
        const width = definition.footprint?.width || 1;
        const height = definition.footprint?.height || 1;
        for (let y = actor.spawn.y; y < actor.spawn.y + height; y++)
          for (let x = actor.spawn.x; x < actor.spawn.x + width; x++) {
            const tile = map.tiles[y * map.width + x];
            if (!tile || tile.blocked || blockedKinds.has(tile.kind))
              issues.push({ path: `${path}.actors.${index}.spawn`, message: `Actor footprint does not fit walkable map geometry at ${x},${y}.` });
          }
      }
    });
    if (room.actors?.length) auditEncounterBalance(room.actors.map((actor) => actor.actorId), [1, 1, 1, 1]);
    room.rewards?.items.forEach((item, index) => {
      if (!ITEM_REGISTRY[item]) issues.push({ path: `${path}.rewards.items.${index}`, message: `Unknown item: ${item}` });
    });
  });

  Object.entries(SCRIPTED_DUNGEON_ENCOUNTERS).forEach(([kind, encounter]) => {
    const path = `encounters.${kind}`;
    if (encounter.kind !== kind) issues.push({ path, message: `Encounter kind must match registry key (${encounter.kind}).` });
    if (encounter.roomLabel !== "bridge" && !roomIds.has(encounter.roomLabel))
      issues.push({ path: `${path}.roomLabel`, message: `Unknown room: ${encounter.roomLabel}` });
    if (encounter.roomLabel !== "bridge") {
      const room = ROOM_BLUEPRINTS[encounter.roomLabel];
      if (room?.entry.encounter !== kind)
        issues.push({ path: `${path}.roomLabel`, message: `Room ${encounter.roomLabel} does not point back to encounter ${kind}.` });
      const actorNames = new Set((room?.actors || []).flatMap((actor) => [actor.actorId, actor.name || actor.actorId]));
      if (encounter.choices.some((choice) => choice.effects.some((effect) => effect.kind === "bubble" && effect.speaker === "golem")) &&
        !actorNames.has("Flesh Golem"))
        issues.push({ path: `${path}.choices`, message: "A golem dialogue line requires a Flesh Golem actor in the room." });
    }
    pushDuplicateIds(issues, `${path}.choices`, encounter.choices.map((choice) => choice.id));
    encounter.choices.forEach((choice, choiceIndex) => {
      choice.requirements?.forEach((requirement, requirementIndex) => {
        if ((requirement.kind === "hero-item" || requirement.kind === "party-item") && !ITEM_REGISTRY[requirement.item])
          issues.push({ path: `${path}.choices.${choiceIndex}.requirements.${requirementIndex}`, message: `Unknown item: ${requirement.item}` });
      });
      choice.effects.forEach((effect, effectIndex) => {
        if ((effect.kind === "consume-hero-item" || effect.kind === "consume-party-item" || effect.kind === "grant-hero-item") && !ITEM_REGISTRY[effect.item])
          issues.push({ path: `${path}.choices.${choiceIndex}.effects.${effectIndex}`, message: `Unknown item: ${effect.item}` });
      });
    });
  });

  Object.entries(ACTOR_REGISTRY).forEach(([id, actor]) => {
    if (actor.id !== id) issues.push({ path: `actors.${id}`, message: `Actor id must match registry key (${actor.id}).` });
    actor.abilities.forEach((skill, index) => {
      if (!skill.name || skill.range < 0 || skill.charges < 0)
        issues.push({ path: `actors.${id}.skills.${index}`, message: "Abilities require a name and non-negative range/charges." });
    });
  });

  pushDuplicateIds(issues, "abilities", Object.values(ABILITY_REGISTRY).map((ability) => ability.id));
  pushDuplicateIds(issues, "mapTriggers", DUNGEON_MAP_TRIGGERS.map((trigger) => trigger.id));
  DUNGEON_MAP_TRIGGERS.forEach((trigger, triggerIndex) => {
    trigger.conditions.forEach((condition, conditionIndex) => {
      if (condition.kind === "hero-distance-from-room" && !roomIds.has(condition.roomId))
        issues.push({ path: `mapTriggers.${triggerIndex}.conditions.${conditionIndex}`, message: `Unknown room: ${condition.roomId}` });
    });
    trigger.effects.forEach((effect, effectIndex) => {
      if (effect.kind === "spawn-item" && !ITEM_REGISTRY[effect.item])
        issues.push({ path: `mapTriggers.${triggerIndex}.effects.${effectIndex}`, message: `Unknown item: ${effect.item}` });
    });
  });
  return issues;
};

export const assertValidGameContent = () => {
  const issues = validateGameContent();
  if (issues.length) throw new Error(`Invalid game content:\n${issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`);
};
