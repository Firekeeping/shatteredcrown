import test from "node:test";
import assert from "node:assert/strict";
import {
  createDust2Lobby,
  dust2TeamSlots,
  dust2VisibleObserverIdsForPlayer,
  fillDust2LobbyWithAi,
  joinDust2Lobby,
} from "../app/dust2-lobby.ts";

const dungeoneers = Array.from({ length: 12 }, (_, index) => `hero-${index + 1}`);
const counters = Array.from({ length: 8 }, (_, index) => `counter-${index + 1}`);

test("players may choose either Dust 2 side and retain only one character", () => {
  let lobby = joinDust2Lobby(createDust2Lobby(), "dungeoneers", "hero-1", "jon");
  lobby = joinDust2Lobby(lobby, "counter-dungeoneers", "counter-1", "jon");
  assert.equal(lobby.slots.length, 1);
  assert.equal(lobby.slots[0].team, "counter-dungeoneers");
});

test("AI fills open positions without exceeding eight per side", () => {
  let lobby = joinDust2Lobby(createDust2Lobby(), "dungeoneers", "hero-1", "jon");
  lobby = fillDust2LobbyWithAi(lobby, "dungeoneers", dungeoneers);
  lobby = fillDust2LobbyWithAi(lobby, "counter-dungeoneers", counters);
  assert.equal(dust2TeamSlots(lobby, "dungeoneers").length, 8);
  assert.equal(dust2TeamSlots(lobby, "counter-dungeoneers").length, 8);
});

test("a player receives only their own character vision", () => {
  let lobby = joinDust2Lobby(createDust2Lobby(), "dungeoneers", "hero-1", "jon");
  lobby = joinDust2Lobby(lobby, "dungeoneers", "hero-2", "friend");
  lobby = fillDust2LobbyWithAi(lobby, "dungeoneers", dungeoneers);
  assert.deepEqual(dust2VisibleObserverIdsForPlayer(lobby, "jon"), ["human:jon"]);
  assert.deepEqual(dust2VisibleObserverIdsForPlayer(lobby, "friend"), ["human:friend"]);
});
