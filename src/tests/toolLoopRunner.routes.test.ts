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
                  { id: "text_el", parentId: "root", type: "text", props: { text: "hi" } }
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

test("tool loop: update_classname updates element's className using className parameter", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-runner-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const configPath = path.join(workspaceRoot, "app", "pageConfig.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        elements: [
          {
            id: "el_mGCUHuZuL0",
            type: "button",
            props: { text: "Order Now" },
            children: [],
            className: "",
          },
        ],
      })
    );

    let aiCalls = 0;
    const aiCall = async () => {
      aiCalls += 1;
      if (aiCalls === 1) {
        return {
          functionCalls: [
            {
              name: "update_classname",
              args: {
                route: "/",
                element_id: "el_mGCUHuZuL0",
                className: "bg-red-600 font-bold",
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
        c.parts.some((p: any) => p?.functionResponse?.name === "update_classname"),
    );
    assert.equal(toolResponses.length, 1);

    const response = toolResponses[0].parts.find(
      (p: any) => p?.functionResponse?.name === "update_classname",
    )?.functionResponse?.response;

    assert.equal(response?.success, true);
    assert.equal(response?.updated_id, "el_mGCUHuZuL0");

    const afterConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
    assert.equal(afterConfig.elements[0].className, "bg-red-600 font-bold");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("tool loop: update_props updates element's props using root-level parameters", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-runner-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const configPath = path.join(workspaceRoot, "app", "pageConfig.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        elements: [
          {
            id: "el_k01Ij3HJvZ",
            type: "text",
            props: {
              text: "A vibrant blast of sweet, sun-ripened strawberries.",
            },
            children: [],
            className: "text-sm text-muted-foreground",
          },
        ],
      })
    );

    let aiCalls = 0;
    const aiCall = async () => {
      aiCalls += 1;
      if (aiCalls === 1) {
        return {
          functionCalls: [
            {
              name: "update_props",
              args: {
                route: "/",
                element_id: "el_k01Ij3HJvZ",
                text: "Life is too short for boring flavors! This is pure strawberry joy.",
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
        c.parts.some((p: any) => p?.functionResponse?.name === "update_props"),
    );
    assert.equal(toolResponses.length, 1);

    const response = toolResponses[0].parts.find(
      (p: any) => p?.functionResponse?.name === "update_props",
    )?.functionResponse?.response;

    assert.equal(response?.success, true);
    assert.equal(response?.updated_id, "el_k01Ij3HJvZ");

    const afterConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
    assert.equal(afterConfig.elements[0].props.text, "Life is too short for boring flavors! This is pure strawberry joy.");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
