"""RBAC 操作人上下文与审计参数测试。"""

from omni_api.data.mysql.actor import (
    get_actor_id,
    get_actor_username,
    reset_actor_token,
    reset_actor_username_token,
    set_actor_id,
    set_actor_username,
)
from omni_api.data.mysql.audit import audit_insert_params, audit_update_params


def test_actor_context_roundtrip() -> None:
    assert get_actor_id() is None
    assert get_actor_username() is None
    id_token = set_actor_id(42)
    name_token = set_actor_username("alice")
    try:
        assert get_actor_id() == 42
        assert get_actor_username() == "alice"
    finally:
        reset_actor_username_token(name_token)
        reset_actor_token(id_token)
    assert get_actor_id() is None
    assert get_actor_username() is None


def test_audit_params_from_actor() -> None:
    token = set_actor_id(7)
    try:
        assert audit_insert_params() == {"created_by": 7, "updated_by": 7}
        assert audit_update_params() == {"updated_by": 7}
    finally:
        reset_actor_token(token)
