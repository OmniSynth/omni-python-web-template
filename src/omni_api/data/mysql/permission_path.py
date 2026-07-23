"""API 路径模式匹配。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ApiRouteRow:
    code: str
    method: str
    pattern: str
    pattern_len: int


def match_path_pattern(pattern: str, path: str) -> bool:
    """匹配路径模式；`*` 表示单段通配。"""
    pp = [p for p in pattern.strip("/").split("/") if p]
    pv = [p for p in path.strip("/").split("/") if p]
    if len(pp) != len(pv):
        return False
    for seg_p, seg_v in zip(pp, pv, strict=True):
        if seg_p == "*":
            continue
        if seg_p != seg_v:
            return False
    return True
