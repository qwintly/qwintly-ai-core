import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createApplyPatchImpl } from "./applyPatch.impl.js";

type MemFs = {
  files: Map<string, string>;
};

const enoent = (message: string) => {
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = "ENOENT";
  return err;
};

const makeMemFs = (): MemFs & Parameters<typeof createApplyPatchImpl>[0]["fs"] => {
  const files = new Map<string, string>();

  return {
    files,
    readFile: async (absolutePath: string) => {
      const key = path.resolve(absolutePath);
      const v = files.get(key);
      if (v === undefined) throw enoent(`ENOENT: no such file, open '${absolutePath}'`);
      return v;
    },
    writeFile: async (absolutePath: string, content: string) => {
      files.set(path.resolve(absolutePath), String(content ?? ""));
    },
    mkdirp: async () => {},
    rmFile: async (absolutePath: string) => {
      const key = path.resolve(absolutePath);
      if (!files.has(key)) throw enoent(`ENOENT: no such file, unlink '${absolutePath}'`);
      files.delete(key);
    },
    stat: async (absolutePath: string) => {
      const key = path.resolve(absolutePath);
      if (!files.has(key)) throw enoent(`ENOENT: no such file, stat '${absolutePath}'`);
      return { isDirectory: () => false };
    },
    safeReadDir: async () => [],
  };
};

test('apply_patch: Update + Move writes new path and deletes old path', async () => {
  const workspaceRoot = path.resolve("C:\\virtual-workspace");
  const fs = makeMemFs();
  const applyPatch = createApplyPatchImpl({ workspaceRoot, fs });

  fs.files.set(
    path.resolve(workspaceRoot, "app/a/page.config.ts"),
    "export const config = { elements: [] };\n",
  );

  const res = await applyPatch(`*** Begin Patch
*** Update File: app/a/page.config.ts
*** Move to: app/b/page.config.ts
@@
 export const config = { elements: [] };
*** End Patch
`);

  assert.equal(res.success, true);
  assert.equal((res as any).changed, true);
  assert.equal(fs.files.has(path.resolve(workspaceRoot, "app/a/page.config.ts")), false);
  assert.equal(
    fs.files.get(path.resolve(workspaceRoot, "app/b/page.config.ts")),
    "export const config = { elements: [] };\n",
  );
});

test("apply_patch: context-only Update succeeds as no-op", async () => {
  const workspaceRoot = path.resolve("C:\\virtual-workspace");
  const fs = makeMemFs();
  const applyPatch = createApplyPatchImpl({ workspaceRoot, fs });

  fs.files.set(
    path.resolve(workspaceRoot, "app/a/page.config.ts"),
    "export const config = { elements: [] };\n",
  );

  const res = await applyPatch(`*** Begin Patch
*** Update File: app/a/page.config.ts
@@
 export const config = { elements: [] };
*** End Patch
`);

  assert.equal(res.success, true);
  assert.equal((res as any).changed, false);
  assert.equal(
    fs.files.get(path.resolve(workspaceRoot, "app/a/page.config.ts")),
    "export const config = { elements: [] };\n",
  );
});
