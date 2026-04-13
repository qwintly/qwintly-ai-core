export type ValidationNodePromptParams = {
    errors: Array<{
        type?: string | null;
        filePath?: string | null;
        message?: string | null;
    }>;
    history: Array<{
        file?: string;
        fix?: string;
    }>;
    validatorIndex: unknown;
};
export declare const validationNodePrompt: (params: ValidationNodePromptParams) => string;
