"""权限树构建。"""

from __future__ import annotations

from omni_api.auth.permission_seed import ASSIGNABLE_KINDS
from omni_api.schemas.rbac import PermissionRecord


def _perm_to_node(p: PermissionRecord, api_codes: list[str] | None = None) -> dict:
    return {
        "id": p.id,
        "code": p.code,
        "name": p.name,
        "kind": p.kind,
        "parent_id": p.parent_id,
        "sort_order": p.sort_order,
        "enabled": p.enabled,
        "route_path": p.route_path,
        "component_key": p.component_key,
        "api_codes": api_codes if api_codes is not None else [],
        "children": [],
    }


def _attach_api_children(
    nodes: dict[int, dict],
    code_to_perm: dict[str, PermissionRecord],
    bindings: dict[str, list[str]],
    *,
    enabled_only: bool,
) -> None:
    """将绑定的接口权限挂到目录/菜单/按钮节点下。"""
    for node in nodes.values():
        api_children: list[dict] = []
        for api_code in bindings.get(node["code"], []):
            api_perm = code_to_perm.get(api_code)
            if api_perm is None or api_perm.kind != "api":
                continue
            if enabled_only and not api_perm.enabled:
                continue
            api_children.append(_perm_to_node(api_perm))
        api_children.sort(key=lambda c: (c["sort_order"], c["id"]))
        node["children"].extend(api_children)


def build_permission_tree_nodes(
    perms: list[PermissionRecord],
    bindings: dict[str, list[str]],
    *,
    assignable_only: bool,
    nav_only: bool = False,
    enabled_only: bool = False,
) -> list[dict]:
    code_to_perm = {p.code: p for p in perms}

    if nav_only:
        structure_perms = [
            p for p in perms if p.enabled and p.kind in ("catalog", "menu")
        ]
        attach_api = False
    else:
        structure_perms = [p for p in perms if p.kind in ASSIGNABLE_KINDS]
        if enabled_only:
            structure_perms = [p for p in structure_perms if p.enabled]
        attach_api = True

    nodes: dict[int, dict] = {}
    for p in structure_perms:
        nodes[p.id] = _perm_to_node(p, bindings.get(p.code, []))

    roots: list[dict] = []
    for p in sorted(structure_perms, key=lambda x: (x.sort_order, x.id)):
        node = nodes[p.id]
        if p.parent_id is not None and p.parent_id in nodes:
            nodes[p.parent_id]["children"].append(node)
        else:
            roots.append(node)

    if attach_api:
        _attach_api_children(
            nodes, code_to_perm, bindings, enabled_only=enabled_only
        )

    for node in nodes.values():
        node["children"].sort(key=lambda c: (c["sort_order"], c["id"]))
    roots.sort(key=lambda c: (c["sort_order"], c["id"]))
    return roots
