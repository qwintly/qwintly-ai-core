import assert from "node:assert/strict";
import test from "node:test";
import { buildToolStatusMessage } from "../ai/toolLoop/status/toolStatusMessage.js";

test("buildToolStatusMessage for modify_element", () => {
  const insertStatus = buildToolStatusMessage(
    "modify_element",
    {
      action: "insert",
      route: "/about",
      parent_id: "root_div",
      before_id: "existing_sibling",
    },
    null
  );
  assert.equal(
    insertStatus,
    'AI tool: Inserting element into route "/about" (under parent "root_div", before "existing_sibling")'
  );

  const deleteStatus = buildToolStatusMessage(
    "modify_element",
    {
      action: "delete",
      route: "/pricing",
      element_id: "el_card",
    },
    null
  );
  assert.equal(
    deleteStatus,
    'AI tool: Deleting element "el_card" from route "/pricing"'
  );

  const classStatus = buildToolStatusMessage(
    "modify_element",
    {
      action: "update_classname",
      route: "/",
      element_id: "el_button",
      className: "bg-blue-500 text-white",
    },
    null
  );
  assert.equal(
    classStatus,
    'AI tool: Updating class name for element "el_button" on route "/" to "bg-blue-500 text-white"'
  );

  const propsStatus = buildToolStatusMessage(
    "modify_element",
    {
      action: "update_props",
      route: "/contact",
      element_id: "el_input",
    },
    null
  );
  assert.equal(
    propsStatus,
    'AI tool: Updating properties for element "el_input" on route "/contact"'
  );
});
