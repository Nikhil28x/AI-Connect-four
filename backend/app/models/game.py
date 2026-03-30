import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tournament_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("tournaments.id"), nullable=True
    )
    agent_a_id: Mapped[str] = mapped_column(String, ForeignKey("agents.id"), nullable=False)
    agent_b_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("agents.id"), nullable=True
    )
    human_session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    winner_agent_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("agents.id"), nullable=True
    )
    is_draw: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    move_count: Mapped[int] = mapped_column(Integer, default=0)
