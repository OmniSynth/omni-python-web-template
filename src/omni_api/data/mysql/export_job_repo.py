"""导出任务仓储。"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.tenant_biz_repo import TenantBizRepo
from omni_api.data.mysql.tenant_context import get_dept_id, resolve_tenant_id
from omni_api.data.mysql.tenant_schema_cache import ensure_tenant_biz_provisioned
from omni_api.data.mysql.utc import naive_utc, utc_now
from omni_api.schemas.export_job import ExportJobRecord, PaginatedExportJob

_DEFAULT_TTL_HOURS = 24


class ExportJobRepo(TenantBizRepo):
    def __init__(self, engine: AsyncEngine, tenant_id: int | None = None) -> None:
        super().__init__(engine, "export_job")
        self._explicit_tenant = tenant_id

    def _tid(self) -> int:
        return resolve_tenant_id(explicit=self._explicit_tenant)

    async def ensure_schema(self, tenant_id: int | None = None) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await ensure_tenant_biz_provisioned(self._engine, tid)

    async def count_active_for_user(
        self, user_id: int, *, tenant_id: int | None = None
    ) -> int:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(
            f"SELECT COUNT(*) AS c FROM {t} "
            f"WHERE created_by=:uid AND status IN ('queued', 'running')"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"uid": user_id})).mappings().first()
        return int(row["c"] if row else 0)

    async def badge_counts_for_user(
        self, user_id: int, *, tenant_id: int | None = None
    ) -> tuple[int, int]:
        """返回 (进行中数量, 已完成未读数量)。进行中不依赖 read_at。"""
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        now = utc_now()
        sql = text(
            f"SELECT "
            f"COALESCE(SUM(CASE WHEN status IN ('queued', 'running') THEN 1 ELSE 0 END), 0) "
            f"AS active_count, "
            f"COALESCE(SUM(CASE WHEN status = 'done' AND read_at IS NULL "
            f"AND (expires_at IS NULL OR expires_at > :now) THEN 1 ELSE 0 END), 0) "
            f"AS done_unread_count "
            f"FROM {t} WHERE created_by=:uid"
        )
        async with self._engine.connect() as conn:
            row = (
                await conn.execute(sql, {"uid": user_id, "now": now})
            ).mappings().first()
        if not row:
            return 0, 0
        return int(row["active_count"] or 0), int(row["done_unread_count"] or 0)

    async def mark_badge_read_for_user(
        self, user_id: int, *, tenant_id: int | None = None
    ) -> int:
        """进入下载中心：仅将已完成未读标为已读（进行中蓝角标保持）。"""
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        now = utc_now()
        params = {"uid": user_id, "read_at": now, "now": now, **audit_update_params()}
        sql = text(
            f"UPDATE {t} SET read_at=:read_at, updated_by=:updated_by "
            f"WHERE created_by=:uid AND status='done' AND read_at IS NULL "
            f"AND (expires_at IS NULL OR expires_at > :now)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, params)
            return int(result.rowcount or 0)

    async def mark_job_read(
        self, job_id: int, user_id: int, *, tenant_id: int | None = None
    ) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        params = {
            "id": job_id,
            "uid": user_id,
            "read_at": utc_now(),
            **audit_update_params(),
        }
        sql = text(
            f"UPDATE {t} SET read_at=:read_at, updated_by=:updated_by "
            f"WHERE id=:id AND created_by=:uid AND read_at IS NULL"
        )
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)

    async def list_expired(
        self,
        *,
        tenant_id: int | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        """过期任务（含 object_key），供清理定时任务使用。"""
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        size = min(500, max(1, limit))
        sql = text(
            f"SELECT id, object_key, filename, status FROM {t} "
            f"WHERE expires_at IS NOT NULL AND expires_at <= :now "
            f"ORDER BY id ASC LIMIT :limit"
        )
        async with self._engine.connect() as conn:
            rows = (
                await conn.execute(sql, {"now": utc_now(), "limit": size})
            ).mappings().all()
        return [dict(r) for r in rows]

    async def delete_by_ids(
        self, job_ids: list[int], *, tenant_id: int | None = None
    ) -> int:
        if not job_ids:
            return 0
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        placeholders = ", ".join(f":id{i}" for i in range(len(job_ids)))
        params: dict[str, Any] = {f"id{i}": jid for i, jid in enumerate(job_ids)}
        sql = text(f"DELETE FROM {t} WHERE id IN ({placeholders})")
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, params)
            return int(result.rowcount or 0)

    async def insert_job(
        self,
        *,
        source_type: str,
        source_label: str,
        filter_json: str,
        filename: str,
        tenant_id: int | None = None,
        expires_at: datetime | None = None,
    ) -> int:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        exp = expires_at or (utc_now() + timedelta(hours=_DEFAULT_TTL_HOURS))
        params = {
            "source_type": source_type,
            "source_label": source_label,
            "status": "queued",
            "progress_current": 0,
            "progress_total": 0,
            "filter_json": filter_json,
            "filename": filename,
            "content_type": "",
            "file_size": 0,
            "object_key": "",
            "public_url": "",
            "row_count": 0,
            "error_message": "",
            "expires_at": exp,
            "dept_id": get_dept_id(),
            **audit_insert_params(),
        }
        sql = text(
            f"INSERT INTO {t} (source_type, source_label, status, progress_current, "
            f"progress_total, filter_json, filename, content_type, file_size, object_key, "
            f"public_url, row_count, error_message, expires_at, dept_id, created_by, updated_by) "
            f"VALUES (:source_type, :source_label, :status, :progress_current, "
            f":progress_total, :filter_json, :filename, :content_type, :file_size, :object_key, "
            f":public_url, :row_count, :error_message, :expires_at, :dept_id, "
            f":created_by, :updated_by)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, params)
            return int(result.lastrowid)

    async def update_job(
        self, job_id: int, *, tenant_id: int | None = None, **fields: Any
    ) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        allowed = {
            "status",
            "progress_current",
            "progress_total",
            "filename",
            "content_type",
            "file_size",
            "object_key",
            "public_url",
            "row_count",
            "error_message",
            "expires_at",
            "read_at",
        }
        sets = [f"{k}=:{k}" for k in fields if k in allowed]
        if not sets:
            return
        params = {k: v for k, v in fields.items() if k in allowed}
        params["id"] = job_id
        params.update(audit_update_params())
        sets.append("updated_by=:updated_by")
        sql = text(f"UPDATE {t} SET {', '.join(sets)} WHERE id=:id")
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)

    async def get_owned(
        self, job_id: int, user_id: int, *, tenant_id: int | None = None
    ) -> ExportJobRecord | None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(
            f"SELECT id, source_type, source_label, status, progress_current, progress_total, "
            f"filename, content_type, file_size, row_count, "
            f"error_message, expires_at, read_at, public_url, created_at, updated_at "
            f"FROM {t} WHERE id=:id AND created_by=:uid LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (
                await conn.execute(sql, {"id": job_id, "uid": user_id})
            ).mappings().first()
        return _to_record(row) if row else None

    async def list_page(
        self,
        *,
        user_id: int,
        keyword: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
        tenant_id: int | None = None,
    ) -> PaginatedExportJob:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        where = ["created_by = :uid"]
        bind: dict[str, Any] = {"uid": user_id}
        if status and status.strip():
            where.append("status = :status")
            bind["status"] = status.strip()
        if keyword and keyword.strip():
            where.append("(filename LIKE :kw OR source_label LIKE :kw)")
            bind["kw"] = f"%{keyword.strip()}%"
        where_sql = " AND ".join(where)
        page = max(1, page)
        size = min(200, max(1, page_size))
        offset = (page - 1) * size
        count_sql = text(f"SELECT COUNT(*) FROM {t} WHERE {where_sql}")
        list_sql = text(
            f"SELECT id, source_type, source_label, status, progress_current, progress_total, "
            f"filename, content_type, file_size, row_count, error_message, expires_at, "
            f"read_at, public_url, created_at, updated_at FROM {t} WHERE {where_sql} "
            f"ORDER BY id DESC LIMIT :limit OFFSET :offset"
        )
        async with self._engine.connect() as conn:
            total = int((await conn.execute(count_sql, bind)).scalar_one())
            rows = (
                await conn.execute(list_sql, {**bind, "limit": size, "offset": offset})
            ).mappings().all()
        return PaginatedExportJob(
            items=[_to_record(r) for r in rows],
            total=total,
            page=page,
            page_size=size,
        )


def dumps_filter(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, default=str)


def _is_expired(expires_at: Any) -> bool:
    if expires_at is None:
        return False
    if not isinstance(expires_at, datetime):
        return False
    return naive_utc(expires_at) < utc_now()


def _downloadable_public_url(row: Any) -> str:
    if str(row.get("status") or "") != "done":
        return ""
    if _is_expired(row.get("expires_at")):
        return ""
    return str(row.get("public_url") or "").strip()


def _to_record(row: Any) -> ExportJobRecord:
    return ExportJobRecord(
        id=int(row["id"]),
        source_type=str(row["source_type"] or ""),
        source_label=str(row["source_label"] or ""),
        status=str(row["status"] or "queued"),  # type: ignore[arg-type]
        progress_current=int(row["progress_current"] or 0),
        progress_total=int(row["progress_total"] or 0),
        filename=str(row["filename"] or ""),
        content_type=str(row["content_type"] or ""),
        file_size=int(row["file_size"] or 0),
        row_count=int(row["row_count"] or 0),
        error_message=str(row["error_message"] or ""),
        public_url=_downloadable_public_url(row),
        expires_at=row.get("expires_at"),
        read_at=row.get("read_at"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )
