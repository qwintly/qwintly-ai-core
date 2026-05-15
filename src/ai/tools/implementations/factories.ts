import { createApplyPatchImpl } from "./applyPatch.impl.js";
import { createCreateNewRouteImpl } from "./createNewRoute.impl.js";
import { createDeleteElementImpl } from "./deleteElement.impl.js";
import { createInsertElementImpl } from "./insertElement.impl.js";
import { createListDirImpl } from "./listDir.impl.js";
import { createReadFileImpl } from "./readFile.impl.js";
import { createSearchImpl, type SearchDeps } from "./search.impl.js";
import { createUpdateClassNameImpl } from "./updateClassName.impl.js";
import { createUpdatePropsImpl } from "./updateProps.impl.js";
import { createWriteFileImpl } from "./writeFile.impl.js";

export { DEFAULT_NOT_FOUND_RESPONSE } from "./workspaceDeps.js";
export type {
  CoreDirent,
  CoreFs,
  WorkspaceDeps,
} from "./workspaceDeps.js";

export { createApplyPatchImpl } from "./applyPatch.impl.js";
export { createCreateNewRouteImpl } from "./createNewRoute.impl.js";
export { createDeleteElementImpl } from "./deleteElement.impl.js";
export { createInsertElementImpl } from "./insertElement.impl.js";
export { createListDirImpl } from "./listDir.impl.js";
export { createReadFileImpl } from "./readFile.impl.js";
export {
  createSearchImpl,
  type SearchDeps,
  type SearchResult,
} from "./search.impl.js";
export { createUpdateClassNameImpl } from "./updateClassName.impl.js";
export { createUpdatePropsImpl } from "./updateProps.impl.js";
export { createWriteFileImpl } from "./writeFile.impl.js";

export const createWorkspaceToolImpls = (deps: SearchDeps) => {
  const readFileImpl = createReadFileImpl(deps);
  const writeFileImpl = createWriteFileImpl(deps);
  const listDirImpl = createListDirImpl(deps);
  const searchImpl = createSearchImpl(deps);
  const applyPatchImpl = createApplyPatchImpl(deps);
  const createNewRouteImpl = createCreateNewRouteImpl(deps);
  const deleteElementImpl = createDeleteElementImpl(deps);
  const insertElementImpl = createInsertElementImpl(deps);
  const updatePropsImpl = createUpdatePropsImpl(deps);
  const updateClassNameImpl = createUpdateClassNameImpl(deps);

  return {
    readFileImpl,
    writeFileImpl,
    listDirImpl,
    searchImpl,
    applyPatchImpl,
    createNewRouteImpl,
    deleteElementImpl,
    insertElementImpl,
    updatePropsImpl,
    updateClassNameImpl,
  };
};
