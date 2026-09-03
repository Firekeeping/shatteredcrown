import { normalizeTrapPersistence } from "./trap-state";

export const CAMPAIGN_SAVE_SCHEMA_VERSION = 2;
export const CAMPAIGN_SAVE_KEY = "shattered-crown-campaign-v2";
export const LEGACY_CAMPAIGN_SAVE_KEYS = ["shattered-crown-campaign-v1"] as const;
export const isCurrentCampaignSave = (value: unknown): value is Record<string, unknown> & { schemaVersion: 2 } =>
  !!value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === CAMPAIGN_SAVE_SCHEMA_VERSION;
export const PUBLISHED_ROUTE_SCENES: Readonly<Record<string, number>> = {};

export type AuditableUnit = { id: string; team: string; downed?: boolean; encounterGroup?: string };
export type CampaignAuditSnapshot = {
  flags: readonly string[];
  discoveredPoi?: readonly string[];
  resolvedPoi: readonly string[];
  units: readonly AuditableUnit[];
  socialKind?: string | null;
  encounterMode?: string;
};

export const RESOLUTION_FLAGS: Record<string, readonly string[]> = {
  "2b": ["pillar-bugbears-paid-break", "pillar-bugbears-warned", "pillar-bugbears-outmaneuvered", "pillar-bugbears-deserter-clue"],
  "5": ["room-state:5:resolved"],
  "6c": ["undertaker-club-tour-complete", "room-state:6c:resolved"],
  "8b": ["harria-golem-inspection-bluff", "harria-golem-chose-home", "room-state:8b:resolved"],
  "16": ["room-state:16:resolved"],
  "18": ["room-state:18:resolved"],
  "19c": ["room-state:19c:resolved", "flour-ghost-trapped", "flour-ghost-empowered"],
  "35": ["room-state:35:resolved"],
  "39c": ["room-state:39c:resolved"],
};

const COUPLED_POI_RESOLUTIONS: readonly { flag: string; poiIds: readonly string[] }[] = [
  { flag: "ceramic-alarm-sounded", poiIds: ["ceramic-alarm"] },
  { flag: "black-pudding-triggered", poiIds: ["black-pudding-statue"] },
  { flag: "black-goo-emo-bond", poiIds: ["black-pudding-statue"] },
  { flag: "dwarven-water-bottled", poiIds: ["dwarven-spigot"] },
];

export const resolvedEncounterGroups = (flags: readonly string[]) => new Set(
  Object.entries(RESOLUTION_FLAGS)
    .filter(([, outcomes]) => outcomes.some((flag) => flags.includes(flag)))
    .map(([room]) => room),
);

export const auditCampaignState = (snapshot: CampaignAuditSnapshot) => {
  const resolved = resolvedEncounterGroups(snapshot.flags);
  const issues: string[] = [];
  snapshot.units.forEach((unit) => {
    if (unit.encounterGroup && resolved.has(unit.encounterGroup) && !unit.downed)
      issues.push(`resolved-actor:${unit.encounterGroup}:${unit.id}`);
  });
  COUPLED_POI_RESOLUTIONS.forEach(({ flag, poiIds }) => {
    if (snapshot.flags.includes(flag) && poiIds.some((id) => !snapshot.resolvedPoi.includes(id)))
      issues.push(`partial-poi-resolution:${flag}`);
  });
  if (snapshot.flags.includes("flour-ghost-trapped") && snapshot.flags.includes("flour-ghost-empowered"))
    issues.push("conflicting-flour-ghost-outcomes");
  if (snapshot.encounterMode === "exploration" && snapshot.units.some((unit) => unit.team === "enemy" && !unit.downed))
    issues.push("exploration-with-active-enemies");
  return issues;
};

export const repairCampaignState = <T extends AuditableUnit>(snapshot: Omit<CampaignAuditSnapshot, "units"> & { units: readonly T[] }) => {
  const resolved = resolvedEncounterGroups(snapshot.flags);
  const coupledResolvedPoi = COUPLED_POI_RESOLUTIONS.flatMap(({ flag, poiIds }) =>
    snapshot.flags.includes(flag) ? poiIds : []);
  const migratedResolvedPoi = snapshot.resolvedPoi.map((id) => id === "dwarven-emergency-cabinet" ? "dwarven-cave-in" : id);
  const traps = normalizeTrapPersistence(
    snapshot.flags,
    snapshot.discoveredPoi || [],
    [...migratedResolvedPoi, ...coupledResolvedPoi],
  );
  return {
    units: snapshot.units.filter((unit) => unit.encounterGroup !== "31" && (!unit.encounterGroup || !resolved.has(unit.encounterGroup) || unit.downed)),
    flags: traps.flags,
    discoveredPoi: traps.discoveredPoi,
    resolvedPoi: traps.resolvedPoi,
    issues: auditCampaignState(snapshot),
  };
};
