import { DELVER_ORIENTATION_MESSAGE } from "./scene-content";

export type VoiceLineId = "halaster-orientation" | "princess-hologram";

type VoiceLine = {
  text: string;
  rate: number;
  pitch: number;
  volume: number;
  preferredVoiceNames: string[];
  fallbackVoiceHints: string[];
};

const VOICE_LINES: Record<VoiceLineId, VoiceLine> = {
  "halaster-orientation": {
    text: DELVER_ORIENTATION_MESSAGE,
    rate: 0.86,
    pitch: 0.72,
    volume: 0.9,
    preferredVoiceNames: [
      "Microsoft George",
      "Google UK English Male",
      "Daniel",
      "Microsoft David",
    ],
    fallbackVoiceHints: ["male", "george", "daniel", "david"],
  },
  "princess-hologram": {
    text: "Help us, adventurers. You're our only hope.",
    rate: 0.88,
    pitch: 1.18,
    volume: 0.86,
    preferredVoiceNames: [
      "Microsoft Zira",
      "Google UK English Female",
      "Samantha",
      "Karen",
      "Moira",
    ],
    fallbackVoiceHints: ["female", "zira", "samantha", "karen", "moira"],
  },
};

const pickVoice = (voices: SpeechSynthesisVoice[], preferredNames: string[], fallbackVoiceHints: string[]) => {
  for (const preferredName of preferredNames) {
    const exact = voices.find((voice) => voice.name === preferredName);
    if (exact) return exact;
  }
  return voices.find((voice) => {
    const name = voice.name.toLowerCase();
    return voice.lang.toLowerCase().startsWith("en") && fallbackVoiceHints.some((hint) => name.includes(hint));
  })
    || voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
};

export const stopVoiceLine = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
};

export const playVoiceLine = (id: VoiceLineId, enabled: boolean) => {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const line = VOICE_LINES[id];
  const utterance = new SpeechSynthesisUtterance(line.text);
  const voice = pickVoice(window.speechSynthesis.getVoices(), line.preferredVoiceNames, line.fallbackVoiceHints);
  if (voice) utterance.voice = voice;
  utterance.rate = line.rate;
  utterance.pitch = line.pitch;
  utterance.volume = line.volume;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
};
