/** 全站菜单路由注册表：与 permission_seed 菜单项一致；静态构建，不随 navTree 引用变化重建。 */
export const APP_MENU_ROUTES: Array<{ code: string; path: string; componentKey: string }> = [
  { code: "menu.users", path: "sys/users", componentKey: "users" },
  { code: "menu.roles", path: "sys/roles", componentKey: "roles" },
  { code: "menu.permissions", path: "sys/permissions", componentKey: "permissions" },
  { code: "menu.audit", path: "sys/audit", componentKey: "audit" },
  { code: "menu.scheduled_jobs", path: "sys/scheduled-jobs", componentKey: "scheduled_jobs" },
  { code: "menu.orgs", path: "sys/orgs", componentKey: "orgs" },
  { code: "menu.tenants", path: "sys/tenants", componentKey: "tenants" },
  { code: "menu.tenant_users", path: "users", componentKey: "users" },
  { code: "menu.tenant_roles", path: "roles", componentKey: "roles" },
  { code: "menu.depts", path: "depts", componentKey: "depts" },
  { code: "menu.profile", path: "profile", componentKey: "profile" },
  { code: "menu.dev_params", path: "dev-params", componentKey: "dev_params" },
];
