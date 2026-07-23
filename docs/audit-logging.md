# 审计日志

三轨 append-only 审计：请求日志（安全）+ 操作日志（业务追踪）+ 慢 SQL 日志（语句级性能）。

## 模型

| 类型 | 表 | 用途 |
|---|---|---|
| 请求日志 | `t_sys_audit_request_logs` | 每次 `/api/` 调用的 method/path/status/用户/IP/耗时 |
| 操作日志 | `t_sys_audit_operation_logs` | 语义事件（登录、创建用户、分配权限等）及变更快照 |
| 慢 SQL | `t_sys_audit_slow_sql_logs` | 超阈值的 MySQL 语句：tier、severity、耗时、脱敏 SQL 文本 |

关联键：`request_id`（响应头 `X-Request-ID`）。

## 慢 SQL 分级

按当前 HTTP 路由划分四级 tier，阈值可在 `config/{profile}.toml` 覆盖：

| tier | warn | critical | 典型路由 |
|---|---|---|---|
| `oltp` | 50ms | 100ms | auth、users、roles、tenants、orgs |
| `polling` | 100ms | 100ms | 高频轮询类接口（按需在 `sql_tier.py` 注册） |
| `data` | 500ms | 2000ms | audit 查询等偏分析型读 |
| `artifact` | 1000ms | 3000ms | audit export 等重操作 |

超 `warn` 记 `severity=slow`；超 `critical` 记 `critical`。无 HTTP 上下文（脚本/bootstrap）默认 tier=`data`。

**耗时字段**（分级阈值仍只看 `duration_ms`）：

| 字段 | 含义 |
|---|---|
| `duration_ms` | 客户端总耗时（`before/after_cursor_execute` 计时，含网络与驱动开销；UI 列「总耗时」） |
| `server_exec_ms` | MySQL 执行耗时（UI 列「执行耗时」）：读 `performance_schema.events_statements_history`（及 `_long`），跳过 SET/SHOW 等会话语句；不可用时为 NULL |

两者之差可近似为网络/驱动开销，便于区分「SQL 本身慢」与「链路慢」。**DBeaver/JDBC 显示的 ms 同样是客户端往返时间，不是 `server_exec_ms`。**

连接建立时会尽力开启 `performance_schema` 语句 history（需数据库账号具备相应权限）。**修改后须重启服务并重建连接池**（重启应用即可）。

实现：`audit/sql_tier.py` 分类；`data/mysql/sql_audit_listener.py` 挂 SQLAlchemy `before/after_cursor_execute`，异步队列写入，跳过 `t_sys_audit_*` 防递归。超阈值后于同一连接读取 `server_exec_ms`（`data/mysql/sql_server_timing.py`）。超阈值 SELECT 语句由 `audit/sql_explain.py` 自动执行 EXPLAIN：监听器捕获 DBAPI 参数（`%s`），经 `exec_driver_sql` 绑定后分析，结果写入 `meta_json.explain`。

## 级别（请求/操作）

| 级别 | 含义 | 示例 |
|---|---|---|
| `system` | 认证、用户/角色、审计导出 | `/api/v1/auth/*`、`/api/v1/users/*` |
| `business` | 其余业务 API | `/api/v1/tenant/*`、`/api/v1/dev-params/*` |

## 脱敏

`audit/mask.py` 对 `password`、`token`、`secret` 等键替换为 `***`；请求日志**不落 body 明文**，仅记录体积。慢 SQL 仅落脱敏截断后的 SQL 文本（约 4KB），参数不落库。

## 冷归档

配置 `config/{profile}.toml`：

```toml
[audit]
retention_days = 90
archive_dir = "audit-archive"
export_batch_size = 5000
slow_sql_enabled = true
slow_sql_queue_size = 1000
slow_sql_explain_enabled = true

[audit.slow_sql_thresholds]
oltp_warn_ms = 50
oltp_critical_ms = 100
polling_warn_ms = 100
polling_critical_ms = 100
data_warn_ms = 500
data_critical_ms = 2000
artifact_warn_ms = 1000
artifact_critical_ms = 3000
```

```bash
# 导出指定日期前日志
uv run scripts/export_audit_logs.py --before 2026-01-01 --types all

# 仅慢 SQL
uv run scripts/export_audit_logs.py --before 2026-01-01 --types slow_sql

# 按 retention_days 自动 cutoff
uv run scripts/export_audit_logs.py --retention --purge
```

输出：`audit-archive/requests/`、`operations/`、`slow-sql/YYYY-MM-DD.jsonl`

## Web

路径 `/audit`（需 `menu.audit`）；Tab：请求 / 操作 / **慢 SQL**，支持筛选与详情抽屉。慢 SQL 表格偏好键 `audit.slow-sql`。

**全局 UI 参考**：多 Tab（`PageTabBar`）+ 筛选区（`PageFilterToolbar` + `DateRangeFilterField`）以本页为准，详见 [datetime.md](datetime.md)。

筛选区字段顺序（使用频率从高到低）：**时间（范围选日） → 关键词 → …**；`DateRangeFilterField`：shadcn Popover + Calendar，选日即生效；预设按 UserMenu 时区计算。

## API

响应时间字段统一 UTC ISO-8601（`...ffffffZ`），见 [datetime.md](datetime.md)。

| 方法 | 路径 | 权限 |
|---|---|---|
| GET | `/api/v1/audit/requests` | `system.audit.read` |
| GET | `/api/v1/audit/requests/{id}` | `system.audit.read` |
| GET | `/api/v1/audit/operations` | `system.audit.read` |
| GET | `/api/v1/audit/operations/{id}` | `system.audit.read` |
| GET | `/api/v1/audit/slow-sql` | `system.audit.read` |
| GET | `/api/v1/audit/slow-sql/{id}` | `system.audit.read` |
| POST | `/api/v1/audit/export` | `system.audit.export` |

## 合规自检

1. 敏感接口变更是否有操作日志 before/after？
2. 403 是否记录 `permission_denied` 操作与请求日志 `permission_code`？
3. 登录成功/失败是否留痕？
4. 归档脚本是否定期执行？热数据是否按 `retention_days` 清理？
5. OLTP 路由是否出现大量 `critical` 慢 SQL？需排查索引或 N+1。
