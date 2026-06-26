import { createCreateNewRouteImpl } from "./createNewRoute.impl.js";
import { createListDirImpl } from "./listDir.impl.js";
import { createReadFileImpl } from "./readFile.impl.js";
import { createSearchImpl, type SearchDeps } from "./search.impl.js";
import { createUpdateGlobalStylesImpl } from "./updateGlobalStyles.impl.js";
import { createModifyElementImpl } from "./modifyElement.impl.js";

export { DEFAULT_NOT_FOUND_RESPONSE } from "./workspaceDeps.js";
export type {
  CoreDirent,
  CoreFs,
  WorkspaceDeps,
} from "./workspaceDeps.js";

export { createCreateNewRouteImpl } from "./createNewRoute.impl.js";
export { createListDirImpl } from "./listDir.impl.js";
export { createReadFileImpl } from "./readFile.impl.js";
export {
  createSearchImpl,
  type SearchDeps,
  type SearchResult,
} from "./search.impl.js";
export { createUpdateGlobalStylesImpl } from "./updateGlobalStyles.impl.js";
export { createModifyElementImpl } from "./modifyElement.impl.js";

export const createWorkspaceToolImpls = (deps: SearchDeps) => {
  const readFileImpl = createReadFileImpl(deps);
  const listDirImpl = createListDirImpl(deps);
  const searchImpl = createSearchImpl(deps);
  const updateGlobalStylesImpl = createUpdateGlobalStylesImpl(deps);
  const createNewRouteImpl = createCreateNewRouteImpl(deps);
  const modifyElementImpl = createModifyElementImpl(deps);

  return {
    readFileImpl,
    listDirImpl,
    searchImpl,
    updateGlobalStylesImpl,
    createNewRouteImpl,
    modifyElementImpl,
  };
};
