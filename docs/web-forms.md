# Web 表单与错误反馈

前端表单控件统一使用 shadcn/ui + 项目表单原语。设计令牌见 [web-theme.md](web-theme.md)。

## 控件映射

| 场景 | 组件 | 路径 |
|---|---|---|
| 字段样式令牌 | `field-control.ts` | `web/src/lib/field-control.ts` |
| 文本输入 | `Input` | `web/src/components/ui/input.tsx` |
| 多行文本 | `Textarea` | `web/src/components/ui/textarea.tsx` |
| 下拉选择 | `Select` | `web/src/components/ui/select.tsx` |
| 开关 | `Switch` | `web/src/components/ui/switch.tsx` |
| 复选框 | `Checkbox` | `web/src/components/ui/checkbox.tsx` |
| 复选框组 | `CheckboxGroup` | `web/src/components/form/checkbox-group.tsx` |
| 表单字段包装 | `FormField` | `web/src/components/form/form-field.tsx` |
| 必填星号 | `RequiredMark` | `web/src/components/form/required-mark.tsx` |
| 字段错误 | `FieldError` | `web/src/components/form/field-error.tsx` |
| 区块错误 | `FormSectionError` | `web/src/components/form/form-section-error.tsx` |

**禁止**在 `web/src/pages/` 与 `web/src/components/`（`ui/` 除外）使用原生 `<input type="checkbox|radio">`、`<select>`、`<textarea>`。

## Apple HIG 对照

完整规则见 [AGENTS.md](../AGENTS.md)「前端」。要点：

- 官方：[Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- Sheet 关闭：纯图标，无 ring/边框
- 筛选：四列 flex（全端一致）；`FilterField span` + `PageFilterToolbar`
- 文案：按钮用动词

## 输入字段样式（Apple 填充式）

- 单行/下拉：`fieldControlClass`（`rounded-xl`、`h-11`、`bg-muted/50`、focus 柔和 ring）
- 多行：`fieldTextareaClass`
- 标签在上：`FormField` + `Label`（`text-xs` 弱对比）
- 筛选：`FilterField` + `PageFilterToolbar`（手机展开单列 / lg 4 列 / 2xl 6 列栅格）

## 错误反馈决策

```
错误发生
  ├─ 可关联单个字段？ → P1：FormField 下方 FieldError（修改后 clearFieldError 消失）
  ├─ 多字段关联？     → P1：FormSectionError 置于对应区块
  ├─ API/操作失败？   → P2：showToastError（Sonner 气泡，top-center）
  └─ 阻断性错误？     → P3：showBlockingError（AlertDialog）
```

| 保留 PageMessage 的场景 |
|---|
| 非错误引导文案（如「请先在机构管理中创建机构」） |
| 整页数据加载失败（列表无法展示时的阻断提示） |

Sheet 抽屉内表单校验**不得**仅写入页顶 `PageMessage`——用户在抽屉中看不到页顶错误。

## 必填标记

- 视觉：`<RequiredMark />`（红色 `*`）
- 语义：`FormField required` 或 HTML `required`（二者同时使用）
- 示例：

```tsx
<FormField label="用户名" htmlFor="user-username" required error={fieldErrors.username}>
  <Input id="user-username" aria-invalid={!!fieldErrors.username} ... />
</FormField>
```

## Sheet 表单模板

```tsx
const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();

<Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) clearFieldErrors(); }}>
  <SheetContent side="right" className="p-0 sm:max-w-md">
    <SheetHeader><SheetTitle>新建</SheetTitle></SheetHeader>
    <SheetBody>
      <form id="my-form" className="grid gap-4" onSubmit={handleSubmit}>
        <FormField label="名称" htmlFor="name" required error={fieldErrors.name}>
          <Input id="name" aria-invalid={!!fieldErrors.name}
            onChange={(e) => { setName(e.target.value); clearFieldError("name"); }} />
        </FormField>
      </form>
    </SheetBody>
    <SheetFooter>
      <Button variant="secondary" onClick={() => setOpen(false)}>取消</Button>
      <Button type="submit" form="my-form">保存</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

## 工具 API

[`web/src/lib/form-feedback.ts`](../web/src/lib/form-feedback.ts)：

| 函数 | 用途 |
|---|---|
| `showToastError(message)` | P2 全局错误气泡 |
| `showToastSuccess(message)` | 成功气泡 |
| `showBlockingError(title, message)` | P3 阻断弹窗 |
| `errorMessage(err, fallback)` | 从 Error 提取文案 |

[`web/src/hooks/useFieldErrors.ts`](../web/src/hooks/useFieldErrors.ts)：

| 成员 | 用途 |
|---|---|
| `fieldErrors` | 当前字段错误映射 |
| `setFieldErrors({ field: msg })` | 批量设置 |
| `clearFieldError(field)` | 单字段清除（onChange 时调用） |
| `clearFieldErrors()` | 打开/关闭 Sheet 时清空 |

## 与后端 ApiError 配合

[`web/src/lib/api.ts`](../web/src/lib/api.ts) 抛出 `ApiError`，`detail` 为字符串。调用方按场景选择反馈层级：

- 字段级业务规则（前端校验）→ P1 内联
- 后端返回的通用错误（如「用户名已存在」）→ P2 Toast
- 不在 `api.ts` 层自动 toast，避免重复提示

## 全局宿主

[`web/src/App.tsx`](../web/src/App.tsx) 根节点挂载：

- `<Toaster richColors closeButton position="top-center" />`
- `<BlockingErrorHost />`
