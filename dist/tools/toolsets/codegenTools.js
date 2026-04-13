import { ReadFileSchema } from "../schemas/readFile.schema.js";
import { ApplyPatchSchema } from "../schemas/applyPatch.schema.js";
import { WriteFileSchema } from "../schemas/writeFile.schema.js";
import { SubmitCodegenDoneSchema } from "../schemas/submitCodegenDone.schema.js";
export const codegenTools = () => {
    return [
        {
            functionDeclarations: [
                ReadFileSchema,
                ApplyPatchSchema,
                WriteFileSchema,
                SubmitCodegenDoneSchema,
            ],
        },
    ];
};
//# sourceMappingURL=codegenTools.js.map