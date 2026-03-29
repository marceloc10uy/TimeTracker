import logging
import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw in (None, ""):
        return default
    try:
        return float(raw)
    except ValueError:
        logging.warning("Invalid float for %s: %s. Falling back to %s", name, raw, default)
        return default


def init_sentry() -> bool:
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        logging.info("Sentry disabled: SENTRY_DSN is not set")
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("SENTRY_ENVIRONMENT", os.getenv("ENV", "development")),
        release=os.getenv("SENTRY_RELEASE"),
        traces_sample_rate=_float_env("SENTRY_TRACES_SAMPLE_RATE", 0.0),
        integrations=[FastApiIntegration()],
    )
    logging.info("Sentry enabled for backend")
    return True
