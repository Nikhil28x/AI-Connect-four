from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AgentBase(BaseModel):
    name: str
    model: str
    system_prompt: str
    temperature: float = 0.7


class AgentCreate(AgentBase):
    pass


class AgentRead(AgentBase):
    id: str
    elo_rating: int
    wins: int
    losses: int
    draws: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
