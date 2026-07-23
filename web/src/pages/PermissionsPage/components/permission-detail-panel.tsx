import type { PermissionInfo, PermissionRecord } from "@/types/auth";
import { KIND_LABEL } from "../types";
import { EditableNameField } from "./editable-name-field";

interface PermissionDetailPanelProps {
  selectedNode: PermissionInfo | null;
  selectedRecord: PermissionRecord | null;
  menuButtons: PermissionRecord[];
  editingCode: string | null;
  draftName: string;
  nameFocused: boolean;
  canUpdate: boolean;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: (record: PermissionRecord) => void;
  onDraftChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function PermissionDetailPanel({
  selectedNode,
  selectedRecord,
  menuButtons,
  editingCode,
  draftName,
  nameFocused,
  canUpdate,
  nameInputRef,
  onStartEdit,
  onDraftChange,
  onFocus,
  onBlur,
  onCancel,
  onSave,
}: PermissionDetailPanelProps) {
  return (
    <div className="surface-glass min-h-0 min-w-0 overflow-auto rounded-lg border p-4">
      {!selectedNode || !selectedRecord ? (
        <p className="text-sm text-muted-foreground">请选择左侧目录或菜单</p>
      ) : (
        <div className="grid gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{KIND_LABEL[selectedRecord.kind] ?? selectedRecord.kind}</p>
            <div className="mt-1 min-w-0">
              <EditableNameField
                record={selectedRecord}
                editing={editingCode === selectedRecord.code}
                draftName={draftName}
                nameFocused={nameFocused}
                canUpdate={canUpdate}
                inputRef={nameInputRef}
                onStartEdit={() => onStartEdit(selectedRecord)}
                onDraftChange={onDraftChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onCancel={onCancel}
                onSave={onSave}
              />
            </div>
          </div>

          {selectedRecord.kind === "menu" ? (
            <div className="grid min-w-0 gap-2">
              <p className="text-xs text-muted-foreground">{KIND_LABEL.button}</p>
              {menuButtons.length === 0 ? (
                <p className="text-sm text-muted-foreground">该菜单暂无按钮权限</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {menuButtons.map((record) => (
                    <div key={record.code} className="surface-glass min-w-0 rounded-md border p-2 text-sm">
                      <EditableNameField
                        record={record}
                        editing={editingCode === record.code}
                        draftName={draftName}
                        nameFocused={nameFocused}
                        canUpdate={canUpdate}
                        inputRef={nameInputRef}
                        titleClassName="text-sm font-medium"
                        onStartEdit={() => onStartEdit(record)}
                        onDraftChange={onDraftChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onCancel={onCancel}
                        onSave={onSave}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
