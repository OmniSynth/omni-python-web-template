"""导出任务租户分表 DDL。"""

from __future__ import annotations

from omni_api.data.mysql.audit import AUDIT_COLUMN_DEFS
from omni_api.data.mysql.biz_table import biz_table
from omni_api.data.mysql.ddl_comment import ID_PK, cmt, table_cmt


def export_job_ddl(tenant_id: int) -> str:
    """异步导出任务（下载中心）。"""
    t = biz_table("export_job", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    dept_id BIGINT NULL{cmt("部门ID")},
    source_type VARCHAR(64) NOT NULL{cmt("来源类型（业务域注册的 builder 键）")},
    source_label VARCHAR(128) NOT NULL DEFAULT ''{cmt("来源展示名")},
    status VARCHAR(32) NOT NULL DEFAULT 'queued'{cmt("状态：queued排队中 running导出中 done已完成 failed失败")},
    progress_current INT NOT NULL DEFAULT 0{cmt("已处理条数")},
    progress_total INT NOT NULL DEFAULT 0{cmt("总条数（0表示未知）")},
    filter_json MEDIUMTEXT NULL{cmt("筛选与排序快照 JSON")},
    filename VARCHAR(256) NOT NULL DEFAULT ''{cmt("下载文件名")},
    content_type VARCHAR(128) NOT NULL DEFAULT ''{cmt("MIME 类型")},
    file_size BIGINT NOT NULL DEFAULT 0{cmt("文件字节数")},
    object_key VARCHAR(512) NOT NULL DEFAULT ''{cmt("对象存储键")},
    public_url VARCHAR(2048) NOT NULL DEFAULT ''{cmt("对象公开访问地址")},
    row_count INT NOT NULL DEFAULT 0{cmt("导出行数")},
    error_message VARCHAR(512) NOT NULL DEFAULT ''{cmt("失败原因（用户可读）")},
    expires_at DATETIME(6) NULL{cmt("过期时间（UTC naive）")},
    read_at DATETIME(6) NULL{cmt("已读时间（UTC naive；空表示需提醒）")},
    {AUDIT_COLUMN_DEFS.strip()},
    KEY idx_export_job_owner_created (created_by, created_at),
    KEY idx_export_job_status_created (status, created_at),
    KEY idx_export_job_expires (expires_at),
    KEY idx_export_job_owner_read (created_by, read_at, status),
    KEY idx_export_job_dept (dept_id)
){table_cmt("导出任务（下载中心）")};
"""
