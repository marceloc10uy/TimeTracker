import sqlite3
from datetime import datetime
from fastapi import HTTPException
from backend.db import get_targets
from backend.time_utils import parse_date, dt_for


def get_or_create_day(con: sqlite3.Connection, day_str: str) -> sqlite3.Row:
    cur = con.cursor()
    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row = cur.fetchone()
    if row:
        return row
    cur.execute("INSERT INTO work_day(date) VALUES (?)", (day_str,))
    con.commit()
    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    return cur.fetchone()

def compute_day_summary(con: sqlite3.Connection, day_str: str, row: sqlite3.Row) -> dict[str, any]:
    targets = get_targets(con)
    DAILY_SOFT = targets["daily_soft"]
    DAILY_HARD = targets["daily_hard"]

    day = parse_date(day_str)
    start_time = row["start_time"]
    end_time = row["end_time"]
    break_minutes = int(row["break_minutes"]) or 0

    running = False
    gross_minutes = 0
    net_minutes = 0

    if start_time:
        start_dt = dt_for(day, start_time)

        if end_time:
            end_dt = dt_for(day, end_time)
            if end_dt < start_dt:
                raise HTTPException(400, f"End time earlier than start time on {day_str}.")
        else:
            end_dt = datetime.now()
            running = True

        gross_minutes = max(0, int((end_dt - start_dt).total_seconds() // 60))
        net_minutes = max(0, gross_minutes - break_minutes)

    if net_minutes > DAILY_HARD:
        daily_status = "over_hard"
    elif net_minutes > DAILY_SOFT:
        daily_status = "between_soft_and_hard"
    else:
        daily_status = "under_soft"

    return {
        "date": day_str,
        "start_time": start_time,
        "end_time": end_time,
        "break_minutes": break_minutes,
        "gross_minutes": gross_minutes,
        "net_minutes": net_minutes,
        "running": running,
        "targets": {"daily_soft": DAILY_SOFT, "daily_hard": DAILY_HARD},
        "status": {
            "daily": daily_status,
            "over_soft_by": max(0, net_minutes - DAILY_SOFT),
            "over_hard_by": max(0, net_minutes - DAILY_HARD),
            "soft_remaining": max(0, DAILY_SOFT - net_minutes),
            "hard_remaining": max(0, DAILY_HARD - net_minutes),
        }
    }