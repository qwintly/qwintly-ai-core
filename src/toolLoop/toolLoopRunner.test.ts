import assert from "node:assert/strict";
import test from "node:test";
import { runToolLoop } from "./toolLoopRunner.js";

test("runToolLoop: retries transient aiCall 503/UNAVAILABLE when configured", async () => {
  let calls = 0;

  const result = await runToolLoop({
    initialContents: [{ role: "user", parts: [{ text: "hi" }] }],
    tools: [],
    handlers: {},
    maxSteps: 1,
    aiCallAutoRetryMax: 2,
    aiCallAutoRetryBaseMs: 1,
    aiCallAutoRetryMaxMs: 2,
    aiCall: async () => {
      calls += 1;
      if (calls === 1) {
        throw {
          error: {
            code: 503,
            message:
              "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
            status: "UNAVAILABLE",
          },
        };
      }
      return { text: "ok" };
    },
  });

  assert.equal(result.finalText, "ok");
  assert.equal(calls, 2);
});

test("runToolLoop: does not retry aiCall by default (aiCallAutoRetryMax=0)", async () => {
  let calls = 0;

  await assert.rejects(
    async () =>
      await runToolLoop({
        initialContents: [{ role: "user", parts: [{ text: "hi" }] }],
        tools: [],
        handlers: {},
        maxSteps: 1,
        aiCall: async () => {
          calls += 1;
          throw { error: { code: 503, status: "UNAVAILABLE", message: "high demand" } };
        },
      }),
  );

  assert.equal(calls, 1);
});

