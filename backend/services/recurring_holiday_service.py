from typing import Optional


def list_recurring(con) -> list[dict]:
    cur = con.cursor()
    cur.execute("SELECT * FROM recurring_holiday ORDER BY date ASC")
    return cur.fetchall()


def upsert_recurring(con, date: str, label: Optional[str]) -> None:
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO recurring_holiday (date, label)
        VALUES (%s, %s)
        ON CONFLICT(date) DO UPDATE SET label=excluded.label
        """,
        (date, label),
    )
    con.commit()


def delete_recurring(con, rid: int):
    cur = con.cursor()
    cur.execute("DELETE FROM recurring_holiday WHERE id = %s", (rid,))
    con.commit()
