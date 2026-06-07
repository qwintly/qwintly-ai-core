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
import { getAvailableRoutes } from "../ai/tools/helpers/pageConfigJson.helpers.js";

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

test("create_new_route: creates parent route when it does not exist", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createCreateNewRouteImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl("/does-not-exist", "settings");
    assert.equal((res as any)?.success, true);
    assert.equal((res as any)?.route, "/does-not-exist/settings");

    // Check parent route files exist
    const parentPage = await fs.readFile(
      path.join(workspaceRoot, "app", "does-not-exist", "page.tsx"),
      "utf-8",
    );
    assert.equal(parentPage, PAGE_TSX_TEMPLATE_STRING);

    const parentConfig = await fs.readFile(
      path.join(workspaceRoot, "app", "does-not-exist", "pageConfig.json"),
      "utf-8",
    );
    assert.equal(parentConfig, DEFAULT_PAGE_CONFIG_JSON);

    // Check child route files exist
    const childPage = await fs.readFile(
      path.join(workspaceRoot, "app", "does-not-exist", "settings", "page.tsx"),
      "utf-8",
    );
    assert.equal(childPage, PAGE_TSX_TEMPLATE_STRING);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("create_new_route: fallback to root route if parent is invalid (e.g. empty or invalid segments)", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createCreateNewRouteImpl({ workspaceRoot, fs: makeRealFs() } as any);
    
    // Empty parent route -> should create under /
    const res1 = await impl("", "settings");
    assert.equal((res1 as any)?.success, true);
    assert.equal((res1 as any)?.route, "/settings");

    // Invalid segment in parent route -> should fallback to / profile
    const res2 = await impl("/../invalid-parent", "profile");
    assert.equal((res2 as any)?.success, true);
    assert.equal((res2 as any)?.route, "/profile");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("get_available_routes: helper scans app folder recursively and extracts routes", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    // Root route /
    await fs.writeFile(path.join(workspaceRoot, "app", "pageConfig.json"), "{}");
    
    // Dashboard route /dashboard
    await fs.mkdir(path.join(workspaceRoot, "app", "dashboard"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "app", "dashboard", "pageConfig.json"), "{}");

    // Nested route /dashboard/settings
    await fs.mkdir(path.join(workspaceRoot, "app", "dashboard", "settings"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "app", "dashboard", "settings", "pageConfig.json"), "{}");

    // Non-route folder (no pageConfig.json)
    await fs.mkdir(path.join(workspaceRoot, "app", "dashboard", "helpers"), { recursive: true });

    const routes = await getAvailableRoutes({ workspaceRoot, fs: makeRealFs() } as any);
    assert.deepEqual(routes, ["/", "/dashboard", "/dashboard/settings"]);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
