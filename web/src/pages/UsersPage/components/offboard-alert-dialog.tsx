import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserRecord } from "@/types/auth";

export function OffboardAlertDialog({
  offboardTarget,
  offboarding,
  onOpenChange,
  onConfirm,
}: {
  offboardTarget: UserRecord | null;
  offboarding: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={offboardTarget != null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认离职</AlertDialogTitle>
          <AlertDialogDescription>
            确定将「{offboardTarget?.display_name || offboardTarget?.username}」标记为离职？
            离职后将无法访问本租户，历史数据保留。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={offboarding}>取消</AlertDialogCancel>
          <AlertDialogAction disabled={offboarding} onClick={() => void onConfirm()}>
            确认离职
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
