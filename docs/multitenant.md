# 多租户与多部门

## 模型

```
机构 (t_sys_organization) ──N:M──> 租户 (t_sys_tenant)
用户 (t_sys_user) ──N:M──> 租户绑定 (t_sys_user_tenant) ──> 部门 (t_biz_dept_{tenant_id})
角色 (t_biz_roles_{tenant_id}) ──> 数据权限 data_scope
业务表 (t_biz_*_{tenant_id}) ──> dept_id + created_by 隔离
```

## 表命名

| 层级 | 格式 | 示例 |
|---|---|---|
| 系统级 | `t_sys_{表名}` | `t_sys_user`、`t_sys_tenant` |
| 业务级 | `t_biz_{表名}_{tenant_id}` | `t_biz_dept_{tenant_id}` |

机构/租户/用户初始化请执行 `seed_admin.py`；`main.py` 仅建 `t_sys_*` 系统表。全部租户的 `t_biz_*_{tenant_id}` 分表由 `sync_rbac.py` 开通/校验；新建租户时 `TenantProvisioner` 也会即时创建该租户分表。

租户 `code` 由系统按 **机构类型行业前缀 - 地区编码 - 4 位自增序号** 自动生成（`-` 分隔），例如机构类型为企业、区县码 `110105` 时：`co-110105-0001`、`co-110105-0002` …

| 机构类型 | 行业前缀 |
|---|---|
| company | co |
| government | gv |
| school | sc |
| hospital | hp |
| association | as |
| 未绑定机构 | gn |

租户表 `t_sys_tenant` 含 `province` / `city` / `district`（省市区名称）与 `region`（区县行政区划码，6 位数字，由前端三级联动选择后自动填写）；`phone`（11 位大陆手机号，必填，**可重复**）；`code` 创建后不可修改；`expires_at`（`DATETIME(6)` UTC naive，套餐到期时间，**空表示永不过期**）。新建租户未显式指定到期时间时默认 **注册后 7 天**到期。

## 套餐到期

- 登录 / 切换租户：目标租户已到期则拒绝，提示「租户套餐已到期，请联系管理员续费」。
- 在线会话：定时任务 `tenant_expiry_check`（默认每 5 秒）扫描过期租户并删除对应 Redis 会话；前端约每 5 秒探测 `/auth/me`，收到 401 后弹阻断窗并退出登录。
- 会话解析路径同样校验当前租户是否到期；踢下线时会暂存原因文案供 401 返回。

机构表 `t_sys_organization` 含 `phone`（机构联系电话，**全局唯一**）、`credit_code`（统一社会信用代码，**全局唯一**、必填）。

用户表 `t_sys_user.username` 通常为手机号，**全局唯一**；同一用户可绑定多个租户，每个租户仅有一个管理员（`admin_user_id`）。

机构创建租户时**复用机构手机号**（租户手机号可与其他租户重复）。

## 一键开通链路

`POST /api/v1/orgs`（含省市区 + 机构/租户手机号 + 可选系统角色绑定）自动完成：

1. 写入机构（机构手机号唯一校验）
2. 创建关联租户并开通 `t_biz_*_{id}` 分表
3. 初始化默认角色（`admin` / `operator` / `viewer`）
4. 绑定预置系统角色（`t_sys_tenant_system_role`，默认 `operator` + `viewer`）
5. 按绑定并集 + `tenant.*` 基线同步 `admin` 权限
6. 创建根部门（名称同租户；**每租户唯一**，开通后不可再增顶级部门）
7. 开通租户管理员（优先级：手动 `admin_user_id` → 租户手机号匹配已有用户 → 新建用户）；仅新建用户时返回一次性凭据

独立 `POST /api/v1/tenants` 同样走上述租户开通流程（需指定 `org_id`）。

## 租户管理员绑定

- 字段：`t_sys_tenant.admin_user_id` 指向当前租户管理员用户（每租户唯一）
- 创建：未手动指定时，按**租户手机号**查找 `username` 相同的用户；找到则绑定，否则新建
- 编辑更换：`PUT /api/v1/tenants/{id}` 传入新的 `admin_user_id` 后，新用户获得 `admin` 角色；**原管理员仅移除 `admin` 角色**，保留其它角色与租户绑定
- 候选用户：`GET /api/v1/tenants/admin-user-options?tenant_id=`

## 租户系统角色绑定

- 表：`t_sys_tenant_system_role`（`tenant_id` + `role_code`，仅 `operator` / `viewer`）
- 平台管理：`GET/PUT /api/v1/tenants/{id}/system-roles`（需 `system.tenant.bind_role`）
- 变更绑定后同步规则：
  - **管理员**：`tenant.*` 基线 + 当前绑定角色权限并集（全量对齐）
  - **移除权限**：绑定并集缩减时，租户内**所有角色**（含 operator/viewer 及自定义角色）移除对应权限
  - **增加权限**：绑定并集扩大时，仅管理员自动赋权，其它角色保持不变
- 切换租户 / 刷新会话时，会按当前绑定重新对齐该租户管理员权限
- 租户 `admin` 权限 = `tenant.*` 基线 + 绑定角色并集；平台 `system.*` 仅赋给 `t_sys_user_roles` 中的平台超管
- 平台超管：执行 `seed_admin.py` 新建机构并绑定平台 admin；已存在平台 admin 时不再重复绑定；`sync_rbac.py` 同步权限种子、租户业务分表与角色权限，不操作用户
- **系统预置标识**：租户角色表 `t_biz_roles_{tenant_id}.system_managed`（0 自定义 / 1 系统预置）；开通租户时写入的 `admin` / 平台绑定模板角色为 `1`，租户 API 新建恒为 `0`（即使 code 为 `admin` 也不视为预置）
- **租户侧不可编辑**：租户管理员不可修改 `system_managed=1` 的角色（含名称、数据权限、功能权限分配）；列表接口返回 `system_managed=true` 标识。预置角色权限变更由平台 `system-roles` 绑定与同步链路生效；`system_managed=0` 的自定义角色可自由管理

## 租户域 API

用户仍存 `t_sys_user`；租户管理员通过独立前缀管理本租户用户体系（仅当前会话租户内已绑定用户）：

| 前缀 | 说明 |
|---|---|
| `/api/v1/tenant/users` | 租户用户 CRUD 与离职；**不含重置密码**（由平台管理员或脚本处理）；列表含在职与离职用户（`membership_status`）；**新建**时用户名已存在且未在职绑定时可重新绑定；**编辑自身**仅可修改显示名 |
| `/api/v1/tenant/roles` | 租户角色与权限分配 |
| `/api/v1/tenant/depts` | 租户部门树 |

**离职与会话**：`membership_status=2` 时清除该租户角色与数据权限；`SessionService.resolve` 每请求校验在职状态，离职租户会话上下文即时降级为需重选租户；离职操作亦主动修补 Redis 会话。

权限码命名：`tenant.user.*` / `tenant.role.*` / `tenant.dept.*` / `tenant.permission.list`（与平台 `system.*` 分离）。

## Session 鉴权（非 JWT）

- 登录 `POST /api/v1/auth/login` 返回 `session_token`（`uuid4().hex`，32 位）
- 会话存 Redis：`session:{token}`，TTL 见 `config/*.toml` 中 `[auth] session_ttl_hours`
- 请求头：`Authorization: Bearer <session_token>`
- 切换租户 `POST /api/v1/auth/switch-tenant` 原地更新 Redis 会话，token 不变
- 登出 `POST /api/v1/auth/logout` 删除 Redis 会话

## 登录流程

1. 用户输入账号密码（不选租户）
2. 单绑定租户：若该租户下已分配角色/权限则直接进入；否则 `need_tenant_select=true`，跳转 `/select-tenant` 并提示联系管理员
3. 多绑定租户：优先 `last_login_at` 最近租户（同样需有角色/权限）；无可用租户上下文则 `need_tenant_select=true`，前端跳转 `/select-tenant`
4. 在 `/select-tenant` 选择无权限的租户时，接口返回「未开通访问权限，请联系管理员」，停留在选择页

## 数据权限（角色 data_scope）

| 值 | 含义 |
|---|---|
| 1 | 仅本人（`created_by`） |
| 2 | 本部门（`dept_id`） |
| 3 | 本部门及以下 |
| 4 | 自定义（`t_biz_role_data_scope_{tenant_id}` 勾选部门/用户） |

用户租户绑定（`t_sys_user_tenant.data_scope`）可单独指定数据权限；新建时默认 **3 本部门及以下**。`data_scope=4` 时自定义范围存 `t_biz_user_data_scope_{tenant_id}`，与角色数据权限并集生效。

## 新租户开通

创建租户时 `TenantProvisioner` 自动建全部 `t_biz_*_{id}` 物理表；`TenantOnboardingService` 负责默认角色、系统角色绑定、根部门与管理员账号。详见上文「一键开通链路」。
