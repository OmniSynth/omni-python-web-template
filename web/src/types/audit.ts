export type AuditLevel = "system" | "business";

export type SqlTier = "oltp" | "polling" | "data" | "artifact";
export type SqlSeverity = "slow" | "critical";

export interface RequestLogRecord {
  id: number;
  request_id: string;
  occurred_at: string;
  duration_ms: number;
  method: string;
  path: string;
  query_string: string | null;
  status_code: number;
  client_ip: string | null;
  user_agent: string | null;
  user_id: number | null;
  username: string | null;
  level: AuditLevel;
  auth_status: string;
  permission_code: string | null;
  error_detail: string | null;
  request_body_size: number;
  response_body_size: number | null;
}

export interface OperationLogRecord {
  id: number;
  request_id: string | null;
  occurred_at: string;
  level: AuditLevel;
  category: string;
  action: string;
  actor_id: number | null;
  actor_username: string | null;
  resource_type: string | null;
  resource_id: string | null;
  summary: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  result: string;
  error_detail: string | null;
  client_ip: string | null;
  meta_json: Record<string, unknown> | null;
}

export interface PaginatedRequestLogs {
  items: RequestLogRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedOperationLogs {
  items: OperationLogRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditExportResult {
  request_files: string[];
  operation_files: string[];
  slow_sql_files: string[];
  request_count: number;
  operation_count: number;
  slow_sql_count: number;
  purged_request_count: number;
  purged_operation_count: number;
  purged_slow_sql_count: number;
}

export type SqlExplainStatus = "ok" | "skipped" | "error";

export interface SqlExplainSummary {
  max_rows_examined: number | null;
  uses_index: boolean;
  warnings: string[];
}

export interface SqlExplainResult {
  status: SqlExplainStatus;
  reason?: string;
  error?: string;
  plan?: Record<string, unknown>[];
  summary?: SqlExplainSummary;
}

export interface SlowSqlMetaJson {
  explain?: SqlExplainResult;
}

export interface SlowSqlLogRecord {
  id: number;
  occurred_at: string;
  request_id: string | null;
  http_method: string | null;
  http_path: string | null;
  user_id: number | null;
  username: string | null;
  tenant_id: number | null;
  tier: SqlTier;
  severity: SqlSeverity;
  duration_ms: number;
  threshold_ms: number;
  sql_fingerprint: string;
  sql_text: string;
  rows_affected: number | null;
  meta_json: SlowSqlMetaJson | null;
}

export interface PaginatedSlowSqlLogs {
  items: SlowSqlLogRecord[];
  total: number;
  page: number;
  page_size: number;
}
