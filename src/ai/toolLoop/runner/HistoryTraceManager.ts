import { EXECUTION_GUIDE_MARKER } from "../constants/runner.constants.js";

export class HistoryTraceManager {
  private modelContents: any[];
  private readonly fullTraceContents: any[];
  private readonly pinnedInitialCount: number;
  private readonly keepFullTrace: boolean;
  private readonly maxSteps: number;

  constructor(
    initialContents: any[],
    keepFullTrace: boolean,
    maxSteps: number,
  ) {
    this.maxSteps = maxSteps;
    const executionGuideInstruction = {
      role: "user",
      parts: [
        {
          text:
            `${EXECUTION_GUIDE_MARKER}\n` +
            `Execution limit: At most ${this.maxSteps} assistant turn(s) in this tool loop. ` +
            `One turn = one assistant response in the tool loop.\n` +
            `Complete the task in as few turns as possible and avoid unnecessary actions. Prioritize correctness.`,
        },
      ],
    };

    this.modelContents = [...initialContents, executionGuideInstruction];
    this.fullTraceContents = keepFullTrace
      ? [...initialContents, executionGuideInstruction]
      : [];
    this.pinnedInitialCount = initialContents.length + 1;
    this.keepFullTrace = keepFullTrace;
  }

  public getModelContents(): any[] {
    return this.modelContents;
  }

  public getFullTraceContents(): any[] {
    return this.fullTraceContents;
  }

  public getPinnedInitialCount(): number {
    return this.pinnedInitialCount;
  }

  public setModelContents(contents: any[]) {
    this.modelContents = contents;
  }

  public pushAssistantMessage(assistantFull: any, assistantModel: any) {
    if (this.keepFullTrace) {
      this.fullTraceContents.push(assistantFull);
    }
    this.modelContents.push(assistantModel);
  }

  public pushUserMessage(responseFull: any) {
    if (this.keepFullTrace) {
      this.fullTraceContents.push(responseFull);
    }
    this.modelContents.push(responseFull);
  }
}
