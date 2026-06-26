import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createModifyElementImpl } from "../ai/tools/implementations/modifyElement.impl.js";

type Deps = Parameters<typeof createModifyElementImpl>[0];
type CoreFs = Deps["fs"];

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

test("modify_element insert: flat element tree under parent", async () => {
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
              children: [{ id: "existing", type: "text", props: { text: "x" } }],
            },
          ],
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    const deps = { workspaceRoot, fs: makeRealFs() } as any;
    const modify = createModifyElementImpl(deps);

    const res = await modify({
      action: "insert",
      route: "/a",
      parent_id: "root",
      elements: [
        { id: "new_el", parentId: "root", type: "text", props: { text: "hello" } },
      ],
    });

    assert.equal(res.success, true);
    assert.equal((res as any).changed, true);
    const insertedId = (res as any).inserted_id as string;
    assert.ok(typeof insertedId === "string" && insertedId.startsWith("el_"));

    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const children = after.elements[0].children as any[];
    // inserted at the end of the children array
    assert.equal(children[children.length - 1].id, insertedId);
    assert.equal(children[children.length - 1].props.text, "hello");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("modify_element delete: deletes element by id", async () => {
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

    const deps = { workspaceRoot, fs: makeRealFs() } as any;
    const modify = createModifyElementImpl(deps);

    const res = await modify({
      action: "delete",
      route: "/a",
      element_id: "del_me",
    });

    assert.equal(res.success, true);
    assert.equal((res as any).changed, true);
    assert.equal((res as any).deleted_id, "del_me");

    const after = await fs.readFile(filePath, "utf-8");
    assert.ok(!after.includes('"del_me"'));
    assert.ok(after.includes('"keep"'));
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("modify_element update_classname: updates className", async () => {
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
              className: "old-class",
            },
          ],
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    const deps = { workspaceRoot, fs: makeRealFs() } as any;
    const modify = createModifyElementImpl(deps);

    const res = await modify({
      action: "update_classname",
      route: "/a",
      element_id: "root",
      className: "new-class",
    });

    assert.equal(res.success, true);
    assert.equal((res as any).changed, true);

    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    assert.equal(after.elements[0].className, "new-class");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("modify_element update_props: updates nested and flat props", async () => {
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
              type: "text",
              props: {
                text: "original text",
              },
            },
          ],
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    const deps = { workspaceRoot, fs: makeRealFs() } as any;
    const modify = createModifyElementImpl(deps);

    const res = await modify({
      action: "update_props",
      route: "/a",
      element_id: "root",
      text: "updated text",
      href: "/updated-href",
    });

    assert.equal(res.success, true);
    assert.equal((res as any).changed, true);

    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    assert.equal(after.elements[0].props.text, "updated text");
    assert.equal(after.elements[0].props.href, "/updated-href");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
