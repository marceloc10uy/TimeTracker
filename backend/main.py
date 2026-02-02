
from backend.frontend_hosting import mount_react_spa
from fastapi import FastAPI
from backend.db import init_db
from backend.logging_config import setup_logging
from backend.middleware import add_request_logging
from backend.routers.day_router import router as day_router
from backend.routers.week_router import router as week_router
from backend.routers.settings_router import router as settings_router
from backend.routers.recurring_holiday_router import router as recurring_holiday_router
from backend.routers.timeoff_router import router as timeoff_router

def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Time Tracker API")
    add_request_logging(app)
    app.include_router(day_router)
    app.include_router(week_router)
    app.include_router(settings_router)
    app.include_router(recurring_holiday_router)
    app.include_router(timeoff_router)
    mount_react_spa(app)
    return app

init_db()
app = create_app()