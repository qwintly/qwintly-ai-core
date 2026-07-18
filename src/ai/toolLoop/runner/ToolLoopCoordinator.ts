import { FunctionCallingConfigMode } from "@google/genai";
import { EVENT_TYPES } from "../../../types/events.js";
import { DEFAULT_CONTEXT_POLICY } from "../constants/context.constants.js";
import {
  DEFAULT_AI_CALL_AUTO_RETRY_BASE_MS,
  DEFAULT_AI_CALL_AUTO_RETRY_MAX,
  DEFAULT_AI_CALL_AUTO_RETRY_MAX_MS,
  DEFAULT_KEEP_FULL_TRACE,
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_CALLING_MODE,
} from "../constants/runner.constants.js";
import { compactForModelAsync } from "../context/compactForModelAsync.js";
import { aiCallWithRetry } from "../helpers/aiCall.helper.js";
import { serializeError } from "../helpers/errors.helper.js";
import { extractThoughtSignatures } from "../helpers/signatures.helper.js";
import { ToolLoopContextPolicy } from "../types/context.types.js";
import {
  AiCallFn,
  AiCallResponse,
  Logger,
  RunToolLoopOptions,
  TokenPersistence,
  ToolLoopResult,
} from "../types/runner.types.js";
import { HistoryTraceManager } from "./HistoryTraceManager.js";
import { TokenPersistenceManager } from "./TokenPersistenceManager.js";
import { ToolCallExecutor } from "./ToolCallExecutor.js";

export class ToolLoopCoordinator {
  private readonly policy: Required<ToolLoopContextPolicy>;

  private readonly initialContents: any[];
  private readonly tools: any[];
  private readonly maxSteps: number;
  private readonly toolCallingMode: FunctionCallingConfigMode;
  private readonly terminalToolNames: string[];
  private readonly keepFullTrace: boolean;
  private readonly aiCall: AiCallFn;
  private readonly logger: Logger;
  private readonly aiCallAutoRetryMax: number;
  private readonly aiCallAutoRetryBaseMs: number;
  private readonly aiCallAutoRetryMaxMs: number;
  private readonly persistResponse?: (
    modelInput: any,
    modelOutput: any,
  ) => Promise<void>;
  private readonly tokenPersistence?: TokenPersistence;

  // Single-instantiation state managers and executor
  private readonly traceManager: HistoryTraceManager;
  private readonly tokenManager: TokenPersistenceManager;
  private readonly executor: ToolCallExecutor;

  constructor(options: RunToolLoopOptions) {
    this.policy = {
      ...DEFAULT_CONTEXT_POLICY,
      ...options.contextPolicy,
    };

    this.initialContents = options.initialContents;
    this.tools = options.tools;
    this.maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
    this.toolCallingMode = options.toolCallingMode ?? DEFAULT_TOOL_CALLING_MODE;
    this.terminalToolNames = options.terminalToolNames ?? [];
    this.keepFullTrace = options.keepFullTrace ?? DEFAULT_KEEP_FULL_TRACE;
    this.aiCall = options.aiCall;
    this.logger = options.logger;
    this.aiCallAutoRetryMax =
      options.aiCallAutoRetryMax ?? DEFAULT_AI_CALL_AUTO_RETRY_MAX;
    this.aiCallAutoRetryBaseMs =
      options.aiCallAutoRetryBaseMs ?? DEFAULT_AI_CALL_AUTO_RETRY_BASE_MS;
    this.aiCallAutoRetryMaxMs =
      options.aiCallAutoRetryMaxMs ?? DEFAULT_AI_CALL_AUTO_RETRY_MAX_MS;
    this.persistResponse = options.persistResponse;
    this.tokenPersistence = options.tokenPersistence;

    if (typeof this.aiCall !== "function") {
      throw new TypeError("Tool loop: aiCall is required.");
    }

    this.traceManager = new HistoryTraceManager(
      this.initialContents,
      this.keepFullTrace,
      this.maxSteps,
    );

    this.tokenManager = new TokenPersistenceManager(this.tokenPersistence);

    this.executor = new ToolCallExecutor({
      workspaceRoot: options.workspaceRoot,
      policy: this.policy,
      logger: this.logger,
    });
  }

  public async run(): Promise<ToolLoopResult> {
    for (let step = 0; step < this.maxSteps; step++) {
      const currentStep = step + 1;
      await this.compactContext(currentStep);
      this.logApproxModelCharsIfEnabled(currentStep);

      let response: AiCallResponse;
      try {
        response = await this.performAiCallWithRetry(currentStep);
      } catch (err) {
        await this.handleProviderError(currentStep, err);
        continue;
      }

      await this.persistResponseIfEnabled(currentStep, response);
      this.tokenManager.recordUsage(response);

      const functionCalls = response.functionCalls ?? [];
      if (functionCalls.length === 0) {
        await this.tokenManager.persist();
        return {
          contents: this.keepFullTrace
            ? this.traceManager.getFullTraceContents()
            : this.traceManager.getModelContents(),
          modelContents: this.traceManager.getModelContents(),
          finalText: (response.text ?? "").trim(),
          steps: currentStep,
          success: false,
        };
      }

      const result = await this.executeFunctionCalls(currentStep, response);

      if (result) {
        return result;
      }
    }

    await this.tokenManager.persist();
    return {
      contents: this.keepFullTrace
        ? this.traceManager.getFullTraceContents()
        : this.traceManager.getModelContents(),
      modelContents: this.traceManager.getModelContents(),
      finalText: `Stopped: max steps reached (${this.maxSteps}).`,
      steps: this.maxSteps,
      success: false,
    };
  }

  private async compactContext(step: number): Promise<void> {
    const compacted = await compactForModelAsync({
      initialCount: this.traceManager.getPinnedInitialCount(),
      modelContents: this.traceManager.getModelContents(),
      aiCall: this.aiCall,
      aiCallAutoRetryMax: this.aiCallAutoRetryMax,
      aiCallAutoRetryBaseMs: this.aiCallAutoRetryBaseMs,
      aiCallAutoRetryMaxMs: this.aiCallAutoRetryMaxMs,
      logger: this.logger,
      step,
    });
    this.traceManager.setModelContents(compacted);
  }

  private logApproxModelCharsIfEnabled(step: number): void {
    if (this.policy.logApproxModelChars) {
      const approxChars = JSON.stringify(
        this.traceManager.getModelContents(),
      ).length;
      console.log("Tool loop: approx model chars", { approxChars, step });
    }
  }

  private async performAiCallWithRetry(step: number): Promise<AiCallResponse> {
    return await aiCallWithRetry({
      aiCall: this.aiCall,
      request: this.traceManager.getModelContents(),
      options: { tools: this.tools, toolCallingMode: this.toolCallingMode },
      retryMax: this.aiCallAutoRetryMax,
      retryBaseMs: this.aiCallAutoRetryBaseMs,
      retryMaxMs: this.aiCallAutoRetryMaxMs,
      step,
      logger: this.logger,
    });
  }

  private async handleProviderError(step: number, err: unknown): Promise<void> {
    await this.logger(
      "Tool loop: AI provider error; preserving context and continuing",
      EVENT_TYPES.STEP_ERROR,
    );
    console.error("Tool loop: aiCall failed (provider/server side)", err, {
      step,
      error: serializeError(err),
    });

    const message =
      err instanceof Error ? err.message : JSON.stringify(err ?? null);
    const providerErrorInstruction = {
      role: "user",
      parts: [
        {
          text:
            `AI provider error (server-side). Do NOT clear or restart context; continue from the existing conversation state.\n` +
            `Error: ${message}\n` +
            `Next: retry the last request using the same context. If you were about to call tools, resend a valid tool call.`,
        },
      ],
    };
    if (this.keepFullTrace) {
      this.traceManager.getFullTraceContents().push(providerErrorInstruction);
    }
  }

  private async persistResponseIfEnabled(
    step: number,
    response: AiCallResponse,
  ): Promise<void> {
    if (this.persistResponse) {
      try {
        await this.persistResponse(
          this.traceManager.getModelContents(),
          response,
        );
      } catch (err) {
        console.error("Tool loop: failed to persist response", err, { step });
      }
    }
  }

  private async executeFunctionCalls(
    step: number,
    response: AiCallResponse,
  ): Promise<ToolLoopResult | null> {
    const functionCalls = response.functionCalls ?? [];
    const signatureById = extractThoughtSignatures(response);

    for (const call of functionCalls) {
      const executionResult = await this.executor.execute(
        call,
        signatureById,
        step,
      );

      if (executionResult.malformedMessage) {
        if (this.keepFullTrace) {
          this.traceManager
            .getFullTraceContents()
            .push(executionResult.malformedMessage);
        }
        this.traceManager
          .getModelContents()
          .push(executionResult.malformedMessage);
        continue;
      }

      this.traceManager.pushAssistantMessage(
        executionResult.assistantFull,
        executionResult.assistantModel,
      );

      this.traceManager.pushUserMessage(executionResult.responseFull);

      if (this.terminalToolNames.includes(executionResult.name)) {
        await this.tokenManager.persist();
        return {
          contents: this.keepFullTrace
            ? this.traceManager.getFullTraceContents()
            : this.traceManager.getModelContents(),
          modelContents: this.traceManager.getModelContents(),
          finalText: "",
          steps: step,
          terminalCall: {
            name: executionResult.name,
            args: executionResult.effectiveArgs,
            response: executionResult.toolResultRaw,
          },
          success: true,
        };
      }
    }

    return null;
  }
}
