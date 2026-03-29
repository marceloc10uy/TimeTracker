import logging
import os
import sys
from logging.handlers import RotatingFileHandler


LOG_TO_FILE = os.getenv("LOG_TO_FILE", "0") == "1"


def _get_runtime_dir() -> str:
    if getattr(sys, "frozen", False):
        if sys.platform == "darwin":
            return os.path.expanduser("~/Library/Application Support/TimeTracker")
        if os.name == "nt":
            base = os.getenv("APPDATA") or os.path.expanduser("~")
            return os.path.join(base, "TimeTracker")
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_log_file_path() -> str:
    runtime_dir = _get_runtime_dir()
    os.makedirs(runtime_dir, exist_ok=True)
    return os.path.join(runtime_dir, "timetracker.log")


def setup_logging() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    root_logger = logging.getLogger()

    if root_logger.handlers:
        root_logger.setLevel(level)
        return

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)

    root_logger.setLevel(level)
    root_logger.addHandler(console_handler)

    if LOG_TO_FILE:
        file_handler = RotatingFileHandler(
            get_log_file_path(),
            maxBytes=1_000_000,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
        root_logger.info("Logging initialized | file=%s", get_log_file_path())
    else:
        root_logger.info("Logging initialized | console only")
