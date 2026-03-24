import logging
import time
import os
from fastapi import Request
from fastapi.responses import JSONResponse

LOG_BODY = os.getenv("LOG_BODY", "0") == "1"
DEBUG_ERRORS = os.getenv("DEBUG_ERRORS", "1") == "1"

def add_request_logging(app):
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()

        body_bytes = b""
        if LOG_BODY:
            body_bytes = await request.body()

            async def receive():
                return { "type": "http.request", "body": body_bytes, "more_body": False }
            request._receive = receive

        try:
            response = await call_next(request)
        except Exception as exc:
            ms = (time.time() - start) * 1000
            logging.exception(
                "Unhandled exception | %s %s | %.1fms | body=%s",
                request.method,
                request.url.path,
                ms,
                body_bytes.decode("utf-8", errors="ignore") if LOG_BODY else "",
            )
            detail = "Internal server error"
            if DEBUG_ERRORS:
                detail = f"{type(exc).__name__}: {exc}"
            return JSONResponse(status_code=500, content={"detail": detail})

        ms = (time.time() - start) * 1000
        logging.info(
            "%s %s | %s | %.1fms%s",
            request.method,
            request.url.path,
            response.status_code,
            ms,
            f" | body={body_bytes.decode('utf-8', errors='ignore')}" if LOG_BODY else "",
        )
        return response
