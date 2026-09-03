export const SPIKE_PIT_PRESENTATION = Object.freeze({
  id: "spiked-pit-28d",
  triggeredFlag: "spiked-pit-28d-triggered",
  damage: 21,
  laugh: "HALASTER: HA! HA! HA!",
  log: (heroName: string) => `Halaster's laughter follows the crash. ${heroName} takes 21 damage as the hinged floor drops and oversized stone spikes punch upward.`,
});

export const trapReaction = (trapId: string, fallbackName: string) => {
  if (trapId === "watch-hall-spear-trap") return "Wall spears!";
  if (trapId === "bridge-snare") return "Caught!";
  if (trapId.startsWith("ceramic-alarm")) return "Alarm!";
  return fallbackName;
};
