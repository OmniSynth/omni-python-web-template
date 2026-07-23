"""身份证号校验、脱敏与哈希（本地采集，不对接第三方核验）。"""

from __future__ import annotations

import hashlib
import re

_ID_CARD_RE = re.compile(
    r"^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$"
)

_WEIGHTS = (7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2)
_CHECK_CHARS = "10X98765432"


def normalize_id_card(value: str) -> str:
    return value.strip().upper()


def validate_id_card(value: str) -> str:
    """校验 18 位身份证号格式与校验位，返回规范化大写串。"""
    card = normalize_id_card(value)
    if not _ID_CARD_RE.match(card):
        raise ValueError("身份证号格式无效")
    total = sum(int(card[i]) * _WEIGHTS[i] for i in range(17))
    if _CHECK_CHARS[total % 11] != card[17]:
        raise ValueError("身份证号校验位无效")
    return card


def mask_id_card(card: str) -> str:
    if len(card) < 8:
        return "***"
    return f"{card[:3]}{'*' * (len(card) - 7)}{card[-4:]}"


def hash_id_card(card: str) -> str:
    return hashlib.sha256(card.encode("utf-8")).hexdigest()
