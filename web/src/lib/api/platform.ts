import { json } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type {
  AuditExportResult,
  OperationLogRecord,
  PaginatedOperationLogs,
  PaginatedRequestLogs,
  PaginatedSlowSqlLogs,
  RequestLogRecord,
  SlowSqlLogRecord,
} from "@/types/audit";
import type {
  AuthUser,
  BoundTenantInfo,
  DeptRecord,
  LoginResponse,
  OrganizationCreateResult,
  OrganizationRecord,
  PermissionInfo,
  PermissionRecord,
  RegisterResponse,
  RoleRecord,
  TenantAdminUserOption,
  TenantCreateResult,
  TenantRecord,
  TenantSystemRolesRecord,
  UserCreateWithPassword,
  UserRecord,
  UserTenantConfigItem,
} from "@/types/auth";

export const platformApi = {
  auth: {
    login: (username: string, password: string) =>
      json<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    register: (body: {
      name: string;
      org_type: string;
      credit_code: string;
      phone: string;
      province: string;
      city: string;
      district: string;
      region: string;
    }) =>
      json<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    logout: () => json<{ status: string }>("/api/v1/auth/logout", { method: "POST" }),
    me: () => json<AuthUser>("/api/v1/auth/me"),
    nav: () => json<PermissionInfo[]>("/api/v1/auth/nav"),
    tenants: () => json<BoundTenantInfo[]>("/api/v1/auth/tenants"),
    switchTenant: (tenant_id: number) =>
      json<AuthUser>("/api/v1/auth/switch-tenant", {
        method: "POST",
        body: JSON.stringify({ tenant_id }),
      }),
  },
  users: {
    list: () => json<UserRecord[]>("/api/v1/users"),
    get: (id: number) => json<UserRecord>(`/api/v1/users/${id}`),
    create: (body: {
      username: string;
      password: string;
      display_name?: string;
      role_ids?: number[];
      dept_id?: number | null;
      data_scope?: number;
      custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
    }) =>
      json<UserRecord>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: {
        display_name?: string;
        password?: string;
        enabled?: boolean;
        role_ids?: number[];
        dept_id?: number | null;
        data_scope?: number;
        custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
      },
    ) =>
      json<UserRecord>(`/api/v1/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    listTenants: (id: number) => json<UserTenantConfigItem[]>(`/api/v1/users/${id}/tenants`),
    tenantOptions: (defaultTenantId?: number) => {
      const q = defaultTenantId != null ? `?default_tenant_id=${defaultTenantId}` : "";
      return json<UserTenantConfigItem[]>(`/api/v1/users/tenant-options${q}`);
    },
    setTenants: (
      id: number,
      body: {
        bindings: {
          tenant_id: number;
          dept_id?: number | null;
          data_scope?: number;
          custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
        }[];
      },
    ) =>
      json<UserTenantConfigItem[]>(`/api/v1/users/${id}/tenants`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    resetPassword: (id: number) =>
      json<{ username: string; password: string }>(`/api/v1/users/${id}/reset-password`, {
        method: "POST",
      }),
    setEnabled: (id: number, enabled: boolean) =>
      json<UserRecord>(`/api/v1/users/${id}/enabled`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
  },
  roles: {
    listPermissions: (roleType: "system" | "tenant" = "system") =>
      json<PermissionInfo[]>(`/api/v1/roles/permissions?role_type=${roleType}`),
    listTenantBindable: () => json<RoleRecord[]>("/api/v1/roles/tenant-bindable"),
    list: () => json<RoleRecord[]>("/api/v1/roles"),
    create: (body: {
      code: string;
      name: string;
      description?: string;
      role_type?: "system" | "tenant";
      data_scope?: number;
    }) =>
      json<RoleRecord>("/api/v1/roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: {
        name?: string;
        description?: string;
        data_scope?: number;
        custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
      },
    ) =>
      json<RoleRecord>(`/api/v1/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    setPermissions: (id: number, permissions: string[]) =>
      json<RoleRecord>(`/api/v1/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }),
  },
  permissions: {
    list: () => json<PermissionRecord[]>("/api/v1/permissions"),
    tree: () => json<PermissionInfo[]>("/api/v1/permissions/tree"),
    create: (body: {
      code: string;
      name: string;
      kind: string;
      parent_id?: number | null;
      sort_order?: number;
      enabled?: boolean;
      route_path?: string | null;
      component_key?: string | null;
      description?: string;
    }) =>
      json<PermissionRecord>("/api/v1/permissions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: { name?: string; parent_id?: number | null; sort_order?: number }) =>
      json<PermissionRecord>(`/api/v1/permissions/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) => json<{ status: string }>(`/api/v1/permissions/${id}`, { method: "DELETE" }),
    getBindings: (id: number) => json<string[]>(`/api/v1/permissions/${id}/bindings`),
    setBindings: (id: number, api_codes: string[]) =>
      json<PermissionRecord>(`/api/v1/permissions/${id}/bindings`, {
        method: "PUT",
        body: JSON.stringify({ api_codes }),
      }),
  },
  audit: {
    listRequests: (params: Record<string, string | number | undefined>) =>
      json<PaginatedRequestLogs>(`/api/v1/audit/requests?${buildQuery(params)}`),
    getRequest: (id: number) => json<RequestLogRecord>(`/api/v1/audit/requests/${id}`),
    listOperations: (params: Record<string, string | number | undefined>) =>
      json<PaginatedOperationLogs>(`/api/v1/audit/operations?${buildQuery(params)}`),
    getOperation: (id: number) => json<OperationLogRecord>(`/api/v1/audit/operations/${id}`),
    listSlowSql: (params: Record<string, string | number | undefined>) =>
      json<PaginatedSlowSqlLogs>(`/api/v1/audit/slow-sql?${buildQuery(params)}`),
    getSlowSql: (id: number) => json<SlowSqlLogRecord>(`/api/v1/audit/slow-sql/${id}`),
    export: (body: {
      from: string;
      to: string;
      types?: "requests" | "operations" | "slow_sql" | "all";
      purge?: boolean;
    }) =>
      json<AuditExportResult>("/api/v1/audit/export", {
        method: "POST",
        body: JSON.stringify({
          occurred_from: body.from,
          occurred_to: body.to,
          types: body.types ?? "all",
          purge: body.purge ?? false,
        }),
      }),
  },
  orgs: {
    list: () => json<OrganizationRecord[]>("/api/v1/orgs"),
    create: (body: {
      name: string;
      org_type?: string;
      credit_code?: string;
      phone: string;
      province: string;
      city: string;
      district: string;
      region: string;
      admin_user_id?: number;
      system_role_codes?: string[];
      enabled?: boolean;
    }) =>
      json<OrganizationCreateResult>("/api/v1/orgs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: { name?: string; org_type?: string; credit_code?: string; phone?: string; enabled?: boolean },
    ) =>
      json<OrganizationRecord>(`/api/v1/orgs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },
  tenants: {
    list: () => json<TenantRecord[]>("/api/v1/tenants"),
    adminUserOptions: (tenantId?: number) => {
      const q = tenantId != null ? `?tenant_id=${tenantId}` : "";
      return json<TenantAdminUserOption[]>(`/api/v1/tenants/admin-user-options${q}`);
    },
    create: (body: {
      name: string;
      province: string;
      city: string;
      district: string;
      region: string;
      org_id: number;
      phone: string;
      admin_user_id?: number;
      system_role_codes?: string[];
      enabled?: boolean;
    }) =>
      json<TenantCreateResult>("/api/v1/tenants", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: {
        name?: string;
        province?: string;
        city?: string;
        district?: string;
        region?: string;
        phone?: string;
        admin_user_id?: number;
        enabled?: boolean;
      },
    ) =>
      json<TenantRecord>(`/api/v1/tenants/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    getSystemRoles: (id: number) => json<TenantSystemRolesRecord>(`/api/v1/tenants/${id}/system-roles`),
    setSystemRoles: (id: number, role_codes: string[]) =>
      json<TenantSystemRolesRecord>(`/api/v1/tenants/${id}/system-roles`, {
        method: "PUT",
        body: JSON.stringify({ role_codes }),
      }),
  },
  tenantUsers: {
    list: () => json<UserRecord[]>("/api/v1/tenant/users"),
    get: (id: number) => json<UserRecord>(`/api/v1/tenant/users/${id}`),
    create: (body: {
      username: string;
      password?: string;
      display_name?: string;
      role_ids?: number[];
      dept_id?: number | null;
      data_scope?: number;
      custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
    }) =>
      json<UserCreateWithPassword>("/api/v1/tenant/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: {
        enabled?: boolean;
        role_ids?: number[];
        dept_id?: number | null;
        data_scope?: number;
        custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
      },
    ) =>
      json<UserRecord>(`/api/v1/tenant/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    offboard: (id: number) =>
      json<UserRecord>(`/api/v1/tenant/users/${id}/offboard`, {
        method: "POST",
      }),
    setEnabled: (id: number, enabled: boolean) =>
      json<UserRecord>(`/api/v1/tenant/users/${id}/enabled`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
  },
  tenantRoles: {
    listPermissions: () => json<PermissionInfo[]>("/api/v1/tenant/roles/permissions/tree"),
    list: () => json<RoleRecord[]>("/api/v1/tenant/roles"),
    create: (body: { code: string; name: string; description?: string; data_scope?: number }) =>
      json<RoleRecord>("/api/v1/tenant/roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: {
        name?: string;
        description?: string;
        data_scope?: number;
        custom_scopes?: { scope_type: "dept" | "user"; scope_id: number }[];
      },
    ) =>
      json<RoleRecord>(`/api/v1/tenant/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    setPermissions: (id: number, permissions: string[]) =>
      json<RoleRecord>(`/api/v1/tenant/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }),
  },
  tenantDepts: {
    tree: () => json<DeptRecord[]>("/api/v1/tenant/depts/tree"),
    create: (body: { parent_id?: number; name: string; sort_order?: number; enabled?: boolean }) =>
      json<DeptRecord>("/api/v1/tenant/depts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: { parent_id?: number; name?: string; sort_order?: number; enabled?: boolean }) =>
      json<DeptRecord>(`/api/v1/tenant/depts/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) => json<void>(`/api/v1/tenant/depts/${id}`, { method: "DELETE" }),
  },
  depts: {
    tree: (tenantId?: number) =>
      json<DeptRecord[]>(tenantId != null ? `/api/v1/depts/tree-for-user?tenant_id=${tenantId}` : "/api/v1/depts/tree"),
    create: (body: { parent_id?: number; name: string; sort_order?: number; enabled?: boolean }) =>
      json<DeptRecord>("/api/v1/depts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: { parent_id?: number; name?: string; sort_order?: number; enabled?: boolean }) =>
      json<DeptRecord>(`/api/v1/depts/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) => json<void>(`/api/v1/depts/${id}`, { method: "DELETE" }),
  },
};
