import assert from "node:assert/strict";
import test from "node:test";
import { createSearchImpl } from "../ai/tools/implementations/search.impl.js";

const makeDeps = (overrides?: {
  workspaceRoot?: string;
  execRg?: Parameters<typeof createSearchImpl>[0]["execRg"];
}) => {
  return {
    workspaceRoot: overrides?.workspaceRoot ?? "C:\\virtual-workspace",
    fs: {} as any,
    execRg: overrides?.execRg,
  } as Parameters<typeof createSearchImpl>[0];
};

test("search: blank query returns empty and does not call rg", async () => {
  let called = 0;
  const search = createSearchImpl(
    makeDeps({
      execRg: async () => {
        called++;
        return { code: 0, stdout: "", stderr: "" };
      },
    }),
  );

  const res = await search("   ");
  assert.deepEqual(res, []);
  assert.equal(called, 0);
});

test("search: trims query and calls rg with cwd and maxCount=20", async () => {
  let got: any = null;
  const search = createSearchImpl(
    makeDeps({
      workspaceRoot: "C:\\my-workspace",
      execRg: async (input) => {
        got = input;
        return { code: 0, stdout: "", stderr: "" };
      },
    }),
  );

  const res = await search("  hello  ");
  assert.deepEqual(res, []);
  assert.deepEqual(got, { query: "hello", cwd: "C:\\my-workspace", maxCount: 20 });
});

test("search: parses rg output into {path, content}", async () => {
  const search = createSearchImpl(
    makeDeps({
      execRg: async () => ({
        code: 0,
        stdout: "a.ts:10:hello\nb.ts:2:world\r\nc.ts:3: spaced  \n",
        stderr: "",
      }),
    }),
  );

  const res = await search("q");
  assert.deepEqual(res, [
    { path: "a.ts:10", content: "hello" },
    { path: "b.ts:2", content: "world" },
    { path: "c.ts:3", content: " spaced  " },
  ]);
});

test("search: malformed lines fall back to path-only result", async () => {
  const search = createSearchImpl(
    makeDeps({
      execRg: async () => ({
        code: 0,
        stdout: "no-colons-here\nfile.ts:12:ok\nfile.ts:onlyonecolon\n",
        stderr: "",
      }),
    }),
  );

  const res = await search("q");
  assert.deepEqual(res, [
    { path: "no-colons-here", content: "" },
    { path: "file.ts:12", content: "ok" },
    { path: "file.ts:onlyonecolon", content: "" },
  ]);
});

test("search: rg exit code 1 returns empty (no matches)", async () => {
  const search = createSearchImpl(
    makeDeps({
      execRg: async () => ({ code: 1, stdout: "ignored", stderr: "" }),
    }),
  );

  const res = await search("q");
  assert.deepEqual(res, []);
});

test("search: non-zero rg exit code returns empty (error is caught)", async () => {
  const search = createSearchImpl(
    makeDeps({
      execRg: async () => ({ code: 2, stdout: "", stderr: "rg blew up" }),
    }),
  );

  const res = await search("q");
  assert.deepEqual(res, []);
});

test("search: limits results to 20 lines", async () => {
  const stdout = Array.from({ length: 25 }, (_, i) => `f.ts:${i + 1}:x`).join("\n") + "\n";
  const search = createSearchImpl(
    makeDeps({
      execRg: async () => ({ code: 0, stdout, stderr: "" }),
    }),
  );

  const res = await search("q");
  assert.equal(res.length, 20);
  assert.deepEqual(res[0], { path: "f.ts:1", content: "x" });
  assert.deepEqual(res[19], { path: "f.ts:20", content: "x" });
});
