import sqlite3
from typing import Optional


def list_recurring(con: sqlite3.Connection) -> list[dict]:
    cur = con.cursor()
    cur.execute("SELECT * FROM recurring_holiday ORDER BY date ASC")
    return [dict(r) for r in cur.fetchall()]


def upsert_recurring(con: sqlite3.Connection, date: str, label: Optional[str]) -> None:
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO recurring_holiday (date, label)
        VALUES (?, ?)
        ON CONFLICT(date) DO UPDATE SET label=excluded.label
        """,
        (date, label),
    )
    con.commit()


def delete_recurring(con: sqlite3.Connection, rid: int):
    cur = con.cursor()
    cur.execute("DELETE FROM recurring_holiday WHERE id = ?", (rid,))
    con.commit()