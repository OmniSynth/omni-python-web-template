#!/usr/bin/env python3
"""审计日志冷归档：导出 JSONL 并可清理 MySQL 热数据。"""

from __future__ import annotations

import argparse
import asyncio

from omni_api.schemas.audit_log import AuditExportRequest
from omni_api.schemas.utc_datetime import parse_api_utc
from omni_api.services.audit_service import AuditService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="导出审计日志到 JSONL 冷归档")
    parser.add_argument(
        "--before",
        required=True,
        help="导出此时间之前的数据（ISO-8601 UTC，如 2026-01-01T00:00:00.000000Z）",
    )
    parser.add_argument(
        "--from",
        dest="occurred_from",
        default="1970-01-01T00:00:00.000000Z",
        help="起始时间（UTC ISO-8601，默认 1970-01-01T00:00:00.000000Z）",
    )
    parser.add_argument(
        "--types",
        choices=["requests", "operations", "slow_sql", "all"],
        default="all",
        help="导出类型",
    )
    parser.add_argument(
        "--purge",
        action="store_true",
        help="导出后删除已归档热数据",
    )
    parser.add_argument(
        "--retention",
        action="store_true",
        help="按配置 retention_days 自动计算 cutoff 并导出",
    )
    return parser.parse_args()


async def _main() -> None:
    args = parse_args()
    svc = AuditService()
    await svc.ensure_schema()
    if args.retention:
        result = await svc.export_retention_cutoff(purge=args.purge)
    else:
        result = await svc.export_and_purge(
            AuditExportRequest(
                occurred_from=parse_api_utc(args.occurred_from),
                occurred_to=parse_api_utc(args.before),
                types=args.types,
                purge=args.purge,
            )
        )
    print(
        f"请求日志 {result.request_count} 条 -> {len(result.request_files)} 个文件; "
        f"操作日志 {result.operation_count} 条 -> {len(result.operation_files)} 个文件; "
        f"慢 SQL {result.slow_sql_count} 条 -> {len(result.slow_sql_files)} 个文件"
    )
    if args.purge:
        print(
            f"已清理热数据: 请求 {result.purged_request_count}, "
            f"操作 {result.purged_operation_count}, "
            f"慢 SQL {result.purged_slow_sql_count}"
        )


if __name__ == "__main__":
    asyncio.run(_main())
