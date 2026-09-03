let guestReplicaActive = false;

/**
 * Player 2 directly handles their assigned hero's controls and commits the
 * resulting state, but must never run a second autonomous campaign state
 * machine. This flag keeps AI and world-reaction effects on the host.
 */
export const setGuestReplicaActive = (active: boolean) => {
  guestReplicaActive = active;
};

export const isGuestReplicaActive = () => guestReplicaActive;
