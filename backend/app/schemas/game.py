from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GameBase(BaseModel):
    agent_a_id: str
    agent_b_id: str | None = None


class GameCreate(GameBase):
    tournament_id: str | None = None


class HumanGameCreate(BaseModel):
    agent_id: str


class GameRead(GameBase):
    id: str
    tournament_id: str | None
    human_session_id: str | None
    winner_agent_id: str | None
    is_draw: bool
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    move_count: int

    model_config = ConfigDict(from_attributes=True)
