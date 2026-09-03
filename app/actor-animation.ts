export type SpritePose = "idle" | "walk" | "attack" | "damage" | "ko" | "cast";
export type ActionSpritePose = Extract<SpritePose, "attack" | "cast">;
export type MonsterActionKind = "body" | "projectile" | "hybrid";

export type ActorActionPresentation = {
  kind: MonsterActionKind;
  pose: ActionSpritePose;
  duration: number;
  effectName?: string;
};

export type ActorActionAnimation = Pick<ActorActionPresentation, "pose" | "duration">;

export const SPRITE_POSE_TIMING: Readonly<Record<Exclude<SpritePose, "idle" | "ko">, number>> = Object.freeze({
  walk: 560,
  attack: 720,
  damage: 620,
  cast: 900,
});

export const spritePoseDuration = (pose: Exclude<SpritePose, "idle" | "ko">, requested?: number) =>
  Math.max(SPRITE_POSE_TIMING[pose], requested || 0);

const body = (duration = 760): ActorActionPresentation => ({ kind: "body", pose: "attack", duration });
const signature = (duration = 1000): ActorActionPresentation => ({ kind: "body", pose: "cast", duration });
const projectile = (duration = 900): ActorActionPresentation => ({ kind: "projectile", pose: "cast", duration });
const ranged = (duration = 900): ActorActionPresentation => ({ kind: "projectile", pose: "attack", duration });
const hybrid = (effectName: string, duration = 1100): ActorActionPresentation => ({ kind: "hybrid", pose: "cast", duration, effectName });

// Every actor sheet follows the six-cell contract: idle, move, physical
// action, damage, downed, signature. Every attack owned by an actor marked
// `visualKind: "monster"` in the registry must be classified here. Body
// actions change only the actor sprite. Projectile and hybrid actions may add
// a detached effect after the actor begins its authored pose.
export const MONSTER_ACTION_PRESENTATIONS: Readonly<Record<string, Readonly<Record<string, ActorActionPresentation>>>> = {
  Goblin: { "Goblin Slash": body(), "Dirty Slash": body(820) },
  "Hungry Goblin": { "Hungry Goblin Slash": body() },
  "Goblin in a White Shirt": { "Goblin in a White Shirt Thrust": body() },
  "Giant Rat": { Bite: body() },
  "Gelatinous Cube": { Engulf: hybrid("Engulf", 1000) },
  "Black Dragon": { Rend: body(900), "Acid Breath": hybrid("Acid Breath", 1200) },
  "Nightmare Clown": { "Nightmare Clown Strike": body(950) },
  "Living Shroud": { "Living Shroud Shot": hybrid("Living Shroud Strike", 1000) },
  "Spectral Delver": { "Spectral Delver Strike": body(850) },
  "Brell, Expedition Leader": { "Brell, Expedition Leader Strike": body(850) },
  "Marda, Celebrant": { "Marda, Celebrant Strike": body(850) },
  "Osric, Cartographer": { "Osric, Cartographer Shot": projectile(900) },
  "Dire Wolf": { Bite: body(760), Pounce: body(900) },
  Grell: { Tentacles: body(900) },
  Grick: { "Beak and Tentacles": body(900) },
  "Grick Alpha": { "Rending Tentacles": body(950) },
  Bugbear: { "Bugbear Strike": body(850) },
  "Pillar Bugbear": { "Pillar Bugbear Strike": body(900) },
  Troll: { Claw: body(900), Regeneration: hybrid("Regeneration", 900) },
  "Flesh Golem": { Slam: body(900), "Lightning Absorption": hybrid("Lightning Absorption", 1000) },
  "Air Elemental": { "Whirlwind Slam": hybrid("Whirlwind Slam", 1100) },
  Werewolf: { Claws: body(850), "Rending Claws": body(900), "Predator's Leap": body(950) },
  Manticore: { "Tail Spike": hybrid("Tail Spike", 950), Tailstorm: hybrid("Tailstorm", 1150) },
  Flyndol: { "Silvered Blade": body(850) },
  Ettin: { "Two-Headed Assault": body(1000), Greatclub: body(950), Boulder: projectile(1050), "Crown Beam": hybrid("Crown Beam", 1100) },
  "Large Mimic": { "Adhesive Pseudopod": signature(1000) },
  "John Wick": { "Runed Pistol Double Tap": ranged(980) },
  "Vesper Longshot": { "AWP Arc Shot": ranged(1120) },
  "Brakka Breach": { "Dragonfire Breach": ranged(960) },
  "Nix Fusefinger": { "Emerald Grenade": ranged(1000) },
  "Thorne Bastion": { "Adamant Suppression": ranged(980) },
  "Sable Null": { "Null-Sigil Suppressed Shot": ranged(900) },
  "Mercy Hex": { "Trauma Hex Burst": ranged(940) },
  "Rook Ironjaw": { "Ironjaw Carbine Rush": ranged(960) },
};

export const monsterActionPresentation = (role: string, actionName?: string) =>
  actionName ? MONSTER_ACTION_PRESENTATIONS[role]?.[actionName] : undefined;

export const monsterActionEffect = (role: string, actionName?: string) =>
  monsterActionPresentation(role, actionName)?.effectName;

export const actorActionAnimation = (role: string, actionName?: string): ActorActionAnimation => {
  const presentation = monsterActionPresentation(role, actionName);
  return presentation ? { pose: presentation.pose, duration: presentation.duration } : { pose: "attack", duration: actionName ? 760 : 700 };
};

export const actorUsesSignatureFrame = (role: string, actionName: string) =>
  monsterActionPresentation(role, actionName)?.pose === "cast";
