import { type ComponentType, type LazyExoticComponent, lazy } from "react";

/** 命名导出页面 → React.lazy，按路由按需加载。 */
function lazyNamedPage<T extends Record<string, ComponentType>>(
  importFn: () => Promise<T>,
  name: keyof T & string,
): LazyExoticComponent<ComponentType> {
  return lazy(() => importFn().then((mod) => ({ default: mod[name] })));
}

const UsersPage = lazyNamedPage(() => import("@/pages/UsersPage"), "UsersPage");
const RolesPage = lazyNamedPage(() => import("@/pages/RolesPage"), "RolesPage");
const AuditLogsPage = lazyNamedPage(() => import("@/pages/AuditLogsPage"), "AuditLogsPage");
const PermissionsPage = lazyNamedPage(() => import("@/pages/PermissionsPage"), "PermissionsPage");
const OrgsPage = lazyNamedPage(() => import("@/pages/OrgsPage"), "OrgsPage");
const TenantsPage = lazyNamedPage(() => import("@/pages/TenantsPage"), "TenantsPage");
const ScheduledJobsPage = lazyNamedPage(() => import("@/pages/ScheduledJobsPage"), "ScheduledJobsPage");
const TenantScheduledJobsPage = lazyNamedPage(
  () => import("@/pages/TenantScheduledJobsPage"),
  "TenantScheduledJobsPage",
);
const DeptsPage = lazyNamedPage(() => import("@/pages/DeptsPage"), "DeptsPage");
const ProfilePage = lazyNamedPage(() => import("@/pages/ProfilePage"), "ProfilePage");
const DevParamsPage = lazyNamedPage(() => import("@/pages/DevParamsPage"), "DevParamsPage");

/** 菜单 component_key → 页面组件（新增页面须在此注册）。 */
export const PAGE_REGISTRY: Record<string, LazyExoticComponent<ComponentType>> = {
  users: UsersPage,
  roles: RolesPage,
  audit: AuditLogsPage,
  scheduled_jobs: ScheduledJobsPage,
  tenant_scheduled_jobs: TenantScheduledJobsPage,
  permissions: PermissionsPage,
  orgs: OrgsPage,
  tenants: TenantsPage,
  depts: DeptsPage,
  profile: ProfilePage,
  dev_params: DevParamsPage,
};

export function pageComponent(key: string | null | undefined): LazyExoticComponent<ComponentType> | undefined {
  if (!key) return undefined;
  return PAGE_REGISTRY[key];
}

const PAGE_IMPORTERS: Partial<Record<string, () => Promise<unknown>>> = {
  users: () => import("@/pages/UsersPage"),
  roles: () => import("@/pages/RolesPage"),
  audit: () => import("@/pages/AuditLogsPage"),
  scheduled_jobs: () => import("@/pages/ScheduledJobsPage"),
  tenant_scheduled_jobs: () => import("@/pages/TenantScheduledJobsPage"),
  permissions: () => import("@/pages/PermissionsPage"),
  orgs: () => import("@/pages/OrgsPage"),
  tenants: () => import("@/pages/TenantsPage"),
  depts: () => import("@/pages/DeptsPage"),
  profile: () => import("@/pages/ProfilePage"),
  dev_params: () => import("@/pages/DevParamsPage"),
};

/** 侧栏悬停时预取页面 chunk，缩短首屏 LCP。 */
export function prefetchPage(key: string | null | undefined): void {
  if (!key) return;
  void PAGE_IMPORTERS[key]?.();
}
