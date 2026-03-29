import logging
import time
import os
import uuid
import sentry_sdk
from fastapi import Request
from fastapi.responses import JSONResponse

LOG_BODY = os.getenv("LOG_BODY", "0") == "1"

def add_request_logging(app):
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()
        request_id = uuid.uuid4().hex[:12]
        request.state.request_id = request_id

        body_bytes = b""
        if LOG_BODY:
            body_bytes = await request.body()

            async def receive():
                return { "type": "http.request", "body": body_bytes, "more_body": False }
            request._receive = receive

        try:
            response = await call_next(request)
        except Exception:
            ms = (time.time() - start) * 1000
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("request_id", request_id)
                scope.set_context(
                    "request",
                    {
                        "method": request.method,
                        "path": request.url.path,
                        "query": request.url.query,
                    },
                )
                sentry_sdk.capture_exception()
            logging.exception(
                "Unhandled exception | request_id=%s | %s %s | query=%s | %.1fms | body=%s",
                request_id,
                request.method,
                request.url.path,
                request.url.query,
                ms,
                body_bytes.decode("utf-8", errors="ignore") if LOG_BODY else "",
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "request_id": request_id},
                headers={"X-Request-ID": request_id},
            )

        ms = (time.time() - start) * 1000
        logging.info(
            "%s %s | %s | %.1fms | request_id=%s%s",
            request.method,
            request.url.path,
            response.status_code,
            ms,
            request_id,
            f" | body={body_bytes.decode('utf-8', errors='ignore')}" if LOG_BODY else "",
        )
        response.headers["X-Request-ID"] = request_id
        return response
