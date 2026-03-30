from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MoveBase(BaseModel):
    game_id: str
    move_number: int
    player_label: str
    column: int
    board_state: list
    reasoning_text: str | None = None


class MoveCreate(MoveBase):
    pass


class MoveRead(MoveBase):
    id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
