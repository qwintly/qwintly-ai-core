import assert from "node:assert/strict";
import test from "node:test";
import { FunctionCallingConfigMode } from "@google/genai";
import { runToolLoop } from "../ai/toolLoop/toolLoopRunner.js";

test("tool loop: persists gen tokens from usageMetadata", async () => {
  const persisted: Array<{
    sessionId: string;
    input: number;
    output: number;
    model: string;
  }> = [];

  let aiCalls = 0;
  const res = await runToolLoop({
    initialContents: [],
    tools: [],
    workspaceRoot: "/dummy/path",
    toolCallingMode: FunctionCallingConfigMode.ANY,
    maxSteps: 2,
    keepFullTrace: false,
    logger: async () => {},
    aiCall: async () => {
      aiCalls += 1;
      if (aiCalls === 1) {
        return {
          functionCalls: [{ name: "get_available_routes", args: {} }],
          modelVersion: "gemini-2.5-flash-lite",
          usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 22 },
        };
      }
      return {
        functionCalls: [],
        text: "ok",
        modelVersion: "gemini-2.5-flash-lite",
        usageMetadata: { promptTokenCount: 33, candidatesTokenCount: 44 },
      };
    },
    tokenPersistence: {
      sessionId: "sess_123",
      repository: {
        persistGenTokens: async (sessionId, input, output, model) => {
          persisted.push({ sessionId, input, output, model });
        },
      },
      model:'gemini-2.5-flash-lite'
    },
  });

  assert.equal(res.finalText, "ok");
  assert.deepEqual(persisted, [
    {
      sessionId: "sess_123",
      input: 44,
      output: 66,
      model: "gemini-2.5-flash-lite",
    },
  ]);
});
