import type { SocialScene, Unit } from "./game-types";

/** Prefer the authored NPC speaker over the responding hero in mixed social scenes. */
export const resolveSocialDialogueSpeaker = (units: Unit[], scene: SocialScene | null) => {
  if (!scene) return undefined;
  return units.find((unit) => !unit.downed && unit.name === scene.speaker)
    || units.find((unit) => !unit.downed && unit.encounterGroup === scene.roomLabel)
    || units.find((unit) => !unit.downed && unit.id === scene.heroId);
};
