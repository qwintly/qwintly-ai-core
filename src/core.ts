import { FunctionCallingConfigMode, Tool } from "@google/genai";
import { getClient } from "./ai/generate/generateClient.js";
import {
  runToolLoop,
  RunToolLoopOptions,
  ToolHandler,
  ToolLoopResult,
} from "./ai/toolLoop/toolLoopRunner.js";
import { buildCodegenIndex } from "./indexer/codegenIndex.js";
import { buildPlannerIndex } from "./indexer/plannerIndex.js";
import { computeProjectInfo } from "./indexer/projectInfoIndex.js";
import { buildValidatorIndex } from "./indexer/validatorIndex.js";
import { statusService } from "./logging/genStatus.service.js";
import { SendStatusToRedis } from "./logging/redis.service.js";
import { ContextRepository } from "./repository/context.repository.js";
import { GenStatusRepository } from "./repository/genStatus.repository.js";
import { EventType, GenStep } from "./types/events.js";
import {
  CodegenIndex,
  PlannerIndex,
  ValidatorIndex,
} from "./types/index/index.types.js";
import type { ProjectInfo } from "./types/projectInfo.types.js";
import { assertNonEmptyString } from "./utils/utils.js";

export type QwintlyCoreOptions = {
  chatId: string;
  sessionId: string;
  workspacePath: string;
  source: string;
  step: GenStep;
  supabase: { endpoint: string; secret: string };
  upstash: { url: string; token: string };
  gemini?: { apiKey: string; model?: string };
};

type AiResponseOptions = {
  tools?: Tool[];
  toolCallingMode?: FunctionCallingConfigMode;
};

type AiClient = {
  aiResponse: (
    request: unknown,
    options?: AiResponseOptions,
  ) => Promise<{
    functionCalls?: any[];
    text?: string;
  }>;
};

export class QwintlyCore {
  public readonly chatId: string;
  public readonly sessionId: string;
  public readonly workspacePath: string;
  public readonly source: string;
  public readonly step: GenStep;

  private readonly aiClient?: AiClient;
  private readonly statusRepo: GenStatusRepository;
  private readonly ctxRepo: ContextRepository;
  private readonly redisStatusPublisher: SendStatusToRedis;

  constructor(options: QwintlyCoreOptions) {
    assertNonEmptyString(options.chatId, "chatId");
    assertNonEmptyString(options.sessionId, "sessionId");
    assertNonEmptyString(options.workspacePath, "workspacePath");
    assertNonEmptyString(options.source, "source");
    assertNonEmptyString(options.step, "step");
    assertNonEmptyString(options.supabase?.endpoint, "supabase.endpoint");
    assertNonEmptyString(options.supabase?.secret, "supabase.secret");
    assertNonEmptyString(options.upstash?.url, "upstash.url");
    assertNonEmptyString(options.upstash?.token, "upstash.token");

    this.chatId = options.chatId;
    this.sessionId = options.sessionId;
    this.workspacePath = options.workspacePath;
    this.source = options.source;
    this.step = options.step;

    if (options.gemini?.apiKey) {
      this.aiClient = getClient(
        "gemini",
        options.gemini.apiKey,
        options.gemini.model,
      ) as AiClient;
    }

    this.statusRepo = new GenStatusRepository(
      options.supabase.endpoint,
      options.supabase.secret,
    );
    this.ctxRepo = new ContextRepository(
      options.supabase.endpoint,
      options.supabase.secret,
    );
    this.redisStatusPublisher = new SendStatusToRedis(
      options.upstash.url,
      options.upstash.token,
    );

    console.log(
      `QwintlyCore initialized (chatId=${this.chatId}, sessionId=${this.sessionId})`,
    );
  }

  public async runAiFlow(
    initialContents: any[],
    tools: Tool[],
    handlers: Record<string, ToolHandler>,
    maxSteps: number,
    terminalToolNames: string[],
  ): Promise<ToolLoopResult> {
    if (!this.aiClient) {
      throw new Error(
        "AI client not initialized. Please provide 'gemini' config to use runAiFlow.",
      );
    }
    const toolLoopOptions: RunToolLoopOptions = {
      initialContents: initialContents,
      tools: tools,
      handlers: handlers,
      maxSteps: maxSteps,
      terminalToolNames: terminalToolNames,
      aiCall: (request, options) =>
        this.aiClient!.aiResponse(request, {
          tools: options.tools,
          toolCallingMode: options.toolCallingMode,
        }),
      logger: this.streamLog.bind(this),
    };

    const result = await runToolLoop(toolLoopOptions);
    return result;
  }

  public async streamLog(
    message: string,
    eventType: EventType,
    displayedSummary: boolean = false,
  ): Promise<void> {
    try {
      assertNonEmptyString(message, "message");
      await statusService(
        this.chatId,
        this.sessionId,
        eventType,
        this.step,
        message,
        this.source,
        {
          repository: {
            persist: this.statusRepo.persistStatusMessage.bind(this.statusRepo),
          },
          publisher: {
            publish: this.redisStatusPublisher.sendStatusToRedis.bind(
              this.redisStatusPublisher,
            ),
          },
        },
        displayedSummary,
      );
    } catch (error) {
      console.error(error);
    }
  }

  public async buildProjectInfoIdx(): Promise<ProjectInfo> {
    const projectInfo = await computeProjectInfo(this.workspacePath);

    await this.ctxRepo.updateProjectInfo(this.chatId, projectInfo);

    return projectInfo;
  }

  private async buildIndex<T>(
    builder: (path: string) => Promise<T>,
  ): Promise<T> {
    return builder(this.workspacePath);
  }

  public async buildPlannerIdx(): Promise<PlannerIndex> {
    return this.buildIndex(buildPlannerIndex);
  }

  public async buildCodegenIdx(): Promise<CodegenIndex> {
    return this.buildIndex(buildCodegenIndex);
  }

  public async buildValidatorIdx(): Promise<ValidatorIndex> {
    return this.buildIndex(buildValidatorIndex);
  }
}
