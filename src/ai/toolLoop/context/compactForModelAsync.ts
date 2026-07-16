import { aiCallWithRetry } from "../helpers/aiCall.helper.js";
import { EVENT_TYPES } from "../../../types/events.js";
import { AiCallFn, Logger } from "../types/runner.types.js";
import { estimateTokenCount } from "./estimateTokenCount.js";
import { removeReadSearchListTools } from "./removeReadSearchListTools.js";
import { formatMessagesForSummary } from "./formatMessagesForSummary.js";
import { TOKEN_LIMIT, MSG_LIMIT } from "../constants/context.constants.js";

export async function compactForModelAsync(input: {
  initialCount: number;
  modelContents: any[];
  aiCall: AiCallFn;
  aiCallAutoRetryMax: number;
  aiCallAutoRetryBaseMs: number;
  aiCallAutoRetryMaxMs: number;
  logger: Logger;
  step: number;
}): Promise<any[]> {
  const {
    initialCount,
    modelContents,
    aiCall,
    aiCallAutoRetryMax,
    aiCallAutoRetryBaseMs,
    aiCallAutoRetryMaxMs,
    logger,
    step,
  } = input;

  let history = modelContents.slice(initialCount);
  const initial = modelContents.slice(0, initialCount);

  while (true) {
    const totalTokens = estimateTokenCount([...initial, ...history]);
    const needsCompaction = history.length > MSG_LIMIT || totalTokens > TOKEN_LIMIT;

    if (!needsCompaction || history.length <= 1) {
      break;
    }

    const countToPop = Math.min(5, history.length);
    const popped = history.slice(0, countToPop);
    history = history.slice(countToPop);

    const filteredPopped = removeReadSearchListTools(popped);

    if (filteredPopped.length > 0) {
      const formattedText = formatMessagesForSummary(filteredPopped);
      const summaryRequest = [
        {
          role: "user",
          parts: [
            {
              text: `History:\n${formattedText}`,
            },
          ],
        },
      ];

      logger(
        `Tool loop: Summarizing ${filteredPopped.length} messages (removed read/list/search tools)`,
        EVENT_TYPES.STEP_STARTED,
      );

      let summaryText = "";
      try {
        const response = await aiCallWithRetry({
          aiCall,
          request: summaryRequest,
          options: {
            systemInstruction:
              "You are a helpful assistant. Summarize the assistant/user interaction history concisely, highlighting key actions taken, achievements, and findings. Do not mention any search, read_file, or list_dir tool executions. Keep the summary short and focused.",
          },
          retryMax: aiCallAutoRetryMax,
          retryBaseMs: aiCallAutoRetryBaseMs,
          retryMaxMs: aiCallAutoRetryMaxMs,
          step,
          logger,
        });
        summaryText = (response.text ?? "").trim();
      } catch (err) {
        console.error("Tool loop: summarization failed", err);
        summaryText = `[Summarized ${filteredPopped.length} steps due to limits]`;
      }

      if (summaryText) {
        const summaryMessage = {
          role: "model",
          parts: [
            {
              text: `MEMORY (tool trace summary):\n${summaryText}`,
            },
          ],
        };
        history.unshift(summaryMessage);
      }
    }
  }

  return [...initial, ...history];
}
