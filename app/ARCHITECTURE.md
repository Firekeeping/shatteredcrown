# Game Content Architecture

New content belongs in registries. Do not add item, POI, dialogue-timing, or
visual-placement branches directly to `page.tsx`.

## Add or change a room

`ROOM_BLUEPRINTS` in `dungeon-content.ts` is the authoritative Level 1 room
registry. A room blueprint owns its title, description, visual theme, actors,
authored spawn anchors, entry conditions, encounter handoff, rewards, and
scenery references. The map JSON owns only geometry and the room marker used as
the blueprint anchor.

Do not add a new `label === "..."` room branch. Extend `RoomEntryBlueprint` with
a reusable action when an encounter cannot be expressed by the existing
encounter or trigger effects.

Generated room prefabs and style packs are intentionally not part of this
system yet. Level Forge continues to own map geometry while that workflow is
designed separately.

## Add an actor or ability

Add abilities to `ABILITY_REGISTRY` and actors to `ACTOR_REGISTRY` in
`actor-registry.ts`. Actor definitions own stats, challenge rating, sprite,
AI family, footprint, abilities, and aliases. Room blueprints reference actor
IDs; runtime unit creation resolves the registry and clones its kit.

## Add a map trigger

Add a `MapTriggerDefinition` to `map-trigger-engine.ts`. Conditions are pure
data evaluated against a snapshot; effects are executed through the shared map
effect dispatcher in `page.tsx`. One-shot triggers must set or otherwise own a
durable flag. Do not add a new effect whose only purpose is watching a flag and
immediately setting unrelated state.

## Add an item

Add one entry to `ITEM_REGISTRY` in `item-registry.ts`. The definition owns its
description, hidden-effect status, stat changes, granted action, potion value,
whether it is carried, and drop policy. `grantDungeonLoot`, inventory rendering,
achievement boxes, and dropping all consume this definition.

## Add a POI

Add the map point's authored text/coordinate to the map content, then add its
behavior to `POI_REGISTRY` in `poi-registry.ts`. A POI definition owns visual
kind, discovery visibility, proximity, interaction action, and resolved
visibility. Mouse and keyboard activation both call `activatePoi`.

Inspection panels are registry-driven too. Add `panel.actions` to the POI
definition and implement the reusable action ID in the single
`runPoiPanelAction` dispatcher. Do not add `poi.id === "..."` JSX branches.
`getPoiPanelModel` owns action visibility, requirements, labels, notices, and
inspection art so mouse and keyboard users receive the same interaction.

The visual kinds are:

- `wall`: mounted on a wall edge; must not occupy a walkable floor square.
- `floor`: sits under tokens and does not block movement.
- `room-plate`: noninteractive scenery clipped to an authored room.
- `creature`: a unit/token with combat ownership.
- `interactive-object`: a visible object with one POI activation target.

Atlas art and room scenery live in `visual-registry.ts`.

## Add an encounter

Add a `ScriptedEncounter` to `encounter-engine.ts`. Requirements control which
choices appear. Effects own dialogue, item changes, rewards, combat handoff,
dismissal, flags, and cleanup. Do not create a second timer or dialogue system.
Special multi-round games may keep a small state machine, but their opening,
choices, combat handoff, reward, and dismissal still belong to the encounter
definition.

Automatic encounter readiness belongs to `encounter-director.ts`. Its
directives are the uniform gate for village waves, forest ambushes, bridge
detection, boss arrival and engagement, phase changes, and ambient dungeon
events. Page-level executors perform authored consequences only after the
director declares a directive ready; do not add another condition watcher.

## Change encounter or turn state

Use `useGameStateTransitions`. `startCombat`, `startExploration`, and
`resetTurnControls` reset the related state as one operation. Content code must
not reconstruct the round/turn/phase/selection/AI reset sequence itself.

Tutorial level gains apply immediately, but optional ability choices wait until
the party leaves the bridge. The regular progression screen must not interrupt
the woods, ritual, poison, or village routes.

## Add combat or enemy behavior

Pure combat geometry, footprints, range, rear attacks, hit chance, and damage
live in `combat-engine.ts`. General enemy target ranking, tactics, and disguise
detection live in `enemy-ai.ts`. Boss action sequences may remain authored
encounter actions, but they consume these shared calculations rather than
forking movement or targeting rules in the page.

Combat timing and floating hit/heal/status feedback live in
`combat-presentation.ts` and `use-combat-feedback.ts`. Hero equipment sprite
resolution lives in `equipment-visuals.ts`, synthesized cue patterns live in
`sound-engine.ts`, and authored trap presentation constants live in
`trap-presentation.ts`. `level-one-regression.ts` is the stable route/state
contract for full-floor regression passes.

## Add dialogue or a cutscene

Use `showDialogueBubble` for readable character text. It is persistent, joins
the single FIFO queue, and advances only from the dedicated Continue button,
Space, or Enter. Never make the speech bubble itself clickable and never put a
timer on authored dialogue. Use `showCombatBark` only for short combat/status
barks; exploration dialogue, trap explanations, and authored reactions must
use the portrait dialogue surface.
Use `scheduleCutscene` for authored action delays; the sequence controller
invalidates all pending callbacks on a reset or scene handoff.

## Reset scopes

Every reset button must name a scope from `reset-policy.ts`:

- `encounter`: clears active combat/dialogue only.
- `map`: resets board discovery and encounters; preserves party and inventory.
- `level`: restarts the level; preserves campaign rewards.
- `campaign`: deletes the campaign state.

## Objectives and recaps

Objectives and recap labels live in `objective-registry.ts`. Map completion UI
must read those definitions so the ritual, village, bridge, dungeon, and future
levels use the same ledger vocabulary and reward-box handoff.

## Room behavior defaults

Crossing an authored room threshold starts its introduction; do not make the
player hunt for a nearby marker. Completion is explicit per room rather than
inferred from the first encounter, because rooms may have multiple phases.
Resolved rooms do not automatically replay their introduction. Any actor that
remains must have an authored final line, while decorative scenery without a
choice, consequence, reward, hazard, or useful inspection is not interactive.

## Runtime ownership

The main screen consumes shared game types from `game-types.ts`. Character
kits, progression, XP thresholds, roster construction, and monster unit seeds
live in `character-runtime.ts`. Static terrain, authored map geometry, room
points, secret-door crossings, line of sight, encounter spawn footprints, and
scenery indexes live in `map-runtime.ts`. Do not put new static content or pure
map construction back into `page.tsx`.

The architecture regression suite caps `page.tsx` at 9,800 lines. That budget
may only move downward as live subsystems are extracted.

## Remaining migration boundary

`page.tsx` still owns live combat state, map traversal, save hydration, and
authored consequence executors. Combat calculations and general AI policy now
live outside the renderer; encounter readiness and state handoffs have shared
controllers. Pure time/random/unit construction is owned by `game-runtime.ts`;
declarative map evaluation is owned by `map-trigger-engine.ts`.
`content-validator.ts` checks room markers, spawn
footprints, item/actor/encounter references, duplicate IDs, and trigger
references before the game renders. New features must use these boundaries.
Existing hardcoded combat behavior should be migrated by subsystem, with all
behavior tests run after each slice.
