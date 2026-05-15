import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createInsertElementImpl } from "../ai/tools/implementations/insertElement.impl.js";
import { createUpdatePropsImpl } from "../ai/tools/implementations/updateProps.impl.js";
import { createUpdateClassNameImpl } from "../ai/tools/implementations/updateClassName.impl.js";

type Deps = Parameters<typeof createInsertElementImpl>[0];
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

test("insert/update tools: inject ids, insert under parent, update props and classname", async () => {
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
    const insert = createInsertElementImpl(deps);
    const updateProps = createUpdatePropsImpl(deps);
    const updateClassName = createUpdateClassNameImpl(deps);

    const inserted = await insert("/a", "root", {
      type: "text",
      props: { text: "hello" },
    } as any);
    assert.equal(
      (inserted as any).success,
      true,
      `unexpected response: ${JSON.stringify(inserted)}`,
    );
    const insertedId = (inserted as any).inserted_id as string;
    assert.ok(typeof insertedId === "string" && insertedId.startsWith("el_"));

    const up1 = await updateProps({
      route: "/a",
      element_id: insertedId,
      text: "updated",
      href: "/x",
    } as any);
    assert.equal((up1 as any).success, true);

    const up2 = await updateClassName("/a", insertedId, "text-red-500");
    assert.equal((up2 as any).success, true);

    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const found = (after.elements[0].children as any[]).find((e) => e.id === insertedId);
    assert.ok(found);
    assert.equal(found.props.text, "updated");
    assert.equal(found.props.href, "/x");
    assert.equal(found.className, "text-red-500");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
