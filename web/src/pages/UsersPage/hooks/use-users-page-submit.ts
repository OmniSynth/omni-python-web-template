import { api } from "@/lib/api";
import { showToastSuccess } from "@/lib/form-feedback";
import { generateRandomPassword } from "@/lib/password";
import type { UserRecord } from "@/types/auth";
import type { PasswordReveal } from "../types";

export async function submitCreateUser({
  tenantScope,
  username,
  displayName,
  roleIds,
  currentTenantDeptId,
  currentTenantScopePayload,
  bindings,
}: {
  tenantScope: boolean;
  username: string;
  displayName: string;
  roleIds: number[];
  currentTenantDeptId: () => number | null;
  currentTenantScopePayload: () => {
    data_scope: number;
    custom_scopes: { scope_type: "dept"; scope_id: number }[];
  };
  bindings: {
    tenant_id: number;
    dept_id: number | null;
    data_scope: number;
    custom_scopes: { scope_type: "dept"; scope_id: number }[];
  }[];
}): Promise<PasswordReveal | null> {
  if (tenantScope) {
    const created = await api.tenantUsers.create({
      username: username.trim(),
      display_name: displayName.trim(),
      role_ids: roleIds,
      dept_id: currentTenantDeptId(),
      ...currentTenantScopePayload(),
    });
    if (created.bound_existing || !created.password) {
      showToastSuccess(`用户 ${created.user.username} 已绑定到当前租户`);
      return null;
    }
    return { username: created.user.username, password: created.password, kind: "create" };
  }

  const password = generateRandomPassword();
  const created = await api.users.create({
    username: username.trim(),
    password,
    display_name: displayName.trim(),
    role_ids: roleIds,
    dept_id: currentTenantDeptId(),
  });
  await api.users.setTenants(created.id, { bindings });
  return { username: created.username, password, kind: "create" };
}

export async function submitUpdateUser({
  tenantScope,
  editing,
  displayName,
  enabled,
  roleIds,
  currentTenantDeptId,
  currentTenantScopePayload,
  bindings,
}: {
  tenantScope: boolean;
  editing: UserRecord;
  displayName: string;
  enabled: boolean;
  roleIds: number[];
  currentTenantDeptId: () => number | null;
  currentTenantScopePayload: () => {
    data_scope: number;
    custom_scopes: { scope_type: "dept"; scope_id: number }[];
  };
  bindings: {
    tenant_id: number;
    dept_id: number | null;
    data_scope: number;
    custom_scopes: { scope_type: "dept"; scope_id: number }[];
  }[];
}) {
  if (tenantScope) {
    await api.tenantUsers.update(editing.id, {
      enabled,
      role_ids: roleIds,
      dept_id: currentTenantDeptId(),
      ...currentTenantScopePayload(),
    });
    return;
  }
  await api.users.update(editing.id, {
    display_name: displayName.trim() || editing.username,
    enabled,
    role_ids: roleIds,
    dept_id: currentTenantDeptId(),
    ...currentTenantScopePayload(),
  });
  await api.users.setTenants(editing.id, { bindings });
}
