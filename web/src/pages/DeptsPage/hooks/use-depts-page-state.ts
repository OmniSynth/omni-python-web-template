import { useCallback, useEffect, useMemo, useState } from "react";
import { deptNameMap, flattenDeptRecords } from "@/components/dept/dept-tree-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { api } from "@/lib/api";
import { useManagementScope } from "@/lib/management-scope";
import type { DeptRecord } from "@/types/auth";
import type { DeptFormMode } from "../types";
import { collectDescendantIds, firstDeptId } from "../utils";

export function useDeptsPageState() {
  const tenantScope = useManagementScope() === "tenant";
  const deptPerm = (system: string, tenant: string) => (tenantScope ? tenant : system);
  const deptApi = tenantScope ? api.tenantDepts : api.depts;
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(deptPerm("system.dept.create", "tenant.dept.create"));
  const canUpdate = hasPermission(deptPerm("system.dept.update", "tenant.dept.update"));
  const canDelete = hasPermission(deptPerm("system.dept.delete", "tenant.dept.delete"));

  const [tree, setTree] = useState<DeptRecord[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<DeptFormMode>("edit");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingIsRoot, setEditingIsRoot] = useState(false);
  const [parentId, setParentId] = useState("0");
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeptRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();

  const flatDepts = useMemo(() => flattenDeptRecords(tree), [tree]);
  const parentNameById = useMemo(() => deptNameMap(flatDepts), [flatDepts]);
  const rootDept = useMemo(() => flatDepts.find((dept) => dept.parent_id === 0) ?? null, [flatDepts]);
  const hasRoot = rootDept != null;
  const selectedDept = useMemo(() => flatDepts.find((dept) => dept.id === selectedId) ?? null, [flatDepts, selectedId]);

  const load = useCallback(async () => {
    const nextTree = await deptApi.tree();
    setTree(nextTree);
    setSelectedId((current) => {
      const flat = flattenDeptRecords(nextTree);
      if (current != null && flat.some((dept) => dept.id === current)) return current;
      return firstDeptId(nextTree);
    });
  }, [deptApi]);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((err: Error) => setPageLoadError(err.message));
  }, [load]);

  const parentExcludeIds = useMemo(() => {
    if (formMode === "edit" && editingId != null) return collectDescendantIds(tree, editingId);
    return new Set<number>();
  }, [tree, formMode, editingId]);

  return {
    canCreate,
    canUpdate,
    canDelete,
    deptApi,
    tree,
    pageLoadError,
    selectedId,
    setSelectedId,
    formMode,
    setFormMode,
    editingId,
    setEditingId,
    editingIsRoot,
    setEditingIsRoot,
    parentId,
    setParentId,
    name,
    setName,
    enabled,
    setEnabled,
    saving,
    setSaving,
    deleteTarget,
    setDeleteTarget,
    deleting,
    setDeleting,
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
    flatDepts,
    parentNameById,
    rootDept,
    hasRoot,
    selectedDept,
    load,
    parentExcludeIds,
  };
}
