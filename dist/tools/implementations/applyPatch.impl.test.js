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
    fs.files.set(path.resolve(workspaceRoot, "a.txt"), "hello\n");
    const res = await applyPatch(`*** Begin Patch
*** Update File: a.txt
*** Move to: b.txt
@@
-hello
+hi
*** End Patch
`);
    assert.equal(res.success, true);
    assert.equal(res.changed, true);
    assert.equal(fs.files.has(path.resolve(workspaceRoot, "a.txt")), false);
    assert.equal(fs.files.get(path.resolve(workspaceRoot, "b.txt")), "hi\n");
});
test("apply_patch: context-only Update succeeds as no-op", async () => {
    const workspaceRoot = path.resolve("C:\\virtual-workspace");
    const fs = makeMemFs();
    const applyPatch = createApplyPatchImpl({ workspaceRoot, fs });
    fs.files.set(path.resolve(workspaceRoot, "a.txt"), "x\n");
    const res = await applyPatch(`*** Begin Patch
*** Update File: a.txt
@@
 x
*** End Patch
`);
    assert.equal(res.success, true);
    assert.equal(res.changed, false);
    assert.equal(fs.files.get(path.resolve(workspaceRoot, "a.txt")), "x\n");
});
//# sourceMappingURL=applyPatch.impl.test.js.map