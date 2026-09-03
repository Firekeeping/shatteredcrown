export const FOREST_GUARD_WARNING =
  "Hurry, we don't have much time, there's some sort of ritual going on deeper in the forest.";

export const FOREST_GUARD_CAP_OFFER =
  "Take this, he says as his hand loosens around the battered blue ball cap…";

export const FOREST_POISON_BAIT_CHOICE =
  "Poison the guard's body and use it as bait to stop the ritual";

export const POISON_BAIT_ENEMY_TYPES = [
  "Werewolf",
  "Dire Wolf",
  "Dire Wolf",
  "Dire Wolf",
] as const;

export const poisonBaitEnemyName = (type: (typeof POISON_BAIT_ENEMY_TYPES)[number], index: number) =>
  type === "Werewolf" ? "The Werewolf" : `Wolf ${index}`;

export const POISON_BAIT_DIALOGUE = {
  scent: "Fresh meat…",
  reaction: "Gross, did a troll cook this?",
} as const;
