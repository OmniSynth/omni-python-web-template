import { Can } from "@/components/Can";
import { DateRangeFilterField, type DateRangeValue } from "@/components/form/date-range-filter-field";
import { FilterClearableControl } from "@/components/form/filter-clearable-control";
import { FilterField } from "@/components/form/filter-field";
import { PageFilterToolbar } from "@/components/layout/AppShell";
import { TableHeaderButton } from "@/components/table/table-header-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditLevel, SqlSeverity, SqlTier } from "@/types/audit";
import type { ScheduledJobRunStatus, ScheduledJobTriggerType } from "@/types/scheduled-job";
import {
  AUDIT_JOB_STATUS_SELECT_OPTIONS,
  AUDIT_JOB_TRIGGER_SELECT_OPTIONS,
  AUDIT_LEVEL_SELECT_OPTIONS,
  AUDIT_SEVERITY_SELECT_OPTIONS,
  AUDIT_TIER_SELECT_OPTIONS,
  type Tab,
} from "../types";

type AuditFilterToolbarProps = {
  tab: Tab;
  dateRange: DateRangeValue;
  keyword: string;
  level: AuditLevel | "";
  tier: SqlTier | "";
  severity: SqlSeverity | "";
  jobStatus: ScheduledJobRunStatus | "";
  jobTrigger: ScheduledJobTriggerType | "";
  requestId: string;
  hiddenFilterActiveCount: number;
  exporting: boolean;
  onDateRangeChange: (value: DateRangeValue) => void;
  onKeywordChange: (value: string) => void;
  onLevelChange: (value: AuditLevel | "") => void;
  onTierChange: (value: SqlTier | "") => void;
  onSeverityChange: (value: SqlSeverity | "") => void;
  onJobStatusChange: (value: ScheduledJobRunStatus | "") => void;
  onJobTriggerChange: (value: ScheduledJobTriggerType | "") => void;
  onRequestIdChange: (value: string) => void;
  onExport: () => void;
};

function AuditExportToolbarButton({ exporting, onExport }: { exporting: boolean; onExport: () => void }) {
  return (
    <Can permission="system.audit.export">
      <TableHeaderButton
        type="button"
        disabled={exporting}
        mobileLabel={exporting ? "导出中" : "导出"}
        onClick={onExport}
      >
        {exporting ? "导出中…" : "导出归档"}
      </TableHeaderButton>
    </Can>
  );
}

function keywordPlaceholder(tab: Tab): string {
  if (tab === "slow-sql") return "SQL、路径、用户名";
  if (tab === "job-runs") return "任务编码、摘要、Run ID、操作人";
  return "路径、用户名、摘要";
}

export function AuditFilterToolbar({
  tab,
  dateRange,
  keyword,
  level,
  tier,
  severity,
  jobStatus,
  jobTrigger,
  requestId,
  hiddenFilterActiveCount,
  exporting,
  onDateRangeChange,
  onKeywordChange,
  onLevelChange,
  onTierChange,
  onSeverityChange,
  onJobStatusChange,
  onJobTriggerChange,
  onRequestIdChange,
  onExport,
}: AuditFilterToolbarProps) {
  return (
    <PageFilterToolbar
      key={tab}
      hiddenActiveCount={hiddenFilterActiveCount}
      actions={tab === "job-runs" ? undefined : <AuditExportToolbarButton exporting={exporting} onExport={onExport} />}
    >
      <DateRangeFilterField value={dateRange} onChange={onDateRangeChange} />
      <FilterField label="关键词" htmlFor="audit-keyword">
        <FilterClearableControl
          clearVisible={keyword.trim().length > 0}
          clearLabel="清空关键词"
          onClear={() => onKeywordChange("")}
        >
          <Input
            id="audit-keyword"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder={keywordPlaceholder(tab)}
          />
        </FilterClearableControl>
      </FilterField>
      {tab === "job-runs" ? (
        <FilterField label="状态" htmlFor="audit-job-status">
          <Select
            value={jobStatus || "all"}
            options={[...AUDIT_JOB_STATUS_SELECT_OPTIONS]}
            onValueChange={(value) => onJobStatusChange(value === "all" ? "" : (value as ScheduledJobRunStatus))}
          >
            <FilterClearableControl
              variant="select"
              clearVisible={jobStatus !== ""}
              clearLabel="清空状态"
              onClear={() => onJobStatusChange("")}
            >
              <SelectTrigger id="audit-job-status" className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
            </FilterClearableControl>
            <SelectContent>
              {AUDIT_JOB_STATUS_SELECT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      ) : tab === "slow-sql" ? (
        <FilterField label="Tier" htmlFor="audit-tier">
          <Select
            value={tier || "all"}
            options={[...AUDIT_TIER_SELECT_OPTIONS]}
            onValueChange={(value) => onTierChange(value === "all" ? "" : (value as SqlTier))}
          >
            <FilterClearableControl
              variant="select"
              clearVisible={tier !== ""}
              clearLabel="清空 Tier"
              onClear={() => onTierChange("")}
            >
              <SelectTrigger id="audit-tier" className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
            </FilterClearableControl>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="oltp">OLTP</SelectItem>
              <SelectItem value="polling">轮询</SelectItem>
              <SelectItem value="data">数据</SelectItem>
              <SelectItem value="artifact">归档</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      ) : (
        <FilterField label="级别" htmlFor="audit-level">
          <Select
            value={level || "all"}
            options={[...AUDIT_LEVEL_SELECT_OPTIONS]}
            onValueChange={(value) => onLevelChange(value === "all" ? "" : (value as AuditLevel))}
          >
            <FilterClearableControl
              variant="select"
              clearVisible={level !== ""}
              clearLabel="清空级别"
              onClear={() => onLevelChange("")}
            >
              <SelectTrigger id="audit-level" className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
            </FilterClearableControl>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="business">业务</SelectItem>
              <SelectItem value="system">系统</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      )}
      {tab === "job-runs" ? (
        <FilterField label="触发方式" htmlFor="audit-job-trigger">
          <Select
            value={jobTrigger || "all"}
            options={[...AUDIT_JOB_TRIGGER_SELECT_OPTIONS]}
            onValueChange={(value) => onJobTriggerChange(value === "all" ? "" : (value as ScheduledJobTriggerType))}
          >
            <FilterClearableControl
              variant="select"
              clearVisible={jobTrigger !== ""}
              clearLabel="清空触发方式"
              onClear={() => onJobTriggerChange("")}
            >
              <SelectTrigger id="audit-job-trigger" className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
            </FilterClearableControl>
            <SelectContent>
              {AUDIT_JOB_TRIGGER_SELECT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      ) : null}
      {tab === "slow-sql" ? (
        <FilterField label="严重度" htmlFor="audit-severity">
          <Select
            value={severity || "all"}
            options={[...AUDIT_SEVERITY_SELECT_OPTIONS]}
            onValueChange={(value) => onSeverityChange(value === "all" ? "" : (value as SqlSeverity))}
          >
            <FilterClearableControl
              variant="select"
              clearVisible={severity !== ""}
              clearLabel="清空严重度"
              onClear={() => onSeverityChange("")}
            >
              <SelectTrigger id="audit-severity" className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
            </FilterClearableControl>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="slow">慢</SelectItem>
              <SelectItem value="critical">严重</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      ) : null}
      <FilterField label="Request ID" htmlFor="audit-req-id">
        <FilterClearableControl
          clearVisible={requestId.trim().length > 0}
          clearLabel="清空 Request ID"
          onClear={() => onRequestIdChange("")}
        >
          <Input
            id="audit-req-id"
            value={requestId}
            onChange={(e) => onRequestIdChange(e.target.value)}
            placeholder="UUID"
          />
        </FilterClearableControl>
      </FilterField>
    </PageFilterToolbar>
  );
}
