"""个人中心 API（登录即可访问，不经 RBAC 路径映射）。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from omni_api.api.deps import get_current_user, get_session_token
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.user_profile import (
    ChangePasswordRequest,
    IdentityVerifyRequest,
    UserProfile,
    UserProfileUpdate,
)
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_credentials import verify_password
from omni_api.services.auth_service import hash_password
from omni_api.services.session_service import SessionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/users/me",
    tags=["user-profile"],
    dependencies=[Depends(get_current_user)],
)


def _repo() -> UserRepo:
    return UserRepo(mysql_engine())


@router.get("/profile", response_model=UserProfile)
async def get_my_profile(actor: UserRecord = Depends(get_current_user)) -> UserProfile:
    profile = await _repo().get_profile(actor.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return profile


@router.patch("/profile", response_model=UserProfile)
async def update_my_profile(
    body: UserProfileUpdate,
    actor: UserRecord = Depends(get_current_user),
    token: str | None = Depends(get_session_token),
) -> UserProfile:
    if body.display_name is None and body.avatar_url is None:
        raise HTTPException(status_code=400, detail="未提供可更新字段")
    before = await _repo().get_profile(actor.id)
    profile = await _repo().update_profile(actor.id, body, actor_id=actor.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    if token:
        await SessionService().patch_profile(token, profile.display_name, profile.avatar_url)
    await AuditService().record_operation(
        category="user",
        action="profile_update",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(actor.id),
        before=before,
        after=profile,
        username=actor.username,
    )
    return profile


@router.post("/change-password")
async def change_my_password(
    body: ChangePasswordRequest,
    actor: UserRecord = Depends(get_current_user),
    token: str | None = Depends(get_session_token),
) -> dict[str, str]:
    repo = _repo()
    row = await repo.get_by_username(actor.username)
    if row is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    _, password_hash = row
    if not verify_password(body.old_password, password_hash):
        raise HTTPException(status_code=400, detail="原密码不正确")
    if body.old_password == body.new_password:
        raise HTTPException(status_code=400, detail="新密码须与原密码不同")
    ok = await repo.change_password(
        actor.id, hash_password(body.new_password), actor_id=actor.id
    )
    if not ok:
        raise HTTPException(status_code=404, detail="用户不存在")
    if token:
        await SessionService().revoke_other_sessions(actor.id, token)
    await AuditService().record_operation(
        category="user",
        action="change_password",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(actor.id),
        username=actor.username,
    )
    return {"status": "ok"}


@router.post("/identity", response_model=UserProfile)
async def verify_my_identity(
    body: IdentityVerifyRequest,
    actor: UserRecord = Depends(get_current_user),
) -> UserProfile:
    try:
        profile = await _repo().verify_identity(
            actor.id,
            real_name=body.real_name,
            id_card=body.id_card,
            actor_id=actor.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if profile is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    await AuditService().record_operation(
        category="user",
        action="identity_verify",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(actor.id),
        after=profile,
        username=actor.username,
    )
    return profile
