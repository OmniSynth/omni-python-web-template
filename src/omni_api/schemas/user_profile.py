"""个人中心 DTO。"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from omni_api.schemas.utc_datetime import UtcDateTime


class UserProfile(BaseModel):
    """当前用户个人资料（只读）。"""

    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    real_name: str | None = None
    id_card_masked: str | None = None
    identity_verified: bool = False
    identity_verified_at: UtcDateTime | None = None


class UserProfileUpdate(BaseModel):
    """更新昵称与头像。"""

    display_name: str | None = Field(default=None, max_length=128)
    avatar_url: str | None = Field(default=None, max_length=512)

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        name = value.strip()
        if not name:
            raise ValueError("昵称必填")
        return name

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        url = value.strip()
        if not url:
            return None
        if not url.startswith(("http://", "https://")):
            raise ValueError("头像须为 http(s) 链接")
        return url


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class IdentityVerifyRequest(BaseModel):
    real_name: str = Field(min_length=2, max_length=64)
    id_card: str = Field(min_length=18, max_length=18)

    @field_validator("real_name")
    @classmethod
    def validate_real_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("姓名必填")
        return name
