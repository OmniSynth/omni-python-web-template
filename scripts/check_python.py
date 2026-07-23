#!/usr/bin/env python3
"""按 AGENTS.md「Python」「布局与文档」规范检查 Python 源码。"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import TypeGuard

MAX_FILE_LINES = 400
WARN_FILE_LINES = 300
MAX_FUNC_BODY_LINES = 50
MAX_NEST_DEPTH = 2
MAX_LINE_WIDTH = 120

SKIP_DIRS = {".git", ".venv", "__pycache__", "build", "dist", ".eggs"}
PRINT_OK_TOP_DIRS = frozenset({"scripts"})
NEST_FUNC_LINE_SKIP_TOP_DIRS = frozenset({"tests"})
BAD_STEMS = frozenset({"utils", "common", "handler", "misc", "helpers", "manager"})
PLACEHOLDER_PATTERNS = (
    re.compile(r"#\s*TODO:\s*剩余逻辑", re.I),
    re.compile(r"#\s*\.\.\.\s*保持不变", re.I),
    re.compile(r"#\s*请在此处添加逻辑", re.I),
)
SECRET_PATTERNS = (
    re.compile(r"mysql(\+[\w]+)?://[^\"'\s${}]+@", re.I),
    re.compile(r"postgres(ql)?://[^\"'\s${}]+@", re.I),
    re.compile(r"redis://:[^\"'\s]+@", re.I),
    re.compile(r"(password|secret|api_key)\s*=\s*['\"][^'\"]{8,}['\"]", re.I),
)
CONTROL_NODES = (
    ast.If,
    ast.For,
    ast.While,
    ast.Try,
    ast.With,
    ast.AsyncFor,
    ast.AsyncWith,
)
MUTABLE_CALL_NAMES = frozenset({"dict", "list", "set"})


class Level(Enum):
    ERROR = "error"
    WARN = "warn"


@dataclass(frozen=True)
class Issue:
    level: Level
    rule: str
    path: Path
    line: int
    message: str

    def format(self, root: Path) -> str:
        rel = self.path.relative_to(root)
        tag = "错误" if self.level == Level.ERROR else "警告"
        return f"[{tag}] {rel}:{self.line} [{self.rule}] {self.message}"


def _top_dir(rel: Path) -> str | None:
    parts = rel.parts
    return parts[0] if parts else None


def iter_py_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*.py"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        files.append(path)
    return sorted(files)


def is_public_api(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    return not node.name.startswith("_")


def is_dunder_init_arg(name: str | None) -> bool:
    return name in {"self", "cls"}


def missing_arg_annotations(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    missing: list[str] = []
    args = list(node.args.posonlyargs) + list(node.args.args) + list(node.args.kwonlyargs)
    for arg in args:
        if is_dunder_init_arg(arg.arg):
            continue
        if arg.annotation is None:
            missing.append(arg.arg)
    if node.args.vararg and node.args.vararg.annotation is None:
        missing.append(f"*{node.args.vararg.arg}")
    if node.args.kwarg and node.args.kwarg.annotation is None:
        missing.append(f"**{node.args.kwarg.arg}")
    return missing


def func_body_line_count(node: ast.FunctionDef | ast.AsyncFunctionDef, lines: list[str]) -> int:
    if not node.body:
        return 0
    start = node.body[0].lineno
    end = node.end_lineno or start
    count = 0
    for i in range(start - 1, end):
        stripped = lines[i].strip()
        if stripped and not stripped.startswith("#"):
            count += 1
    return count


def max_control_depth(node: ast.AST, depth: int = 0) -> int:
    peak = depth
    for child in ast.iter_child_nodes(node):
        next_depth = depth + 1 if isinstance(child, CONTROL_NODES) else depth
        peak = max(peak, max_control_depth(child, next_depth))
    return peak


def max_body_control_depth(node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    peak = 0
    for stmt in node.body:
        peak = max(peak, max_control_depth(stmt, 0))
    return peak


def is_silent_except(handler: ast.ExceptHandler) -> bool:
    if handler.type is None:
        return _body_is_empty(handler.body)
    if isinstance(handler.type, ast.Name) and handler.type.id == "Exception":
        return _body_is_empty(handler.body)
    return False


def _body_is_empty(body: list[ast.stmt]) -> bool:
    if not body:
        return True
    return len(body) == 1 and isinstance(body[0], ast.Pass)


def _is_print_call(node: ast.AST) -> TypeGuard[ast.Call]:
    return isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "print"


def _is_empty_mutable_module_value(node: ast.AST) -> bool:
    """仅拦截会在运行期累积状态的模块级空容器，常量映射表不算。"""
    if isinstance(node, ast.Dict) and len(node.keys) == 0:
        return True
    if isinstance(node, ast.List) and len(node.elts) == 0:
        return True
    if isinstance(node, ast.Set) and len(node.elts) == 0:
        return True
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        return node.func.id in MUTABLE_CALL_NAMES and not node.args and not node.keywords
    return False


def _module_mutable_globals(tree: ast.Module) -> list[tuple[int, str]]:
    issues: list[tuple[int, str]] = []
    for node in tree.body:
        if isinstance(node, ast.Assign):
            if not _is_empty_mutable_module_value(node.value):
                continue
            names = [t.id for t in node.targets if isinstance(t, ast.Name)]
            if names:
                issues.append((node.lineno, f"禁止模块级可变全局: {', '.join(names)}"))
        elif (
            isinstance(node, ast.AnnAssign)
            and node.value
            and _is_empty_mutable_module_value(node.value)
            and isinstance(node.target, ast.Name)
        ):
            issues.append((node.lineno, f"禁止模块级可变全局: {node.target.id}"))
    return issues


def _attach_parents(tree: ast.AST) -> None:
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            child.parent = parent  # type: ignore[attr-defined]


def _inside_with(node: ast.AST) -> bool:
    parent = getattr(node, "parent", None)
    while parent is not None:
        if isinstance(parent, (ast.With, ast.AsyncWith)):
            return True
        parent = getattr(parent, "parent", None)
    return False


def _open_assigned_outside_with(tree: ast.AST) -> list[tuple[int, str]]:
    issues: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign) or not isinstance(node.value, ast.Call):
            continue
        func = node.value.func
        if isinstance(func, ast.Name) and func.id == "open" and not _inside_with(node):
            issues.append((node.lineno, "open() 赋值未使用 with/async with"))
    return issues


def _hardcoded_secrets(lines: list[str]) -> list[tuple[int, str]]:
    issues: list[tuple[int, str]] = []
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(line):
                issues.append((idx, "疑似硬编码密钥或连接串"))
                break
    return issues


def check_file(path: Path, root: Path) -> list[Issue]:
    issues: list[Issue] = []
    rel = path.relative_to(root)
    top = _top_dir(rel)
    skip_nest_and_func = top in NEST_FUNC_LINE_SKIP_TOP_DIRS
    allow_print = top in PRINT_OK_TOP_DIRS
    stem = path.stem.lower()

    if stem in BAD_STEMS:
        issues.append(Issue(Level.WARN, "bad-filename", path, 1, f"避免笼统文件名: {path.name}"))
    if re.search(r"and|sync", stem) and "_" in stem:
        issues.append(Issue(Level.WARN, "bad-filename", path, 1, f"文件名疑似拼接多职责: {path.name}"))

    line_count = len(path.read_text(encoding="utf-8").splitlines())
    if line_count > MAX_FILE_LINES:
        issues.append(
            Issue(Level.ERROR, "file-lines", path, 1, f"文件 {line_count} 行，超过上限 {MAX_FILE_LINES}")
        )
    elif line_count > WARN_FILE_LINES:
        issues.append(
            Issue(Level.WARN, "file-lines", path, 1, f"文件 {line_count} 行，接近拆分阈值 {WARN_FILE_LINES}")
        )

    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()
    for idx, line in enumerate(lines, start=1):
        if len(line) > MAX_LINE_WIDTH:
            issues.append(
                Issue(Level.ERROR, "line-width", path, idx, f"行宽 {len(line)} 超过上限 {MAX_LINE_WIDTH}")
            )
        for pattern in PLACEHOLDER_PATTERNS:
            if pattern.search(line):
                issues.append(Issue(Level.ERROR, "placeholder", path, idx, "存在未完成逻辑占位注释"))

    for idx, msg in _hardcoded_secrets(lines):
        issues.append(Issue(Level.ERROR, "hardcoded-secret", path, idx, msg))

    try:
        tree = ast.parse(source, filename=str(rel))
    except SyntaxError as exc:
        issues.append(Issue(Level.ERROR, "syntax", path, exc.lineno or 1, str(exc.msg)))
        return issues

    if not isinstance(tree, ast.Module):
        return issues

    _attach_parents(tree)

    for lineno, msg in _module_mutable_globals(tree):
        issues.append(Issue(Level.ERROR, "mutable-global", path, lineno, msg))

    for node in ast.walk(tree):
        if isinstance(node, ast.Global):
            issues.append(Issue(Level.ERROR, "global", path, node.lineno, "使用了 global 语句"))

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        if not skip_nest_and_func:
            body_lines = func_body_line_count(node, lines)
            if body_lines > MAX_FUNC_BODY_LINES:
                issues.append(
                    Issue(
                        Level.ERROR,
                        "func-lines",
                        path,
                        node.lineno,
                        f"函数 {node.name!r} 函数体 {body_lines} 行，超过上限 {MAX_FUNC_BODY_LINES}",
                    )
                )
            depth = max_body_control_depth(node)
            if depth > MAX_NEST_DEPTH:
                issues.append(
                    Issue(
                        Level.ERROR,
                        "nest-depth",
                        path,
                        node.lineno,
                        f"函数 {node.name!r} 控制流嵌套 {depth} 层，超过上限 {MAX_NEST_DEPTH}",
                    )
                )

        if is_public_api(node):
            missing_args = missing_arg_annotations(node)
            if missing_args:
                issues.append(
                    Issue(
                        Level.ERROR,
                        "type-hint",
                        path,
                        node.lineno,
                        f"函数 {node.name!r} 缺少参数类型: {', '.join(missing_args)}",
                    )
                )
            if node.returns is None:
                issues.append(
                    Issue(
                        Level.ERROR,
                        "type-hint",
                        path,
                        node.lineno,
                        f"函数 {node.name!r} 缺少返回值类型注解",
                    )
                )

    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler) and is_silent_except(node):
            issues.append(
                Issue(Level.ERROR, "silent-except", path, node.lineno, "禁止 bare except 或 except Exception: pass")
            )

    if not allow_print:
        for node in ast.walk(tree):
            if _is_print_call(node):
                issues.append(
                    Issue(Level.ERROR, "print", path, node.lineno, "使用 print()，生产代码应改用 logging")
                )

    for lineno, msg in _open_assigned_outside_with(tree):
        issues.append(Issue(Level.ERROR, "resource", path, lineno, msg))

    return issues


def run_checks(root: Path) -> list[Issue]:
    issues: list[Issue] = []
    py_files = iter_py_files(root)
    if not py_files:
        issues.append(Issue(Level.WARN, "scan", root, 0, f"未在 {root} 下找到 Python 文件"))
        return issues
    self_path = Path(__file__).resolve()
    for path in py_files:
        if path.resolve() == self_path:
            continue
        issues.extend(check_file(path, root))
    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查项目是否符合 AGENTS.md Python 规范")
    parser.add_argument("root", nargs="?", default=".", type=Path, help="项目根目录（默认当前目录）")
    parser.add_argument("--warn-only", action="store_true", help="仅以警告级别退出（不因 error 返回非零）")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    issues = run_checks(root)
    errors = [i for i in issues if i.level == Level.ERROR]
    warns = [i for i in issues if i.level == Level.WARN]
    for issue in sorted(issues, key=lambda i: (i.path, i.line, i.rule)):
        print(issue.format(root))
    print()
    print(f"扫描完成: {len(errors)} 个错误, {len(warns)} 个警告")
    if errors and not args.warn_only:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
