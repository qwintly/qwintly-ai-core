export type PlanNodePromptParams = {
    planTasks: unknown[];
    collectedContext: unknown;
    plannerIndex: unknown;
    isNewProject: boolean;
    requestTypeLabel: string;
};
export declare const planNodePrompt: (params: PlanNodePromptParams) => string;
