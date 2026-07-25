# RBAC 权限模型

多租户场景下，权限定义全局共享，角色与用户绑定按租户物理分表。详见 [multitenant.md](multitenant.md)。

## 模型

```
用户 (t_sys_user) ──N:M──> 租户 (t_sys_user_tenant)
         │
         ├──N:M──> 平台系统角色 (t_sys_roles) ──> t_sys_role_permissions
         │
租户内角色 (t_biz_roles_{tenant_id}) ──N:M──> 权限码 (t_sys_permissions)
                              │
                    t_sys_permission_api_bindings（目录/菜单/按钮 → 接口）
                    t_sys_permission_api_routes（接口 HTTP 路径映射）
```

- **权限定义**：MySQL `t_sys_permissions` 表，全平台共享；支持运行时编辑名称、排序、显示、父子关系。
- **种子同步**：[`auth/permission_seed.py`](../src/omni_api/auth/permission_seed.py) 由 `scripts/sync_rbac.py` 写入；仅 **INSERT** 新增 code；不覆盖管理员已改的菜单/按钮 `name`、`sort_order`；**目录**（`kind=catalog`）的名称与默认排序以种子为准并每次同步。新增非目录项 `sort_order` 追加到同级末尾。菜单 `api_codes` 变更后，脚本会按 `DEFAULT_ROLE_DEFS` **并集补齐**平台 `operator`/`viewer` 并下发到各租户同名角色；仅改种子后未跑同步时，旧角色仍缺新接口权限（表现为列表可进、详情 403）。
- **平台系统角色**：`t_sys_roles` / `t_sys_role_permissions` / `t_sys_user_roles`；与租户无关，用户登录后权限与租户内角色**并集**生效。
- **角色类型**（`t_sys_roles.role_type`）：`system`（平台用户绑定）或 `tenant`（可绑定到机构/租户作为预置模板）。新建/编辑机构、租户时仅可选 `tenant` 类型角色。
- **租户角色**：`t_biz_roles_{tenant_id}`；绑定在 `t_biz_role_permissions_{tenant_id}.permission_code`。
- **用户租户角色**：`t_biz_user_roles_{tenant_id}`。
- **数据权限**：角色 `data_scope`（1 仅本人 / 2 本部门 / 3 本部门及以下 / 4 自定义；**新建默认 3**）；自定义范围存 `t_biz_role_data_scope_{tenant_id}`。用户租户绑定可单独设置 `t_sys_user_tenant.data_scope`，自定义范围存 `t_biz_user_data_scope_{tenant_id}`，与角色范围并集生效。
- **成员状态**：`t_sys_user_tenant.membership_status`（1 在职 / 2 离职）；离职保留绑定行与业务数据，清除角色与数据权限；平台解除租户绑定与租户「离职」统一为软离职。

### Web 数据权限入口

| 页面 | 入口 | 说明 |
|---|---|---|
| 角色管理 | 列表「数据权限」按钮 | 配置角色默认数据范围；与「功能权限」分离 |
| 角色管理 | 新建角色表单 | 创建时一并设置菜单权限与默认数据范围 |
| 用户管理 | 新建/编辑表单 | 配置用户个人数据范围；与角色范围并集；**租户域编辑不可改显示名**（用户自助于个人中心） |
| 个人中心 | `/profile` | 用户自助修改昵称、头像、密码与实名认证 |
| 用户/角色列表 | 「数据权限」列 | 展示当前范围摘要（自定义显示部门数） |

功能权限（菜单/按钮/接口）与数据权限（可见部门/用户）在 UI 上分离，避免混在同一抽屉。

## 鉴权（Session，非 JWT）

- 登录 `POST /api/v1/auth/login` 返回 `session_token`（`uuid4().hex`，32 位），存 Redis `session:{token}`。
- 请求头：`Authorization: Bearer <session_token>`。
- 切换租户 `POST /api/v1/auth/switch-tenant` 原地更新 Redis 会话，**不重新签发** token。
- 热路径权限校验优先读会话中的 `permissions` 列表。

## 默认角色（每租户种子）

| code | 名称 | 说明 |
|---|---|---|
| `admin` | 管理员 | `tenant.*` 基线 + 绑定预置角色（operator/viewer）并集；平台 `system.*` 仅通过 `t_sys_user_roles` 授予 |
| `operator` | 操作员 | 租户用户/部门/开发参数等业务读写 |
| `viewer` | 只读 | 租户菜单只读 |

修改平台 `role_type=tenant` 角色的功能权限时，自动同步到已绑定该角色的各租户内同名角色权限。

## 双端校验

| 层 | 机制 |
|---|---|
| API | `require_permission("...")` + `PermissionMiddleware`（DB 路径映射） |
| 数据 | `DataScopeFilter` 合并角色与用户绑定范围；`DataScopeGuard` 注入列表 WHERE / 单条校验 |
| Web | `Can` / `RequirePermission` / 侧栏 `hasPermission` |

### 数据权限生效范围

- **业务与租户管理菜单**（`/users`、`/depts` 及 `/api/v1/tenant/users`、`/tenant/depts`）：遵守合并后的数据范围；`data_scope=1`（仅本人）时只能看到本人相关数据。
- **租户角色**（`/roles`、`GET /api/v1/tenant/roles`）：租户级配置，仅功能权限 `tenant.role.list` 控制，不做 `created_by` 数据范围裁剪（否则预置角色 `created_by IS NULL` 可见、他人创建的自定义角色不可见）。
- **个人中心** `/profile`：固定仅本人（`actor.id`），不走范围合并。
- **系统/平台菜单**（用户、角色、权限、审计、机构、租户）：仅功能权限控制，不做数据范围裁剪。

### 平台 vs 租户 API 分域

| 域 | 路由前缀 | 仓储 | 数据权限 |
|---|---|---|---|
| 平台 | `/api/v1/users`、`/roles`、`/orgs`、`/tenants`、`/audit` | `UserRepo.list_users`、`SysRoleRepo`、`OrgRepo`、`TenantRepo` | 不裁剪 |
| 租户 | `/api/v1/tenant/users`、`/tenant/depts` | `UserRepo.list_users_by_tenant`、`DeptRepo.list_flat` | 固定裁剪 |
| 租户 | `/api/v1/tenant/roles` | `RoleRepo.list_all_roles` | 不裁剪（功能权限） |

平台与租户**不复用同一列表方法**；禁止通过 `apply_data_scope` 开关在 API 层切换，避免改一侧规则影响另一侧。策略入口：[`services/data_scope_policy.py`](../src/omni_api/services/data_scope_policy.py)（`PLATFORM_API_PREFIXES` / `TENANT_SCOPED_API_PREFIXES`）。

登录后 `GET /api/v1/auth/me` 从 DB 重载当前租户 `roles`、`permissions` 并写回会话；`GET /api/v1/auth/nav` 按 DB 中用户权限过滤导航树。

多租户且未选上下文时（`need_tenant_select=true`），除 `switch-tenant` / `tenants` 外 API 返回 403。

## 平台 vs 租户权限边界

| 命名空间 | 用途 | 典型菜单 |
|---|---|---|
| `system.*` | 平台超管：机构/租户/跨租户用户 | `catalog.platform`、`catalog.system` |
| `tenant.*` | 租户管理员：本租户用户/角色/部门（含 `tenant.dept.list/create/update/delete`） | `catalog.tenant`（设置） |

Web 用户/角色/部门页按路由分流：`/users`、`/roles`、`/depts` 走租户 API（仅当前租户）；`/sys/users`、`/sys/roles` 等走平台 API。二者相互独立。

## 权限管理

- 页面：`/permissions`（需 `menu.permissions`）
- API：`/api/v1/permissions` CRUD，见 [interfaces.md](interfaces.md)
- 仓储：[`data/mysql/permission_repo.py`](../src/omni_api/data/mysql/permission_repo.py)

分配权限 UI 为 **目录 → 菜单 → 按钮 → 接口** 四级树；角色编辑页通过 **「功能权限」** 抽屉配置接口与菜单，**「数据权限」** 抽屉单独配置范围（含自定义部门勾选）。

功能权限分配树按**角色类型**裁剪根目录：

| 角色类型 | 可绑定目录 |
|---|---|
| 系统（`role_type=system`） | `catalog.system`（系统配置）、`catalog.platform`（平台管理） |
| 租户（`role_type=tenant`） | `catalog.tenant`（设置） |

侧栏目录默认排序（种子 `sort_order`，`sync_rbac` 会同步目录名与排序）：**设置 → 系统配置 → 平台管理**。业务域若新增根目录，应插在「设置」之前或之间，并显式声明种子 `sort_order`（勿依赖插入时追加到末尾）。

保存时 API 校验权限码所属根目录与角色类型一致，并继续拒绝跨域 `system.*` / `tenant.*` 前缀。

## 新增功能如何加权限

1. 在 `auth/permission_seed.py` 增加种子（目录/菜单/按钮/API 及 `API_ROUTE_SEEDS`）。
2. 新页面在 `web/src/lib/page-registry.ts` 注册 `component_key`。
3. API 路由加 `Depends(require_permission("..."))`；路径映射写入种子或管理页。
4. 前端按钮用 `Can` 包裹相同 code。
5. 重启服务自动 `sync_permissions()`；`seed_admin.py` 补齐 admin 权限。

## 能力边界

| 可在 UI/DB 配置 | 仍需代码部署 |
|---|---|
| 名称、排序 | 新 FastAPI 处理函数 |
| | 新 React 页面组件 |
| | 按钮/接口权限码与 API 绑定 |
| | 菜单 route_path、component_key |
| | 页面内按钮 JSX 位置 |

**管理页仅允许修改 `name` 与 `sort_order`。** 按钮、接口及其绑定由 `permission_seed.py` 经 `sync_rbac.py` 同步，不可在页面或 API 中新建/删除/改绑定。

## 初始化

```bash
# 启动服务（仅建 t_sys_* 系统表，不同步权限、不建租户分表）
uv run main.py

# 首个管理员：建机构并绑定平台 admin
OMNI_PROFILE=local uv run scripts/seed_admin.py

# 同步权限种子、平台/租户角色权限，并为全部租户开通/校验 t_biz_* 分表（升级代码后手动执行）
OMNI_PROFILE=local uv run scripts/sync_rbac.py
```

## MySQL 表

见 [AGENTS.md](../AGENTS.md)「MySQL 表结构」与 [multitenant.md](multitenant.md)。
