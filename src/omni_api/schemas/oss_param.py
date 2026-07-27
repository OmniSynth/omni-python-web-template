"""对象存储开发参数定义（系统/租户共用键名）。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

OssProvider = Literal["volcano", "aliyun", "tencent"]

OSS_PROVIDER_OPTIONS: tuple[tuple[str, str], ...] = (
    ("volcano", "火山云 TOS"),
    ("aliyun", "阿里云 OSS"),
    ("tencent", "腾讯云 COS"),
)

OSS_PARAM_PROVIDER = "oss.provider"
OSS_PARAM_ACCESS_KEY = "oss.access_key"
OSS_PARAM_SECRET_KEY = "oss.secret_key"
OSS_PARAM_DOMAIN = "oss.domain"
OSS_PARAM_UPLOAD_BUCKET_DOMAIN = "oss.upload_bucket_domain"
OSS_PARAM_BASIC_PATH = "oss.basic_path"

OSS_SECRET_KEYS: frozenset[str] = frozenset({OSS_PARAM_ACCESS_KEY, OSS_PARAM_SECRET_KEY})

DEFAULT_OSS_PROVIDER = "volcano"
DEFAULT_OSS_BASIC_PATH = "omni/static"


@dataclass(frozen=True, slots=True)
class OssParamDef:
    """单条对象存储参数元数据。"""

    param_key: str
    label: str
    field_type: Literal["input", "password", "select"]
    description: str
    default_value: str = ""
    select_options: tuple[tuple[str, str], ...] = ()
    placeholder: str = ""


OSS_PARAM_DEFS: tuple[OssParamDef, ...] = (
    OssParamDef(
        OSS_PARAM_PROVIDER,
        "存储提供商",
        "select",
        "可切换 volcano / aliyun / tencent；当前仅火山云已实现",
        DEFAULT_OSS_PROVIDER,
        OSS_PROVIDER_OPTIONS,
        "请选择存储提供商",
    ),
    OssParamDef(
        OSS_PARAM_ACCESS_KEY,
        "Access Key",
        "password",
        "对象存储访问密钥 ID",
        placeholder="请输入 Access Key",
    ),
    OssParamDef(
        OSS_PARAM_SECRET_KEY,
        "Secret Key",
        "password",
        "对象存储访问密钥 Secret",
        placeholder="请输入 Secret Key",
    ),
    OssParamDef(
        OSS_PARAM_DOMAIN,
        "访问域名",
        "input",
        "仅协议 + 主机（可选端口），支持 http/https，须以单个 / 结尾",
        placeholder="https://oss.example.com/",
    ),
    OssParamDef(
        OSS_PARAM_UPLOAD_BUCKET_DOMAIN,
        "上传 Bucket 域名",
        "input",
        "厂商上传 endpoint 域名（含 bucket 子域）",
        placeholder="请输入上传 Bucket 域名",
    ),
    OssParamDef(
        OSS_PARAM_BASIC_PATH,
        "基础路径",
        "input",
        "系统级对象键前缀；租户侧为「系统路径/租户ID」，只读不可改",
        DEFAULT_OSS_BASIC_PATH,
        placeholder="如 omni/static 或 /omni/static",
    ),
)


def normalize_oss_basic_path(raw: str) -> str:
    """存储用基础路径：去首尾斜杠与空白。"""
    return (raw or "").strip().strip("/")


def format_oss_basic_path_display(raw: str) -> str:
    """展示用基础路径：统一带前导 /。"""
    path = normalize_oss_basic_path(raw) or DEFAULT_OSS_BASIC_PATH
    return f"/{path}"


def effective_tenant_basic_path(system_basic_path: str, tenant_id: int) -> str:
    """租户有效基础路径：系统基础路径 + 租户 ID（存储形态，无首尾 /）。"""
    base = normalize_oss_basic_path(system_basic_path) or DEFAULT_OSS_BASIC_PATH
    return f"{base}/{tenant_id}"


def validate_oss_domain(raw: str) -> str:
    """校验并规范化访问域名；空串表示未配置。须 http(s) + 主机，且恰好一个尾 /。"""
    text = (raw or "").strip()
    if not text:
        return ""
    text = text.rstrip("/") + "/"
    parsed = urlparse(text)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("访问域名须以 http:// 或 https:// 开头")
    if not parsed.netloc or not parsed.hostname:
        raise ValueError("访问域名格式无效，请输入合法域名或主机")
    if parsed.path not in ("/", ""):
        raise ValueError("访问域名不能包含路径，仅协议与主机，须以单个 / 结尾")
    if parsed.params or parsed.query or parsed.fragment:
        raise ValueError("访问域名不能包含查询参数或片段")
    return f"{parsed.scheme}://{parsed.netloc}/"


def parse_tos_bucket_endpoint(upload_bucket_domain: str) -> tuple[str, str, str]:
    """从 upload_bucket_domain 解析 (bucket, endpoint, region)。"""
    text = upload_bucket_domain.strip().rstrip("/")
    if "://" in text:
        text = text.split("://", 1)[1]
    host = text.split("/", 1)[0]
    parts = host.split(".")
    if len(parts) < 4:
        raise ValueError(f"无法解析 upload_bucket_domain: {upload_bucket_domain}")
    bucket = parts[0]
    # bucket.tos-cn-beijing.ivolces.com → endpoint tos-cn-beijing.ivolces.com
    endpoint = ".".join(parts[1:])
    region = "cn-beijing"
    for part in parts:
        if part.startswith("tos-"):
            region = part.removeprefix("tos-")
            break
    return bucket, endpoint, region
