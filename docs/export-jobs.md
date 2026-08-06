# 导出任务与下载中心

异步导出产物落租户对象存储，用户在「下载中心」查看本人记录、进度并下载文件。

## 职责

- 业务域注册导出构建器并调用 `ExportJobService.enqueue` → 入队 `t_biz_export_job_{tenant}` → worker 生成文件 → 上传租户 OSS
- 下载中心仅展示**当前用户**发起的任务；完成后列表返回 `public_url`，浏览器直链 OSS 下载
- 顶栏「下载中心」入口展示未读角标

## 业务域如何接入

```python
from omni_api.services.export_job_builder import ExportFile, register_export_builder

async def build_report(**kwargs) -> ExportFile:
    ...
    return ExportFile(filename="报表.xlsx", content=xlsx_bytes, row_count=n)

register_export_builder("my_report", build_report)

# 业务 API 内：
await ExportJobService(engine, tenant_id).enqueue(
    user,
    source_type="my_report",
    source_label="某业务报表",
    filename="报表.xlsx",
    filter_payload={...},
)
```

## 状态

`queued` → `running` → `done` / `failed`；默认 **24 小时**后 `expires_at` 过期不可下。

## 排队与并发

- 全局同时最多执行 2 个导出（队列容量 100）。
- 单用户排队中 + 执行中合计最多 10 个。

## 过期清理

定时任务 `export_job_cleanup`（`scope=tenant`，默认每小时 `:25`）。

## 角标与实时推送

进度与角标由 WebSocket 频道 `export_job.badge` / `export_job.mine` 推送。详见 [interfaces.md](interfaces.md)「实时通道」。

接口见 [interfaces.md](interfaces.md)「导出任务 / 下载中心」。
