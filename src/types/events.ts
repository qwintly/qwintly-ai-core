export const EVENT_TYPES = {
  STEP_STARTED: "step_started",
  STEP_FINISHED: "step_finished",
  STEP_ERROR: "step_error",
  STEP_RETRY: "step_retry",
  GENERATION_COMPLETED: "generation_completed",
  GENERATION_FAILED: "generation_failed",
};

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export const GEN_STEPS = {
  INITIATING: "initiating",
  BUILDING: "building",
  DEPLOYING: "deploying",
};

export type GenStep = (typeof GEN_STEPS)[keyof typeof GEN_STEPS];