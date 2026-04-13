import { Type } from "@google/genai";
export declare const SubmitCodegenDoneSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            summary: {
                type: Type;
                description: string;
            };
        };
        required: string[];
    };
};
