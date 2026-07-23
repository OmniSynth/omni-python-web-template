import { useMemo, useRef, useState } from "react";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { formatUserCredentialsCopy } from "@/lib/user-credentials-copy";
import type { DeptRecord, RoleRecord, UserRecord, UserTenantConfigItem } from "@/types/auth";
import type { PasswordReveal, SheetMode, TenantDraft } from "../types";

export function useUsersPageState() {
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create");
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [offboardTarget, setOffboardTarget] = useState<UserRecord | null>(null);
  const [offboarding, setOffboarding] = useState(false);
  const [tenantConfigs, setTenantConfigs] = useState<UserTenantConfigItem[]>([]);
  const [tenantDraft, setTenantDraft] = useState<Record<number, TenantDraft>>({});
  const [deptCache, setDeptCache] = useState<Record<number, DeptRecord[]>>({});
  const [saving, setSaving] = useState(false);
  const [passwordReveal, setPasswordReveal] = useState<PasswordReveal | null>(null);
  const [copyHint, setCopyHint] = useState("");
  const passwordInputRef = useRef<HTMLTextAreaElement>(null);

  const credentialsCopyText = useMemo(() => {
    if (!passwordReveal) return "";
    return formatUserCredentialsCopy(passwordReveal.username, passwordReveal.password);
  }, [passwordReveal]);

  return {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
    users,
    setUsers,
    roles,
    setRoles,
    pageLoadError,
    setPageLoadError,
    sectionError,
    setSectionError,
    sheetOpen,
    setSheetOpen,
    sheetMode,
    setSheetMode,
    editing,
    setEditing,
    username,
    setUsername,
    displayName,
    setDisplayName,
    roleIds,
    setRoleIds,
    enabled,
    setEnabled,
    resettingId,
    setResettingId,
    offboardTarget,
    setOffboardTarget,
    offboarding,
    setOffboarding,
    tenantConfigs,
    setTenantConfigs,
    tenantDraft,
    setTenantDraft,
    deptCache,
    setDeptCache,
    saving,
    setSaving,
    passwordReveal,
    setPasswordReveal,
    copyHint,
    setCopyHint,
    passwordInputRef,
    credentialsCopyText,
  };
}
