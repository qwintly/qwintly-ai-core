import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import {
  createUpdateGlobalStylesImpl,
} from "../ai/tools/implementations/updateGlobalStyles.impl.js";

type CoreFs = Parameters<typeof createUpdateGlobalStylesImpl>[0]["fs"];

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

const readStyleConfig = async (workspaceRoot: string) => {
  const raw = await fs.readFile(
    path.join(workspaceRoot, "app", "styleConfig.json"),
    "utf-8",
  );
  return JSON.parse(raw) as any;
};

test("update_global_styles: merges tokens and bumps version", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, "app", "styleConfig.json"),
      JSON.stringify(
        {
          version: 10,
          tokens: {
            radius: "1rem",
            background: "oklch(0.9 0.02 80.2)",
            foreground: "oklch(0.2 0.03 255.4)",
            card: "oklch(0.995 0.004 80.2)",
            cardForeground: "oklch(0.2 0.03 255.4)",
            popover: "oklch(0.995 0.004 80.2)",
            popoverForeground: "oklch(0.2 0.03 255.4)",
            primary: "oklch(0.62 0.16 199.4)",
            primaryForeground: "oklch(0.985 0.008 80.2)",
            secondary: "oklch(0.94 0.02 83.1)",
            secondaryForeground: "oklch(0.22 0.04 258.2)",
            muted: "oklch(0.95 0.01 85.6)",
            mutedForeground: "oklch(0.46 0.04 257.6)",
            accent: "oklch(0.9 0.06 78.4)",
            accentForeground: "oklch(0.22 0.04 258.2)",
            destructive: "oklch(0.57 0.21 25.6)",
            border: "oklch(0.89 0.02 82.5)",
            input: "oklch(0.92 0.02 82.5)",
            ring: "oklch(0.62 0.16 199.4)",
            chart1: "oklch(0.62 0.16 199.4)",
            chart2: "oklch(0.66 0.14 143.6)",
            chart3: "oklch(0.52 0.12 297.6)",
            chart4: "oklch(0.74 0.16 79.3)",
            chart5: "oklch(0.62 0.18 24.8)",
            sidebar: "oklch(0.975 0.01 82.5)",
            sidebarForeground: "oklch(0.2 0.03 255.4)",
            sidebarPrimary: "oklch(0.62 0.16 199.4)",
            sidebarPrimaryForeground: "oklch(0.985 0.008 80.2)",
            sidebarAccent: "oklch(0.94 0.02 83.1)",
            sidebarAccentForeground: "oklch(0.22 0.04 258.2)",
            sidebarBorder: "oklch(0.89 0.02 82.5)",
            sidebarRing: "oklch(0.62 0.16 199.4)",
          },
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ background: "oklch(0.88 0.02 80.2)" });
    assert.equal((res as any)?.success, true);
    assert.equal((res as any)?.version, 11);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.version, 11);
    assert.equal(stored.tokens.background, "oklch(0.88 0.02 80.2)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: missing file => creates defaults and applies patch", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ radius: "0.5rem" });
    assert.equal((res as any)?.success, true);
    assert.equal((res as any)?.created, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.radius, "0.5rem");
    assert.equal(stored.version, 2);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: invalid JSON => recreates defaults then applies patch", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, "app", "styleConfig.json"),
      "{",
      "utf-8",
    );
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ border: "oklch(0.5 0.02 82.5)" });
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.border, "oklch(0.5 0.02 82.5)");
    assert.equal(stored.version, 2);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: unknown token key is rejected", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ notAKey: "oklch(0.1 0 0)" } as any);
    assert.equal((res as any)?.success, false);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: unsafe/empty token value is rejected", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ background: "" });
    assert.equal((res as any)?.success, false);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: empty tokens patch is rejected", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, "app", "styleConfig.json"),
      JSON.stringify({ version: 1, tokens: { radius: "0.85rem" } }),
      "utf-8",
    );

    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({} as any);
    assert.equal((res as any)?.success, false);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.version, 1);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: accepts JSON-string args (primary only)", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl(JSON.stringify({ primary: "oklch(0.7 0.15 350)" }));
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.primary, "oklch(0.7 0.15 350)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: accepts wrapped args {tokens:{...}} and still applies patch", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ tokens: { primary: "oklch(0.7 0.15 350)" } } as any);
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.primary, "oklch(0.7 0.15 350)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: exact case (primary/ring/chart1/primaryForeground) succeeds", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({
      chart1: "oklch(0.7 0.18 50)",
      ring: "oklch(0.7 0.18 50)",
      primaryForeground: "oklch(1 0 0)",
      primary: "oklch(0.7 0.18 50)",
    } as any);
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.primary, "oklch(0.7 0.18 50)");
    assert.equal(stored.tokens.primaryForeground, "oklch(1 0 0)");
    assert.equal(stored.tokens.ring, "oklch(0.7 0.18 50)");
    assert.equal(stored.tokens.chart1, "oklch(0.7 0.18 50)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: user's failing case", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({
      chart2: "oklch(0.75 0.1 45)",
      chart5: "oklch(0.6 0.2 30)",
      sidebarRing: "oklch(0.7 0.15 40)",
      chart1: "oklch(0.7 0.15 40)",
      primaryForeground: "oklch(1 0 0)",
      sidebarPrimary: "oklch(0.7 0.15 40)",
      chart4: "oklch(0.65 0.18 35)",
      primary: "oklch(0.7 0.15 40)",
      ring: "oklch(0.7 0.15 40)",
      accent: "oklch(0.85 0.12 40)",
      chart3: "oklch(0.8 0.08 50)",
      sidebarPrimaryForeground: "oklch(1 0 0)"
    });
    assert.equal((res as any)?.success, true);
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: mix of valid and invalid/unknown/unsafe params succeeds by ignoring invalid ones", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({
      primary: "oklch(0.7 0.15 40)",
      notAKey: "should be ignored",
      background: "", // empty - should be ignored
      ring: "<script>unsafe</script>", // unsafe - should be ignored
    } as any);
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.primary, "oklch(0.7 0.15 40)");
    // background, ring, notAKey should not be overwritten/updated to invalid values
    assert.notEqual(stored.tokens.ring, "<script>unsafe</script>");
    assert.notEqual(stored.tokens.background, "");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: handles heavily nested/wrapped SDK responses", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({
      sdkHttpResponse: {
        headers: {
          "content-type": "application/json"
        }
      },
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "update_global_styles",
                  args: {
                    chart2: "oklch(0.75 0.1 45)",
                    primary: "oklch(0.7 0.15 40)"
                  }
                }
              }
            ]
          }
        }
      ]
    } as any);
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.chart2, "oklch(0.75 0.1 45)");
    assert.equal(stored.tokens.primary, "oklch(0.7 0.15 40)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: accepts malformed/unquoted JS object string", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    // JS object literal format (invalid standard JSON)
    const res = await impl("{ primary: 'oklch(0.6, 0.2, 260)' }");
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.primary, "oklch(0.6, 0.2, 260)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("update_global_styles: accepts single valid key/value", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-"));
  try {
    await fs.mkdir(path.join(workspaceRoot, "app"), { recursive: true });
    const impl = createUpdateGlobalStylesImpl({ workspaceRoot, fs: makeRealFs() } as any);
    const res = await impl({ primary: "oklch(0.6, 0.2, 260)" });
    assert.equal((res as any)?.success, true);

    const stored = await readStyleConfig(workspaceRoot);
    assert.equal(stored.tokens.primary, "oklch(0.6, 0.2, 260)");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});



