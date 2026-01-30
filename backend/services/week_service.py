from datetime import timedelta, date
import sqlite3

from backend.db import get_targets
from backend.time_utils import week_range_for, iso
from backend.services.day_service import get_or_create_day, compute_day_summary

def compute_week(con: sqlite3.Connection, any_day: date) -> dict:
    week_start, week_end = week_range_for(any_day)

    targets = get_targets(con)
    weekly_soft = targets["weekly_soft"]
    weekly_hard = targets["weekly_hard"]

    days = []
    week_net = 0

    for i in range(5):
        di = week_start + timedelta(days=i)
        ds = iso(di)
        row = get_or_create_day(con, ds)
        summary = compute_day_summary(con, ds, row)
        week_net += summary["net_minutes"]
        days.append(summary)

    if week_net > weekly_hard:
        weekly_status = "over_hard"
    elif week_net > weekly_soft:
        weekly_status = "between_soft_and_hard"
    else:
        weekly_status = "under_soft"

    # Pace per remaining weekday in this Mon-Fri block
    today = date.today()
    days_left = 0
    for i in range(5):
        di = week_start + timedelta(days=i)
        if di >= today:
            days_left += 1

    hard_remaining = max(0, weekly_hard - week_net)
    soft_remaining = max(0, weekly_soft - week_net)

    pace_hard = hard_remaining // days_left if days_left > 0 else None
    pace_soft = soft_remaining // days_left if days_left > 0 else None

    con.close()
    return {
        "week_start": iso(week_start),
        "week_end": iso(week_end),
        "targets": {"weekly_soft": weekly_soft, "weekly_hard": weekly_hard},
        "week_net_minutes": week_net,
        "status": {
            "weekly": weekly_status,
            "over_soft_by": max(0, week_net - weekly_soft),
            "over_hard_by": max(0, week_net - weekly_hard),
            "soft_remaining": soft_remaining,
            "hard_remaining": hard_remaining,
            "days_left": days_left,
            "pace_soft_per_day": pace_soft,
            "pace_hard_per_day": pace_hard,
        },
        "days": days
    }