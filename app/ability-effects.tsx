import type { CSSProperties } from "react";
import { ABILITY_VFX_ASSETS, ANIMATED_ABILITY_EFFECTS, MONSTER_DETACHED_EFFECTS, PASSIVE_BADGE_ASSETS, abilityVfxAssetUrl, abilityVfxGeometry } from "./ability-vfx-registry";

export { SPECIAL_RENDERED_EFFECTS } from "./ability-vfx-registry";

type Point = { x: number; y: number };
export type AbilityVfxState = { name: string; from: Point; to: Point; tiles?: Point[]; nonce: number };
export type LineVfxState = { from: Point; to: Point; nonce: number };

const effectSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function PassiveAbilityBadges({ skills }: { skills: ReadonlyArray<{ name: string }> }) {
  const owned = Object.entries(PASSIVE_BADGE_ASSETS).filter(([name]) => skills.some((skill) => skill.name === name));
  if (!owned.length) return null;
  return <span className="passive-ability-badges" aria-hidden="true">
    {owned.map(([name, asset]) => <span key={name} className="passive-ability-badge" title={`${name} — passive ability`} style={{ "--passive-vfx-image": `url(/vfx-${asset}.png)` } as CSSProperties} />)}
  </span>;
}

export default function AbilityEffects({ effect, lightning, cols, rows }: { effect: AbilityVfxState | null; lightning: LineVfxState | null; cols: number; rows: number }) {
  const renderLine = (line: LineVfxState, className: string, image?: string) => {
    const dx = (line.to.x - line.from.x) * 100 / cols, dy = (line.to.y - line.from.y) * 100 / rows;
    return <span key={line.nonce} className={className} style={{ left: `${line.from.x * 100 / cols + 50 / cols}%`, top: `${line.from.y * 100 / rows + 50 / rows}%`, width: `${Math.max(Math.hypot(dx, dy), 100 / cols)}%`, transform: `translateY(-50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`, ...(image ? { "--ability-vfx-image": `url(${image})` } : {}) } as CSSProperties} aria-hidden="true" />;
  };
  let renderedEffect = null;
  if (effect) {
    const image = ABILITY_VFX_ASSETS[effect.name];
    const monsterClass = MONSTER_DETACHED_EFFECTS.has(effect.name) ? ` monster-vfx monster-vfx-${effectSlug(effect.name)}` : "";
    const spriteClass = ANIMATED_ABILITY_EFFECTS.has(effect.name) ? " ability-vfx-sprite" : "";
    if (abilityVfxGeometry(effect.name) === "area" && effect.tiles?.length) {
      const xs = effect.tiles.map((tile) => tile.x), ys = effect.tiles.map((tile) => tile.y);
      const left = Math.min(...xs), top = Math.min(...ys), right = Math.max(...xs), bottom = Math.max(...ys);
      renderedEffect = <span key={effect.nonce} className={`ability-vfx ability-vfx-area ability-vfx-${effectSlug(effect.name)}${monsterClass}${spriteClass}`} style={{ left: `${left * 100 / cols}%`, top: `${top * 100 / rows}%`, width: `${(right - left + 1) * 100 / cols}%`, height: `${(bottom - top + 1) * 100 / rows}%`, "--ability-vfx-angle": `${Math.atan2(effect.to.y - effect.from.y, effect.to.x - effect.from.x) * 180 / Math.PI}deg`, ...(image ? { "--ability-vfx-image": `url(${abilityVfxAssetUrl(effect.name)})` } : {}) } as CSSProperties} aria-hidden="true" />;
    } else if (abilityVfxGeometry(effect.name) === "line") renderedEffect = renderLine(effect, `ability-vfx ability-vfx-line ability-vfx-${effectSlug(effect.name)}${monsterClass}${spriteClass}`, abilityVfxAssetUrl(effect.name));
    else renderedEffect = <span key={effect.nonce} className={`ability-vfx ability-vfx-point ability-vfx-${effectSlug(effect.name)}${monsterClass}${spriteClass}`} style={{ left: `${effect.to.x * 100 / cols + 50 / cols}%`, top: `${effect.to.y * 100 / rows + 50 / rows}%`, ...(image ? { "--ability-vfx-image": `url(${abilityVfxAssetUrl(effect.name)})` } : {}) } as CSSProperties} aria-hidden="true" />;
  }
  return <>{lightning && renderLine(lightning, "lightning-bolt-effect")}{renderedEffect}</>;
}
