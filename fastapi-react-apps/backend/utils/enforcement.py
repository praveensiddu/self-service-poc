"""Enforcement settings utilities."""

from typing import Any
from pydantic import BaseModel

from backend.dependencies import get_control_settings_path
from backend.utils.yaml_utils import read_yaml_dict
from backend.utils.helpers import normalize_yes_no


class EnforcementSettings(BaseModel):
    enforce_egress_firewall: str = "yes"
    enforce_egress_ip: str = "yes"


def load_enforcement_settings() -> EnforcementSettings:
    """Load enforcement settings from control settings file."""
    path = get_control_settings_path()
    raw = read_yaml_dict(path)

    return EnforcementSettings(
        enforce_egress_firewall=normalize_yes_no(raw.get("enforce_egress_firewall"), "yes"),
        enforce_egress_ip=normalize_yes_no(raw.get("enforce_egress_ip"), "yes"),
    )
