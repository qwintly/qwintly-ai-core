import assert from "node:assert/strict";
import test from "node:test";
import { parseApplyPatch } from "../ai/tools/helpers/applyPatch.helpers.js";

test("parseApplyPatch: tolerates leading indentation (dedent)", () => {
  const patch = `
    *** Begin Patch
    *** Update File: a.txt
    @@
    -hello
    +hi
    *** End Patch
  `;

  const ops = parseApplyPatch(patch);
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.kind, "update");
  assert.equal(ops[0]?.filePath, "a.txt");
});

test("parseApplyPatch: strips surrounding markdown code fences", () => {
  const patch = `
\`\`\`diff
*** Begin Patch
*** Update File: a.txt
@@
-hello
+hi
*** End Patch
\`\`\`
`;

  const ops = parseApplyPatch(patch);
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.kind, "update");
  assert.equal(ops[0]?.filePath, "a.txt");
});

test('parseApplyPatch: supports "*** Move to:" after Update File', () => {
  const patch = `
*** Begin Patch
*** Update File: a.txt
*** Move to: b.txt
@@
-hello
+hi
*** End Patch
`;

  const ops = parseApplyPatch(patch);
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.kind, "update");
  assert.equal(ops[0]?.filePath, "a.txt");
  assert.equal((ops[0] as any).moveTo, "b.txt");
});
