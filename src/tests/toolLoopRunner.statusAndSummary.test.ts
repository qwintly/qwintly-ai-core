import assert from "node:assert/strict";
import test from "node:test";
import { buildToolStatusMessage } from "../ai/toolLoop/toolStatusMessage.js";
import { buildToolEventSummary } from "../ai/toolLoop/toolEventSummary.js";

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

test("buildToolEventSummary for modify_element", () => {
  const insertSummary = buildToolEventSummary({
    name: "modify_element",
    effectiveArgs: {
      action: "insert",
      route: "/about",
      parent_id: "root_div",
      before_id: "existing_sibling",
    },
    modelArgs: {},
    readFileMeta: null,
    toolResult: {
      success: true,
      changed: true,
      inserted_id: "new_el_1",
    },
    toolResultRaw: null,
  });
  assert.equal(
    insertSummary.summary,
    "modify_element (insert) success route=/about parent_id=root_div before_id=existing_sibling inserted_id=new_el_1 changed=true"
  );

  const deleteSummary = buildToolEventSummary({
    name: "modify_element",
    effectiveArgs: {
      action: "delete",
      route: "/pricing",
      element_id: "el_card",
    },
    modelArgs: {},
    readFileMeta: null,
    toolResult: {
      success: true,
      changed: true,
      deleted_id: "el_card",
    },
    toolResultRaw: null,
  });
  assert.equal(
    deleteSummary.summary,
    "modify_element (delete) success route=/pricing element_id=el_card deleted_id=el_card changed=true"
  );

  const classSummary = buildToolEventSummary({
    name: "modify_element",
    effectiveArgs: {
      action: "update_classname",
      route: "/",
      element_id: "el_button",
      className: "bg-blue-500 text-white",
    },
    modelArgs: {},
    readFileMeta: null,
    toolResult: {
      success: true,
      changed: true,
      updated_id: "el_button",
    },
    toolResultRaw: null,
  });
  assert.equal(
    classSummary.summary,
    'modify_element (update_classname) success route=/ element_id=el_button className="bg-blue-500 text-white" updated_id=el_button changed=true'
  );

  const propsSummary = buildToolEventSummary({
    name: "modify_element",
    effectiveArgs: {
      action: "update_props",
      route: "/contact",
      element_id: "el_input",
      text: "Submit Query",
    },
    modelArgs: {},
    readFileMeta: null,
    toolResult: {
      success: true,
      changed: true,
      updated_id: "el_input",
    },
    toolResultRaw: null,
  });
  assert.equal(
    propsSummary.summary,
    "modify_element (update_props) success route=/contact element_id=el_input keys=text updated_id=el_input changed=true"
  );
});
