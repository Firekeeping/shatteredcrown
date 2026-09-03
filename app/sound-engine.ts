export type SoundCue = "attack" | "impact" | "charge" | "spell" | "trap" | "achievement" | "door" | "boss" | "victory" | "howl";

const RECORDED_CUES: Partial<Record<SoundCue, readonly string[]>> = {
  attack: ["/audio/kenney/attack-1.ogg", "/audio/kenney/attack-2.ogg", "/audio/kenney/attack-3.ogg"],
  impact: ["/audio/kenney/impact-1.ogg", "/audio/kenney/impact-2.ogg", "/audio/kenney/impact-3.ogg"],
  charge: ["/audio/kenney/charge-1.ogg", "/audio/kenney/charge-2.ogg", "/audio/kenney/charge-3.ogg"],
  spell: ["/audio/kenney/spell-1.ogg", "/audio/kenney/spell-2.ogg", "/audio/kenney/spell-3.ogg"],
  trap: ["/audio/kenney/trap-1.ogg", "/audio/kenney/trap-2.ogg", "/audio/kenney/trap-3.ogg"],
  achievement: ["/audio/kenney/achievement-1.ogg", "/audio/kenney/achievement-2.ogg", "/audio/kenney/achievement-3.ogg"],
  door: ["/audio/kenney/door-1.ogg", "/audio/kenney/door-2.ogg", "/audio/kenney/door-3.ogg"],
  boss: ["/audio/kenney/boss-1.ogg", "/audio/kenney/boss-2.ogg", "/audio/kenney/boss-3.ogg"],
  victory: ["/audio/kenney/victory-1.ogg", "/audio/kenney/victory-2.ogg", "/audio/kenney/victory-3.ogg"],
};

const RECORDED_VOLUME: Partial<Record<SoundCue, number>> = {
  attack: .42,
  impact: .46,
  charge: .35,
  spell: .38,
  trap: .42,
  achievement: .38,
  door: .48,
  boss: .52,
  victory: .42,
};

const cueCursor: Partial<Record<SoundCue, number>> = {};

const playRecordedCue = (cue: SoundCue) => {
  const variants = RECORDED_CUES[cue];
  if (!variants?.length || typeof Audio === "undefined") return false;
  const cursor = cueCursor[cue] ?? 0;
  cueCursor[cue] = cursor + 1;
  const audio = new Audio(variants[cursor % variants.length]);
  audio.volume = RECORDED_VOLUME[cue] ?? .4;
  audio.playbackRate = [.98, 1, 1.02][cursor % 3];
  void audio.play().catch(() => {
    // Browsers may block sound until the player has interacted with the page.
  });
  return true;
};

export const playSoundCue = (
  cue: SoundCue,
  enabled: boolean,
  existingContext: AudioContext | null,
) => {
  if (!enabled || typeof window === "undefined") return existingContext;
  if (cue !== "howl" && playRecordedCue(cue)) return existingContext;

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return existingContext;
  const context = existingContext || new AudioContextClass();
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;

  // The intentionally theatrical wolf howl remains procedural.
  [0, 7].forEach((detune) => {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = detune ? "triangle" : "sine";
    oscillator.detune.value = detune;
    oscillator.frequency.setValueAtTime(185, now);
    oscillator.frequency.exponentialRampToValueAtTime(325, now + .42);
    oscillator.frequency.exponentialRampToValueAtTime(235, now + 1.35);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.035, now + .12);
    gain.gain.setValueAtTime(.035, now + .82);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 1.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now); oscillator.stop(now + 1.4);
  });
  return context;
};
