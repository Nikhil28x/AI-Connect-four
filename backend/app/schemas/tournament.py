from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TournamentBase(BaseModel):
    name: str
    format: str


class TournamentCreate(TournamentBase):
    agent_ids: list[str]
    scheduled_at: datetime | None = None


class TournamentRead(TournamentBase):
    id: str
    status: str
    scheduled_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
