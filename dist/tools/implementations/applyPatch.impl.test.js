import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createApplyPatchImpl } from "./applyPatch.impl.js";
const enoent = (message) => {
    const err = new Error(message);
    err.code = "ENOENT";
    return err;
};
const makeMemFs = () => {
    const files = new Map();
    return {
        files,
        readFile: async (absolutePath) => {
            const key = path.resolve(absolutePath);
            const v = files.get(key);
            if (v === undefined)
                throw enoent(`ENOENT: no such file, open '${absolutePath}'`);
            return v;
        },
        writeFile: async (absolutePath, content) => {
            files.set(path.resolve(absolutePath), String(content ?? ""));
        },
        mkdirp: async () => { },
        rmFile: async (absolutePath) => {
            const key = path.resolve(absolutePath);
            if (!files.has(key))
                throw enoent(`ENOENT: no such file, unlink '${absolutePath}'`);
            files.delete(key);
        },
        stat: async (absolutePath) => {
            const key = path.resolve(absolutePath);
            if (!files.has(key))
                throw enoent(`ENOENT: no such file, stat '${absolutePath}'`);
            return { isDirectory: () => false };
        },
        safeReadDir: async () => [],
    };
};
test('apply_patch: Update + Move writes new path and deletes old path', async () => {
    const workspaceRoot = path.resolve("C:\\virtual-workspace");
    const fs = makeMemFs();
    const applyPatch = createApplyPatchImpl({ workspaceRoot, fs });
    fs.files.set(path.resolve(workspaceRoot, "app/a/page.config.ts"), "export const config = { elements: [] };\n");
    const res = await applyPatch(`*** Begin Patch
*** Update File: app/a/page.config.ts
*** Move to: app/b/page.config.ts
@@
 export const config = { elements: [] };
*** End Patch
`);
    assert.equal(res.success, true);
    assert.equal(res.changed, true);
    assert.equal(fs.files.has(path.resolve(workspaceRoot, "app/a/page.config.ts")), false);
    assert.equal(fs.files.get(path.resolve(workspaceRoot, "app/b/page.config.ts")), "export const config = { elements: [] };\n");
});
test("apply_patch: context-only Update succeeds as no-op", async () => {
    const workspaceRoot = path.resolve("C:\\virtual-workspace");
    const fs = makeMemFs();
    const applyPatch = createApplyPatchImpl({ workspaceRoot, fs });
    fs.files.set(path.resolve(workspaceRoot, "app/a/page.config.ts"), "export const config = { elements: [] };\n");
    const res = await applyPatch(`*** Begin Patch
*** Update File: app/a/page.config.ts
@@
 export const config = { elements: [] };
*** End Patch
`);
    assert.equal(res.success, true);
    assert.equal(res.changed, false);
    assert.equal(fs.files.get(path.resolve(workspaceRoot, "app/a/page.config.ts")), "export const config = { elements: [] };\n");
});
//# sourceMappingURL=applyPatch.impl.test.js.map