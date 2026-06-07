import { Tool } from "@google/genai";
import { ReadFileSchema } from "../schemas/readFile.schema.js";
import { SubmitCodegenDoneSchema } from "../schemas/submitCodegenDone.schema.js";
import { ListDirSchema } from "../schemas/listDir.schema.js";
import { CreateNewRouteSchema } from "../schemas/createNewRoute.schema.js";
import { DeleteElementSchema } from "../schemas/deleteElement.schema.js";
import { InsertElementSchema } from "../schemas/insertElement.schema.js";
import { UpdateClassNameSchema } from "../schemas/updateClassName.schema.js";
import { UpdatePropsSchema } from "../schemas/updateProps.schema.js";
import { UpdateGlobalStylesSchema } from "../schemas/updateGlobalStyles.schema.js";
import { GetAvailableRoutesSchema } from "../schemas/getAvailableRoutes.schema.js";

export const codegenTools = (): Tool[] => {
  return [
    {
      functionDeclarations: [
        ReadFileSchema,
        UpdateGlobalStylesSchema,
        CreateNewRouteSchema,
        InsertElementSchema,
        DeleteElementSchema,
        UpdateClassNameSchema,
        UpdatePropsSchema,
        ListDirSchema,
        GetAvailableRoutesSchema,
        SubmitCodegenDoneSchema,
      ],
    },
  ];
};
