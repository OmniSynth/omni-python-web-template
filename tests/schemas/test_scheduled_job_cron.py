"""定时任务 cron 表达式校验。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from omni_api.schemas.scheduled_job import ScheduledJobUpdate, validate_cron_expr


@pytest.mark.parametrize(
    "expr",
    [
        "*/5 * * * *",
        "0 * * * *",
        "0 9 * * *",
        "0 9 * * 1",
        "*/5 * * * * *",
        "0 */5 * * * *",
        "0 0 * * * *",
    ],
)
def test_validate_cron_expr_accepts_five_and_six_fields(expr: str) -> None:
    assert validate_cron_expr(expr) == expr


@pytest.mark.parametrize(
    "expr",
    [
        "",
        "*",
        "* * * *",
        "* * * * * * *",
        "not-a-cron",
    ],
)
def test_validate_cron_expr_rejects_invalid(expr: str) -> None:
    with pytest.raises(ValueError):
        validate_cron_expr(expr)


def test_scheduled_job_update_accepts_six_field_cron() -> None:
    body = ScheduledJobUpdate(cron_expr="*/5 * * * * *")
    assert body.cron_expr == "*/5 * * * * *"


def test_scheduled_job_update_rejects_bad_cron() -> None:
    with pytest.raises(ValidationError):
        ScheduledJobUpdate(cron_expr="* * * *")
