import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createDeleteElementImpl } from "../ai/tools/implementations/deleteElement.impl.js";

type CoreFs = Parameters<typeof createDeleteElementImpl>[0]["fs"];

const makeRealFs = (overrides?: Partial<CoreFs>): CoreFs => {
  return {
    readFile: async (absolutePath) => fs.readFile(absolutePath, "utf-8"),
    writeFile: async (absolutePath, content) =>
      fs.writeFile(absolutePath, content ?? "", "utf-8"),
    mkdirp: async (absoluteDir) => {
      await fs.mkdir(absoluteDir, { recursive: true });
    },
    rmFile: async (absolutePath) => fs.rm(absolutePath, { force: true }),
    stat: async (absolutePath) => fs.stat(absolutePath),
    safeReadDir: async (absoluteDir) =>
      fs.readdir(absoluteDir, { withFileTypes: true }),
    ...(overrides ?? {}),
  };
};

test("delete_element: removes nested element by id from page.config.ts", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    const routeDir = path.join(workspaceRoot, "app", "a");
    await fs.mkdir(routeDir, { recursive: true });
    const filePath = path.join(routeDir, "pageConfig.json");
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          elements: [
            {
              id: "root",
              type: "div",
              children: [
                { id: "keep", type: "text", props: { text: "hi" } },
                {
                  id: "del_me",
                  type: "div",
                  children: [
                    { id: "child", type: "text", props: { text: "x" } },
                  ],
                },
              ],
            },
          ],
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    const impl = createDeleteElementImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl("/a", "del_me");
    assert.equal(
      (res as any).success,
      true,
      `unexpected response: ${JSON.stringify(res)}`,
    );
    assert.equal((res as any).changed, true, `unexpected response: ${JSON.stringify(res)}`);

    const after = await fs.readFile(filePath, "utf-8");
    assert.ok(!after.includes('"del_me"'));
    assert.ok(after.includes('"keep"'));
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("delete_element: unchanged when id not present", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    const routeDir = path.join(workspaceRoot, "app");
    await fs.mkdir(routeDir, { recursive: true });
    const filePath = path.join(routeDir, "pageConfig.json");
    await fs.writeFile(
      filePath,
      JSON.stringify({ elements: [{ id: "root", type: "div" }] }, null, 2) + "\n",
      "utf-8",
    );

    const impl = createDeleteElementImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl("/", "missing");
    assert.deepEqual(res, { success: true, changed: false });

    const after = await fs.readFile(filePath, "utf-8");
    assert.ok(after.includes('"root"'));
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("delete_element: parse failure returns success=false", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    const routeDir = path.join(workspaceRoot, "app", "a");
    await fs.mkdir(routeDir, { recursive: true });
    const filePath = path.join(routeDir, "pageConfig.json");
    await fs.writeFile(filePath, "{ bad json }");

    const impl = createDeleteElementImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl("/a", "x");
    assert.equal((res as any).success, false);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
