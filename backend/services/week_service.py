from __future__ import annotations

from datetime import date, timedelta
import sqlite3

from backend.time_utils import parse_date
from backend.db import get_settings

from backend.services.day_service import compute_day_summary
from backend.services.recurring_holiday_service import list_recurring
from backend.services.timeoff_service import expand_time_off_days


def _week_bounds(day_str: str) -> tuple[date, date]:
    anchor = parse_date(day_str)  # YYYY-MM-DD
    monday = anchor - timedelta(days=anchor.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def _ceil_div(a: int, b: int) -> int:
    if b <= 0:
        return a
    return (a + b - 1) // b


def _fetch_day_rows_for_range(con: sqlite3.Connection, start: date, end: date) -> dict[str, sqlite3.Row | dict]:
    """
    Fetch all stored day rows for dates in [start, end] in ONE query.
    Returns: map YYYY-MM-DD -> row
    Adjust table/column names if yours differ.
    """
    cur = con.cursor()

    # IMPORTANT: adjust table name if yours isn't 'days'
    # IMPORTANT: adjust column name if your date column isn't 'day' or 'date'
    cur.execute(
        """
        SELECT *
        FROM work_day
        WHERE date >= ? AND date <= ?
        """,
        (start.isoformat(), end.isoformat()),
    )
    rows = cur.fetchall()

    out = {}
    for r in rows:
        # If your column is named 'day' use r["day"]. If it's 'date' use r["date"].
        out[r["date"]] = r
    return out


def compute_week(con: sqlite3.Connection, day_str: str) -> dict:
    week_start, week_end = _week_bounds(day_str)

    # Settings (your project uses *_minutes keys)
    settings = get_settings(con)
    daily_soft = int(settings["daily_soft_minutes"])
    daily_hard = int(settings["daily_hard_minutes"])

    # --- OFF MAP (recurring + personal) ---
    rec_items = list_recurring(con)  # {id, month, day, label}
    rec_lookup = {(r["month"], r["day"]): r for r in rec_items}
    personal_map = expand_time_off_days(con, week_start, week_end)  # YYYY-MM-DD -> time_off row

    off_map: dict[str, dict] = {}
    d = week_start
    while d <= week_end:
        ds = d.isoformat()

        rh = rec_lookup.get((d.month, d.day))
        if rh:
            off_map[ds] = {
                "source": "recurring",
                "kind": "holiday",
                "label": rh.get("label"),
                "recurring_id": rh.get("id"),
            }

        po = personal_map.get(ds)
        if po:
            off_map[ds] = {
                "source": "personal",
                "kind": po.get("kind"),  # vacation | personal
                "label": po.get("label"),
                "time_off_id": po.get("id"),
                "range": {"start": po.get("start_date"), "end": po.get("end_date")},
            }

        d += timedelta(days=1)

    # --- Fetch all day rows once ---
    row_map = _fetch_day_rows_for_range(con, week_start, week_end)

    # --- Build day summaries Mon..Fri ---
    days: list[dict] = []
    working_days = 0
    week_net_minutes = 0

    d = week_start
    while d <= week_end:
        ds = d.isoformat()

        row = row_map.get(ds)  # may be None if not stored yet
        summary = compute_day_summary(con, ds, row)

        off_info = off_map.get(ds)
        is_off = off_info is not None
        summary["is_off"] = is_off
        summary["off"] = off_info

        if not is_off:
            working_days += 1

        week_net_minutes += int(summary.get("net_minutes", 0))
        days.append(summary)

        d += timedelta(days=1)

    weekly_soft = daily_soft * working_days
    weekly_hard = daily_hard * working_days

    # --- Pace (exclude off days) from TODAY to week_end ---
    today = date.today()
    remaining_workdays = 0

    d = week_start
    while d <= week_end:
        if d >= today:
            ds = d.isoformat()
            if ds not in off_map:
                remaining_workdays += 1
        d += timedelta(days=1)

    hard_remaining = max(0, weekly_hard - week_net_minutes)
    soft_remaining = max(0, weekly_soft - week_net_minutes)

    pace_hard = _ceil_div(hard_remaining, remaining_workdays) if remaining_workdays > 0 else None
    pace_soft = _ceil_div(soft_remaining, remaining_workdays) if remaining_workdays > 0 else None

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),

        # New fields (nice to have)
        "working_days": working_days,
        "weekly_soft": weekly_soft,
        "weekly_hard": weekly_hard,

        "week_net_minutes": week_net_minutes,
        "days": days,

        # Old UI-compatible fields (your App.jsx reads these)
        "targets": {
            "daily_soft": daily_soft,
            "daily_hard": daily_hard,
            "weekly_soft": weekly_soft,
            "weekly_hard": weekly_hard,
        },
        "status": {
            "remaining_workdays": remaining_workdays,
            "hard_remaining_minutes": hard_remaining,
            "soft_remaining_minutes": soft_remaining,
            "pace_hard_per_day": pace_hard,
            "pace_soft_per_day": pace_soft,
        },
    }