import { Tool } from "@google/genai";
import { getClient } from "./ai/generate/generateClient.js";
import {
  runToolLoop,
  RunToolLoopOptions,
  ToolHandler,
} from "./ai/toolLoop/toolLoopRunner.js";
import { buildCodegenIndex } from "./indexer/codegenIndex.js";
import { buildPlannerIndex } from "./indexer/plannerIndex.js";
import { computeProjectInfo } from "./indexer/projectInfoIndex.js";
import { buildValidatorIndex } from "./indexer/validatorIndex.js";
import { statusService } from "./logging/genStatus.service.js";
import { SendStatusToRedis } from "./logging/redis.service.js";
import { ContextRepository } from "./repository/context.repository.js";
import { GenStatusRepository } from "./repository/genStatus.repository.js";
import { EventType } from "./types/events.js";
import {
  CodegenIndex,
  PlannerIndex,
  ValidatorIndex,
} from "./types/index/index.types.js";

export class QwintlyCore {
  public chatId: string;
  public sessionId: string;
  public workspacePath: string;
  public source: string;
  public step: string;
  public sbSecret: string;
  public sbEndpoint: string;
  public upstashUrl: string;
  public upstashToken: string;
  private geminiApiKey: string;
  public aiClient: any;
  public statusRepo: any;
  public ctxRepo: any;
  public redisStatusPublisher: any;

  constructor(
    chatId: string,
    sessionId: string,
    workspacePath: string,
    source: string,
    step: string,
    sbSecret: string,
    sbEndpoint: string,
    upstashUrl: string,
    upstashToken: string,
    geminiApiKey: string,
  ) {
    this.chatId = chatId;
    this.sessionId = sessionId;
    this.workspacePath = workspacePath;
    this.source = source;
    this.step = step;
    this.sbSecret = sbSecret;
    this.sbEndpoint = sbEndpoint;
    this.upstashUrl = upstashUrl;
    this.upstashToken = upstashToken;
    this.geminiApiKey = geminiApiKey;

    this.aiClient = getClient("gemini", this.geminiApiKey);

    this.statusRepo = new GenStatusRepository(this.sbEndpoint, this.sbSecret);
    this.ctxRepo = new ContextRepository(this.sbEndpoint, this.sbSecret);
    this.redisStatusPublisher = new SendStatusToRedis(
      this.upstashUrl,
      this.upstashToken,
    );
    console.log(
      `Qwintly Core successfully initialized for the session ${sessionId} for chat ${chatId}`,
    );
  }

  public async runAiFlow(
    initialContents: any[],
    tools: Tool[],
    handlers: Record<string, ToolHandler>,
    maxSteps: number,
    terminalToolNames: string[],
  ) {
    const toolLoopOptions: RunToolLoopOptions = {
      initialContents: initialContents,
      tools: tools,
      handlers: handlers,
      maxSteps: maxSteps,
      terminalToolNames: terminalToolNames,
      aiCall: this.aiClient.aiCall,
      logger: this.streamLog.bind(this),
    };

    const result = await runToolLoop(toolLoopOptions);
    return result;
  }

  public async streamLog(message: string, eventType: EventType) {
    await statusService(
      this.chatId,
      this.sessionId,
      eventType,
      this.step,
      message,
      this.source,
      {
        repository: this.statusRepo,
        publisher: this.redisStatusPublisher,
      },
    );
  }

  public async buildProjectInfoIdx() {
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
