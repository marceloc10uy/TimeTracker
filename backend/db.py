import sqlite3
from fastapi import HTTPException

DB_PATH = "timetracker.db"

DEFAULT_SETTINGS = {
    "daily_soft_minutes": "360", # 6h
    "daily_hard_minutes": "480", # 8h
    "workdays_per_week": 5 # Mon-Fri
}

def get_con() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_db() -> None:
    con = get_con()
    cur = con.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS work_day (
        date TEXT PRIMARY KEY,
        start_time TEXT,
        end_time TEXT,
        break_minutes INTEGER NOT NULL DEFAULT 0,
        notes TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
    )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS recurring_holiday (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER NOT NULL,
            day INTEGER NOT NULL,
            label TEXT,
            UNIQUE(month, day)        
        )
    """            
    )

    cur.execute(
    """ 
        CREATE TABLE IF NOT EXISTS time_off (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            kind TEXT NOT NULL,
            label TEXT
        )
    """)

    # Seed defaults if missing
    for k, v in DEFAULT_SETTINGS.items():
        cur.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?) "
            "ON CONFLICT (key) DO NOTHING",
            (k, v),
        )
    con.commit()
    con.close()

def get_settings(con: sqlite3.Connection) -> dict[str, str]:
    cur = con.cursor()
    cur.execute("SELECT key, value FROM settings")
    rows = cur.fetchall()
    out = {r["key"]: r["value"] for r in rows }
    #ensure defaults exist even if DB got weird
    for k, v in DEFAULT_SETTINGS.items():
        out.setdefault(k, v)
    return out

def upsert_settings(con: sqlite3.Connection, updates: dict[str, str]) -> None:
    cur = con.cursor()
    for k, v in updates.items():
        cur.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (k, v),
        )


def get_targets(con: sqlite3.Connection) -> dict[str, int]:
    s = get_settings(con)
    try:
        daily_soft = int(s["daily_soft_minutes"])
        daily_hard = int(s["daily_hard_minutes"])
        workdays = int(s["workdays_per_week"])
    except Exception:
        raise HTTPException(500, "invalid settings in DB (non-integer).")

    if daily_soft < 0 or daily_hard < 0 or workdays <= 0:
        raise HTTPException(500, "invalid settings in DB (negative/zero).")
    if daily_soft > daily_hard:
        raise HTTPException(400, "daily_soft_minutes cannot be greater than daily_hard_minutes.")

    weekly_soft = daily_soft * workdays
    weekly_hard = daily_hard * workdays

    return {
        "daily_soft": daily_soft,
        "daily_hard": daily_hard,
        "workdays_per_week": workdays,
        "weekly_soft": weekly_soft,
        "weekly_hard": weekly_hard
    }