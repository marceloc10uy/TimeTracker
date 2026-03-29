import * as Sentry from "@sentry/react";

let frontendSentryStatus = {
  enabled: false,
  dsnPresent: false,
};

function parseSampleRate(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  frontendSentryStatus = {
    enabled: false,
    dsnPresent: Boolean(dsn),
  };

  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0),
  });

  frontendSentryStatus = {
    enabled: true,
    dsnPresent: true,
  };

  return true;
}

export function captureFrontendException(error, context = {}) {
  return Sentry.captureException(error, {
    extra: context,
  });
}

export async function flushFrontendSentry(timeout = 2000) {
  return Sentry.flush(timeout);
}

export function getFrontendSentryStatus() {
  return frontendSentryStatus;
}

export { Sentry };
