from fastapi import APIRouter, HTTPException
from typing import Optional
from backend.db import get_con
from backend.schemas import TimeoffCreate
from backend.time_utils import parse_date
from backend.services.timeoff_service import add_time_off, list_time_off, delete_time_off

router= APIRouter(prefix="/api/time-off", tags=["time-off"])

@router.get("")
def get_time_off(from_date: Optional[str] = None, to_date: Optional[str] = None):
    if from_date: parse_date(from_date)
    if to_date: parse_date(to_date)

    con = get_con()
    items = list_time_off(con, from_date, to_date)
    con.close()
    return {"items": items}

@router.post("")
def create_time_off(body: TimeoffCreate):
    s = parse_date(body.start_date)
    e = parse_date(body.end_date)
    if e < s:
        raise HTTPException(status_code=400, detail="end_date cannot be earlier than start_date")
    
    con = get_con()
    _ = add_time_off(con, body.start_date, body.end_date, body.kind, body.label)
    items = list_time_off(con)
    con.close()
    return {"items": items}

@router.delete("/{tid}")
def remove_time_off(tid: int):
    con = get_con()
    delete_time_off(con, tid)
    items = list_time_off(con)
    con.close()
    return {"items": items}