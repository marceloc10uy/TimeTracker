from fastapi import APIRouter, HTTPException
from backend.db import get_con, get_settings, get_targets, upsert_settings
from backend.schemas import SettingsPatch

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("")
def api_get_settings():
    con = get_con()
    s = get_settings(con)
    t = get_targets(con)
    con.close()
    return {
        "settings": {
            "daily_soft_minutes": int(s["daily_soft_minutes"]),
            "daily_hard_minutes": int(s["daily_hard_minutes"]),
            "workdays_per_week": int(s["workdays_per_week"]),
        },
        "derived": {
            "weekly_soft_minutes": t["weekly_soft"],
            "weekly_hard_minutes": t["weekly_hard"],
        }
    }

@router.patch("")
def api_patch_settings(body: SettingsPatch):
    con = get_con()
    current = get_settings(con)

    new_soft = body.daily_soft_minutes if body.daily_soft_minutes is not None else int(current["daily_soft_minutes"])
    new_hard = body.daily_hard_minutes if body.daily_hard_minutes is not None else int(current["daily_hard_minutes"])

    if new_soft > new_hard:
        con.close()
        raise HTTPException(400, "daily_soft_minutes cannot be greater than daily_hard_minutes.")

    updates = {}
    if body.daily_soft_minutes is not None:
        updates["daily_soft_minutes"] = str(body.daily_soft_minutes)
    if body.daily_hard_minutes is not None:
        updates["daily_hard_minutes"] = str(body.daily_hard_minutes)
    if body.workdays_per_week is not None:
        updates["workdays_per_week"] = str(body.workdays_per_week)

    if updates:
        upsert_settings(con, updates)

    out = api_get_settings
    con.close()
    return out