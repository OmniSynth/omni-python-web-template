# Web 表格与列偏好

## 概述

列表页表格支持用户级列偏好：列宽、行高、显示顺序、自定义列名、列头 Tips、列固定、列头点击排序。配置按 **user + pageKey + tableKey** 隔离（切换租户共用，不含 `tenant_id`）。

- **本地优先**：IndexedDB（`omni-local`，Dexie `tablePreferences` 表）缓存，mount 时立即渲染
- **持久化**：MySQL `t_sys_user_table_preference`，后台 GET 合并后写回 IDB
- **变更**：即时更新 UI → 写 IDB → debounce 500ms PUT API（失败 Toast，不回滚 UI）；列固定/显隐/顺序/列宽（含 PC 表头拖拽）等立即 flush PUT
- **PC 列宽拖拽**：桌面表头右边缘可拖动调宽；拖动中仅本地预览，松手后批量写入各列 `width`（先物化按比例铺满结果），与自定义字段同步并持久化到后端

详见 [interfaces.md](interfaces.md#表格偏好-apiv1usersmetable-preferences) 与后端 `schemas/table_preference.py`。

## 表格页滚动布局

列表页使用 `PageBody layout="table"`：

- 筛选项 / Tab 固定，仅表格数据区纵向滚动
- 表头与表体分离渲染（非 `sticky`），横向滚动同步，避免表头抖动
- 列宽：`table-layout: fixed` + `colgroup`；偏好为绝对像素。之和小于容器时按各列偏好比例瓜分剩余宽度铺满；之和更大时横向滚动。拖拽开始时物化当前显示宽，松手批量写入偏好，避免再次瓜分时牵动其它列
- PC 端表头右边缘拖拽调宽：`ConfigurableTable` 传 `onColumnWidthsChange={prefs.setColumnWidths}`；拖动预览不写库，松手后与自定义字段共用偏好并同步后端
- PC 端 `ConfigurableTable` 表头 `bg-secondary`；隔行变色偶数行 `bg-muted`（较表头更浅），固定列背景与行/表头同步；手机端无隔行色
- 全局与各滚动容器设置 `overscroll-behavior: none`，禁用橡皮筋拉扯感

## 表格注册表

每个表格实例须注册唯一的 `pageKey.tableKey`：

| pageKey | tableKey | 页面 | 分页 | 排序 |
|---|---|---|---|---|
| `users` | `main` | UsersPage | 客户端 | 前端 |
| `roles` | `main` | RolesPage | 客户端 | 前端 |
| `audit` | `requests` | AuditLogsPage | 服务端 | 后端 `sort_by` |
| `audit` | `operations` | AuditLogsPage | 服务端 | 后端 `sort_by` |
| `tenants` | `main` | TenantsPage | 无 | 前端 |
| `orgs` | `main` | OrgsPage | 无 | 前端 |
| `dev_params` | `main` | DevParamsPage | 服务端 | 后端 `sort_by` |
| `dev_params` | `detail-params` | DevParamGroupDetailSheet | — | — |
| `scheduled_jobs` | `main` | ScheduledJobsPage | 客户端 | — |
| `tenant_scheduled_jobs` | `main` | TenantScheduledJobsPage | 客户端 | — |

## 偏好 JSON Schema

```ts
type TablePreferenceConfig = {
  version: 1;
  rowHeight: number;           // px，默认 36
  sort?: { columnId: string; order: "asc" | "desc" } | null;
  columns: Record<string, {
    visible: boolean;
    pinned?: boolean;          // 横向滚动时固定于左侧
    width?: number;
    label?: string;
    tip?: string;
    order: number;
    actionOrder?: string[];    // 操作列按钮排序（仅 actions 列）
    actionInlineVisibleMax?: number; // 操作列直显按钮数（仅 actions 列）
  }>;
};
```

## 操作列

- 文案保持 2 字简洁（详情、编辑等）
- **总数 ≤ 直显数 + 1** 时全部直接显示为 link；超出时前 N 个直显，其余收入「更多」折叠菜单（Popover）。默认直显数为 2（即 ≤3 全显、>3 时第 3 个起折叠）
- 按钮权限：无权限的 item 不渲染（`TableActionItem.permission` + `hidden`）
- 操作列可在列设置中**取消右侧固定**、**取消显示**（桌面表格隐藏；手机端行内操作按钮仍按 `resolveActionItems` 展示）
- 排序与直显数：列设置抽屉「操作按钮排序」写入 `config.columns.actions.actionOrder` / `actionInlineVisibleMax`；页面 `ConfigurableTable` 传入 `actionsColumnPref={tablePrefs.config.columns.actions}`
- 列定义使用 `createActionsColumn({ actionDefs, renderItems })`，`actionDefs` 供设置抽屉展示可排序项

```tsx
createActionsColumn({
  actionDefs: [
    { id: "detail", label: "详情" },
    { id: "edit", label: "编辑" },
  ],
  renderItems: (row) => [
    { id: "detail", label: "详情", permission: "user.read", onClick: () => onDetail(row) },
    { id: "edit", label: "编辑", permission: "user.update", onClick: () => onEdit(row) },
  ],
});

<ConfigurableTable
  actionsColumnPref={tablePrefs.config.columns.actions}
  /* ... */
/>
```

- `columnId` 为稳定业务键，与列表 API `sort_by` 白名单字段对齐（见各 repo `*_SORT_FIELDS`）
- 「还原此列 / 全部还原」= 删除自定义项，回退页面注册的 `defaultColumns`；还原后若默认列宽之和小于视口，仍按比例自动铺满；超过视口则横向滚动

## 前端模块

| 模块 | 路径 | 职责 |
|---|---|---|
| 操作列 | `web/src/components/table/table-row-actions.tsx` | `TableRowActions`、`TableActionLink`、`createActionsColumn`（link 风格 + 权限 + 折叠） |
| 操作排序 | `web/src/components/table/table-action-order-settings.tsx` | 列设置抽屉内操作按钮排序与直显个数 |
| 类型与工具 | `web/src/types/table-preference.ts` | `TableColumnDef`、`resolveColumns`、`sortRows`、`cycleSortState` |
| IDB 缓存 | `web/src/db/table-pref-repo.ts` | Key：`${userId}:${pageKey}:${tableKey}`（Dexie `omni-local`） |
| Hook | `web/src/hooks/useTablePreferences.ts` | 读缓存、同步 API；列固定/显隐/顺序/列宽等立即写库，行高等 debounce 500ms；`setColumnWidths` 供表头拖拽物化 |
| 客户端表格 | `web/src/hooks/useClientTable.ts` | 偏好 + 前端排序 + `useClientPagination` |
| 表格组件 | `web/src/components/table/ConfigurableTable.tsx` | 应用列宽/行高/顺序/排序；不足视口按比例铺满；PC 表头拖拽调宽；`<lg` 可选手机端卡片/列表 |
| 列宽拖拽 | `web/src/components/table/use-table-column-resize.ts` | Pointer 拖拽预览；松手提交 `onColumnWidthsChange` |
| 列宽分配 | `distributeTableColumnWidths`（`table-preference.ts`） | 之和 &lt; 容器时按比例放大至铺满 |
| 手机端表格 | `web/src/components/table/table-mobile-*.tsx` | 瀑布流卡片 / 横向列表；行点击与桌面 `onRowClick` 一致；操作按钮行内直显 |
| 页头操作区 | `web/src/components/table/table-header-actions.tsx` | 业务按钮靠左，自定义字段 + 布局 icon 靠右 |
| 列头 | `web/src/components/table/SortableTableHead.tsx` | 点击 asc → desc → 无；有 Tips 时悬停列头显示气泡；PC 右边缘拖拽调宽 |
| 设置抽屉 | `web/src/components/table/TableColumnSettingsSheet.tsx` | 拖拽排序、列宽、别名、Tips、固定/显示；列卡片支持置顶/上移/下移/置底 link 按钮 |
| 入口按钮 | `web/src/components/table/TableSettingsButton.tsx` | PageHeader 操作区；须传 `title`，有 Tab 时传 `subtitle` |

## 新表格接入清单

1. 定义 `TableColumnDef<T>[]`：`id`、`label`、`defaultWidth`、`sortKey?`、`render`；操作列用 `createActionsColumn`
2. 选择 Hook：
   - **客户端分页**：`useClientTable({ pageKey, tableKey, rows, defaultColumns })`
   - **无分页 / 仅偏好**：`useTablePreferences` + `sortRows`
   - **服务端分页**：`useTablePreferences` + `onSortChange` 触发 reload，请求带 `sort_by`/`sort_order`（`sortKeyFromPreference`）
3. 渲染 `ConfigurableTable`（带 `actionsColumnPref`、`onColumnWidthsChange={prefs.setColumnWidths}`）+ `TableSettingsButton` + `TableColumnSettingsSheet`
4. 在本文档注册表补充 `pageKey.tableKey`
5. 若列表 API 尚无排序，后端 repo 增加白名单 `ORDER BY`（禁止拼接未白名单字段）

## 手机端布局

`ConfigurableTable` 在 `lg` 以下可切换为手机端视图（桌面端仍为原表格）：

| 布局 | `mobileLayout` | 说明 |
|---|---|---|
| 瀑布流卡片 | `masonry` | 双列等宽不等高；**按行左右优先**（第 1 条左、第 2 条右…）；每卡单列最多 6 行字段；字段值自动换行最多 3 行；点击卡片与桌面行点击一致 |
| 横向列表 | `list` | 单列列表；每行 3 列 × 最多 6 行字段预览；字段值自动换行最多 3 行；点击行与桌面行点击一致 |

- 行点击：有 `onRowClick` 时与其一致；否则触发操作列主操作（详情 > 编辑 > 首个）。不再打开全字段详情抽屉。
- 操作列按钮在卡片/列表行内直显（与桌面相同的直显/「更多」规则），**单行右对齐不换行**；可通过列设置控制顺序与直显个数。
- 手机端排序栏位于列表上方，展示可排序字段，与桌面列头排序状态同步（共用 `config.sort`）。
- 操作列须用 `createActionsColumn`（内部提供 `resolveActionItems` 供手机端读取）。
- 可选 `mobileLayoutToggle`：用户在卡片/列表间切换；偏好**全局共用**（`localStorage` 键 `omni-table-mobile-layout:global`），切换菜单或刷新页面后保持不变。
- 手机端下滑接近底部时**自动加载下一页**（客户端分页累积切片；服务端分页追加请求）；**仅在 `< lg` 视口挂载并触发**，避免 PC 端隐藏容器误触分页。列表底部显示加载状态，底部分页栏仍保留（可跳页/改每页条数）。
- 页头使用 `TableHeaderActions`：**功能按钮 → 自定义字段 → 手机布局 icon**，整体靠右；手机端**单行不换行**（超出横向滚动）。
- 含 `PageFilterToolbar` 的页面须用 `PageFilterToolbarProvider` 包裹；手机端筛选「展开/收起」与 `actions`（如导出）通过 `PageFilterToolbarHeaderActions` 放入页头、位于自定义字段左侧；桌面端仍在筛选栏内。
- 手机端按钮文案：`TableHeaderButton` 的 `mobileLabel` 尽量短（如「新建」）；`TableSettingsButton` 在 `<lg` 仅显示 icon。
- 接入：`mobileTableProps({ titleColumnId, detailTitle })` 统一生成 `ConfigurableTable` 手机端 props。

```tsx
const MOBILE_TABLE = mobileTableProps({
  titleColumnId: "display_name",
  detailTitle: (user) => user.display_name,
});

<TableHeaderActions
  settings={<TableSettingsButton title="用户管理" onClick={() => setSettingsOpen(true)} />}
  mobileLayoutToggle
>
  <TableHeaderButton type="button" mobileLabel="新建">新建用户</TableHeaderButton>
</TableHeaderActions>

{/* 含筛选栏时 */}
<PageFilterToolbarProvider hiddenActiveCount={hiddenFilterActiveCount}>
  <PageHeader
    action={
      <TableHeaderActions settings={...} mobileLayoutToggle>
        <PageFilterToolbarHeaderActions actions={<ExportButton />} />
      </TableHeaderActions>
    }
  />
  <PageFilterToolbar actions={<ExportButton />}>...</PageFilterToolbar>
</PageFilterToolbarProvider>

<ConfigurableTable {...MOBILE_TABLE} /* 其余 props */ />
```

## 接入示例（客户端分页）

```tsx
const columns = useMemo<TableColumnDef<UserRecord>[]>(() => [
  { id: "username", label: "用户名", defaultWidth: 120, sortKey: "username", render: (u) => u.username },
  { id: "actions", label: "操作", hideInSettings: true, render: (u) => <Actions user={u} /> },
], [/* handlers */]);

const table = useClientTable({ pageKey: "users", tableKey: "main", rows: users, defaultColumns: columns });

<ConfigurableTable
  rows={table.pagination.items}
  columns={table.resolvedColumns}
  rowHeight={table.rowHeight}
  sort={table.sort}
  rowKey={(u) => u.id}
  onSort={table.cycleSort}
/>
```

## 列表 API 排序

各 list 端点支持可选 Query：`sort_by`、`sort_order`（`asc` | `desc`）。未传或字段不在白名单时保持默认排序。

前端辅助：`web/src/lib/list-sort.ts` 中 `sortKeyFromPreference`。
