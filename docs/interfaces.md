# 应用入口

## 能力划分

| 入口 | 职责 | 启动 |
|---|---|---|
| API | 认证、用户、租户、RBAC、审计、定时任务 | `uv run main.py` |
| Web | 登录、平台/租户管理、个人中心 | `uv run main.py` |

Web 静态资源在 `src/omni_api/web/static/`；全局主题见 [web-theme.md](web-theme.md)，表单与错误反馈见 [web-forms.md](web-forms.md)，表格列偏好见 [web-tables.md](web-tables.md)。API 时间字段统一 UTC ISO-8601Z，见 [datetime.md](datetime.md)。

## 认证

- 除 `POST /api/v1/auth/login`、`POST /api/v1/auth/register` 与 `GET /api/v1/health` 外，所有 API 须携带 `Authorization: Bearer <session_token>`。
- **Session 鉴权**（非 JWT）：登录返回 `session_token`（Redis 存储）；详见 [multitenant.md](multitenant.md#session-鉴权)。
- **管理员账号不写死在代码或 TOML**：通过 `scripts/seed_admin.py` 新建机构开通租户，并将租户管理员绑定为平台 admin；也可经公开注册接口自助开通租户。
- 权限模型为 RBAC + 租户分表，详见 [rbac.md](rbac.md)。`GET /me` 返回 `roles`、`permissions`、`tenant_expired` 与租户上下文；各 API 按权限码校验（无权限 403）。
- **套餐过期软锁定**：当前会话租户已过期时，非白名单写操作与 `page>1` 返回 403（文案「套餐已过期，请联系管理员续费」）；列表 JSON 最多 500 条。详见 [multitenant.md](multitenant.md#套餐到期软锁定)。

### 初始化

```bash
uv run main.py
OMNI_PROFILE=local uv run scripts/seed_admin.py
OMNI_PROFILE=local uv run scripts/sync_rbac.py
```

`main.py` 仅建 `t_sys_*` 系统表。租户 `t_biz_*_{tenant_id}` 分表与权限种子由 `sync_rbac.py` 为全部租户开通/同步；新建租户时 `TenantRepo.create` 也会即时开通该租户分表。首个管理员与机构由 `seed_admin.py` 初始化。详见 [rbac.md](rbac.md#初始化)。

## Web 页面（React SPA）

| 路径 | 说明 |
|---|---|
| `/` | 公开产品宣传首页（无需登录） |
| `/login` | 登录 |
| `/register` | 注册开通：填写机构信息并开通租户（无需登录） |
| `/select-tenant` | 多租户选择（登录后自动跳转） |
| 业务菜单路径 | 登录后进入导航树首个可访问菜单（按 DB `sort_order`，非硬编码） |
| `/users` | 租户用户管理（需 `menu.tenant_users`） |
| `/roles` | 租户角色与数据范围（需 `menu.tenant_roles`） |
| `/depts` | 租户部门管理（需 `menu.depts`） |
| `/profile` | 个人中心：昵称、头像、密码、实名认证（需 `menu.profile`） |
| `/download-center` | 下载中心（需 `menu.download_center`；仅本人导出记录） |
| `/sys/users` | 平台用户管理（需 `menu.users`） |
| `/sys/roles` | 平台角色、权限与数据范围（需 `menu.roles`） |
| `/sys/permissions` | 权限管理（需 `menu.permissions`） |
| `/sys/orgs` | 机构管理（需 `menu.orgs`） |
| `/sys/tenants` | 租户管理（需 `menu.tenants`） |
| `/sys/audit` | 审计日志（需 `menu.audit`） |
| `/sys/scheduled-jobs` | 系统定时任务管理（需 `menu.scheduled_jobs`） |
| `/sys/dev-params` | 系统开发参数（需 `menu.sys_dev_params`，仅系统角色） |
| `/scheduled-jobs` | 租户定时任务（手动触发，需 `menu.tenant_scheduled_jobs`） |
| `/dev-params` | 开发参数（需 `menu.dev_params`） |

源码：`web/`。构建：`cd web && npm run build`。主题与响应式布局见 [web-theme.md](web-theme.md#响应式布局)。审计说明见 [audit-logging.md](audit-logging.md)。

## API 路由

### 认证 `/api/v1/auth`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/login` | 账号密码登录，返回 `session_token`；租户套餐已过期仍可登录，`user.tenant_expired=true`（软锁定只读） |
| POST | `/register` | 公开注册：必填机构名称/类型/信用代码/手机号/省市区与区划码；系统生成管理员密码，开通机构与租户后返回 `session_token` 与一次性 `admin_credentials`（手机号为账号） |
| POST | `/logout` | 删除 Redis 会话（需 Bearer） |
| GET | `/me` | 当前用户、租户角色与权限（含 `tenant_expired`；从 DB 重载并写回会话；需登录） |
| GET | `/nav` | 侧栏导航树，按当前租户用户权限过滤（需登录） |
| GET | `/tenants` | 用户绑定的租户列表（含编码、地区、机构信息；需登录） |
| POST | `/switch-tenant` | 切换当前租户上下文（需登录） |

### 机构 `/api/v1/orgs`（需 `menu.orgs`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 机构列表 |
| POST | `/` | 新建机构（可选 `admin_user_id` 绑定已有用户为租户管理员；否则自动创建并返回一次性凭据） |
| PUT | `/{id}` | 更新机构 |

### 租户 `/api/v1/tenants`（需 `menu.tenants`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 租户列表（含 `expires_at`） |
| GET | `/admin-user-options` | 管理员候选用户（可选 `tenant_id` 查询参数） |
| POST | `/` | 新建租户（可选 `admin_user_id`；未传 `expires_at` 时默认 7 天后到期；否则自动创建管理员并返回一次性凭据） |
| PUT | `/{id}` | 更新租户（可选 `admin_user_id`、`expires_at`；传 `expires_at: null` 表示永不过期） |
| GET | `/{id}/system-roles` | 查询绑定的预置系统角色 |
| PUT | `/{id}/system-roles` | 更新绑定并同步 admin 权限 |

### 租户域用户 `/api/v1/tenant/users`（需 `tenant.user.*`，当前会话租户）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 本租户已绑定用户列表 |
| POST | `/` | 创建用户或绑定已有用户到当前租户（用户名已存在且未绑定时自动绑定；已绑定则 400；新建时响应含一次性密码） |
| GET | `/{id}` | 用户详情 |
| PUT | `/{id}` | 更新用户角色、部门与数据权限（不可改显示名；不可编辑自身） |
| POST | `/{id}/offboard` | 标记离职（清除角色与数据权限，保留绑定行与历史数据） |
| PATCH | `/{id}/enabled` | 启用/禁用 |

### 租户域角色 `/api/v1/tenant/roles`（需 `tenant.role.*`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/permissions/tree` | 权限树（分配用，需 `tenant.role.list`） |
| GET | `/` | 角色列表 |
| POST | `/` | 新建角色 |
| GET | `/{id}` | 角色详情 |
| PUT | `/{id}` | 更新角色 |
| PUT | `/{id}/permissions` | 分配权限 |

### 租户域部门 `/api/v1/tenant/depts`（需 `tenant.dept.*`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/tree` | 部门树 |
| POST | `/` | 新建部门 |
| PUT | `/{id}` | 更新部门 |
| DELETE | `/{id}` | 删除部门（存在子部门、用户绑定或角色数据权限引用时拒绝） |

### 部门 `/api/v1/depts`（需 `system.dept.*`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/tree` | 当前租户部门树 |
| GET | `/tree-for-user` | 指定租户部门树（`system.user.update`，用于用户租户配置） |
| POST | `/` | 新建部门 |
| PUT | `/{id}` | 更新部门 |
| DELETE | `/{id}` | 删除部门（存在子部门、用户绑定或角色数据权限引用时拒绝） |

### 权限 `/api/v1/permissions`（需对应权限码）

| 方法 | 路径 | 权限码 |
|---|---|---|
| GET | `/` | `system.permission.list` |
| GET | `/tree` | `system.permission.list` |
| POST | `/` | `system.permission.create` |
| GET | `/{id}` | `system.permission.list` |
| PUT | `/{id}` | `system.permission.update` |
| DELETE | `/{id}` | `system.permission.delete` |
| GET | `/{id}/bindings` | `system.permission.list` |
| PUT | `/{id}/bindings` | `system.permission.update` |

### 角色 `/api/v1/roles`（需对应权限码）

| 方法 | 路径 | 权限码 |
|---|---|---|
| GET | `/permissions?role_type=system\|tenant` | `system.role.list` |
| GET | `/tenant-bindable` | `system.role.list`（机构/租户表单可选的租户类型角色） |
| GET | `/` | `system.role.list` |
| POST | `/` | `system.role.create`（body 含 `role_type`: `system` \| `tenant`） |
| GET | `/{id}` | `system.role.list` |
| PUT | `/{id}` | `system.role.update` |
| PUT | `/{id}/permissions` | `system.role.assign_permission` |

### 用户 `/api/v1/users`（需对应权限码）

| 方法 | 路径 | 权限码 |
|---|---|---|
| GET | `/` | `system.user.list` |
| POST | `/` | `system.user.create` |
| GET | `/{id}` | `system.user.list` |
| PUT | `/{id}` | `system.user.update` |
| GET | `/tenant-options` | `system.user.create`（新建用户时租户选项） |
| GET | `/{id}/tenants` | `system.user.list` |
| PUT | `/{id}/tenants` | `system.user.update` |
| POST | `/{id}/reset-password` | `system.user.reset_password` |
| PATCH | `/{id}/enabled` | `system.user.enable` |

### 个人中心 `/api/v1/users/me`（需登录；不经 RBAC 路径映射，租户内所有角色默认可用）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/profile` | 当前用户资料（含实名认证状态） |
| PATCH | `/profile` | 更新昵称、头像链接 |
| POST | `/avatar` | 上传头像到系统对象存储（≤2MB，JPEG/PNG/WebP/GIF），写回 `avatar_url` |
| POST | `/change-password` | 修改密码（校验原密码；其他会话失效） |
| POST | `/identity` | 实名认证（姓名 + 身份证号；哈希存储，脱敏展示；提交后不可改） |

### 表格偏好 `/api/v1/users/me/table-preferences`（需登录，仅当前用户）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/{page_key}/{table_key}` | 返回 `{ page_key, table_key, config, updated_at }`；无记录时 `config`/`updated_at` 为 `null`（200） |
| PUT | `/{page_key}/{table_key}` | upsert，body 为 `TablePreferenceConfig` |
| DELETE | `/{page_key}/{table_key}` | 删除记录，还原为默认 |

### 列表排序 Query（可选）

以下 list 端点支持 `sort_by`、`sort_order`（`asc` | `desc`）；字段须在 repo 白名单内，否则回退默认排序：

| 端点 | 白名单字段示例 |
|---|---|
| `GET /users/`、`GET /tenant/users/` | `id`, `username`, `display_name`, `created_at`, `enabled` |
| `GET /roles/`、`GET /tenant/roles/` | `id`, `code`, `name`, `role_type`（平台）, `created_at` |
| `GET /orgs/` | `id`, `name`, `created_at`, `enabled` |
| `GET /tenants/` | `id`, `code`, `name`, `phone`, `created_at`, `enabled` |
| `GET /audit/requests` | `id`, `occurred_at`, `level`, `method`, `path`, `status_code`, `username`, `duration_ms` |
| `GET /audit/operations` | `id`, `occurred_at`, `level`, `category`, `action`, `actor_username`, `result` |
| `GET /audit/slow-sql` | `id`, `occurred_at`, `tier`, `severity`, `duration_ms`, `server_exec_ms`, `threshold_ms`, `http_path`, `sql_text` |
| `GET /audit/scheduled-job-runs` | `id`, `started_at`, `job_code`, `status`, `trigger_type`, `tenant_id`, `summary`, `duration_ms` |

### 审计 `/api/v1/audit`（需对应权限码）

| 方法 | 路径 | 权限码 |
|---|---|---|
| GET | `/requests` | `system.audit.read` |
| GET | `/requests/{id}` | `system.audit.read` |
| GET | `/operations` | `system.audit.read` |
| GET | `/operations/{id}` | `system.audit.read` |
| GET | `/slow-sql` | `system.audit.read` |
| GET | `/slow-sql/{id}` | `system.audit.read` |
| GET | `/scheduled-job-runs` | `system.audit.read` |
| GET | `/scheduled-job-runs/{run_id}` | `system.audit.read` |
| POST | `/export` | `system.audit.export` |

任务执行列表筛选项：`from`/`to`/`status`/`trigger_type`/`keyword`/`request_id`/`job_code`/`tenant_id`。

### 定时任务 `/api/v1/scheduled-jobs`（需 `menu.scheduled_jobs`）

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | `/` | `system.scheduled_job.list` | 任务列表（含 `scope`、调度状态、上次/下次执行） |
| GET | `/tenant-options` | `system.scheduled_job.list` | 租户选择（执行/按租户停止；`q` 分页搜索） |
| GET | `/runs/{run_id}` | `system.scheduled_job.list` | 单次执行记录详情（`run_id` UUID） |
| GET | `/{code}/runs` | `system.scheduled_job.list` | 执行历史分页（筛 `tenant_id`/`status`/`trigger_type`/`started_from`/`started_to`） |
| GET | `/{code}` | `system.scheduled_job.read` | 任务详情 |
| PUT | `/{code}` | `system.scheduled_job.update` | 更新 cron（5/6 段）或启用状态 |
| POST | `/{code}/trigger` | `system.scheduled_job.trigger` | 立即触发（`scope=tenant` 时 body 必填 `tenant_id`；202，文案「同步任务已开始执行」；并发中再触发仍返回相同成功文案） |
| POST | `/{code}/start` | `system.scheduled_job.control` | 启动全局调度；同时将该任务下各租户调度重新启用（`enable_all_tenant_schedules`） |
| POST | `/{code}/stop` | `system.scheduled_job.control` | 停止；body 可选 `{ tenant_id }`：有则停止该租户调度，无则停止任务全局调度 |

### 租户定时任务 `/api/v1/tenant/scheduled-jobs`（需 `menu.tenant_scheduled_jobs`）

租户设置页仅暴露 `scope=tenant` 任务的列表与手动执行，供临时刷新；无编辑 cron / 全局启停。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | `/` | `tenant.scheduled_job.list` | 本租户可见的 `scope=tenant` 任务（名称、说明、cron、任务状态=`全局启用∧本租户调度启用`、上次/下次执行、执行结果；前端执行计划仅展示可读文案） |
| GET | `/runs/{run_id}` | `tenant.scheduled_job.list` | 本租户单次执行记录详情 |
| GET | `/{code}/runs` | `tenant.scheduled_job.list` | 本租户该任务执行历史分页 |
| POST | `/{code}/trigger` | `tenant.scheduled_job.trigger` | 对本租户手动触发（临时刷新；全局或本租户调度已停止时 400；202，文案同上；并发去重） |

内置任务由 `services/scheduled_job_registry.py` 注册；`scope`：`system` / `tenant`。配置在 `t_sys_scheduled_job`，租户调度启停在 `t_sys_scheduled_job_tenant`，逐次执行记录在 `t_sys_scheduled_job_run`（见 [scheduled-jobs.md](scheduled-jobs.md)）。

- cron：5 段或 6 段（秒级）。
- 内置 `tenant_expiry_check`：`scope=system`，默认 `*/5 * * * * *`。
- 内置 `export_job_cleanup`：`scope=tenant`，默认 `25 * * * *`（导出过期清理）。
- 租户任务到点后按启用且未过期租户扇出；单租户可用 stop+`tenant_id` 停止其调度；全局或本租户调度已停止时**拒绝**手动触发。
- **过期租户**不可执行租户任务。

### 通用

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/health` | 健康检查（无需登录） |

### 导出任务 / 下载中心 `/api/v1/export-jobs`

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `` | `export.job.list` | 仅本人导出任务分页 |
| GET | `/badge` | `export.job.list` | 顶栏角标 |
| POST | `/mark-read` | `export.job.list` | 完成未读标为已读 |
| GET | `/{id}` | `export.job.list` | 本人任务详情 |
| POST | `/{id}/mark-read` | `export.job.list` | 单条已读 |

详见 [export-jobs.md](export-jobs.md)。业务域通过 `register_export_builder` + `ExportJobService.enqueue` 入队。

### 实时通道 WebSocket `/api/v1/ws`

单连接多订阅。握手：`WS /api/v1/ws?token=<session_token>`。

| `op`（C→S） | 说明 |
|---|---|
| `subscribe` / `unsubscribe` | `channels: string[]` |
| `ping` | 心跳 |

| `op`（S→C） | 说明 |
|---|---|
| `subscribed` / `unsubscribed` / `pong` | 确认 |
| `event` | `channel` + `type` + `payload` |
| `error` | `message` |

| 频道 | 权限 | 用途 |
|---|---|---|
| `export_job.badge` | `export.job.list` | 顶栏角标 |
| `export_job.mine` | `export.job.list` | 本人导出任务变更 |
| `auth.session` | 登录即可 | 会话快照（权限/过期等） |

### 开发参数 `/api/v1/dev-params`（需 `dev_param.list` / `dev_param.update`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/groups` | 开发参数分组列表（主表；含「租户对象存储」） |
| GET | `/groups/{group_id}` | 分组详情与子参数列表（密码字段脱敏，`configured` 表示已配置） |
| PUT | `/groups/{group_id}` | 更新分组名称与描述 |
| PUT | `/{param_key}` | 更新子参数值与备注（密码字段空值表示保持原值；`oss.basic_path` 只读拒绝写入；`oss.domain` 须 http(s)+主机且尾 `/`） |

### 系统开发参数 `/api/v1/sys/dev-params`（需 `system.dev_param.list` / `system.dev_param.update`）

仅系统角色可见（菜单挂在 `catalog.system`）。表结构与字段语义与租户开发参数同构，分组为「系统对象存储」。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/groups` | 系统开发参数分组列表 |
| GET | `/groups/{group_id}` | 分组详情与子参数（`oss.basic_path` 展示带前导 `/`） |
| PUT | `/groups/{group_id}` | 更新分组名称与描述 |
| PUT | `/{param_key}` | 更新子参数（密码脱敏规则同上；`oss.domain` 校验同租户侧） |

升级后执行 `uv run scripts/sync_rbac.py` 同步权限与系统表；在「系统开发参数」填入火山云 AK/SK（或启动前设置环境变量 `OMNI_SYS_OSS_ACCESS_KEY` / `OMNI_SYS_OSS_SECRET_KEY` 首次种子）。租户侧在「开发参数 → 租户对象存储」配置（可选 `OMNI_TENANT_OSS_*`）。**禁止**把密钥写入 `config/*.toml` 或提交 Git。

## main.py

根目录 `main.py` 统一启动 API 与 Web（FastAPI + uvicorn）。`--api-only` / `--web-only` 可选。
