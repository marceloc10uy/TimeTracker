from datetime import datetime, date, timedelta
from fastapi import HTTPException

def parse_date(s: str) -> date:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

def validate_hhmm(s: str) -> None:
    try:
        datetime.strptime(s, "%H:%M")
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use HH:MM (24h).")

def now_hhmm() -> str:
    return datetime.now().strftime("%H:%M")

def dt_for(day: date, hhmm: str) -> datetime:
    validate_hhmm(hhmm)
    t = datetime.strptime(hhmm, "%H:%M").time()
    return datetime.combine(day, t)

def iso(d: date) -> str:
    return d.strftime("%Y-%m-%d")

def week_range_for(d: date) -> tuple[date, date]:
    monday = d - timedelta(days=d.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday