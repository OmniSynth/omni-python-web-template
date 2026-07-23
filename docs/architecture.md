# 架构分层

依赖单向自上而下，禁止循环 import。详见 [AGENTS.md](../AGENTS.md)「布局与文档」。

## 分层

```
L1 入口     main.py、api/、web/
L2 应用     services/
L3 领域     auth/、audit/（按业务扩展）
L4 基础设施 data/mysql/、data/redis/
L5 基础     config/、schemas/
```

应用业务时间在 MySQL/API 层统一 UTC；用户时区展示与筛选转换仅在 Web 边界，见 [datetime.md](datetime.md)。

定时调度：`services/scheduled_job_manager`（`main.py` lifespan，按 `t_sys_scheduled_job` 的 cron）；管理页 `/sys/scheduled-jobs`。内置任务在 `services/scheduled_job_registry.py` 注册。

审计：`RequestAuditMiddleware` → `audit_request_logs`；业务 API / `AuditService` → `audit_operation_logs`；冷归档见 [audit-logging.md](audit-logging.md)。

## 典型请求流

```
Web (React SPA)
  → FastAPI api/
    → services/（用例编排）
      → data/mysql|redis/（仓储）
```
