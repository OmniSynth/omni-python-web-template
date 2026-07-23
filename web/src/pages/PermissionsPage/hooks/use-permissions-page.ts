import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { buttonsUnderMenu, firstMenuCode, flattenPermissionTree } from "@/lib/permissions";
import type { PermissionInfo, PermissionRecord } from "@/types/auth";
import { usePermissionsNameEdit, usePermissionsTreeMove } from "./use-permissions-page-actions";

export function usePermissionsPage() {
  const { refresh: refreshAuth, hasPermission } = useAuth();
  const canUpdate = hasPermission("system.permission.update");
  const [tree, setTree] = useState<PermissionInfo[]>([]);
  const [records, setRecords] = useState<PermissionRecord[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const nameBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordMap = useMemo(() => new Map(records.map((record) => [record.code, record])), [records]);

  const flatTree = useMemo(() => flattenPermissionTree(tree), [tree]);
  const selectedNode = useMemo(
    () => flatTree.find((node) => node.code === selectedCode) ?? null,
    [flatTree, selectedCode],
  );
  const selectedRecord = selectedCode ? (recordMap.get(selectedCode) ?? null) : null;
  const editingRecord = editingCode ? (recordMap.get(editingCode) ?? null) : null;

  const menuButtons = useMemo(() => {
    if (!selectedRecord || selectedRecord.kind !== "menu") return [];
    return buttonsUnderMenu(tree, selectedRecord.code)
      .map((node) => recordMap.get(node.code))
      .filter((record): record is PermissionRecord => record != null);
  }, [recordMap, selectedRecord, tree]);

  const load = useCallback(async () => {
    const [nextTree, list] = await Promise.all([api.permissions.tree(), api.permissions.list()]);
    setTree(nextTree);
    setRecords(list);
    setSelectedCode((current) => {
      const navigable = flattenPermissionTree(nextTree).filter(
        (node) => node.kind === "catalog" || node.kind === "menu",
      );
      if (current && navigable.some((node) => node.code === current)) {
        return current;
      }
      return firstMenuCode(nextTree);
    });
  }, []);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((err: Error) => setPageLoadError(err.message));
  }, [load]);

  const moveTreeNode = usePermissionsTreeMove({ canUpdate, recordMap, records, load, refreshAuth });

  const { handleNameFocus, handleNameBlur, startNameEdit, cancelNameEdit, handleSaveName } = usePermissionsNameEdit({
    editingRecord,
    draftName,
    nameInputRef,
    nameBlurTimerRef,
    setEditingCode,
    setDraftName,
    setNameFocused,
    load,
    refreshAuth,
  });

  return {
    tree,
    pageLoadError,
    selectedCode,
    selectedNode,
    selectedRecord,
    menuButtons,
    editingCode,
    draftName,
    nameFocused,
    canUpdate,
    nameInputRef,
    setSelectedCode,
    moveTreeNode,
    startNameEdit,
    cancelNameEdit,
    handleSaveName,
    handleNameFocus,
    handleNameBlur,
    setDraftName,
  };
}
