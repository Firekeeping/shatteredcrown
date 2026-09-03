import assert from "node:assert/strict";
import test from "node:test";

test("the production worker opens the game route instead of the recovery screen", async () => {
  const { default: worker } = await import(`../dist/server/index.js?runtime-smoke=${Date.now()}`);
  const response = await worker.fetch(
    new Request("https://shattered-crown-tactics.test/"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.doesNotMatch(html, /The dungeon lost the thread\./);
  assert.match(html, /Opening the dungeon/);
});
