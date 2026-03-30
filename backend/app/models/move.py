import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Move(Base):
    __tablename__ = "moves"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id: Mapped[str] = mapped_column(String, ForeignKey("games.id"), nullable=False)
    move_number: Mapped[int] = mapped_column(Integer, nullable=False)
    player_label: Mapped[str] = mapped_column(String, nullable=False)  # A | B | human
    column: Mapped[int] = mapped_column(Integer, nullable=False)
    board_state: Mapped[dict] = mapped_column(JSON, nullable=False)
    reasoning_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
