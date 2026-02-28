import os
from functools import lru_cache
from pathlib import Path
import yaml


@lru_cache()
def is_readonly() -> bool:
    """Check if the application is in read-only mode based on READONLY env variable."""
    readonly_value = os.getenv("READONLY", "false").strip().lower()
    return readonly_value in ("true", "1", "yes", "on")


def _config_path() -> Path:
    return Path.home() / ".kselfserve" / "kselfserveconfig.yaml"


def read_persisted_demo_mode() -> bool:
    try:
        p = _config_path()
        if not p.exists() or not p.is_file():
            return False
        raw = yaml.safe_load(p.read_text()) or {}
        if not isinstance(raw, dict):
            return False
        return bool(raw.get("demo_mode"))
    except Exception:
        return False


def is_demo_mode() -> bool:
    demo_env = str(os.getenv("DEMO_MODE", "")).strip()
    if demo_env:
        return demo_env.lower() == "true"
    return read_persisted_demo_mode()


def persist_demo_mode(enabled: bool) -> None:
    try:
        os.environ["DEMO_MODE"] = str(enabled).lower()
        p = _config_path()
        raw = {}
        if p.exists() and p.is_file():
            loaded = yaml.safe_load(p.read_text()) or {}
            if isinstance(loaded, dict):
                raw = loaded
        raw["demo_mode"] = bool(enabled)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(yaml.safe_dump(raw, sort_keys=False))
    except Exception:
        return


def ensure_demo_mode_env_from_config() -> None:
    if str(os.getenv("DEMO_MODE", "")).strip():
        return
    if read_persisted_demo_mode():
        os.environ["DEMO_MODE"] = "true"
