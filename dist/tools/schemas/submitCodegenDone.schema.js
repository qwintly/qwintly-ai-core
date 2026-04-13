import { Type } from "@google/genai";
export const SubmitCodegenDoneSchema = {
    name: "submit_codegen_done",
    description: "Signals the code-generation agent is finished implementing the task. Calling this tool ends the codegen phase.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            summary: {
                type: Type.STRING,
                description: "Short summary of what changed.",
            },
        },
        required: ["summary"],
    },
};
//# sourceMappingURL=submitCodegenDone.schema.js.map