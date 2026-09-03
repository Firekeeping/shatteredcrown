"use client";
import { useLayoutEffect, useMemo, useReducer, useState } from "react";
import type { AbilityZone } from "./ability-runtime";
import type { BattlefieldDefinition } from "./battlefield-engine";
import { battlefieldElevationAt, battlefieldPositionAt, createBattlefieldVisionKernel } from "./battlefield-vision-runtime";
import { conditionLimitsVision } from "./condition-runtime";
import type { Unit } from "./game-types";
import {
  combinePlayerVisionMasks,
  mergeExploredMask,
  playerVisionTileState,
  type PlayerVisionTileState,
  type VisionObserver,
} from "./player-vision-runtime";

export type BattlefieldVisionScope = "party" | "selected";
export type BattlefieldVisionRange = "daylight" | "120" | "60";
export type BattlefieldAngularVisionLayer = {
  observerId: string;
  polygon: { x:number; y:number }[];
  visible: Uint8Array;
  samples: Uint8Array;
  sampleResolution: number;
};

export type BattlefieldPlayerViewModel = {
  enabled: boolean;
  viewEnabled: boolean;
  battlefieldId: BattlefieldDefinition["id"];
  memoryKey: string;
  width: number;
  height: number;
  scope: BattlefieldVisionScope;
  range: BattlefieldVisionRange;
  visibleNow: Uint8Array;
  explored: Uint8Array;
  angularVisionLayers: BattlefieldAngularVisionLayer[];
  visualMemoryRevision: number;
  observerLabel: string;
  elevationLabel: string;
  setViewEnabled: (enabled: boolean) => void;
  setScope: (scope: BattlefieldVisionScope) => void;
  setRange: (range: BattlefieldVisionRange) => void;
  resetMemory: () => void;
  hasLineOfSight: (from:{x:number;y:number;surfaceId?:string;elevationFt?:number;id?:string}, to:{x:number;y:number;surfaceId?:string;elevationFt?:number}, allowOpaqueTarget?:boolean) => boolean;
  isVisible: (x: number, y: number) => boolean;
  isUnitVisible: (unit: Unit) => boolean;
  tileState: (x: number, y: number) => PlayerVisionTileState;
};

type ObserverRecord = VisionObserver & { name: string; visionRangeSquares: number | null };
type UnitVisionRecord = VisionObserver & { team: Unit["team"] };
type MemoryState = { exploredByKey:Record<string,Uint8Array> };
type MemoryAction = { type:"remember" | "reset"; battlefieldKey:string; visible:Uint8Array };

const VISION_CACHE = new Map<string, BattlefieldAngularVisionLayer>();
const rangeSquares = (range: BattlefieldVisionRange) => range === "60" ? 12 : range === "120" ? 24 : null;
const withinRange = (observer: ObserverRecord, target: { x:number; y:number }) =>
  observer.visionRangeSquares === null || Math.max(Math.abs(target.x - observer.x), Math.abs(target.y - observer.y)) <= observer.visionRangeSquares;
const memoryReducer = (previous: MemoryState, action: MemoryAction): MemoryState => {
  const prior = previous.exploredByKey[action.battlefieldKey] || new Uint8Array(action.visible.length);
  const explored = action.type === "reset" ? action.visible.slice() : mergeExploredMask(prior, action.visible);
  return explored === prior ? previous : { exploredByKey:{ ...previous.exploredByKey, [action.battlefieldKey]:explored } };
};
const setSignature = (values: ReadonlySet<string>) => {
  let xor = 0, sum = 0;
  values.forEach((value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    xor ^= hash; sum = (sum + hash) | 0;
  });
  return `${values.size}:${xor >>> 0}:${sum >>> 0}`;
};

export const useBattlefieldPlayerView = ({
  enabled,
  battlefield,
  blocked = battlefield.blocked,
  blockedCrossings = new Set<string>(),
  units,
  active,
  zones,
  scopeOverride,
  memoryNamespace,
}: {
  enabled: boolean;
  battlefield: BattlefieldDefinition;
  blocked?: ReadonlySet<string>;
  blockedCrossings?: ReadonlySet<string>;
  units: Unit[];
  active?: Unit;
  zones: AbilityZone[];
  scopeOverride?: BattlefieldVisionScope;
  memoryNamespace?: string;
}) => {
  const [viewEnabled, setViewEnabled] = useState(true);
  const [scope, setScope] = useState<BattlefieldVisionScope>("party");
  const [range, setRange] = useState<BattlefieldVisionRange>("daylight");
  const [visualMemoryRevision, resetVisualMemory] = useReducer((revision: number) => revision + 1, 0);
  const battlefieldBaseKey = `${battlefield.id}:${battlefield.cols}x${battlefield.rows}`;
  const size = battlefield.cols * battlefield.rows;
  const [memory, updateMemory] = useReducer(memoryReducer, { exploredByKey:{} });
  const allVisible = useMemo(() => new Uint8Array(size).fill(1), [size]);
  const eligible = units.filter((unit) => unit.team === "hero" && !unit.npc && !unit.downed);
  const selected = eligible.find((unit) => unit.id === active?.id) || eligible[0];
  const effectiveScope = scopeOverride || scope;
  const resolvedMemoryNamespace = effectiveScope === "selected" ? selected?.id : memoryNamespace;
  const battlefieldKey = resolvedMemoryNamespace ? `${battlefieldBaseKey}:${resolvedMemoryNamespace}` : battlefieldBaseKey;
  const explored = memory.exploredByKey[battlefieldKey] || new Uint8Array(size);
  const scoped = effectiveScope === "selected" ? selected ? [selected] : [] : eligible;
  const selectedRange = rangeSquares(range);
  const observerData = scoped.map((unit): ObserverRecord => ({
    id:unit.id,
    name:unit.name,
    x:unit.x,
    y:unit.y,
    surfaceId:unit.surfaceId,
    elevationFt:battlefieldElevationAt(battlefield, unit),
    visionRangeSquares:conditionLimitsVision(unit) ? 1 : selectedRange,
  }));
  const observerSignature = JSON.stringify(observerData);
  const observerRecords = useMemo(() => JSON.parse(observerSignature) as ObserverRecord[], [observerSignature]);
  const blockerSignature = useMemo(() => setSignature(blocked), [blocked]);
  const crossingSignature = useMemo(() => setSignature(blockedCrossings), [blockedCrossings]);
  const zoneSignature = JSON.stringify(zones.filter((zone) => zone.blocksVision).map((zone) => [zone.id, zone.tiles]));
  const zoneBlocked = useMemo(() => new Set(
    (JSON.parse(zoneSignature) as [string, { x:number; y:number }[]][]).flatMap(([, tiles]) => tiles.map((tile) => `${tile.x},${tile.y}`)),
  ), [zoneSignature]);
  const visionKernel = useMemo(() => createBattlefieldVisionKernel({ battlefield, blocked, blockedCrossings, zoneBlocked }),
    [battlefield, blockerSignature, crossingSignature, zoneBlocked]);
  const positionAt = useMemo(() => (observer: VisionObserver, x: number, y: number) =>
    battlefieldPositionAt(battlefield, observer, x, y), [battlefield]);
  const hasLineOfSight = useMemo(() => (
    from:{x:number;y:number;surfaceId?:string;elevationFt?:number;id?:string},
    to:{x:number;y:number;surfaceId?:string;elevationFt?:number},
    allowOpaqueTarget = false,
  ) => {
    const observer:VisionObserver = {
      ...from,
      id:from.id || "line-of-sight",
      elevationFt:from.elevationFt ?? battlefieldElevationAt(battlefield, from),
    };
    const target = to.surfaceId !== undefined || to.elevationFt !== undefined
      ? to
      : positionAt(observer, to.x, to.y);
    return !visionKernel.blocksSight(observer, target, { allowOpaqueTarget });
  }, [battlefield, positionAt, visionKernel]);
  const observerLayers = useMemo(() => {
    if (!enabled || !viewEnabled) return [];
    return observerRecords.map((observer) => {
      const cacheKey = `${battlefieldKey}:${observer.x},${observer.y},${observer.surfaceId || "terrain"},${observer.elevationFt}:${observer.visionRangeSquares ?? "daylight"}:${blockerSignature}:${crossingSignature}:${zoneSignature}`;
      const cached = VISION_CACHE.get(cacheKey);
      if (cached) return cached;
      const layer = visionKernel.layerFor(observer, observer.visionRangeSquares);
      VISION_CACHE.set(cacheKey, layer);
      if (VISION_CACHE.size > 128) VISION_CACHE.delete(VISION_CACHE.keys().next().value!);
      return layer;
    });
  }, [battlefieldKey, blockerSignature, crossingSignature, enabled, observerRecords, viewEnabled, visionKernel, zoneSignature]);
  const observerMasks = useMemo(() => observerLayers.map((layer) => layer.visible), [observerLayers]);
  const visibleNow = useMemo(() => !enabled || !viewEnabled ? allVisible : combinePlayerVisionMasks(size, observerMasks), [allVisible, enabled, observerMasks, size, viewEnabled]);
  const angularVisionLayers = observerLayers;
  useLayoutEffect(() => {
    if (enabled && viewEnabled) updateMemory({ type:"remember", battlefieldKey, visible:visibleNow });
  }, [battlefieldKey, enabled, viewEnabled, visibleNow]);
  const unitSignature = JSON.stringify(units.map((unit): UnitVisionRecord => ({
    id:unit.id,
    team:unit.team,
    x:unit.x,
    y:unit.y,
    surfaceId:unit.surfaceId,
    elevationFt:battlefieldElevationAt(battlefield, unit),
  })));
  const visibleUnitIds = useMemo(() => {
    const targets = JSON.parse(unitSignature) as UnitVisionRecord[];
    if (!enabled || !viewEnabled) return new Set(targets.map((target) => target.id));
    return new Set(targets.filter((target) => observerRecords.some((observer) =>
      observer.id === target.id || withinRange(observer, target) && hasLineOfSight(observer, target, true),
    )).map((target) => target.id));
  }, [enabled, hasLineOfSight, observerRecords, unitSignature, viewEnabled]);
  const primary = observerData[0];
  const observerLabel = effectiveScope === "party" ? `Party vision · ${observerData.length} observer${observerData.length === 1 ? "" : "s"}` : primary?.name || "No conscious hero";
  const elevationLabel = primary ? `${primary.name} · ground ${primary.elevationFt! >= 0 ? "+" : ""}${primary.elevationFt} ft · eyes ${primary.elevationFt! + 5 >= 0 ? "+" : ""}${primary.elevationFt! + 5} ft` : "No elevation sample";
  return {
    enabled,
    viewEnabled,
    battlefieldId:battlefield.id,
    memoryKey:battlefieldKey,
    width:battlefield.cols,
    height:battlefield.rows,
    scope:effectiveScope,
    range,
    visibleNow,
    explored,
    angularVisionLayers,
    visualMemoryRevision,
    observerLabel,
    elevationLabel,
    setViewEnabled,
    setScope,
    setRange,
    hasLineOfSight,
    resetMemory:() => {
      updateMemory({ type:"reset", battlefieldKey, visible:viewEnabled ? visibleNow : new Uint8Array(size) });
      resetVisualMemory();
    },
    isVisible:(x: number, y: number) => !enabled || !viewEnabled || !!visibleNow[y * battlefield.cols + x],
    isUnitVisible:(unit: Unit) => !enabled || !viewEnabled || visibleUnitIds.has(unit.id),
    tileState:(x: number, y: number) => !enabled || !viewEnabled ? "visible-now" : playerVisionTileState(y * battlefield.cols + x, visibleNow, explored),
  } satisfies BattlefieldPlayerViewModel;
};
