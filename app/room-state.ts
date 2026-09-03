export type RoomLifecycle = "unseen" | "discovered" | "active" | "resolved" | "looted" | "exhausted";

const ORDER: RoomLifecycle[] = ["unseen", "discovered", "active", "resolved", "looted", "exhausted"];

export const roomStateFlag = (roomId: string, state: Exclude<RoomLifecycle, "unseen">) =>
  `room-state:${roomId}:${state}`;

export const roomLifecycle = (roomId: string, flags: readonly string[]): RoomLifecycle => {
  for (let index = ORDER.length - 1; index > 0; index--)
    if (flags.includes(roomStateFlag(roomId, ORDER[index] as Exclude<RoomLifecycle, "unseen">))) return ORDER[index];
  return "unseen";
};

export const advanceRoomState = (
  flags: readonly string[],
  roomId: string,
  state: Exclude<RoomLifecycle, "unseen">,
) => [...new Set([...flags, roomStateFlag(roomId, state)])];

export const roomIdFromLootDrop = (dropId: string) =>
  /^room-loot-([^-]+)(?:-|$)/.exec(dropId)?.[1] || null;
