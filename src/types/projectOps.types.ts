export type ProjectOperationRow = {
  id?: unknown;
  route?: unknown;
  operation?: unknown;
};

export type TextOp = {
  kind: "text";
  id: string;
  newText: string;
  oldText?: string;
};

export type DeleteOp = {
  kind: "delete";
  id: string;
  parentId?: string;
};

export type ProjectOp = TextOp | DeleteOp | Record<string, unknown>;
