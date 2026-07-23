import { DataScopeFields } from "@/components/dept/data-scope-fields";
import { PageMessage } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RoleDataScopeSheetProps } from "../types";

export function RoleDataScopeSheet({
  open,
  onOpenChange,
  editing,
  dataScope,
  selectedDeptIds,
  deptTree,
  dataScopeError,
  onDataScopeChange,
  onToggleDeptScope,
  onSave,
}: RoleDataScopeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>数据权限</SheetTitle>
          <SheetDescription>{editing ? `${editing.name}（${editing.code}）` : ""}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {editing?.system_managed ? (
            <PageMessage variant="info">该系统预置角色由平台管理，不可修改数据权限。</PageMessage>
          ) : null}
          <div className={editing?.system_managed ? "pointer-events-none opacity-50" : undefined}>
            <DataScopeFields
              dataScope={dataScope}
              selectedDeptIds={selectedDeptIds}
              deptTree={deptTree}
              disabled={editing?.system_managed}
              onDataScopeChange={onDataScopeChange}
              onToggleDeptScope={onToggleDeptScope}
            />
            {dataScopeError ? <p className="text-xs text-destructive">{dataScopeError}</p> : null}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {!editing?.system_managed ? (
            <Button type="button" onClick={() => void onSave()}>
              保存
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
