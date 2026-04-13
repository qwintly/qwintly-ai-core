import { Type } from "@google/genai";
export declare const SubmitPlannerTasksSchema: {
    name: string;
    description: string;
    parameters: {
        type: Type;
        properties: {
            planner_tasks: {
                type: Type;
                description: string;
                items: {
                    type: Type;
                    properties: {
                        description: {
                            type: Type;
                            description: string;
                        };
                        targets: {
                            type: Type;
                            description: string;
                            items: {
                                type: Type;
                            };
                        };
                    };
                    required: string[];
                };
            };
        };
        required: string[];
    };
};
