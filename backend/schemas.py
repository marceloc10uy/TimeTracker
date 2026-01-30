from typing import Optional
from pydantic import BaseModel, Field

class MinutesBody(BaseModel):
    minutes: int = Field(ge=0, le=24 * 60)

class DayPatch(BaseModel):
    start_time: Optional[str] = Field(default=None, description="HH:MM or null")
    end_time: Optional[str] = Field(default=None, description="HH:MM or null")
    break_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    notes: Optional[str] = None

class SettingsPatch(BaseModel):
    daily_soft_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    daily_hard_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    workdays_per_week: Optional[int] = Field(default=None, ge=1, le=7)

class StartAtBody(BaseModel):
    start_time: str = Field(description="HH:MM")

class EndAtBody(BaseModel):
    end_time: str = Field(description="HH:MM")