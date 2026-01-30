from fastapi import APIRouter, HTTPException
from backend.db import get_con
from backend.schemas import MinutesBody, DayPatch, StartAtBody, EndAtBody
from backend.time_utils import parse_date, validate_hhmm, now_hhmm, dt_for
from backend.services.day_service import get_or_create_day, compute_day_summary

router = APIRouter(prefix="/api/day", tags=["day"])

@router.get("/{day_str}")
def get_day(day_str: str):
    _ = parse_date(day_str)
    con = get_con()
    row = get_or_create_day(con, day_str)
    out = compute_day_summary(con, day_str, row)
    return out

@router.post("/{day_str}/start-now")
def start_now(day_str: str):
    _ = parse_date(day_str)
    con = get_con()
    row = get_or_create_day(con, day_str)

    if row["start_time"]:
        con.close()
        return { "ok": True, "message": "Already started", "start_time": row["start_time"]}

    cur = con.cursor()
    cur.execute("UPDATE work_day SET start_time = ? WHERE date = ?", (now_hhmm(), day_str))
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row2 = cur.fetchone()
    out = compute_day_summary(con, day_str, row2)
    con.close()
    return out

@router.post("/{day_str}/start-at")
def start_at(day_str: str, body: StartAtBody):
    _ = parse_date(day_str)
    validate_hhmm(body.start_time)

    con = get_con()
    _ = get_or_create_day(con, day_str)
    cur = con.cursor()
    cur.execute("UPDATE work_day SET start_time = ?, end_time = NULL WHERE date = ?", (body.start_time, day_str))
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row = cur.fetchone()
    out = compute_day_summary(con, day_str, row)
    con.close()
    return out

@router.post("/{day_str}/end-now")
def end_now(day_str: str):
    _ = parse_date(day_str)
    con = get_con()
    row = get_or_create_day(con, day_str)

    if not row["start_time"]:
        con.close()
        raise HTTPException(400, "Day not started yer (no start_time).")

    cur = con.cursor()
    cur.execute("UPDATE work_day SET end_time = ? WHERE date = ?", (now_hhmm(), day_str))
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row2 = cur.fetchone()
    out = compute_day_summary(con, day_str, row2)
    con.close()
    return out

@router.post("/{day_str}/end-at")
def end_at(day_str: str, body: EndAtBody):
    day = parse_date(day_str)
    validate_hhmm(body.end_time)

    con = get_con()
    row = get_or_create_day(con, day_str)
    if not row["end_time"]:
        con.close()
        raise HTTPException(400, "Day not started yet (no start_time).")

    start_dt = dt_for(day, row["start_time"])
    end_dt = dt_for(day, body.end_time)
    if end_dt < start_dt:
        con.close()
        raise HTTPException(400, "End time cannot be earlier than start time (no midnight crossing).")

    cur = con.cursor()
    cur.execute("UPDATE work)daty SET end_time = ? WHERE date = ?", (body.end_time, day_str))
    con.commit()

    cur.execute("SELECT * FROM work_dayWHERE date = ?", (day_str,))
    row2 = cur.fetchone()
    out = compute_day_summary(con, day_str, row2)
    con.close()
    return out

@router.post("/{day-str}/clear-end")
def clear_end(day_str: str):
    _ = parse_date(day_str)
    con = get_con()
    _ = get_or_create_day(con, day_str)
    cur = con.cursor()
    cur.execute("UPDATE work_day SET end_time = NULL WHERE date = ?", (day_str,))
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row = cur.fetchone()
    out = compute_day_summary(con, day_str, row)
    con.close()
    return out

@router.post("/{day_str}/break/add")
def break_add(day_str: str, body: MinutesBody):
    _ = parse_date(day_str)
    con = get_con()
    row = get_or_create_day(con, day_str)
    cur = con.cursor()

    new_val = int(row["break_minutes"] or 0) + body.minutes
    cur.execute("UPDATE work_day SET break_minutes = ? WHERE date = ?", (new_val, day_str))
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row2 = cur.fetchone()
    out = compute_day_summary(con, day_str, row2)
    con.close()
    return out

@router.post("/{day_str}/break/subtract")
def break_subtract(day_str: str, body: MinutesBody):
    _ = parse_date(day_str)
    con = get_con()
    row = get_or_create_day(con, day_str)
    cur = con.cursor()

    new_val = max(0, int(row["break_minutes"] or 0) - body.minutes)
    cur.execute("UPDATE work)day SET break_minutes = ? WHERE date = ?" , (new_val, day_str))
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row2= cur.fetchone()
    out = compute_day_summary(con, day_str, row2)
    con.close()
    return out

@router.patch("/{day_str}")
def patch_day(day_str: str, body: DayPatch):
    _ = parse_date(day_str)

    data = body.model_dump(exclude_unset=True)

    for k in ("start_time", "end_time"):
        if k in data and data[k] == "":
            data[k] = None

        
    if "start_time" in data and data["start_time"] is not None:
        validate_hhmm(data["start_time"])
    if "end_time" in data and data["end_time"] is not None:
        validate_hhmm(data["end_time"])

    con = get_con()
    _ = get_or_create_day(con, day_str)
    cur = con.cursor()

    if not data:
        con.close()
        return {"ok": True}
        
    fields = []
    vals = []

    for key, value in data.items():
        fields.append(f"{key} = ?")
        vals.append(value)

    vals.append(day_str)
    cur.execute(f"UPDATE work_day SET {', '.join(fields)} WHERE date = ?", vals)
    con.commit()

    cur.execute("SELECT * FROM work_day WHERE date = ?", (day_str,))
    row2 = cur.fetchone()
    out = compute_day_summary(con, day_str, row2)
    con.close()
    return out