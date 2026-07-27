import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DevParamItemView } from "@/types/dev-param";
import { DevParamValueField } from "./dev-param-value-field";

export type DevParamDraft = {
  param_key: string;
  param_value: string;
  remark: string;
  label: string;
  description: string;
  placeholder: string;
  field_type: DevParamItemView["field_type"];
  editable: boolean;
  configured: boolean;
  select_options: DevParamItemView["select_options"];
};

const compactInputClass = "h-9 rounded-lg px-2.5 py-1 text-sm shadow-none hover:bg-muted/65 focus-visible:ring-2";

export function DevParamGroupEditSheet({
  open,
  onOpenChange,
  name,
  description,
  params,
  saving,
  onNameChange,
  onDescriptionChange,
  onParamValueChange,
  onParamRemarkChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  params: DevParamDraft[];
  saving: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onParamValueChange: (paramKey: string, value: string) => void;
  onParamRemarkChange: (paramKey: string, value: string) => void;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>编辑开发参数</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-4">
            <section className="grid gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground">分组信息</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <FormField label="名称" htmlFor="dev-group-name" required className="gap-1">
                  <Input
                    id="dev-group-name"
                    value={name}
                    className={compactInputClass}
                    onChange={(e) => onNameChange(e.target.value)}
                  />
                </FormField>
                <FormField label="描述" htmlFor="dev-group-description" className="gap-1">
                  <Input
                    id="dev-group-description"
                    value={description}
                    className={compactInputClass}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                  />
                </FormField>
              </div>
            </section>

            <section className="grid gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground">子参数</h3>
              {params.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无子参数</p>
              ) : (
                <div className="surface-glass overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[minmax(6.5rem,1fr)_minmax(0,1.6fr)_minmax(5rem,0.8fr)] gap-x-2 border-b border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                    <span>参数</span>
                    <span>值</span>
                    <span>备注</span>
                  </div>
                  {params.map((item) => (
                    <div key={item.param_key} className="border-b border-border/70 px-2.5 py-2 last:border-b-0">
                      <div className="grid grid-cols-[minmax(6.5rem,1fr)_minmax(0,1.6fr)_minmax(5rem,0.8fr)] items-start gap-x-2">
                        <div className="min-w-0 self-center">
                          <p className="truncate text-sm leading-tight text-foreground">{item.label}</p>
                          <p className="truncate text-[11px] leading-tight text-muted-foreground">{item.param_key}</p>
                        </div>
                        <div className="flex h-9 min-w-0 items-center">
                          <DevParamValueField
                            htmlId={`dev-param-value-${item.param_key}`}
                            fieldType={item.field_type}
                            value={item.param_value}
                            configured={item.configured}
                            selectOptions={item.select_options}
                            placeholder={item.placeholder}
                            readOnly={!item.editable}
                            compact
                            onChange={(value) => onParamValueChange(item.param_key, value)}
                          />
                        </div>
                        <div className="flex h-9 min-w-0 items-center">
                          <Input
                            id={`dev-param-remark-${item.param_key}`}
                            value={item.remark}
                            placeholder="备注"
                            readOnly={!item.editable}
                            className={compactInputClass}
                            onChange={(e) => onParamRemarkChange(item.param_key, e.target.value)}
                          />
                        </div>
                      </div>
                      {item.description ? (
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={saving} onClick={onSave}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
