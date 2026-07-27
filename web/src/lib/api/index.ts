import { devParamsApi } from "@/lib/api/dev-params";
import { platformApi } from "@/lib/api/platform";
import { profileApi } from "@/lib/api/profile";
import { scheduledJobsApi } from "@/lib/api/scheduled-jobs";
import { sysDevParamsApi } from "@/lib/api/sys-dev-params";

export { ApiError } from "@/lib/api/client";

export const api = {
  ...platformApi,
  scheduledJobs: scheduledJobsApi,
  devParams: devParamsApi,
  sysDevParams: sysDevParamsApi,
  ...profileApi,
};
