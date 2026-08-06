/** 下载中心任务变更事件：入队 / 已读后刷新顶栏角标。 */

export const EXPORT_JOBS_CHANGED_EVENT = "omni-export-jobs-changed";

export function notifyExportJobsChanged(): void {
  window.dispatchEvent(new Event(EXPORT_JOBS_CHANGED_EVENT));
}
