import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { toWorkspacePath } from "../ai/tools/helpers/fileSystem.helpers.js";

test("toWorkspacePath: tolerates case mismatch for absolute paths on Windows", () => {
  if (process.platform !== "win32") {
    assert.ok(true);
    return;
  }

  const workspaceRoot = "C:\\Repo\\Workspace";
  const input = "c:\\repo\\workspace\\src\\index.ts";
  const resolved = toWorkspacePath(workspaceRoot, input);
  assert.equal(resolved, path.resolve(workspaceRoot, "src", "index.ts"));
});
