#!/usr/bin/env python3
"""定时任务执行记录冷归档：导出 JSONL 并可清理热数据。"""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path

from omni_api.config.settings import get_settings
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.scheduled_job_run_repo import ScheduledJobRunRepo
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.scheduled_job import ScheduledJobRunRecord
from omni_api.schemas.utc_datetime import format_api_utc, parse_api_utc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="导出定时任务执行记录到 JSONL")
    parser.add_argument("--before", default=None, help="导出此时间之前的数据（ISO-8601 UTC）")
    parser.add_argument(
        "--retention",
        action="store_true",
        help="按 retention_days（默认取 audit.retention_days）计算 cutoff",
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=None,
        help="覆盖保留天数（默认配置 audit.retention_days 或 90）",
    )
    parser.add_argument("--purge", action="store_true", help="导出后删除已归档热数据")
    parser.add_argument("--batch-size", type=int, default=5000, help="每批导出条数")
    return parser.parse_args()


def _append_rows(out_root: Path, rows: list[ScheduledJobRunRecord]) -> None:
    by_day: dict[str, list[dict]] = {}
    for row in rows:
        day_key = row.started_at.strftime("%Y-%m-%d")
        by_day.setdefault(day_key, []).append(row.model_dump(mode="json"))
    for day_key, items in by_day.items():
        path = out_root / f"{day_key}.jsonl"
        with path.open("a", encoding="utf-8") as fh:
            for item in items:
                fh.write(json.dumps(item, ensure_ascii=False, default=str) + "\n")


async def _export_batches(
    repo: ScheduledJobRunRepo,
    *,
    before: datetime,
    batch_size: int,
    out_root: Path,
) -> int:
    exported = 0
    after_id = 0
    while True:
        rows = await repo.export_before(
            before=before, limit=batch_size, after_id=after_id
        )
        if not rows:
            return exported
        _append_rows(out_root, rows)
        exported += len(rows)
        after_id = rows[-1].id
        if len(rows) < batch_size:
            return exported


async def _export_and_maybe_purge(
    *,
    before: datetime,
    purge: bool,
    batch_size: int,
    archive_dir: Path,
) -> tuple[int, int]:
    repo = ScheduledJobRunRepo(mysql_engine())
    await repo.ensure_schema()
    out_root = archive_dir / "scheduled-job-runs"
    out_root.mkdir(parents=True, exist_ok=True)
    exported = await _export_batches(
        repo, before=before, batch_size=batch_size, out_root=out_root
    )
    purged = 0
    if purge and exported > 0:
        purged = await repo.purge_before(before=before)
    return exported, purged


async def _main() -> None:
    args = parse_args()
    settings = get_settings()
    retention_days = args.retention_days
    if retention_days is None:
        retention_days = int(settings.audit.retention_days or 90)
    archive_dir = Path(settings.audit.archive_dir or "audit-archive")
    if args.retention:
        before = utc_now() - timedelta(days=retention_days)
    elif args.before:
        before = parse_api_utc(args.before)
    else:
        raise SystemExit("须指定 --before 或 --retention")
    exported, purged = await _export_and_maybe_purge(
        before=before,
        purge=args.purge,
        batch_size=args.batch_size,
        archive_dir=archive_dir,
    )
    msg = f"执行记录导出 {exported} 条（cutoff={format_api_utc(before)}）"
    if args.purge:
        msg += f"；已清理 {purged} 条"
    print(msg)


if __name__ == "__main__":
    asyncio.run(_main())
