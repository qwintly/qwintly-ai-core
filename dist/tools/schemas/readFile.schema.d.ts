import { Type } from "@google/genai";
export declare const ReadFileSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            path: {
                type: Type;
                description: string;
            };
            start_line: {
                type: Type;
                description: string;
                minimum: number;
            };
            end_line: {
                type: Type;
                description: string;
                minimum: number;
            };
        };
        required: string[];
    };
};
