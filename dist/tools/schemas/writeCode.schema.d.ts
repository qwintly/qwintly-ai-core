import { Type } from "@google/genai";
export declare const writeCodeSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            path: {
                type: Type;
                description: string;
            };
            code: {
                type: Type;
                description: string;
            };
            description: {
                type: Type;
                description: string;
            };
        };
        required: string[];
    };
};
