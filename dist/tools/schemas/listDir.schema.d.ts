import { Type } from "@google/genai";
export declare const ListDirSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            path: {
                type: Type;
                description: string;
            };
            depth: {
                type: Type;
                description: string;
                minimum: number;
                maximum: number;
            };
        };
        required: string[];
    };
};
