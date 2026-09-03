export type DamagePart = { amount: number; type: string };

export const simulateAttackSeries = (rolls: number[], attackBonus: number, armorClass: number, damage: number) => rolls.map((roll) => ({
  roll,
  hit: roll === 20 || (roll !== 1 && roll + attackBonus >= armorClass),
  critical: roll === 20,
  damage: roll === 20 ? damage * 2 : roll !== 1 && roll + attackBonus >= armorClass ? damage : 0,
}));

export const simulateTypedDamage = (parts: DamagePart[], defenses: { resistances?: string[]; immunities?: string[]; vulnerabilities?: string[] }) => parts.reduce((sum, part) => {
  if (defenses.immunities?.includes(part.type)) return sum;
  if (defenses.vulnerabilities?.includes(part.type)) return sum + part.amount * 2;
  if (defenses.resistances?.includes(part.type)) return sum + Math.floor(part.amount / 2);
  return sum + part.amount;
}, 0);

export const simulateRecharge = (roll: number, minimum: number, maximum = 6) => roll >= minimum && roll <= maximum;
export const simulateSaveEnds = (roll: number, bonus: number, dc: number) => roll === 20 || (roll !== 1 && roll + bonus >= dc);
export const awardXpOnce = (awarded: Set<string>, sourceId: string, xp: number) => {
  if (awarded.has(sourceId)) return 0;
  awarded.add(sourceId);
  return xp;
};
