import os
import sys
import logging
from fastapi import HTTPException
from dotenv import load_dotenv

def _load_env() -> None:
    candidates = []

    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        candidates.extend([
            os.path.join(exe_dir, ".env"),
            os.path.join(os.path.dirname(exe_dir), ".env"),
            os.path.join(
                os.path.expanduser("~/Library/Application Support/TimeTracker"),
                ".env",
            ),
        ])

    candidates.extend([
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
    ])

    seen = set()
    for path in candidates:
        norm = os.path.normpath(path)
        if norm in seen:
            continue
        seen.add(norm)
        if os.path.exists(norm):
            load_dotenv(norm, override=False)


_load_env()

# Supabase (PostgreSQL) is required
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required!\n"
        "Please set it in your .env file with your Supabase connection string.\n"
        "Get it from: Supabase Console → Settings → Database → Connection String (Session Pooler)"
    )

DB_TYPE = "postgres"

DEFAULT_SETTINGS = {
    "daily_soft_minutes": "360", # 6h
    "daily_hard_minutes": "480", # 8h
    "workdays_per_week": 5 # Mon-Fri
}

_POOL = None


class PooledConnection:
    def __init__(self, pool, con):
        self._pool = pool
        self._con = con

    def __getattr__(self, name):
        return getattr(self._con, name)

    def close(self):
        try:
            self._con.rollback()
        except Exception:
            pass
        self._pool.putconn(self._con)


def _get_pool():
    global _POOL
    if _POOL is None:
        from psycopg2.extras import RealDictCursor
        from psycopg2.pool import SimpleConnectionPool

        _POOL = SimpleConnectionPool(
            minconn=1,
            maxconn=5,
            dsn=DATABASE_URL,
            cursor_factory=RealDictCursor,
        )
    return _POOL

def get_con():
    """Get PostgreSQL (Supabase) database connection"""
    pool = _get_pool()
    con = pool.getconn()
    try:
        con.autocommit = False
        cur = con.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        return PooledConnection(pool, con)
    except Exception:
        logging.warning("Discarding stale PostgreSQL pooled connection", exc_info=True)
        try:
            pool.putconn(con, close=True)
        except Exception:
            logging.exception("Failed to close stale pooled connection cleanly")

        fresh_con = pool.getconn()
        fresh_con.autocommit = False
        fresh_cur = fresh_con.cursor()
        fresh_cur.execute("SELECT 1")
        fresh_cur.fetchone()
        fresh_cur.close()
        return PooledConnection(pool, fresh_con)

def init_db() -> None:
    """Initialize Supabase PostgreSQL database"""
    con = get_con()
    cur = con.cursor()
    
    # Create work_day table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS work_day (
        date TEXT PRIMARY KEY,
        start_time TEXT,
        end_time TEXT,
        break_minutes INTEGER NOT NULL DEFAULT 0,
        break_started_at TEXT,
        notes TEXT
    )
    """)
    
    # Create settings table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    # Create recurring_holiday table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS recurring_holiday (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        label TEXT,
        UNIQUE(date)
    )
    """)
    
    # Create time_off table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS time_off (
        id SERIAL PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        kind TEXT NOT NULL,
        label TEXT
    )
    """)
    
    # Seed defaults if missing
    for k, v in DEFAULT_SETTINGS.items():
        cur.execute(
            """INSERT INTO settings(key, value) VALUES(%s, %s) 
               ON CONFLICT (key) DO NOTHING""",
            (k, str(v)),
        )
    con.commit()
    cur.close()
    con.close()

def get_settings(con) -> dict[str, str]:
    """Get settings from PostgreSQL (Supabase)"""
    cur = con.cursor()
    
    cur.execute("SELECT key, value FROM settings")
    rows = cur.fetchall()
    out = {r["key"]: r["value"] for r in rows}
    
    # Ensure defaults exist even if DB got weird
    for k, v in DEFAULT_SETTINGS.items():
        out.setdefault(k, str(v))
    return out

def upsert_settings(con, updates: dict[str, str]) -> None:
    """Upsert settings to PostgreSQL (Supabase)"""
    cur = con.cursor()
    
    for k, v in updates.items():
        cur.execute(
            """INSERT INTO settings(key, value) VALUES(%s, %s)
               ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value""",
            (k, v),
        )


def get_targets(con) -> dict[str, int]:
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


