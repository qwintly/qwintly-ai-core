import { ReadFileSchema } from "../schemas/readFile.schema.js";
import { SearchSchema } from "../schemas/search.schema.js";
import { ListDirSchema } from "../schemas/listDir.schema.js";
import { SubmitPlannerTasksSchema } from "../schemas/submitPlannerTasks.schema.js";
export const plannerTools = () => {
    return [
        {
            functionDeclarations: [
                ReadFileSchema,
                SearchSchema,
                ListDirSchema,
                SubmitPlannerTasksSchema,
            ],
        },
    ];
};
//# sourceMappingURL=plannerTools.js.map