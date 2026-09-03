import { ABILITIES, ABILITY_LABELS, abilityModifier, proficiencyBonus, signedModifier } from "./dnd-rules";
import type { Ability, AbilityScores } from "./game-types";

export default function AbilityScoreGrid({ abilities, armorClass, level = 1, primaryAbility, className = "ability-score-grid" }: { abilities?: AbilityScores; armorClass: number; level?: number; primaryAbility?: Ability; className?: string }) {
  if (!abilities) return <div className={className}><span>AC <b>{armorClass}</b></span><span>PROF <b>{signedModifier(proficiencyBonus(level))}</b></span></div>;
  return <div className={className}>
    <span>AC <b>{armorClass}</b></span><span>PROF <b>{signedModifier(proficiencyBonus(level))}</b></span>
    {ABILITIES.map((ability) => <span className={ability === primaryAbility ? "primary-ability" : ""} key={ability}>{ABILITY_LABELS[ability]} <b>{abilities[ability]} <small>({signedModifier(abilityModifier(abilities[ability]))})</small></b></span>)}
  </div>;
}
