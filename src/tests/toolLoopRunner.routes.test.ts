import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { FunctionCallingConfigMode } from "@google/genai";
import { runToolLoop } from "../ai/toolLoop/toolLoopRunner.js";

test("tool loop: insert_element failure includes available routes and hint", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-runner-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    // Let's create an existing route
    await fs.mkdir(path.join(workspaceRoot, "app", "dashboard"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "app", "dashboard", "pageConfig.json"), "{}");

    let aiCalls = 0;
    const aiCall = async () => {
      aiCalls += 1;
      if (aiCalls === 1) {
        return {
          functionCalls: [
            {
              name: "insert_element",
              args: {
                route: "/invalid-route",
                parent_id: "root",
                elements: [
                  { id: "text_el", parentId: "parent", type: "text", props: { text: "hi" } }
                ],
              },
            },
          ],
        };
      }
      return { functionCalls: [], text: "ok" };
    };

    const res = await runToolLoop({
      initialContents: [],
      tools: [],
      workspaceRoot,
      aiCall,
      logger: async () => {},
      toolCallingMode: FunctionCallingConfigMode.ANY,
      maxSteps: 5,
      keepFullTrace: false,
    });

    assert.equal(res.finalText, "ok");

    const toolResponses = res.modelContents.filter(
      (c: any) =>
        c?.role === "user" &&
        Array.isArray(c?.parts) &&
        c.parts.some((p: any) => p?.functionResponse?.name === "insert_element"),
    );
    assert.equal(toolResponses.length, 1);

    const response = toolResponses[0].parts.find(
      (p: any) => p?.functionResponse?.name === "insert_element",
    )?.functionResponse?.response;

    assert.equal(response?.success, false);
    assert.match(String(response?.error ?? ""), /insert_element failed/i);
    assert.match(String(response?.error ?? ""), /create_new_route/i);
    assert.deepEqual(response?.available_routes, ["/dashboard"]);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("tool loop: get_available_routes retrieves routes", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-runner-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "app", "pageConfig.json"), "{}");
    await fs.mkdir(path.join(workspaceRoot, "app", "dashboard"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "app", "dashboard", "pageConfig.json"), "{}");

    let aiCalls = 0;
    const aiCall = async () => {
      aiCalls += 1;
      if (aiCalls === 1) {
        return {
          functionCalls: [{ name: "get_available_routes", args: {} }],
        };
      }
      return { functionCalls: [], text: "ok" };
    };

    const res = await runToolLoop({
      initialContents: [],
      tools: [],
      workspaceRoot,
      aiCall,
      logger: async () => {},
      toolCallingMode: FunctionCallingConfigMode.ANY,
      maxSteps: 5,
      keepFullTrace: false,
    });

    assert.equal(res.finalText, "ok");

    const toolResponses = res.modelContents.filter(
      (c: any) =>
        c?.role === "user" &&
        Array.isArray(c?.parts) &&
        c.parts.some((p: any) => p?.functionResponse?.name === "get_available_routes"),
    );
    assert.equal(toolResponses.length, 1);

    const response = toolResponses[0].parts.find(
      (p: any) => p?.functionResponse?.name === "get_available_routes",
    )?.functionResponse?.response;

    assert.equal(response?.success, true);
    assert.deepEqual(response?.routes, ["/", "/dashboard"]);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
