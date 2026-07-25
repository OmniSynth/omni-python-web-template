import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  markTenantExpiredNoticeDismissed,
  showTenantExpiredNotice,
  subscribeTenantExpiredNotice,
  TENANT_EXPIRED_MSG,
  TENANT_EXPIRED_TITLE,
} from "@/lib/tenant-expiry";

/** 套餐过期提示宿主：登录后自动提醒（4h 缓存）+ 强制触发通道。 */
export function TenantExpiredNoticeHost() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeTenantExpiredNotice(setOpen), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 切换租户时需重新评估是否自动提醒
  useEffect(() => {
    if (!user?.tenant_expired) {
      setOpen(false);
      return;
    }
    showTenantExpiredNotice({ force: false });
  }, [user?.tenant_expired, user?.tenant_id]);

  function handleClose() {
    markTenantExpiredNoticeDismissed();
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{TENANT_EXPIRED_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{TENANT_EXPIRED_MSG}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose}>关闭</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
