import { json } from "@/lib/api/client";
import type { UserProfile } from "@/types/auth";
import type {
  TablePreferenceConfig,
  TablePreferenceGetResponse,
  TablePreferenceRecord,
} from "@/types/table-preference";
import { normalizeTablePreferenceConfig } from "@/types/table-preference";

export const profileApi = {
  profile: {
    get: () => json<UserProfile>("/api/v1/users/me/profile"),
    update: (body: { display_name?: string; avatar_url?: string | null }) =>
      json<UserProfile>("/api/v1/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    changePassword: (body: { old_password: string; new_password: string }) =>
      json<{ status: string }>("/api/v1/users/me/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    verifyIdentity: (body: { real_name: string; id_card: string }) =>
      json<UserProfile>("/api/v1/users/me/identity", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  tablePreferences: {
    get: async (pageKey: string, tableKey: string) => {
      const res = await json<TablePreferenceGetResponse>(
        `/api/v1/users/me/table-preferences/${encodeURIComponent(pageKey)}/${encodeURIComponent(tableKey)}`,
      );
      if (res.config != null) {
        res.config = normalizeTablePreferenceConfig(res.config);
      }
      return res;
    },
    save: (pageKey: string, tableKey: string, config: TablePreferenceConfig) =>
      json<TablePreferenceRecord>(
        `/api/v1/users/me/table-preferences/${encodeURIComponent(pageKey)}/${encodeURIComponent(tableKey)}`,
        { method: "PUT", body: JSON.stringify(config) },
      ),
    reset: (pageKey: string, tableKey: string) =>
      json<{ status: string }>(
        `/api/v1/users/me/table-preferences/${encodeURIComponent(pageKey)}/${encodeURIComponent(tableKey)}`,
        { method: "DELETE" },
      ),
  },
};
