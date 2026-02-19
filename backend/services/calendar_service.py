from datetime import date, timedelta
import sqlite3

from backend.time_utils import parse_date
from backend.services.day_service import compute_day_summary
from backend.services.recurring_holiday_service import list_recurring
from backend.services.timeoff_service import expand_time_off_days


def _year_bounds(year: int) -> tuple[date, date]:
    start = parse_date(f"{year:04d}-01-01")
    end = parse_date(f"{year:04d}-12-31")
    return start, end


def _fetch_day_rows_for_range(con: sqlite3.Connection, start: date, end: date) -> dict[str, sqlite3.Row]:
    cur = con.cursor()
    cur.execute(
        """
        SELECT *
        FROM work_day
        WHERE date >= ? AND date <= ?
        """,
        (start.isoformat(), end.isoformat()),
    )
    rows = cur.fetchall()
    return {r["date"]: r for r in rows}


def compute_year_calendar(con: sqlite3.Connection, year: int) -> dict:
    start, end = _year_bounds(year)

    rec_items = list_recurring(con)
    rec_lookup = {}
    for r in rec_items:
        try:
            d = parse_date(r.get("date"))
            rec_lookup[(d.month, d.day)] = r
        except Exception:
            continue

    personal_map = expand_time_off_days(con, start, end)

    off_map: dict[str, dict] = {}
    d = start
    while d <= end:
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
                "kind": po.get("kind"),
                "label": po.get("label"),
                "time_off_id": po.get("id"),
                "range": {"start": po.get("start_date"), "end": po.get("end_date")},
            }

        d += timedelta(days=1)

    row_map = _fetch_day_rows_for_range(con, start, end)

    days: list[dict] = []
    d = start
    while d <= end:
        ds = d.isoformat()
        row = row_map.get(ds)
        summary = compute_day_summary(con, ds, row)
        off_info = off_map.get(ds)

        summary["is_off"] = off_info is not None
        summary["off"] = off_info
        days.append(summary)
        d += timedelta(days=1)

    return {
        "year": year,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "days": days,
    }
