import type { RefObject } from "react";
import { api } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { errorMessage, showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { UserRecord } from "@/types/auth";
import type { PasswordReveal } from "../types";
import { useUsersPageSubmitHandler } from "./use-users-page-submit-handler";

export function useUsersPageActions({
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
  currentId,
  setEditing,
  setResettingId,
  offboardTarget,
  setOffboardTarget,
  setOffboarding,
  passwordReveal,
  credentialsCopyText,
  passwordInputRef,
  setCopyHint,
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
  sheetMode: import("../types").SheetMode;
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
  currentId: number | undefined;
  setEditing: (value: UserRecord | null) => void;
  setResettingId: (value: number | null) => void;
  offboardTarget: UserRecord | null;
  setOffboardTarget: (value: UserRecord | null) => void;
  setOffboarding: (value: boolean) => void;
  passwordReveal: PasswordReveal | null;
  credentialsCopyText: string;
  passwordInputRef: RefObject<HTMLTextAreaElement | null>;
  setCopyHint: (value: string) => void;
}) {
  const handleSubmit = useUsersPageSubmitHandler({
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
  });

  async function handleResetPassword(u: UserRecord) {
    setResettingId(u.id);
    try {
      const res = await api.users.resetPassword(u.id);
      setPasswordReveal({ username: res.username, password: res.password, kind: "reset" });
    } catch (err) {
      showToastError(errorMessage(err, "重置密码失败"));
    } finally {
      setResettingId(null);
    }
  }

  async function toggleEnabled(u: UserRecord) {
    if (u.id === currentId) return;
    try {
      if (tenantScope) {
        await api.tenantUsers.setEnabled(u.id, !u.enabled);
      } else {
        await api.users.setEnabled(u.id, !u.enabled);
      }
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "更新失败"));
    }
  }

  async function handleOffboard() {
    if (!offboardTarget) return;
    setOffboarding(true);
    try {
      await api.tenantUsers.offboard(offboardTarget.id);
      setOffboardTarget(null);
      showToastSuccess("已标记为离职");
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "离职失败"));
    } finally {
      setOffboarding(false);
    }
  }

  async function copyPassword() {
    if (!passwordReveal) return;
    const ok = await copyToClipboard(credentialsCopyText, passwordInputRef.current);
    if (ok) {
      setCopyHint("已复制到剪贴板");
      return;
    }
    passwordInputRef.current?.focus();
    passwordInputRef.current?.select();
    setCopyHint("自动复制不可用，内容已选中，请按 Ctrl+C / ⌘+C");
  }

  function closePasswordReveal() {
    setPasswordReveal(null);
    setCopyHint("");
  }

  return {
    handleSubmit,
    handleResetPassword,
    toggleEnabled,
    handleOffboard,
    copyPassword,
    closePasswordReveal,
  };
}
