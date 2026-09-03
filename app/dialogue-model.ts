import type { EncounterChoice, EncounterRequirement } from "./encounter-engine";
import type { SocialScene } from "./game-types";

export const DISMISSIBLE_SOCIAL_KINDS = new Set<SocialScene["kind"]>(["dead-mage", "schoolteacher"]);
export const VILLAGER_QUOTES = [
  "If you are looking for gratitude, try the baker. I only have turnips.",
  "The wolves were quieter than my neighbors. Deadlier, mind you.",
  "That inn door was new. Was.",
  "I always said this village needed a wall. No one asked me twice.",
  "You lot fight like heroes. You smell like wet dogs.",
  "The College road? Follow the sparks and poor decisions.",
] as const;

export const requirementTag = (requirement: EncounterRequirement) => {
  if (requirement.kind === "hero-item") {
    if (requirement.item === "Ball Cap of Bad Ideas") return "BALL CAP";
    if (requirement.item === "Glasses of Good Questions") return "GLASSES";
    return "ITEM";
  }
  if (requirement.kind === "party-item") return "PARTY ITEM";
  if (requirement.kind === "hero-class") return requirement.role.toUpperCase();
  if (requirement.kind === "investigation") return `INVESTIGATION ${requirement.minimum}`;
  return "CONDITION";
};

export const choiceTag = (choice: EncounterChoice) =>
  choice.requirements?.[0] ? requirementTag(choice.requirements[0]) : ({
    peace: "PEACE",
    item: "ITEM",
    class: "CLASS",
    risk: "RISK",
    combat: "FIGHT",
    retreat: "LEAVE",
  } as const)[choice.tone];
