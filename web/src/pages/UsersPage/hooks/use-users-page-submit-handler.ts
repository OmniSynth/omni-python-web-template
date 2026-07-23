import type { SubmitEvent } from "react";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { UserRecord } from "@/types/auth";
import type { PasswordReveal, SheetMode } from "../types";
import { submitCreateUser, submitUpdateUser } from "./use-users-page-submit";

export function useUsersPageSubmitHandler({
  tenantScope,
  clearFieldErrors,
  setSectionError,
  collectBindings,
  validateDeptRequired,
  sheetMode,
  username,
  displayName,
  setFieldErrors,
  setSaving,
  roleIds,
  currentTenantDeptId,
  currentTenantScopePayload,
  setSheetOpen,
  resetForm,
  setPasswordReveal,
  load,
  editing,
  enabled,
  setEditing,
}: {
  tenantScope: boolean;
  clearFieldErrors: () => void;
  setSectionError: (value: string) => void;
  collectBindings: () => {
    tenant_id: number;
    dept_id: number | null;
    data_scope: number;
    custom_scopes: { scope_type: "dept"; scope_id: number }[];
  }[];
  validateDeptRequired: () => string | null;
  sheetMode: SheetMode;
  username: string;
  displayName: string;
  setFieldErrors: (errors: Record<string, string>) => void;
  setSaving: (value: boolean) => void;
  roleIds: number[];
  currentTenantDeptId: () => number | null;
  currentTenantScopePayload: () => {
    data_scope: number;
    custom_scopes: { scope_type: "dept"; scope_id: number }[];
  };
  setSheetOpen: (value: boolean) => void;
  resetForm: () => void;
  setPasswordReveal: (value: PasswordReveal | null) => void;
  load: () => Promise<void>;
  editing: UserRecord | null;
  enabled: boolean;
  setEditing: (value: UserRecord | null) => void;
}) {
  return async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    clearFieldErrors();
    setSectionError("");
    const errors: Record<string, string> = {};
    const bindings = collectBindings();
    if (!tenantScope && bindings.length === 0) {
      setSectionError("至少保留一个租户绑定");
      return;
    }

    const deptError = validateDeptRequired();
    if (deptError) {
      if (tenantScope) {
        errors.dept = deptError;
      } else {
        setSectionError(deptError);
        return;
      }
    }

    if (sheetMode === "create") {
      if (!username.trim()) errors.username = "用户名必填";
      if (!displayName.trim()) errors.displayName = "显示名必填";
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setSaving(true);
      try {
        const reveal = await submitCreateUser({
          tenantScope,
          username,
          displayName,
          roleIds,
          currentTenantDeptId,
          currentTenantScopePayload,
          bindings,
        });
        setSheetOpen(false);
        resetForm();
        clearFieldErrors();
        if (reveal) setPasswordReveal(reveal);
        await load();
      } catch (err) {
        showToastError(errorMessage(err, "创建失败"));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!editing) return;
    setSaving(true);
    try {
      await submitUpdateUser({
        tenantScope,
        editing,
        displayName,
        enabled,
        roleIds,
        currentTenantDeptId,
        currentTenantScopePayload,
        bindings,
      });
      setSheetOpen(false);
      setEditing(null);
      resetForm();
      clearFieldErrors();
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    } finally {
      setSaving(false);
    }
  };
}
