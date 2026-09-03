export type TrapVisualState = "concealed" | "idle" | "detected" | "armed" | "triggered" | "disabled";

type TrapStateInput = {
  id: string;
  flags: ReadonlySet<string>;
  discovered: ReadonlySet<string>;
  resolved: ReadonlySet<string>;
};

const ALWAYS_VISIBLE_TRAPS = new Set(["heart-acid", "proximity-bomb"]);

export const trapVisualState = ({ id, flags, discovered, resolved }: TrapStateInput): TrapVisualState => {
  if (resolved.has(id)) return "disabled";
  if (id === "proximity-bomb" && flags.has("proximity-bomb-armed")) return "armed";
  if (id === "spiked-pit-28d" && flags.has("spiked-pit-28d-triggered")) return "triggered";
  if (id === "heart-acid" && flags.has("heart-acid-dropped")) return "triggered";
  if (discovered.has(id)) return "detected";
  return ALWAYS_VISIBLE_TRAPS.has(id) ? "idle" : "concealed";
};

export const normalizeTrapPersistence = (
  flags: readonly string[],
  discoveredPoi: readonly string[],
  resolvedPoi: readonly string[],
) => {
  const normalizedFlags = new Set(flags);
  const discovered = new Set(discoveredPoi);
  const resolved = new Set(resolvedPoi);

  if (normalizedFlags.has("ceramic-alarm-sounded")) {
    discovered.add("ceramic-alarm");
    resolved.add("ceramic-alarm");
  }
  if (normalizedFlags.has("spiked-pit-28d-triggered")) discovered.add("spiked-pit-28d");
  if (normalizedFlags.has("heart-acid-dropped")) discovered.add("heart-acid");
  if (normalizedFlags.has("proximity-bomb-armed")) discovered.add("proximity-bomb");
  if (resolved.has("proximity-bomb")) normalizedFlags.delete("proximity-bomb-armed");
  if (normalizedFlags.has("room-33-flood-drained")) normalizedFlags.add("room-33-flood-active");

  return {
    flags: [...normalizedFlags],
    discoveredPoi: [...discovered],
    resolvedPoi: [...resolved],
  };
};
