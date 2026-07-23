import type { Dispatch, SetStateAction } from "react";
import type { DeptRecord } from "@/types/auth";
import type { DeptFormMode } from "../types";

export function useDeptsPageForm({
  formMode,
  editingIsRoot,
  parentId,
  flatDepts,
  hasRoot,
  rootDept,
  clearFieldErrors,
  setFormMode,
  setSelectedId,
  setEditingId,
  setEditingIsRoot,
  setParentId,
  setName,
  setEnabled,
}: {
  formMode: DeptFormMode;
  editingIsRoot: boolean;
  parentId: string;
  flatDepts: DeptRecord[];
  hasRoot: boolean;
  rootDept: DeptRecord | null;
  clearFieldErrors: () => void;
  setFormMode: Dispatch<SetStateAction<DeptFormMode>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  setEditingIsRoot: Dispatch<SetStateAction<boolean>>;
  setParentId: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setEnabled: Dispatch<SetStateAction<boolean>>;
}) {
  function selectDept(dept: DeptRecord) {
    setFormMode("edit");
    setSelectedId(dept.id);
  }

  function openCreate(parent: DeptRecord | null) {
    clearFieldErrors();
    setFormMode("create");
    setEditingId(null);
    setEditingIsRoot(false);
    if (parent) {
      setParentId(String(parent.id));
    } else if (hasRoot && rootDept) {
      setParentId(String(rootDept.id));
    } else {
      setParentId("0");
    }
    setName("");
    setEnabled(true);
  }

  function cancelCreate() {
    clearFieldErrors();
    setFormMode("edit");
  }

  const showParentField = formMode === "create" || !editingIsRoot;
  const isRootForm = formMode === "create" ? parentId === "0" : editingIsRoot;
  const parentDeptName =
    Number(parentId) === 0 ? "顶级部门" : (flatDepts.find((dept) => dept.id === Number(parentId))?.name ?? "—");

  return {
    selectDept,
    openCreate,
    cancelCreate,
    showParentField,
    isRootForm,
    parentDeptName,
  };
}
