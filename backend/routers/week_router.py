from fastapi import APIRouter
from backend.db import get_con
from backend.time_utils import parse_date
from backend.services.week_service import compute_week

router = APIRouter(prefix="/api/week", tags=["week"])

@router.get("/{day_str}")
def get_week(day_str: str):
    con = get_con()
    out = compute_week(con, day_str)
    con.close()
    return out