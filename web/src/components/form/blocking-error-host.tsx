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
import { type BlockingErrorPayload, dismissBlockingError, subscribeBlockingError } from "@/lib/form-feedback";

/** 全局阻断性错误弹窗宿主，挂载于 App 根节点。 */
export function BlockingErrorHost() {
  const [payload, setPayload] = useState<BlockingErrorPayload | null>(null);

  useEffect(() => subscribeBlockingError(setPayload), []);

  return (
    <AlertDialog
      open={payload != null}
      onOpenChange={(open) => {
        if (!open) dismissBlockingError();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{payload?.title ?? "操作失败"}</AlertDialogTitle>
          <AlertDialogDescription>{payload?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => dismissBlockingError()}>确定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
