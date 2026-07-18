import assert from "node:assert/strict";
import test from "node:test";
import { estimateTokenCount } from "../ai/toolLoop/context/estimateTokenCount.js";
import { removeReadSearchListTools } from "../ai/toolLoop/context/removeReadSearchListTools.js";
import { formatMessagesForSummary } from "../ai/toolLoop/context/formatMessagesForSummary.js";
import { compactForModelAsync } from "../ai/toolLoop/context/compactForModelAsync.js";

test("estimateTokenCount works as expected", () => {
  const messages = [
    {
      role: "model",
      parts: [{ text: "Hello, this is a test message of thirty characters." }],
    },
    {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "modify_element",
            response: { success: true },
          },
        },
      ],
    },
  ];

  const count = estimateTokenCount(messages);
  // Hello, this is a test message of thirty characters. -> 52 chars -> 13 tokens
  // {"name":"modify_element","response":{"success":true}} -> 53 chars -> 14 tokens
  // Total should be around 27
  assert.equal(count, 27);
});

test("removeReadSearchListTools filters out read_file, list_dir, and search, but keeps others", () => {
  const messages = [
    {
      role: "model",
      parts: [
        {
          functionCall: {
            name: "read_file",
            args: { path: "foo.ts" },
          },
        },
      ],
    },
    {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "read_file",
            response: "some contents",
          },
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          functionCall: {
            name: "modify_element",
            args: { action: "insert" },
          },
        },
      ],
    },
    {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "modify_element",
            response: { success: true },
          },
        },
        {
          functionResponse: {
            name: "search",
            response: { results: [] },
          },
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          functionCall: {
            name: "list_dir",
            args: { path: "." },
          },
        },
      ],
    },
  ];

  const filtered = removeReadSearchListTools(messages);
  // The first two messages only had read_file, so they should be completely removed.
  // The third is kept.
  // The fourth had modify_element and search, so only modify_element should be kept.
  // The fifth only had list_dir, so it should be completely removed.
  assert.equal(filtered.length, 2);

  assert.equal(filtered[0].parts.length, 1);
  assert.equal(filtered[0].parts[0].functionCall.name, "modify_element");

  assert.equal(filtered[1].parts.length, 1);
  assert.equal(filtered[1].parts[0].functionResponse.name, "modify_element");
});

test("formatMessagesForSummary format representation correctly", () => {
  const messages = [
    {
      role: "model",
      parts: [
        {
          functionCall: {
            name: "modify_element",
            args: { action: "delete" },
          },
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "Operation done" }],
    },
  ];

  const formatted = formatMessagesForSummary(messages);
  assert.match(formatted, /\[Assistant\]:/);
  assert.match(formatted, /Called tool "modify_element" with args:/);
  assert.match(formatted, /\[User\]:/);
  assert.match(formatted, /Operation done/);
});

test("compactForModelAsync: does not compact when limits are not exceeded", async () => {
  const initialContents = [{ role: "user", parts: [{ text: "hello" }] }];
  const modelContents = [
    ...initialContents,
    { role: "model", parts: [{ text: "msg1" }] },
    { role: "user", parts: [{ text: "msg2" }] },
  ];

  const result = await compactForModelAsync({
    initialCount: initialContents.length,
    modelContents,
    aiCall: async () => {
      throw new Error("Should not be called");
    },
    aiCallAutoRetryMax: 0,
    aiCallAutoRetryBaseMs: 0,
    aiCallAutoRetryMaxMs: 0,
    logger: async () => {},
    step: 1,
  });

  assert.equal(result.length, modelContents.length);
  assert.deepEqual(result, modelContents);
});

test("compactForModelAsync: compacts when message count limit is exceeded", async () => {
  const initialContents = [{ role: "user", parts: [{ text: "hello" }] }];
  // We need 13 messages in history to exceed the limit of 12.
  const history: any[] = [];
  for (let i = 1; i <= 13; i++) {
    history.push({
      role: i % 2 === 0 ? "user" : "model",
      parts: [{ text: `message ${i}` }],
    });
  }

  const modelContents = [...initialContents, ...history];

  let aiCallCalled = false;
  let passedSystemInstruction = "";
  let passedRequest: any = null;

  const aiCall = async (request: any, options: any) => {
    aiCallCalled = true;
    passedRequest = request;
    passedSystemInstruction = options.systemInstruction;
    return {
      text: "LLM Summary of messages 1-5",
    };
  };

  const result = await compactForModelAsync({
    initialCount: initialContents.length,
    modelContents,
    aiCall,
    aiCallAutoRetryMax: 0,
    aiCallAutoRetryBaseMs: 0,
    aiCallAutoRetryMaxMs: 0,
    logger: async () => {},
    step: 1,
  });

  assert.ok(aiCallCalled);
  assert.match(passedSystemInstruction, /Summarize the assistant\/user interaction history/);
  const requestStr = JSON.stringify(passedRequest);
  assert.match(requestStr, /message 1/);
  assert.match(requestStr, /message 5/);

  // New history should have popped 5 messages, and inserted 1 summary message:
  // 13 - 5 + 1 = 9 messages.
  assert.equal(result.length, initialContents.length + 9);
  assert.equal(result[initialContents.length].role, "model");
  assert.match(
    result[initialContents.length].parts[0].text,
    /MEMORY \(tool trace summary\):\nLLM Summary of messages 1-5/
  );
});

test("compactForModelAsync: compacts when token limit is exceeded", async () => {
  const initialContents = [{ role: "user", parts: [{ text: "hello" }] }];
  // 3 messages in history, but one of them has a huge text size (e.g. 64000 characters -> 16000 tokens)
  const history = [
    { role: "model", parts: [{ text: "small message" }] },
    { role: "user", parts: [{ text: "a".repeat(64000) }] },
    { role: "model", parts: [{ text: "another message" }] },
  ];

  const modelContents = [...initialContents, ...history];

  let aiCallCalled = false;
  const aiCall = async () => {
    aiCallCalled = true;
    return {
      text: "LLM Summary of token-heavy message",
    };
  };

  const result = await compactForModelAsync({
    initialCount: initialContents.length,
    modelContents,
    aiCall,
    aiCallAutoRetryMax: 0,
    aiCallAutoRetryBaseMs: 0,
    aiCallAutoRetryMaxMs: 0,
    logger: async () => {},
    step: 1,
  });

  assert.ok(aiCallCalled);
  // It popped the 3 messages and summarized them.
  // 3 - 3 + 1 = 1 message in new history.
  assert.equal(result.length, initialContents.length + 1);
  assert.match(
    result[initialContents.length].parts[0].text,
    /MEMORY \(tool trace summary\):\nLLM Summary of token-heavy message/
  );
});

test("compactForModelAsync: removes read/list/search tools, skips LLM call if nothing remains", async () => {
  const initialContents = [{ role: "user", parts: [{ text: "hello" }] }];
  // 13 messages in history, but all first 5 messages are read_file/list_dir/search operations.
  const history: any[] = [
    { role: "model", parts: [{ functionCall: { name: "read_file", args: {} } }] },
    { role: "user", parts: [{ functionResponse: { name: "read_file", response: {} } }] },
    { role: "model", parts: [{ functionCall: { name: "search", args: {} } }] },
    { role: "user", parts: [{ functionResponse: { name: "search", response: {} } }] },
    { role: "model", parts: [{ functionCall: { name: "list_dir", args: {} } }] },
  ];
  for (let i = 6; i <= 14; i++) {
    history.push({
      role: "user",
      parts: [{ text: `useful msg ${i}` }],
    });
  }

  const modelContents = [...initialContents, ...history];

  let aiCallCalled = false;
  const aiCall = async () => {
    aiCallCalled = true;
    return { text: "should not be called" };
  };

  const result = await compactForModelAsync({
    initialCount: initialContents.length,
    modelContents,
    aiCall,
    aiCallAutoRetryMax: 0,
    aiCallAutoRetryBaseMs: 0,
    aiCallAutoRetryMaxMs: 0,
    logger: async () => {},
    step: 1,
  });

  // Because the first 5 popped messages were strictly read_file/list_dir/search calls,
  // they were filtered out completely.
  // Hence filteredPopped was empty, aiCall was not invoked, and no summary was inserted.
  // History should just have the remaining 9 messages.
  assert.ok(!aiCallCalled);
  assert.equal(result.length, initialContents.length + 9);
  assert.equal(result[initialContents.length].parts[0].text, "useful msg 6");
});
