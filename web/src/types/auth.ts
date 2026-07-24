export interface RoleSummary {
  id: number;
  code: string;
  name: string;
}

export interface BoundTenantInfo {
  id: number;
  name: string;
  code: string;
  province: string;
  city: string;
  district: string;
  org_name: string;
  org_credit_code: string;
  dept_id?: number | null;
  dept_name?: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  roles: string[];
  permissions: string[];
  tenant_id?: number | null;
  dept_id?: number | null;
  need_tenant_select?: boolean;
}

export interface LoginResponse {
  session_token: string;
  token_type: string;
  user: AuthUser;
  need_tenant_select?: boolean;
}

export interface UserTenantConfigItem {
  tenant_id: number;
  tenant_name: string;
  tenant_code: string;
  province: string;
  city: string;
  district: string;
  org_name: string;
  org_credit_code: string;
  tenant_enabled: boolean;
  bound: boolean;
  dept_id?: number | null;
  dept_name?: string | null;
  data_scope?: number;
  custom_scopes?: RoleDataScopeItem[];
}

export const MEMBERSHIP_ACTIVE = 1;
export const MEMBERSHIP_DEPARTED = 2;

export interface UserRecord {
  id: number;
  username: string;
  display_name: string;
  enabled: boolean;
  roles: RoleSummary[];
  dept_id?: number | null;
  data_scope?: number | null;
  custom_scopes?: RoleDataScopeItem[];
  membership_status?: number | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface RoleDataScopeItem {
  scope_type: "dept" | "user";
  scope_id: number;
}

export interface RoleRecord {
  id: number;
  code: string;
  name: string;
  description: string;
  role_type?: "system" | "tenant";
  data_scope?: number;
  permissions: string[];
  custom_scopes?: RoleDataScopeItem[];
  system_managed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionInfo {
  id?: number | null;
  code: string;
  name: string;
  kind: string;
  parent_id?: number | null;
  sort_order?: number;
  enabled?: boolean;
  route_path?: string | null;
  component_key?: string | null;
  api_codes: string[];
  children: PermissionInfo[];
}

export interface PermissionRecord {
  id: number;
  code: string;
  name: string;
  kind: string;
  parent_id: number | null;
  sort_order: number;
  enabled: boolean;
  route_path: string | null;
  component_key: string | null;
  api_method: string | null;
  api_path_pattern: string | null;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeptRecord {
  id: number;
  parent_id: number;
  name: string;
  sort_order: number;
  enabled: boolean;
  children?: DeptRecord[];
}

export interface OrganizationRecord {
  id: number;
  name: string;
  org_type: string;
  credit_code: string;
  phone: string;
  enabled: boolean;
}

export interface TenantRecord {
  id: number;
  code: string;
  name: string;
  province: string;
  city: string;
  district: string;
  region: string;
  phone: string;
  admin_user_id: number | null;
  admin_username: string | null;
  admin_display_name: string | null;
  enabled: boolean;
  /** 套餐到期时间（UTC ISO）；null 表示永不过期 */
  expires_at: string | null;
}

export interface TenantAdminUserOption {
  id: number;
  username: string;
  display_name: string;
  bound: boolean;
}

export interface ProvisionCredentials {
  username: string;
  password: string;
}

export interface RegisterResponse extends LoginResponse {
  admin_credentials: ProvisionCredentials;
}

export interface OrganizationCreateResult {
  organization: OrganizationRecord;
  tenant: TenantRecord;
  dept: DeptRecord;
  admin_credentials: ProvisionCredentials | null;
}

export interface TenantCreateResult {
  tenant: TenantRecord;
  dept: DeptRecord;
  admin_credentials: ProvisionCredentials | null;
}

export interface TenantSystemRolesRecord {
  tenant_id: number;
  role_codes: string[];
}

export interface UserCreateWithPassword {
  user: UserRecord;
  password: string | null;
  bound_existing?: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  real_name?: string | null;
  id_card_masked?: string | null;
  identity_verified: boolean;
  identity_verified_at?: string | null;
}
