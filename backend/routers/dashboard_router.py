from fastapi import APIRouter

from backend.db import get_con, get_settings, get_targets
from backend.services.day_service import compute_day_summary
from backend.services.week_service import compute_week
from backend.time_utils import parse_date

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{day_str}")
def get_dashboard(day_str: str):
    _ = parse_date(day_str)
    con = get_con()
    cur = con.cursor()
    cur.execute("SELECT * FROM work_day WHERE date = %s", (day_str,))
    row = cur.fetchone()

    day = compute_day_summary(con, day_str, row)
    week = compute_week(con, day_str)
    settings = get_settings(con)
    targets = get_targets(con)
    con.close()

    return {
        "day": day,
        "week": week,
        "settings": {
            "settings": {
                "daily_soft_minutes": int(settings["daily_soft_minutes"]),
                "daily_hard_minutes": int(settings["daily_hard_minutes"]),
                "workdays_per_week": int(settings["workdays_per_week"]),
            },
            "derived": {
                "weekly_soft_minutes": targets["weekly_soft"],
                "weekly_hard_minutes": targets["weekly_hard"],
            },
        },
    }
