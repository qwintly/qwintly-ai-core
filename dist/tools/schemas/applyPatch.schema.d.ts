import { Type } from "@google/genai";
export declare const ApplyPatchSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            patch_string: {
                type: Type;
                description: string;
            };
        };
        required: string[];
    };
};
