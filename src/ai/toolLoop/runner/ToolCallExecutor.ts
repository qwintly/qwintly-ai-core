import { persistToolCall } from "../../../services/toolcallPersist.service.js";
import { EVENT_TYPES } from "../../../types/events.js";
import { STYLE_TOKEN_KEYS } from "../../../types/styleConfig.js";
import { normalizeToolArgs } from "../helpers/toolArgs.helper.js";
import {
  executeToolHandler,
  postProcessToolResult,
} from "../helpers/toolExecution.helper.js";
import { buildToolStatusMessage } from "../status/toolStatusMessage.js";
import { ToolLoopContextPolicy } from "../types/context.types.js";
import { Logger } from "../types/runner.types.js";
import { createWorkspaceToolImpls } from "../../tools/implementations/factories.js";
import { createToolHandlers } from "../helpers/toolHandlers.helper.js";
import { nodeFs } from "../helpers/fsHelpers.js";

export class ToolCallExecutor {
  private readonly toolHandlers: any;
  private readonly policy: Required<ToolLoopContextPolicy>;
  private readonly styleTokenKeySet: Set<string>;
  private readonly logger: Logger;

  constructor(params: {
    workspaceRoot: string;
    policy: Required<ToolLoopContextPolicy>;
    logger: Logger;
  }) {
    this.policy = params.policy;
    this.styleTokenKeySet = new Set<string>(STYLE_TOKEN_KEYS);
    this.logger = params.logger;

    const impls = createWorkspaceToolImpls({
      workspaceRoot: params.workspaceRoot,
      fs: nodeFs,
    });

    this.toolHandlers = createToolHandlers({
      impls,
      workspaceRoot: params.workspaceRoot,
    });
  }

  public async execute(
    call: any,
    signatureById: Map<string, string>,
    step: number,
  ): Promise<{
    effectiveArgs: Record<string, unknown>;
    toolResultRaw: unknown;
    responseFull: any;
    assistantFull: any;
    assistantModel: any;
    name: string;
    malformedMessage?: any;
  }> {
    const name = call.name?.toString() ?? "";
    const args = (call.args ?? {}) as Record<string, unknown>;

    if (!name) {
      await this.logger(
        "Tool loop: malformed function call from model; preserving context and continuing",
        EVENT_TYPES.STEP_ERROR,
      );
      const malformedInstruction = {
        role: "user",
        parts: [
          {
            text:
              `Malformed function call received (missing tool name). Do NOT clear or restart context.\n` +
              `Resend a single valid tool call with a non-empty name and JSON args.\n` +
              `Bad call: ${JSON.stringify(call ?? null).slice(0, 1500)}`,
          },
        ],
      };
      return {
        effectiveArgs: {},
        toolResultRaw: null,
        responseFull: null,
        assistantFull: null,
        assistantModel: null,
        name,
        malformedMessage: malformedInstruction,
      };
    }

    const thoughtSignature = this.extractThoughtSignature(call, signatureById);
    const handler = this.toolHandlers[name];

    const { effectiveArgs, readFileMeta } = normalizeToolArgs(name, args, {
      readFileDefaultMaxLines: this.policy.readFileDefaultMaxLines,
      styleTokenKeySet: this.styleTokenKeySet,
    });

    await this.logger(
      buildToolStatusMessage(name, effectiveArgs, readFileMeta),
      EVENT_TYPES.STEP_STARTED,
      true,
    );

    const modelArgs = effectiveArgs;

    const functionCallPart = {
      functionCall: { name, args: effectiveArgs },
      ...(thoughtSignature
        ? { thoughtSignature, thought_signature: thoughtSignature }
        : {}),
    };

    const functionCallPartModel = {
      functionCall: { name, args: modelArgs },
      ...(thoughtSignature
        ? { thoughtSignature, thought_signature: thoughtSignature }
        : {}),
    };

    const assistantFull = { role: "model", parts: [functionCallPart] };
    const assistantModel = { role: "model", parts: [functionCallPartModel] };

    const toolResultRaw = await executeToolHandler({
      name,
      handler,
      effectiveArgs,
      styleTokenKeySet: this.styleTokenKeySet,
      step,
      logger: this.logger,
    });

    const toolResult = postProcessToolResult({
      name,
      toolResultRaw,
      effectiveArgs,
      readFileMeta,
      readFileDefaultMaxLines: this.policy.readFileDefaultMaxLines,
    });

    try {
      await persistToolCall(name, modelArgs, toolResult);
    } catch (err) {
      console.error("Tool loop: failed to persist tool call", err, {
        tool: name,
        step,
      });
    }

    const responseFull = {
      role: "user",
      parts: [{ functionResponse: { name, response: toolResult } }],
    };

    return {
      effectiveArgs,
      toolResultRaw,
      responseFull,
      assistantFull,
      assistantModel,
      name,
    };
  }

  private extractThoughtSignature(
    call: any,
    signatureById: Map<string, string>,
  ): string | undefined {
    const direct = call?.thought_signature ?? call?.thoughtSignature;
    if (typeof direct === "string" && direct) return direct;
    const id = call?.id;
    if (typeof id === "string" && signatureById.has(id)) {
      return signatureById.get(id);
    }
    return undefined;
  }
}
