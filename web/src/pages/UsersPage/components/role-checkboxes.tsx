import { CheckboxGroup } from "@/components/form/checkbox-group";
import type { RoleSummary } from "@/types/auth";

export function RoleCheckboxes({
  roles,
  selected,
  onChange,
}: {
  roles: RoleSummary[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无租户角色</p>;
  }
  return (
    <CheckboxGroup
      items={roles.map((r) => ({
        id: `role-${r.id}`,
        value: r.id,
        label: (
          <>
            {r.name} <span className="text-muted-foreground">({r.code})</span>
          </>
        ),
      }))}
      selected={selected}
      onChange={(values) => onChange(values.map(Number))}
    />
  );
}
