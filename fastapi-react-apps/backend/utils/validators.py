"""Validation utilities for input validation across the application."""

import re
import ipaddress
from typing import Optional


def is_valid_ip(value: str) -> bool:
    """Check if a string is a valid IP address.

    Args:
        value: String to validate

    Returns:
        True if valid IP or empty string
    """
    s = str(value or "").strip()
    if not s:
        return True
    try:
        ipaddress.ip_address(s)
        return True
    except Exception:
        return False


def is_valid_ip_range(start_ip: str, end_ip: str) -> bool:
    """Check if start and end IPs form a valid range.

    Args:
        start_ip: Start IP address
        end_ip: End IP address

    Returns:
        True if both are valid IPs and end >= start
    """
    if not is_valid_ip(start_ip) or not is_valid_ip(end_ip):
        return False

    start_s = str(start_ip or "").strip()
    end_s = str(end_ip or "").strip()

    if not start_s or not end_s:
        return True  # Allow partial ranges

    try:
        start_int = int(ipaddress.ip_address(start_s))
        end_int = int(ipaddress.ip_address(end_s))
        return end_int >= start_int
    except Exception:
        return False


def is_valid_namespace_name(name: str) -> bool:
    """Check if a namespace name is valid (Kubernetes naming conventions).

    Args:
        name: Namespace name to validate

    Returns:
        True if valid namespace name
    """
    if not name:
        return False
    return bool(re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", name))


def is_valid_app_name(name: str) -> bool:
    """Check if an application name is valid.

    Args:
        name: Application name to validate

    Returns:
        True if valid app name
    """
    if not name:
        return False
    return bool(re.match(r"^[A-Za-z0-9_.-]+$", name))


def is_valid_cluster_name(name: str) -> bool:
    """Check if a cluster name is valid.

    Args:
        name: Cluster name to validate

    Returns:
        True if valid cluster name
    """
    if not name:
        return False
    return bool(re.match(r"^[A-Za-z0-9_.-]+$", str(name).strip()))


def is_valid_cidr(value: str) -> bool:
    """Check if a string is a valid CIDR notation.

    Args:
        value: String to validate

    Returns:
        True if valid CIDR
    """
    s = str(value or "").strip()
    if not s:
        return False
    try:
        ipaddress.ip_network(s, strict=False)
        return True
    except Exception:
        return False


def is_valid_port(port: int) -> bool:
    """Check if a port number is valid.

    Args:
        port: Port number to validate

    Returns:
        True if valid port (1-65535)
    """
    try:
        port_int = int(port)
        return 1 <= port_int <= 65535
    except (TypeError, ValueError):
        return False


def is_valid_protocol(protocol: str) -> bool:
    """Check if a protocol is valid.

    Args:
        protocol: Protocol string to validate

    Returns:
        True if valid protocol (TCP, UDP, SCTP)
    """
    s = str(protocol or "").strip().upper()
    return s in {"TCP", "UDP", "SCTP"}


def sanitize_env(env: str) -> str:
    """Sanitize environment string.

    Args:
        env: Environment string

    Returns:
        Lowercase trimmed environment string
    """
    return str(env or "").strip().lower()
