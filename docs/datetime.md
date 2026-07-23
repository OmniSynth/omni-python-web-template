# 应用时间（UTC）

MySQL 存 UTC、API 返回 UTC ISO-8601Z、Web 按用户时区展示的全链路约定。

## 数据流

```
MySQL DATETIME(6) naive UTC
    ↓ 读出 naive datetime（视为 UTC）
FastAPI format_api_utc() → 2026-06-29T12:30:55.000000Z
    ↓ parseApiDateTime()
Web UserMenu 时区 + 格式 → formatDateTime() 展示
    ↓ dateOnlyToApiUtc(墙上日期, timezone)
FastAPI parse_api_utc() → 查询/写入 UTC
```

## MySQL

- 列类型：`DATETIME(6)`，语义 naive UTC。
- 写入：`src/omni_api/data/mysql/utc.py` 的 `utc_now()` / `naive_utc()`。
- 连接：`SET time_zone = '+00:00'`（`data/mysql/connection.py`）。
- 表结构规范：[AGENTS.md](../AGENTS.md)「MySQL 表结构」§时间。

## 后端 API

| 函数 | 路径 | 用途 |
|---|---|---|
| `parse_api_utc()` | `schemas/utc_datetime.py` | Query/Body 时间字符串 → naive UTC |
| `format_api_utc()` | 同上 | datetime → `...ffffffZ` |
| `UtcDateTime` | 同上 | Pydantic 对外 DTO 字段类型 |

- **禁止**在 API/Service 层做用户时区转换。
- 审计查询入参示例：`from=2026-06-29T00:00:00.000000Z&to=2026-06-29T23:59:59.999999Z`。

## 前端 Web

| 入口 | 路径 | 职责 |
|---|---|---|
| `UserMenu` | `web/src/components/layout/UserMenu.tsx` | 时区 / 时间格式（唯一设置入口） |
| `TimezoneContext` | `web/src/contexts/TimezoneContext.tsx` | 全局 `formatDateTime` |
| `datetime.ts` | `web/src/lib/datetime.ts` | 解析、格式化、筛选 UTC 转换 |
| `DateRangeFilterField` | `web/src/components/form/date-range-filter-field.tsx` | 日期范围筛选（参考页：审计日志） |

### 筛选约定

- 日历选的 `yyyy-MM-dd` 表示**用户所选时区**的墙上日期。
- 发 API 前用 `dateOnlyToApiUtc(date, timezone, "start"|"end")`。
- 预设「今日 / 近 N 天」基于 UserMenu 时区，禁止浏览器本地「今天」。
- 禁止 `new Date().toISOString()` 代替用户时区日界。

### UI 参考

- 多 Tab + 筛选：[`AuditLogsPage.tsx`](../web/src/pages/AuditLogsPage.tsx)（`PageTabBar` + `PageFilterToolbar` + `DateRangeFilterField`）。
- 右侧录入抽屉：不变，见 [web-theme.md](web-theme.md) 与 [AGENTS.md](../AGENTS.md)「前端」§录入。

## 自检

1. UserMenu 切换时区后，列表与详情时间是否同步变化？
2. 北京时区与 UTC 下，同一「今日」筛选的 API `from/to` 是否不同？
3. API 响应时间字段是否均为 `...Z` 后缀且 6 位小数？
4. 新建 MySQL 表时间列是否为 `DATETIME(6)`？
5. 审计导出时间范围是否与筛选区 / 用户时区一致？

## 相关文档

- [数据存储](data-stores.md)
- [审计日志](audit-logging.md)
- [入口与 API](interfaces.md)
- [Web 主题](web-theme.md)
