import { FieldError } from "@/components/form/field-error";
import { RequiredMark } from "@/components/form/required-mark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RegionNode, RegionSelection } from "@/lib/china-region";

interface RegionCascaderSelectsProps {
  regionData: RegionNode[];
  selectionCodes: { provinceCode: string; cityCode: string; districtCode: string };
  provinceNode: RegionNode | undefined;
  cityNode: RegionNode | undefined;
  value: RegionSelection;
  disabled: boolean;
  required: boolean;
  error?: string;
  portalContainer: HTMLElement | null | undefined;
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
}

export function RegionCascaderSelects({
  regionData,
  selectionCodes,
  provinceNode,
  cityNode,
  value,
  disabled,
  required,
  error,
  portalContainer,
  onProvinceChange,
  onCityChange,
  onDistrictChange,
}: RegionCascaderSelectsProps) {
  const reqMark = required ? <RequiredMark /> : null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>省份{reqMark}</Label>
        <Select
          value={selectionCodes.provinceCode || undefined}
          options={regionData.map((p) => ({ value: p.value, label: p.label }))}
          onValueChange={onProvinceChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择省份" />
          </SelectTrigger>
          <SelectContent portalContainer={portalContainer}>
            {regionData.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>城市{reqMark}</Label>
        <Select
          value={selectionCodes.cityCode || undefined}
          options={(provinceNode?.children ?? []).map((c) => ({ value: c.value, label: c.label }))}
          onValueChange={onCityChange}
          disabled={disabled || !provinceNode}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择城市" />
          </SelectTrigger>
          <SelectContent portalContainer={portalContainer}>
            {(provinceNode?.children ?? []).map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>区县{reqMark}</Label>
        <Select
          value={selectionCodes.districtCode || undefined}
          options={(cityNode?.children ?? []).map((d) => ({ value: d.value, label: d.label }))}
          onValueChange={onDistrictChange}
          disabled={disabled || !cityNode}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择区县" />
          </SelectTrigger>
          <SelectContent portalContainer={portalContainer}>
            {(cityNode?.children ?? []).map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tenant-region-code">地区编码</Label>
        <Input
          id="tenant-region-code"
          value={value.region}
          readOnly
          disabled
          className="font-mono text-xs"
          placeholder="选择区县后自动填写"
        />
        <p className="text-xs text-muted-foreground">根据所选区县自动生成行政区划码</p>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
