from fastapi import APIRouter, HTTPException

from backend.db import get_con
from backend.services.calendar_service import compute_year_calendar


router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/year/{year}")
def get_calendar_year(year: int):
    if year < 1900 or year > 2100:
        raise HTTPException(status_code=400, detail="year must be between 1900 and 2100")

    con = get_con()
    out = compute_year_calendar(con, year)
    con.close()
    return out
