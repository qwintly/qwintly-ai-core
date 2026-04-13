import { Type } from "@google/genai";
export declare const SearchSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            search_query: {
                type: Type;
                description: string;
            };
        };
        required: string[];
    };
};
