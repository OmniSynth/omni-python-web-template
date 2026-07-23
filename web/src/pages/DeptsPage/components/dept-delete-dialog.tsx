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
import type { DeptRecord } from "@/types/auth";

type DeptDeleteDialogProps = {
  deleteTarget: DeptRecord | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeptDeleteDialog({ deleteTarget, deleting, onOpenChange, onConfirm }: DeptDeleteDialogProps) {
  return (
    <AlertDialog open={deleteTarget != null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除部门</AlertDialogTitle>
          <AlertDialogDescription>
            确定删除「{deleteTarget?.name}」？删除后不可恢复。若存在子部门、绑定用户或角色数据权限引用，将无法删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} onClick={() => void onConfirm()}>
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
