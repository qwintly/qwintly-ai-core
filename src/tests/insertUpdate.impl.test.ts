import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createInsertElementImpl } from "../ai/tools/implementations/insertElement.impl.js";
import { createUpdatePropsImpl } from "../ai/tools/implementations/updateProps.impl.js";
import { createUpdateClassNameImpl } from "../ai/tools/implementations/updateClassName.impl.js";
import { createDeleteElementImpl } from "../ai/tools/implementations/deleteElement.impl.js";
import { matchRoute } from "../ai/tools/helpers/pageConfigJson.helpers.js";

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

    const inserted = await insert("/a", "root", [
      { id: "new_el", parentId: "root", type: "text", props: { text: "hello" } }
    ] as any);
    assert.equal(
      (inserted as any).success,
      true,
      `unexpected response: ${JSON.stringify(inserted)}`,
    );
    const insertedId = (inserted as any).inserted_id as string;
    assert.ok(typeof insertedId === "string" && insertedId.startsWith("el_"));

    const inserted2 = await insert({
      route: "/a",
      parent_id: "root",
      before_id: "existing",
      elements: [
        { id: "first_el", parentId: "root", type: "text", props: { text: "first" } }
      ],
    } as any);
    assert.equal(
      (inserted2 as any).success,
      true,
      `unexpected response: ${JSON.stringify(inserted2)}`,
    );
    const inserted2Id = (inserted2 as any).inserted_id as string;
    assert.ok(typeof inserted2Id === "string" && inserted2Id.startsWith("el_"));

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
    const children = after.elements[0].children as any[];
    assert.equal(children[0].id, inserted2Id);
    assert.equal(children[1].id, "existing");

    const found = children.find((e) => e.id === insertedId);
    assert.ok(found);
    assert.equal(found.props.text, "updated");
    assert.equal(found.props.href, "/x");
    assert.equal(found.className, "text-red-500");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("matchRoute helper correctly matches physical paths", () => {
  // exact match
  assert.equal(matchRoute("/", "/"), true);
  assert.equal(matchRoute("/dashboard", "/dashboard"), true);
  assert.equal(matchRoute("/dashboard", "/dashboard/"), true);
  assert.equal(matchRoute("/dashboard/", "/dashboard"), true);
  
  // dynamic segment
  assert.equal(matchRoute("/product/[id]", "/product/123"), true);
  assert.equal(matchRoute("/product/[id]", "/product/hi"), true);
  assert.equal(matchRoute("/product/[id]", "/product/"), false);
  assert.equal(matchRoute("/product/[id]", "/product/123/reviews"), false);
  assert.equal(matchRoute("/product/[id]/reviews", "/product/abc/reviews"), true);

  // catch-all segment
  assert.equal(matchRoute("/blog/[...slug]", "/blog/react"), true);
  assert.equal(matchRoute("/blog/[...slug]", "/blog/react/hooks/state"), true);
  assert.equal(matchRoute("/blog/[...slug]", "/blog"), false); // required catch-all requires at least one segment

  // optional catch-all segment
  assert.equal(matchRoute("/blog/[[...slug]]", "/blog"), true);
  assert.equal(matchRoute("/blog/[[...slug]]", "/blog/react"), true);
  assert.equal(matchRoute("/blog/[[...slug]]", "/blog/react/hooks"), true);
});

test("dynamic/nested routes resolution in tools", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-dynamic-"));
  try {
    // 1. Create a dynamic route /product/[id]
    const routeDir = path.join(workspaceRoot, "app", "product", "[id]");
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
              children: [{ id: "prod_title", type: "text", props: { text: "Product Name" } }],
            },
          ],
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    // 2. Create a catch-all route /blog/[...slug]
    const blogDir = path.join(workspaceRoot, "app", "blog", "[...slug]");
    await fs.mkdir(blogDir, { recursive: true });
    const blogFilePath = path.join(blogDir, "pageConfig.json");
    await fs.writeFile(
      blogFilePath,
      JSON.stringify(
        {
          elements: [
            {
              id: "blog_root",
              type: "div",
              children: [{ id: "blog_content", type: "text", props: { text: "Blog Post" } }],
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
    const deleteElement = createDeleteElementImpl(deps);

    const insRes = await insert("/product/123", "root", [
      { id: "buy_btn", parentId: "root", type: "button", props: { text: "Buy Now" } }
    ] as any);
    assert.equal(insRes.success, true);

    // Verify it updated '/app/product/[id]/pageConfig.json'
    const afterProduct = JSON.parse(await fs.readFile(filePath, "utf-8"));
    assert.equal(afterProduct.elements[0].children.length, 2);
    const newBtn = afterProduct.elements[0].children[1];
    assert.equal(newBtn.type, "button");
    assert.equal(newBtn.props.text, "Buy Now");

    // Test update_props on dynamic route '/product/hi-there'
    const upRes = await updateProps({
      route: "/product/hi-there",
      element_id: "prod_title",
      text: "Updated Product Title",
    } as any);
    assert.equal(upRes.success, true);

    // Test update_classname on catch-all route '/blog/react/hooks/state'
    const classRes = await updateClassName("/blog/react/hooks/state", "blog_content", "text-blue-500");
    assert.equal(classRes.success, true);

    // Verify blog config updated
    const afterBlog = JSON.parse(await fs.readFile(blogFilePath, "utf-8"));
    const updatedTitle = afterBlog.elements[0].children[0];
    assert.equal(updatedTitle.className, "text-blue-500");

    // Test delete_element on catch-all route
    const delRes = await deleteElement("/blog/react/something-else", "blog_content");
    assert.equal(delRes.success, true);

    const afterDelBlog = JSON.parse(await fs.readFile(blogFilePath, "utf-8"));
    assert.equal(afterDelBlog.elements[0].children.length, 0);

  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("insert tool: supports flat elements list with parent-child mapping", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-flat-"));
  try {
    const routeDir = path.join(workspaceRoot, "app", "flat-test");
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
              children: [],
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

    // Call insert using the flat elements format
    const inserted = await insert({
      route: "/flat-test",
      parent_id: "root",
      elements: [
        {
          id: "container",
          parentId: "root",
          type: "div",
          className: "bg-red-500",
        },
        {
          id: "heading",
          parentId: "container",
          type: "text",
          props: { text: "Hello from Flat List" },
        },
      ],
    } as any);

    assert.equal(
      (inserted as any).success,
      true,
      `unexpected response: ${JSON.stringify(inserted)}`,
    );

    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const children = after.elements[0].children as any[];
    assert.equal(children.length, 1);
    
    const insertedContainer = children[0];
    assert.equal(insertedContainer.className, "bg-red-500");
    assert.equal(insertedContainer.type, "div");
    
    // Verify children inside the container
    assert.equal(insertedContainer.children.length, 1);
    const insertedHeading = insertedContainer.children[0];
    assert.equal(insertedHeading.type, "text");
    assert.equal(insertedHeading.props.text, "Hello from Flat List");
    
    // Verify that proper real IDs starting with el_ were generated
    assert.ok(insertedContainer.id.startsWith("el_"));
    assert.ok(insertedHeading.id.startsWith("el_"));
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("insert tool: supports multiple sibling root elements in flat array", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-multi-flat-"));
  try {
    const routeDir = path.join(workspaceRoot, "app", "multi-flat-test");
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
              children: [],
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

    // Call insert with two sibling root elements
    const inserted = await insert({
      route: "/multi-flat-test",
      parent_id: "root",
      elements: [
        {
          id: "card_1",
          parentId: "root",
          type: "div",
          className: "card-1",
        },
        {
          id: "card_2",
          parentId: "root",
          type: "div",
          className: "card-2",
        },
        {
          id: "heading_1",
          parentId: "card_1",
          type: "text",
          props: { text: "Heading 1" },
        },
      ],
    } as any);

    assert.equal(
      (inserted as any).success,
      true,
      `unexpected response: ${JSON.stringify(inserted)}`,
    );

    assert.ok(Array.isArray((inserted as any).inserted_ids));
    assert.equal((inserted as any).inserted_ids.length, 2);

    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const children = after.elements[0].children as any[];
    assert.equal(children.length, 2);

    assert.equal(children[0].className, "card-1");
    assert.equal(children[1].className, "card-2");

    assert.equal(children[0].children.length, 1);
    assert.equal(children[0].children[0].props.text, "Heading 1");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("insert tool: handles inserting into an empty page config elements array", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-empty-page-"));
  try {
    const routeDir = path.join(workspaceRoot, "app", "empty-test");
    await fs.mkdir(routeDir, { recursive: true });
    const filePath = path.join(routeDir, "pageConfig.json");
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          elements: [],
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    const deps = { workspaceRoot, fs: makeRealFs() } as any;
    const insert = createInsertElementImpl(deps);

    const inserted = await insert({
      route: "/empty-test",
      parent_id: "root",
      elements: [
        {
          id: "root",
          parentId: "root",
          type: "div",
          className: "bg-blue-500",
        },
      ],
    } as any);

    assert.equal((inserted as any).success, true, `unexpected response: ${JSON.stringify(inserted)}`);
    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    assert.equal(after.elements.length, 1);
    assert.equal(after.elements[0].className, "bg-blue-500");
    assert.ok(after.elements[0].id.startsWith("el_"));
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("insert tool: supports parentId set to the parent_id parameter", async () => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "qwintly-core-tolerant-"));
  try {
    const routeDir = path.join(workspaceRoot, "app", "tolerant-test");
    await fs.mkdir(routeDir, { recursive: true });
    const filePath = path.join(routeDir, "pageConfig.json");
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          elements: [
            {
              id: "root_element",
              type: "div",
              children: [],
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

    const inserted = await insert({
      route: "/tolerant-test",
      parent_id: "root_element",
      elements: [
        {
          id: "child_element",
          parentId: "root_element", // uses 'root_element' instead of 'parent'
          type: "text",
          props: { text: "Hello" },
        },
      ],
    } as any);

    assert.equal((inserted as any).success, true, `unexpected response: ${JSON.stringify(inserted)}`);
    const after = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const rootEl = after.elements[0];
    assert.equal(rootEl.children.length, 1);
    assert.equal(rootEl.children[0].props.text, "Hello");
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});


