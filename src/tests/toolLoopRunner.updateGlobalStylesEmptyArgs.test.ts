import assert from "node:assert/strict";
import test from "node:test";
import { FunctionCallingConfigMode } from "@google/genai";
import { runToolLoop } from "../ai/toolLoop/toolLoopRunner.js";

test("tool loop: update_global_styles empty tokens is rejected without calling handler", async () => {
  let handlerCalls = 0;

  let aiCalls = 0;
  const aiCall = async () => {
    aiCalls += 1;
    if (aiCalls === 1) {
      return {
        functionCalls: [{ name: "update_global_styles", args: { tokens: {} } }],
      };
    }
    return { functionCalls: [], text: "ok" };
  };

  const res = await runToolLoop({
    initialContents: [],
    tools: [],
    handlers: {
      update_global_styles: async () => {
        handlerCalls += 1;
        return { success: true };
      },
    },
    aiCall,
    logger: async () => {},
    toolCallingMode: FunctionCallingConfigMode.ANY,
    maxSteps: 5,
    keepFullTrace: false,
  });

  assert.equal(handlerCalls, 0);
  assert.equal(res.finalText, "ok");

  const toolResponses = res.modelContents.filter(
    (c: any) =>
      c?.role === "user" &&
      Array.isArray(c?.parts) &&
      c.parts.some((p: any) => p?.functionResponse?.name === "update_global_styles"),
  );
  assert.equal(toolResponses.length, 1);

  const fr = toolResponses[0].parts.find(
    (p: any) => p?.functionResponse?.name === "update_global_styles",
  )?.functionResponse?.response;

  assert.equal(fr?.success, false);
  assert.match(String(fr?.error ?? ""), /must not be empty/i);
});

