import { Type } from "@google/genai";
export declare const WriteFileSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            path: {
                type: Type;
                description: string;
            };
            content: {
                type: Type;
                description: string;
            };
        };
        required: string[];
    };
};
