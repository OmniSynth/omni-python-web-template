# 架构分层

依赖单向自上而下，禁止循环 import。详见 [AGENTS.md](../AGENTS.md)「布局与文档」。

## 分层

```
L1 入口     main.py、api/、web/
L2 应用     services/
L3 领域     auth/、audit/、storage/（按业务扩展）
L4 基础设施 data/mysql/、data/redis/
L5 基础     config/、schemas/
```

应用业务时间在 MySQL/API 层统一 UTC；用户时区展示与筛选转换仅在 Web 边界，见 [datetime.md](datetime.md)。

对象存储：`storage/`（L3）提供 `ObjectStore` 协议与 `ObjectStoreFactory`；provider 可切换（`volcano` 已实现，`aliyun` / `tencent` 占位）。配置来自系统表 `t_sys_dev_param*`（头像等）或租户 `t_biz_dev_param*`（租户文件），密钥不进 TOML。租户有效基础路径为「系统 `oss.basic_path` + 租户 ID」。

定时调度：`services/scheduled_job_manager`（`main.py` lifespan）+ `scheduled_job_runner` 写执行记录。任务含 `scope=system|tenant`；系统任务全局调度，租户任务按启用租户扇出；租户启停状态在 `t_sys_scheduled_job_tenant`；逐次历史在 `t_sys_scheduled_job_run`。平台页 `/sys/scheduled-jobs`，租户设置页 `/scheduled-jobs`（仅手动触发）；审计中心 Tab「任务执行」。注册表：`services/scheduled_job_registry.py`。细则见 [scheduled-jobs.md](scheduled-jobs.md)。

审计：`RequestAuditMiddleware` → `audit_request_logs`；业务 API / `AuditService` → `audit_operation_logs`；任务执行记录独立表与归档，见 [audit-logging.md](audit-logging.md)、[scheduled-jobs.md](scheduled-jobs.md)。

## 典型请求流

```
Web (React SPA)
  → FastAPI api/
    → services/（用例编排）
      → data/mysql|redis/（仓储）
```
