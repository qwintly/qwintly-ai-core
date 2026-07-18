import { ToolLoopCoordinator } from "./ToolLoopCoordinator.js";
import { RunToolLoopOptions, ToolLoopResult } from "../types/runner.types.js";

export async function runToolLoop(options: RunToolLoopOptions): Promise<ToolLoopResult> {
  const coordinator = new ToolLoopCoordinator(options);
  return await coordinator.run();
}
