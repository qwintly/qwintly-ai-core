export type CodegenNodePromptParams = {
    task: unknown;
    codegenIndex: unknown;
    collectedContext: unknown;
    isNewProject: boolean;
    requestTypeLabel: string;
};
export declare const codegenNodePrompt: (params: CodegenNodePromptParams) => string;
