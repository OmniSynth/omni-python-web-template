import { PageMessage } from "@/components/layout/AppShell";
import { PermissionAssignPanel } from "@/components/permission-assign";
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
import type { RoleFunctionalPermissionsSheetProps } from "../types";

export function RoleFunctionalPermissionsSheet({
  open,
  onOpenChange,
  editing,
  permissions,
  selectedMenus,
  selectedButtons,
  onMenusChange,
  onButtonsChange,
  onSave,
}: RoleFunctionalPermissionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>功能权限</SheetTitle>
          <SheetDescription>{editing ? `${editing.name}（${editing.code}）` : ""}</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid gap-4">
          {editing?.system_managed ? (
            <PageMessage variant="info">该系统预置角色由平台管理，不可修改功能权限。</PageMessage>
          ) : null}
          <div className={editing?.system_managed ? "pointer-events-none opacity-50" : undefined}>
            <PermissionAssignPanel
              key={editing?.id}
              tree={permissions}
              selectedMenus={selectedMenus}
              selectedButtons={selectedButtons}
              onMenusChange={onMenusChange}
              onButtonsChange={onButtonsChange}
              disabled={editing?.system_managed}
            />
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
