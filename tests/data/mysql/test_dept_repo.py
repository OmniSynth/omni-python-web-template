"""DeptRepo 单元测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

from omni_api.data.mysql.dept_repo import DeptRepo
from omni_api.schemas.tenant import DeptCreate, DeptRecord, DeptUpdate


def _dept(
    dept_id: int,
    *,
    parent_id: int = 0,
    name: str = "部门",
) -> DeptRecord:
    return DeptRecord(
        id=dept_id,
        parent_id=parent_id,
        name=name,
        sort_order=0,
        enabled=True,
    )


def test_validate_parent_rejects_self() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(2))

        try:
            await repo._validate_parent(1, 2, 2)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "自身" in str(exc)

    asyncio.run(_run())


def test_validate_parent_rejects_missing_parent() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=None)

        try:
            await repo._validate_parent(1, None, 99)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "不存在" in str(exc)

    asyncio.run(_run())


def test_validate_parent_rejects_descendant_as_parent() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(3, parent_id=2))
        repo.list_descendant_ids = AsyncMock(return_value=[2, 3, 4])

        try:
            await repo._validate_parent(1, 2, 3)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "子部门" in str(exc)

    asyncio.run(_run())


def test_create_rejects_empty_name() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())

        try:
            await repo.create(1, DeptCreate(name="   "))
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "名称" in str(exc)

    asyncio.run(_run())


def test_update_rejects_empty_name() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(1))

        try:
            await repo.update(1, 1, DeptUpdate(name=" "))
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "名称" in str(exc)

    asyncio.run(_run())


def test_delete_returns_false_when_missing() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=None)

        deleted = await repo.delete(1, 99)
        assert deleted is False

    asyncio.run(_run())


def test_delete_rejects_when_has_children() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(1, parent_id=10))
        repo._list_all_flat = AsyncMock(return_value=[_dept(1, parent_id=10), _dept(2, parent_id=1)])

        try:
            await repo.delete(1, 1)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "子部门" in str(exc)

    asyncio.run(_run())


def test_delete_rejects_when_user_bound() -> None:
    async def _run() -> None:
        engine = MagicMock()
        conn = AsyncMock()
        conn.execute = AsyncMock(side_effect=[MagicMock(fetchone=MagicMock(return_value=(1,)))])
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=conn)
        cm.__aexit__ = AsyncMock(return_value=None)
        engine.connect = MagicMock(return_value=cm)

        repo = DeptRepo(engine)
        repo.get_by_id = AsyncMock(return_value=_dept(5, parent_id=10))
        repo._list_all_flat = AsyncMock(return_value=[_dept(5, parent_id=10)])

        try:
            await repo.delete(1, 5)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "用户" in str(exc)

    asyncio.run(_run())


def test_delete_rejects_when_role_scope_references() -> None:
    async def _run() -> None:
        engine = MagicMock()
        conn = AsyncMock()
        conn.execute = AsyncMock(
            side_effect=[
                MagicMock(fetchone=MagicMock(return_value=None)),
                MagicMock(fetchone=MagicMock(return_value=(1,))),
            ]
        )
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=conn)
        cm.__aexit__ = AsyncMock(return_value=None)
        engine.connect = MagicMock(return_value=cm)

        repo = DeptRepo(engine)
        repo.get_by_id = AsyncMock(return_value=_dept(6, parent_id=10))
        repo._list_all_flat = AsyncMock(return_value=[_dept(6, parent_id=10)])

        try:
            await repo.delete(1, 6)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "角色" in str(exc)

    asyncio.run(_run())


def test_create_rejects_second_root() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo._list_all_flat = AsyncMock(return_value=[_dept(1, parent_id=0)])

        try:
            await repo.create(1, DeptCreate(name="第二个顶级", parent_id=0))
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "顶级部门" in str(exc)

    asyncio.run(_run())


def test_update_rejects_demote_root() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(1, parent_id=0))
        repo._list_all_flat = AsyncMock(return_value=[_dept(1, parent_id=0), _dept(2, parent_id=1)])

        try:
            await repo.update(1, 1, DeptUpdate(parent_id=2))
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "顶级部门" in str(exc)

    asyncio.run(_run())


def test_update_rejects_disable_root() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(1, parent_id=0))
        repo._list_all_flat = AsyncMock(return_value=[_dept(1, parent_id=0)])

        try:
            await repo.update(1, 1, DeptUpdate(enabled=False))
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "不可禁用" in str(exc)

    asyncio.run(_run())


def test_delete_rejects_root() -> None:
    async def _run() -> None:
        repo = DeptRepo(MagicMock())
        repo.get_by_id = AsyncMock(return_value=_dept(1, parent_id=0))

        try:
            await repo.delete(1, 1)
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "顶级部门" in str(exc)

    asyncio.run(_run())


def test_delete_success() -> None:
    async def _run() -> None:
        engine = MagicMock()
        read_conn = AsyncMock()
        read_conn.execute = AsyncMock(
            side_effect=[
                MagicMock(fetchone=MagicMock(return_value=None)),
                MagicMock(fetchone=MagicMock(return_value=None)),
                MagicMock(fetchone=MagicMock(return_value=None)),
            ]
        )
        read_cm = MagicMock()
        read_cm.__aenter__ = AsyncMock(return_value=read_conn)
        read_cm.__aexit__ = AsyncMock(return_value=None)

        write_conn = AsyncMock()
        write_conn.execute = AsyncMock()
        write_cm = MagicMock()
        write_cm.__aenter__ = AsyncMock(return_value=write_conn)
        write_cm.__aexit__ = AsyncMock(return_value=None)

        engine.connect = MagicMock(return_value=read_cm)
        engine.begin = MagicMock(return_value=write_cm)

        repo = DeptRepo(engine)
        repo.get_by_id = AsyncMock(return_value=_dept(7, parent_id=10))
        repo._list_all_flat = AsyncMock(return_value=[_dept(7, parent_id=10)])

        deleted = await repo.delete(1, 7)
        assert deleted is True
        write_conn.execute.assert_awaited_once()

    asyncio.run(_run())


def test_list_tree_includes_ancestors_for_scoped_flat() -> None:
    async def _run() -> None:
        root = _dept(1, parent_id=0, name="总部")
        child = _dept(2, parent_id=1, name="研发")
        grandchild = _dept(3, parent_id=2, name="后端")
        repo = DeptRepo(MagicMock())
        repo._list_all_flat = AsyncMock(return_value=[grandchild])
        repo._all_flat = AsyncMock(return_value=[root, child, grandchild])

        tree = await repo.list_tree(1)

        assert len(tree) == 1
        assert tree[0].id == 1
        assert len(tree[0].children) == 1
        assert tree[0].children[0].id == 2
        assert tree[0].children[0].children[0].id == 3

    asyncio.run(_run())


def test_expand_with_ancestors_returns_visible_when_no_parent() -> None:
    visible = [_dept(5, parent_id=0)]
    expanded = DeptRepo._expand_with_ancestors(visible, {5: visible[0]})
    assert [d.id for d in expanded] == [5]
