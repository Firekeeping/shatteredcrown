"use client";

import { useEffect } from "react";
import { XP_LEVELS, xpForNextLevel } from "./character-runtime";
import { unitFootprintAt } from "./combat-engine";
import { ENEMY_TACTICS } from "./enemy-ai";
import AbilityScoreGrid from "./ability-score-grid";
import { ABILITIES, ABILITY_LABELS, armorClassOf, attackBonusOf, initiativeModifierOf, passiveScore, proficiencyBonus, savingThrowBonus, skillCheckBonus, spellSaveDc } from "./dnd-rules";
import { weaponAttackProfile } from "./equipment-runtime";
import { monsterStatBlockFor } from "./monster-runtime";
import { activeConditions, conditionDurationLabel } from "./condition-runtime";
import type { Unit } from "./game-types";

type UnitInspectorAction = (() => void) | undefined;

type UnitInspectorOverlayProps = {
  unit: Unit;
  fallbackLevel: number;
  equippedWeapon?: string;
  equippedOffhand?: string;
  wolfTranslation?: {
    interpreterName: string;
    text: string;
  };
  actions: {
    talk?: UnitInspectorAction;
    resumeClub?: UnitInspectorAction;
    resumeConversation?: UnitInspectorAction;
    stopBleeding?: UnitInspectorAction;
    drinkPotion?: UnitInspectorAction;
  };
  onClose: () => void;
};

export default function UnitInspectorOverlay({
  unit,
  fallbackLevel,
  equippedWeapon,
  equippedOffhand,
  wolfTranslation,
  actions,
  onClose,
}: UnitInspectorOverlayProps) {
  useEffect(() => {
    const closeFromKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "Enter" || target?.matches("button, input, select, textarea")) return;
      event.preventDefault(); onClose();
    };
    window.addEventListener("keydown", closeFromKeyboard);
    return () => window.removeEventListener("keydown", closeFromKeyboard);
  }, [onClose]);
  const unitLevel = unit.level || fallbackLevel;
  const currentLevelXp = XP_LEVELS[unitLevel] || 0;
  const nextLevelXp = xpForNextLevel(unitLevel);
  const xpProgress = Math.min(
    100,
    100 * ((unit.xp || 0) - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp),
  );
  const footprint = unitFootprintAt(unit).length;
  const weapon = weaponAttackProfile(unit, equippedWeapon, !equippedOffhand);
  const monster = unit.team !== "hero" ? monsterStatBlockFor(unit) : null;

  return (
    <div className="inspect" onClick={onClose}>
      <div className="panel" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow">UNIT INFORMATION</p>
        <h2>{unit.name}</h2>
        <p>{unit.role} · Level {unitLevel}</p>
        {unit.team === "enemy" && (
          <p className="enemy-tactic-label">
            TACTIC · {(ENEMY_TACTICS[unit.role] || "hunter").toUpperCase()}
            {footprint > 1 ? ` · ${footprint}-SQUARE CREATURE` : ""}
          </p>
        )}
        {unit.team === "hero" && (
          <div className="xp-track">
            <span>XP {(unit.xp || 0).toLocaleString()} / {nextLevelXp.toLocaleString()}</span>
            <i><b style={{ width: `${xpProgress}%` }} /></i>
          </div>
        )}
        {unit.bleeding && <p className="bleed-label">BLEEDING · loses 3 HP each round</p>}
        {unit.poisoned && <p className="bleed-label">POISONED · loses 10 HP each round</p>}
        {activeConditions(unit).filter((condition) => !["poisoned", "bleeding", "unconscious"].includes(condition)).map((condition) => <p className="bleed-label" key={condition}>{condition.toUpperCase()} · {conditionDurationLabel(unit, condition)}</p>)}
        {!!unit.rageRounds && (
          <p className="rage-label">RAGE · +5 Damage · physical damage halved · {unit.rageRounds} round{unit.rageRounds === 1 ? "" : "s"} remaining</p>
        )}
        {unit.team === "hero" && <><AbilityScoreGrid abilities={unit.abilities} armorClass={armorClassOf(unit)} level={unitLevel} primaryAbility={unit.primaryAbility} /><p>Skills <b>{unit.skillProficiencies?.join(" · ") || "None"}</b></p><p>All saves <b>{ABILITIES.map((ability) => { const bonus = savingThrowBonus(unit, ability); return `${ABILITY_LABELS[ability]} ${bonus >= 0 ? "+" : ""}${bonus}`; }).join(" · ")}</b></p></>}
        {monster && <>
          <p><b>{monster.size.toUpperCase()} {monster.creatureType.toUpperCase()}</b>{monster.alignment ? ` · ${monster.alignment}` : ""} · CR {monster.challengeRating} · {monster.xp} XP</p>
          <AbilityScoreGrid abilities={monster.abilities} armorClass={monster.armorClass} level={unitLevel} primaryAbility={unit.primaryAbility} />
          <p>Speeds <b>{Object.entries(monster.speeds).map(([mode, speed]) => `${mode} ${speed}`).join(" · ")}</b></p>
          <p>Current movement <b>{(unit.movementMode || "walk").toUpperCase()}</b></p>
          <p>Saves <b>{ABILITIES.map((ability) => `${ABILITY_LABELS[ability]} ${savingThrowBonus(unit, ability) >= 0 ? "+" : ""}${savingThrowBonus(unit, ability)}`).join(" · ")}</b></p>
          {!!Object.keys(monster.skills).length && <p>Skills <b>{Object.entries(monster.skills).map(([skill, bonus]) => `${skill} ${Number(bonus) >= 0 ? "+" : ""}${bonus}`).join(" · ")}</b></p>}
          {!!monster.senses.length && <p>Senses <b>{monster.senses.join(" · ")}</b></p>}
          {!!monster.languages.length && <p>Languages <b>{monster.languages.join(" · ")}</b></p>}
          {!!monster.resistances.length && <p>Resistances <b>{monster.resistances.join(" · ")}</b></p>}
          {!!monster.immunities.length && <p>Immunities <b>{monster.immunities.join(" · ")}</b></p>}
          {!!monster.vulnerabilities.length && <p>Vulnerabilities <b>{monster.vulnerabilities.join(" · ")}</b></p>}
          {!!monster.conditionImmunities.length && <p>Condition immunities <b>{monster.conditionImmunities.join(" · ")}</b></p>}
          {monster.traits.map((trait) => <p key={trait.id}><b>{trait.name}.</b> {trait.description}</p>)}
          {monster.attacks.map((attack) => <p key={attack.id}><b>{attack.name}.</b> {attack.save ? `${ABILITY_LABELS[attack.save.ability]} DC ${attack.save.dc}` : `${Number(attack.attackBonus) >= 0 ? "+" : ""}${attack.attackBonus} to hit`} · range {attack.reach} · {attack.attacks && attack.attacks > 1 ? `${attack.attacks} attacks · ` : ""}{attack.damage} {attack.damageType}{attack.additionalDamage?.map((part) => ` + ${part.damage} ${part.damageType}`).join("") || ""}{attack.recharge ? ` · Recharge ${attack.recharge.min}–${attack.recharge.max}` : ""}</p>)}
        </>}
        {wolfTranslation && (
          <p className="wolf-tongue-translation"><b>{wolfTranslation.interpreterName} understands:</b> “{wolfTranslation.text}”</p>
        )}
        {actions.talk && <button className="inspect-action" onClick={actions.talk}>Talk</button>}
        {actions.resumeClub && <button className="inspect-action" onClick={actions.resumeClub}>Resume Club Conversation</button>}
        {actions.resumeConversation && <button className="inspect-action" onClick={actions.resumeConversation}>Resume Conversation</button>}
        <div className="inspect-stats">
          <span>HP <b>{unit.hp}/{unit.maxHp}</b></span>
          <span>DAMAGE <b>{weapon.damage}</b></span>
          <span>RANGE <b>{weapon.range}</b></span>
          <span>AC <b>{armorClassOf(unit)}</b></span>
          <span>ATTACK BONUS <b>{attackBonusOf(unit) >= 0 ? "+" : ""}{attackBonusOf(unit)}</b></span>
          <span>INIT <b>{initiativeModifierOf(unit) >= 0 ? "+" : ""}{initiativeModifierOf(unit)}</b></span>
          <span>MOVE <b>{unit.move}</b></span>
          <span>PROF <b>+{proficiencyBonus(unitLevel)}</b></span>
          <span>PASSIVE PERCEPTION <b>{passiveScore(unit, "Perception")}</b></span>
          <span>SPELL DC <b>{spellSaveDc(unit)}</b></span>
          <span>INV <b>{skillCheckBonus(unit, "Investigation") >= 0 ? "+" : ""}{skillCheckBonus(unit, "Investigation")}</b></span>
        </div>
        <p>Weapon <b>{weapon.name}</b></p>
        {equippedOffhand && <p>Off hand <b>{equippedOffhand}</b></p>}
        <div className="inspect-stats">
          {unit.skills.map((skill) => <span key={`${skill.name}-${skill.range}`}>{skill.name} <b>{skill.unlimited ? "Basic" : `${skill.charges} charge${skill.charges === 1 ? "" : "s"}`}</b></span>)}
        </div>
        {actions.stopBleeding && (
          <button className="inspect-action" onClick={actions.stopBleeding}>Stop Bleeding — Spend Action</button>
        )}
        {actions.drinkPotion && (
          <button className="inspect-action" onClick={actions.drinkPotion}>Use Healing Potion — Restore 50 HP</button>
        )}
      </div>
    </div>
  );
}
