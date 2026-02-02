from fastapi import APIRouter
from backend.db import get_con
from backend.schemas import RecurringHolidayCreate
from backend.services.recurring_holiday_service import list_recurring, upsert_recurring, delete_recurring

router = APIRouter(prefix="/api/recurring-holidays", tags=["recurring-holidays"])

@router.get("")
def get_all():
    con = get_con()
    items = list_recurring(con)
    con.close()
    return {"items": items}

@router.post("")
def upsert(body: RecurringHolidayCreate):
    con = get_con()
    upsert_recurring(con, body.month, body.day, body.label)
    items = list_recurring(con)
    con.close()
    return {"items": items}

@router.delete("/{rid}")
def remove(rid: int):
    con = get_con()
    delete_recurring(con, rid)
    items = list_recurring(con)
    con.close()
    return {"items", items}
