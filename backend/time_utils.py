from datetime import datetime, date, timedelta, time
from fastapi import HTTPException

def parse_date(s) -> date:
    try:
        return datetime.strptime(normalize_date(s), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

def normalize_date(value) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

def normalize_hhmm(value) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    if isinstance(value, time):
        return value.strftime("%H:%M")
    raise HTTPException(400, "Invalid time format. Use HH:MM (24h).")

def normalize_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    raise HTTPException(400, "Invalid datetime format.")

def validate_hhmm(s) -> None:
    try:
        datetime.strptime(normalize_hhmm(s), "%H:%M")
    except ValueError:
        raise HTTPException(400, "Invalid time format. Use HH:MM (24h).")

def now_hhmm() -> str:
    return datetime.now().strftime("%H:%M")

def dt_for(day: date, hhmm) -> datetime:
    hhmm = normalize_hhmm(hhmm)
    validate_hhmm(hhmm)
    t = datetime.strptime(hhmm, "%H:%M").time()
    return datetime.combine(day, t)

def iso(d: date) -> str:
    return d.strftime("%Y-%m-%d")

def week_range_for(d: date) -> tuple[date, date]:
    monday = d - timedelta(days=d.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday
