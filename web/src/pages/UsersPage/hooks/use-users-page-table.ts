import { useClientTable } from "@/hooks/useClientTable";
import type { UserRecord } from "@/types/auth";
import { useUserColumns } from "./use-user-columns";

export function useUsersPageTable({
  formatDateTime,
  tenantScope,
  currentId,
  userPerm,
  openEdit,
  resettingId,
  toggleEnabled,
  handleResetPassword,
  setOffboardTarget,
  users,
}: Parameters<typeof useUserColumns>[0] & { users: UserRecord[] }) {
  const userColumns = useUserColumns({
    formatDateTime,
    tenantScope,
    currentId,
    userPerm,
    openEdit,
    resettingId,
    toggleEnabled,
    handleResetPassword,
    setOffboardTarget,
  });

  const userTable = useClientTable({
    pageKey: "users",
    tableKey: "main",
    rows: users,
    defaultColumns: userColumns,
  });

  return { userColumns, userTable };
}
