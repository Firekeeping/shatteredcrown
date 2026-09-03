export type ResetScope = "encounter" | "map" | "level" | "campaign";

export type ResetPolicy = {
  preservesInventory: boolean;
  preservesAchievements: boolean;
  preservesMapDiscovery: boolean;
  clearsCombat: boolean;
  clearsDialogue: boolean;
};

/** Explicit save boundaries. UI reset actions must name one of these scopes. */
export const RESET_POLICIES: Record<ResetScope, ResetPolicy> = {
  encounter: { preservesInventory: true, preservesAchievements: true, preservesMapDiscovery: true, clearsCombat: true, clearsDialogue: true },
  map: { preservesInventory: true, preservesAchievements: true, preservesMapDiscovery: false, clearsCombat: true, clearsDialogue: true },
  level: { preservesInventory: true, preservesAchievements: true, preservesMapDiscovery: false, clearsCombat: true, clearsDialogue: true },
  campaign: { preservesInventory: false, preservesAchievements: false, preservesMapDiscovery: false, clearsCombat: true, clearsDialogue: true },
};

export const resetButtonLabel = (scope: ResetScope) => ({
  encounter: "Reset Encounter",
  map: "Reset Map (Keep Party & Inventory)",
  level: "Restart Level (Keep Campaign Rewards)",
  campaign: "Restart Entire Campaign",
})[scope];
