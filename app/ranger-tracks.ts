import type { PointOfInterest } from "./game-types";

export const ANIMAL_TRACKS_LABEL = "Animal Tracks";
export const RANGER_TRACK_SIGHT = 10;
export const isAnimalTracks = (point: Pick<PointOfInterest, "name">) => point.name.trim().toLowerCase() === ANIMAL_TRACKS_LABEL.toLowerCase();
export const rangerTrackCallout = (point: Pick<PointOfInterest, "id" | "name">) => /dragon/i.test(point.id)
  ? "Dragon tracks... why would there be dragon tracks here?"
  : /wolf/i.test(point.id)
    ? "Wolf tracks. Fresh. Something bigger is moving with them."
    : `${point.name}. Fresh enough to follow.`;
export const RANGER_TRACK_FEATURE = "Animal Tracks glow whenever they enter the Ranger's field of vision; approach or inspect them to identify what made them.";
