from fastapi import APIRouter


router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.get("/sentry-backend")
def trigger_sentry_backend_error():
    raise RuntimeError("Intentional backend Sentry test error")
