"""路径分级测试。"""

from omni_api.audit.classifier import classify_request_level


def test_system_paths() -> None:
    assert classify_request_level("/api/v1/auth/login") == "system"
    assert classify_request_level("/api/v1/users") == "system"
    assert classify_request_level("/api/v1/audit/requests") == "system"


def test_business_paths() -> None:
    assert classify_request_level("/api/v1/tenant/users") == "business"
    assert classify_request_level("/api/v1/dev-params") == "business"
