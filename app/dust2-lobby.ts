import { DUST2_MAX_TEAM_SIZE, type Dust2TeamId } from "./dust2-modes.ts";

export type Dust2Controller =
  | { kind: "human"; playerId: string }
  | { kind: "ai" };

export type Dust2LobbySlot = {
  slotId: string;
  team: Dust2TeamId;
  characterId: string;
  controller: Dust2Controller;
};

export type Dust2Lobby = {
  slots: Dust2LobbySlot[];
};

export const createDust2Lobby = (): Dust2Lobby => ({ slots: [] });

export const dust2TeamSlots = (lobby: Dust2Lobby, team: Dust2TeamId) =>
  lobby.slots.filter((slot) => slot.team === team);

export const joinDust2Lobby = (
  lobby: Dust2Lobby,
  team: Dust2TeamId,
  characterId: string,
  playerId: string,
): Dust2Lobby => {
  if (dust2TeamSlots(lobby, team).length >= DUST2_MAX_TEAM_SIZE) return lobby;
  const withoutPlayer = lobby.slots.filter((slot) =>
    slot.controller.kind !== "human" || slot.controller.playerId !== playerId,
  );
  if (withoutPlayer.some((slot) => slot.characterId === characterId)) return lobby;
  return {
    slots: [...withoutPlayer, {
      slotId: `human:${playerId}`,
      team,
      characterId,
      controller: { kind: "human", playerId },
    }],
  };
};

export const fillDust2LobbyWithAi = (
  lobby: Dust2Lobby,
  team: Dust2TeamId,
  characterIds: readonly string[],
): Dust2Lobby => {
  const slots = [...lobby.slots];
  const occupiedCharacters = new Set(slots.map((slot) => slot.characterId));
  let teamCount = dust2TeamSlots(lobby, team).length;
  for (const characterId of characterIds) {
    if (teamCount >= DUST2_MAX_TEAM_SIZE) break;
    if (occupiedCharacters.has(characterId)) continue;
    slots.push({
      slotId: `ai:${team}:${characterId}`,
      team,
      characterId,
      controller: { kind: "ai" },
    });
    occupiedCharacters.add(characterId);
    teamCount += 1;
  }
  return { slots };
};

export const dust2VisibleObserverIdsForPlayer = (lobby: Dust2Lobby, playerId: string) =>
  lobby.slots
    .filter((slot) => slot.controller.kind === "human" && slot.controller.playerId === playerId)
    .map((slot) => slot.slotId);
