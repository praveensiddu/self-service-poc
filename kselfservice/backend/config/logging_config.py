"""Logging configuration module.

This module provides centralized logging configuration with:
- Structured logging with JSON format
- Log rotation
- Different log levels per environment
- Request ID tracking
- Performance logging
"""

import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Any, Dict
import json
from datetime import datetime
import os


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON.

        Args:
            record: Log record to format

        Returns:
            JSON formatted log string
        """
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code

        if hasattr(record, "path"):
            log_data["path"] = record.path

        if hasattr(record, "method"):
            log_data["method"] = record.method

        return json.dumps(log_data)


class ColoredConsoleFormatter(logging.Formatter):
    """Colored console formatter for better readability in development."""

    # ANSI color codes
    COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    RESET = "\033[0m"

    def __init__(self, *args, use_colors: bool = True, **kwargs):
        """Initialize formatter.

        Args:
            use_colors: Whether to use ANSI color codes
        """
        super().__init__(*args, **kwargs)
        self.use_colors = use_colors

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors.

        Args:
            record: Log record to format

        Returns:
            Colored formatted log string
        """
        if not self.use_colors:
            return super().format(record)

        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            colored_levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
            record.levelname = colored_levelname

        # Format the message
        formatted = super().format(record)

        # Reset levelname for future use
        record.levelname = levelname

        return formatted


def setup_logging(
    log_level: str = None,
    log_file: str = None,
    json_logs: bool = None,
    max_bytes: int = 5242880,  # 5MB default
    backup_count: int = 0,  # 0 = don't keep old files
) -> None:
    """Setup application logging configuration.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (None for console only)
        json_logs: Use JSON formatting (default: True in production, False in dev)
        max_bytes: Maximum bytes per log file before rotation (default: 5MB)
        backup_count: Number of backup files to keep (default: 0 - no backups, file gets truncated)
    """
    # Get configuration from environment or use defaults
    env = os.getenv("ENVIRONMENT", "development").lower()

    if log_level is None:
        log_level = os.getenv("LOG_LEVEL", "DEBUG" if env == "development" else "INFO")

    if json_logs is None:
        json_logs = env in ("production", "staging")

    if log_file is None:
        log_file = os.getenv("LOG_FILE")

    # Convert log level string to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)

    # Check if stdout is a terminal (TTY) - disable colors if output is redirected to file
    use_colors = sys.stdout.isatty() and not json_logs

    if json_logs:
        console_formatter = JSONFormatter()
    else:
        console_formatter = ColoredConsoleFormatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            use_colors=use_colors,
        )

    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # File handler with rotation (if log file specified)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.handlers.RotatingFileHandler(
            filename=log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        file_handler.setLevel(numeric_level)

        # Use plain formatter for file logs (no colors)
        if json_logs:
            file_formatter = JSONFormatter()
        else:
            file_formatter = logging.Formatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)

    # Configure third-party loggers
    _configure_third_party_loggers()

    # Apply our formatter to Uvicorn loggers for consistent formatting
    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        uvicorn_logger = logging.getLogger(logger_name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.addHandler(console_handler)
        if log_file:
            uvicorn_logger.addHandler(file_handler)
        uvicorn_logger.propagate = False

    # Log startup information
    logger = logging.getLogger(__name__)
    logger.info(
        f"Logging initialized | Level: {log_level} | Format: {'JSON' if json_logs else 'Text'} | "
        f"File: {log_file or 'Console Only'} | Environment: {env}"
    )


def _configure_third_party_loggers() -> None:
    """Configure logging levels for third-party libraries."""
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Hide access logs in favor of our middleware
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


# Context manager for request logging
class RequestLogger:
    """Context manager for logging HTTP requests with timing."""

    def __init__(
        self,
        logger: logging.Logger,
        method: str,
        path: str,
        request_id: str = None,
    ):
        """Initialize request logger.

        Args:
            logger: Logger instance
            method: HTTP method
            path: Request path
            request_id: Optional request ID
        """
        self.logger = logger
        self.method = method
        self.path = path
        self.request_id = request_id
        self.start_time = None

    def __enter__(self):
        """Start timing the request."""
        import time
        self.start_time = time.time()
        self.logger.info(
            f"Request started: {self.method} {self.path}",
            extra={
                "method": self.method,
                "path": self.path,
                "request_id": self.request_id,
            },
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Log request completion with timing."""
        import time
        duration_ms = (time.time() - self.start_time) * 1000

        if exc_type is None:
            self.logger.info(
                f"Request completed: {self.method} {self.path} in {duration_ms:.2f}ms",
                extra={
                    "method": self.method,
                    "path": self.path,
                    "request_id": self.request_id,
                    "duration_ms": duration_ms,
                },
            )
        else:
            self.logger.error(
                f"Request failed: {self.method} {self.path} - {exc_val}",
                extra={
                    "method": self.method,
                    "path": self.path,
                    "request_id": self.request_id,
                    "duration_ms": duration_ms,
                },
                exc_info=(exc_type, exc_val, exc_tb),
            )
