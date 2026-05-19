import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import {
  createCreateNewRouteImpl,
  DEFAULT_PAGE_CONFIG_JSON,
  PAGE_TSX_TEMPLATE_STRING,
} from "../ai/tools/implementations/createNewRoute.impl.js";

type CoreFs = Parameters<typeof createCreateNewRouteImpl>[0]["fs"];

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

test("create_new_route: creates page.tsx and pageConfig.json under /app", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app", "dashboard"), { recursive: true });

    const impl = createCreateNewRouteImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl("/dashboard", "settings");
    assert.deepEqual(res, {
      success: true,
      route: "/dashboard/settings",
      created_files: [
        "app/dashboard/settings/page.tsx",
        "app/dashboard/settings/pageConfig.json",
      ],
      page_config_json: JSON.parse(DEFAULT_PAGE_CONFIG_JSON),
    });

    const pageTsx = await fs.readFile(
      path.join(workspaceRoot, "app", "dashboard", "settings", "page.tsx"),
      "utf-8",
    );
    const pageConfig = await fs.readFile(
      path.join(workspaceRoot, "app", "dashboard", "settings", "pageConfig.json"),
      "utf-8",
    );

    assert.equal(pageTsx, PAGE_TSX_TEMPLATE_STRING);
    assert.equal(pageConfig, DEFAULT_PAGE_CONFIG_JSON);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("create_new_route: atomic rollback on write failure", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    const parentDir = path.join(workspaceRoot, "app", "dashboard");
    await fs.mkdir(parentDir, { recursive: true });

    const failingFs = makeRealFs({
      writeFile: async (absolutePath, content) => {
        if (absolutePath.replace(/\\/g, "/").endsWith("/pageConfig.json")) {
          throw new Error("simulated write failure");
        }
        await fs.writeFile(absolutePath, content ?? "", "utf-8");
      },
    });

    const impl = createCreateNewRouteImpl({ workspaceRoot, fs: failingFs } as any);
    const res = await impl("/dashboard", "settings");
    assert.equal((res as any)?.success, false);

    const entries = await fs.readdir(parentDir);
    assert.ok(!entries.includes("settings"), "final route dir should not exist");
    assert.ok(
      entries.every((e) => !e.startsWith(".qwintly_route_tmp_settings_")),
      "temp dir should be cleaned up",
    );
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("create_new_route: fails when parent route folder does not exist", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createCreateNewRouteImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl("/does-not-exist", "settings");
    assert.deepEqual(res, { success: false, error: "Parent route missing" });
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
