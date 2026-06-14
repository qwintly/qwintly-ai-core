import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { computeProjectInfo } from "../indexer/projectInfoIndex.js";

test("computeProjectInfo: scans routes from directories and constructs pages", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-project-info-"));
  try {
    // 1. Create a root pageConfig.json with a div root and two sections
    const rootDir = path.join(workspaceRoot, "app");
    await fs.mkdir(rootDir, { recursive: true });
    await fs.writeFile(
      path.join(rootDir, "pageConfig.json"),
      JSON.stringify({
        elements: [
          {
            id: "root",
            type: "div",
            children: [
              { id: "hero-section", type: "div", children: [] },
              { id: "footer-container", type: "div", children: [] },
              { id: "some-text", type: "text", props: { text: "hello" } }
            ]
          }
        ]
      })
    );

    // 2. Create a nested pageConfig.json under /dashboard/settings with a fallback section
    const settingsDir = path.join(workspaceRoot, "app", "dashboard", "settings");
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(
      path.join(settingsDir, "pageConfig.json"),
      JSON.stringify({
        elements: [
          {
            id: "settings-container",
            type: "div",
            children: []
          }
        ]
      })
    );

    // 3. Create a nested pageConfig.json under /dashboard with no sections
    const dashboardDir = path.join(workspaceRoot, "app", "dashboard");
    await fs.mkdir(dashboardDir, { recursive: true });
    await fs.writeFile(
      path.join(dashboardDir, "pageConfig.json"),
      JSON.stringify({
        elements: []
      })
    );

    const projectInfo = await computeProjectInfo(workspaceRoot);

    assert.equal(projectInfo.uiPages.length, 3);
    assert.equal(projectInfo.lastUpdatedPlanVersion, 1);

    // / route
    const rootPage = projectInfo.uiPages.find(p => p.pageRoute === "/");
    assert.ok(rootPage);
    assert.equal(rootPage.pageName, "root");
    assert.equal(rootPage.description, "root page for this project");

    // /dashboard route
    const dashboardPage = projectInfo.uiPages.find(p => p.pageRoute === "/dashboard");
    assert.ok(dashboardPage);
    assert.equal(dashboardPage.pageName, "dashboard");
    assert.equal(dashboardPage.description, "dashboard page for this project");

    // /dashboard/settings route
    const settingsPage = projectInfo.uiPages.find(p => p.pageRoute === "/dashboard/settings");
    assert.ok(settingsPage);
    assert.equal(settingsPage.pageName, "dashboard-settings");
    assert.equal(settingsPage.description, "dashboard-settings page for this project");

  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
