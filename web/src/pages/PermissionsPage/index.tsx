import { Page, PageBody, PageHeader, PageMessage } from "@/components/layout/AppShell";
import { PermissionDetailPanel } from "./components/permission-detail-panel";
import { PermissionTreePanel } from "./components/permission-tree-panel";
import { usePermissionsPage } from "./hooks/use-permissions-page";

export function PermissionsPage() {
  const page = usePermissionsPage();

  return (
    <Page>
      <PageHeader title="权限管理" subtitle="左侧拖动排序；右侧修改名称" />
      <PageBody layout="panels">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
            <PermissionTreePanel
              tree={page.tree}
              selectedCode={page.selectedCode}
              canUpdate={page.canUpdate}
              onSelect={page.setSelectedCode}
              onMove={page.moveTreeNode}
            />
            <PermissionDetailPanel
              selectedNode={page.selectedNode}
              selectedRecord={page.selectedRecord}
              menuButtons={page.menuButtons}
              editingCode={page.editingCode}
              draftName={page.draftName}
              nameFocused={page.nameFocused}
              canUpdate={page.canUpdate}
              nameInputRef={page.nameInputRef}
              onStartEdit={page.startNameEdit}
              onDraftChange={page.setDraftName}
              onFocus={page.handleNameFocus}
              onBlur={page.handleNameBlur}
              onCancel={page.cancelNameEdit}
              onSave={() => void page.handleSaveName()}
            />
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
