"""Common helper utilities."""

from typing import Any, List, Optional


def parse_bool(v: Any) -> bool:
    """Parse a value as a boolean.

    Args:
        v: Value to parse

    Returns:
        Boolean value
    """
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in {"true", "1", "yes", "y", "on"}


def normalize_yes_no(value: Any, default: str = "yes") -> str:
    """Normalize a value to 'yes' or 'no'.

    Args:
        value: Value to normalize
        default: Default value if normalization fails

    Returns:
        'yes' or 'no'
    """
    if value is None:
        return default
    s = str(value).strip().lower()
    if s in ("yes", "y", "true", "1", "on"):
        return "yes"
    if s in ("no", "n", "false", "0", "off"):
        return "no"
    return default


def as_string_list(value: Any) -> List[str]:
    """Convert a value to a list of non-empty strings.

    Args:
        value: Value to convert (list, string, or other)

    Returns:
        List of non-empty string values
    """
    if value is None:
        return []
    if isinstance(value, list):
        out: List[str] = []
        for v in value:
            if v is None:
                continue
            s = str(v).strip()
            if s:
                out.append(s)
        return out
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return []
        return [p.strip() for p in s.split(",") if p.strip()]
    return []


def as_trimmed_str(v: Any) -> Optional[str]:
    """Convert value to trimmed string or None.

    Args:
        v: Value to convert

    Returns:
        Trimmed string or None if empty
    """
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def is_set(v: Optional[str]) -> bool:
    """Check if a string value is set (not None, empty, or '0').

    Args:
        v: Value to check

    Returns:
        True if value is set, False otherwise
    """
    s = str(v or "").strip()
    return bool(s) and s != "0"
