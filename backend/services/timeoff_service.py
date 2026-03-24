from typing import Optional
from datetime import date, timedelta
from backend.time_utils import parse_date

def add_time_off(con, start_date: str, end_date: str, kind: str, label: Optional[str]) -> int:
    s = parse_date(start_date)
    e = parse_date(end_date)
    if e < s:
        raise ValueError("end_date cannot be earlier than start_date")
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO time_off (start_date, end_date, kind, label)
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        (start_date, end_date, kind, label),
    )
    row = cur.fetchone()
    con.commit()
    return row["id"]

def list_time_off(con, from_date: Optional[str] = None, to_date: Optional[str] = None) -> list[dict]:
    cur = con.cursor()
    if from_date and to_date:
        cur.execute(
            """
            SELECT * FROM time_off
            WHERE NOT (end_date < %s OR start_date > %s)
            ORDER BY start_date ASC, id ASC
            """,
            (from_date, to_date),
        )
    else:
        cur.execute("SELECT * FROM time_off ORDER BY start_date ASC, id ASC")
    
    return [dict(r) for r in cur.fetchall()]

def delete_time_off(con, tid: int) -> None:
    cur = con.cursor()
    cur.execute("DELETE FROM time_off WHERE id = %s", (tid,))
    con.commit()

def expand_time_off_days(con, start: date, end: date) -> dict[str, dict]:
    """Map YYY-MM-DD -> time_off row for any off day in [start, end]."""
    def iso(d: date) -> str:
        return d.isoformat()
    
    cur = con.cursor()
    cur.execute(
        """
        SELECT * FROM time_off
        WHERE NOT (end_date < %s OR start_date > %s)
        """,
        (iso(start), iso(end)),
    )
    rows = cur.fetchall()

    out: dict[str, dict] = {}
    for r in rows:
        s = parse_date(r["start_date"])
        e = parse_date(r["end_date"])
        d = max(s, start)
        last = min(e, end)
        while d<= last:
            out[iso(d)] = r
            d += timedelta(days=1)
    
    return out
