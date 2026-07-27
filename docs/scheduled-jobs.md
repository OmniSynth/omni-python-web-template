# 定时任务与执行审计

内置任务注册于 `services/scheduled_job_registry.py`；调度由 `ScheduledJobManager`（`main.py` lifespan）驱动。

## 表

| 表 | 职责 |
|---|---|
| `t_sys_scheduled_job` | 任务定义、cron、全局启停、系统任务 last-run 快照 |
| `t_sys_scheduled_job_tenant` | 租户启停与该租户 last-run 快照（覆盖写） |
| `t_sys_scheduled_job_run` | **逐次执行记录**（append-only，审计例外：无通用审计列） |

`last_run_*` 仅作「当前状态灯」；历史排查一律查 `t_sys_scheduled_job_run`。

## 执行记录字段要点

- `run_id`：对外关联键
- `trigger_type`：`cron` / `manual`；手动带 `actor_*`、`trigger_request_id`
- `params_json`：入参 JSON（可选）
- `context_json`：`cron_expr`、`manual`、`hostname`、`skip_reason` 等
- `result_json`：结构化结果 JSON（可选）
- `status`：`running` / `success` / `failure` / `partial` / `skipped`

写入：`services/scheduled_job_runner.py`（认领后 INSERT running，结束 UPDATE 终态）。慢 SQL 审计跳过本表，避免递归。

## 产品入口

- 平台 `/sys/scheduled-jobs`：行操作「记录」→ 右侧 Sheet 列表/详情
- 租户 `/scheduled-jobs`：同上，仅当前租户
- 审计中心 `/sys/audit` Tab「任务执行」：全量检索（`system.audit.read`）

## 冷归档

默认热数据 90 天（可用 `--retention-days` 覆盖）：

```bash
uv run scripts/export_scheduled_job_runs.py --before 2026-01-01T00:00:00.000000Z
uv run scripts/export_scheduled_job_runs.py --retention --purge
```

输出：`audit-archive/scheduled-job-runs/YYYY-MM-DD.jsonl`
