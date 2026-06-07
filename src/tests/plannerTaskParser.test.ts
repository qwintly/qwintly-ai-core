import assert from "node:assert/strict";
import test from "node:test";
import { parsePlannerTasksUnknown, parsePlannerTasksJson } from "../ai/toolLoop/helpers/plannerTaskParser.js";

test("plannerTaskParser: parses less than 15 tasks successfully", () => {
  const tasks = Array.from({ length: 5 }, (_, i) => ({
    description: `Task ${i + 1}`,
    targets: [`target-${i + 1}`],
  }));

  const parsed = parsePlannerTasksUnknown(tasks);
  assert.equal(parsed.length, 5);
  assert.equal(parsed[0]?.description, "Task 1");
  assert.deepEqual(parsed[0]?.targets, ["target-1"]);
});

test("plannerTaskParser: limits to max 15 tasks and ignores rest without throwing", () => {
  const tasks = Array.from({ length: 25 }, (_, i) => ({
    description: `Task ${i + 1}`,
    targets: [`target-${i + 1}`],
  }));

  const parsed = parsePlannerTasksUnknown(tasks);
  assert.equal(parsed.length, 15);
  assert.equal(parsed[0]?.description, "Task 1");
  assert.equal(parsed[14]?.description, "Task 15");
});

test("plannerTaskParser: invalid tasks past index 15 are ignored and don't throw", () => {
  const tasks: any[] = Array.from({ length: 15 }, (_, i) => ({
    description: `Task ${i + 1}`,
    targets: [`target-${i + 1}`],
  }));

  // Append invalid tasks at the end
  tasks.push({ description: "", targets: [] }); // invalid: empty description & target min length
  tasks.push({ description: 123, targets: "not-an-array" }); // completely invalid
  tasks.push("not-even-an-object");

  const parsed = parsePlannerTasksUnknown(tasks);
  assert.equal(parsed.length, 15);
  assert.equal(parsed[0]?.description, "Task 1");
  assert.equal(parsed[14]?.description, "Task 15");
});

test("plannerTaskParser: parsePlannerTasksJson handles JSON with more than 15 tasks", () => {
  const tasks = Array.from({ length: 20 }, (_, i) => ({
    description: `Task ${i + 1}`,
    targets: [`target-${i + 1}`],
  }));

  const jsonString = JSON.stringify(tasks);
  const parsed = parsePlannerTasksJson(jsonString);
  assert.equal(parsed.length, 15);
  assert.equal(parsed[0]?.description, "Task 1");
  assert.equal(parsed[14]?.description, "Task 15");
});
