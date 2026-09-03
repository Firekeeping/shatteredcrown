const KELIM_CLOSET_BARKS = [
  "Please help!",
  "They're breaking through the door!",
  "I can hear their beaks scraping the hinges!",
  "Please—don't leave me in here!",
] as const;

export const KELIM_ESCAPE_PATH = [{ x: 32, y: 73 }, { x: 32, y: 74 }, { x: 32, y: 75 }, { x: 31, y: 75 }] as const; // GG74 → FF76
export const KELIM_SIGHTING_TRIGGER = { x: 24, y: 73 } as const; // Y74
export const KELIM_LATENT_GRICK_POINT = { x: 32, y: 74 } as const; // GG75, inside the dark room
export const KELIM_LATENT_GRICK_ALPHA_POINT = { x: 28, y: 77 } as const; // AC78, Room 36c's upside-down throne
export const pendingKelimPredator = (flags: readonly string[]) => {
  const pending = (room: "36b" | "36c") => !flags.includes(`room-encounter-spawned-${room}`) && !flags.includes(`room-state:${room}:resolved`);
  if (pending("36b")) return { point: KELIM_LATENT_GRICK_POINT, name: "a Grick in the darkness" };
  if (pending("36c")) return { point: KELIM_LATENT_GRICK_ALPHA_POINT, name: "the Grick Alpha in the darkness" };
  return null;
};
export const kelimCorpseFlag = ({ x, y }: { x: number; y: number }) => `kelim-corpse@${x},${y}`;
export const kelimCorpsePointFromFlags = (flags: readonly string[]) => {
  const flag = flags.find((value) => value.startsWith("kelim-corpse@"));
  if (!flag) return null;
  const [x, y] = flag.slice("kelim-corpse@".length).split(",").map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
};

export const useKelimClosetBark = (active: boolean, round: number) =>
  active ? KELIM_CLOSET_BARKS[(Math.max(1, round) - 1) % KELIM_CLOSET_BARKS.length] : null;
