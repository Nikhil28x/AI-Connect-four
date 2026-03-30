import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TournamentAgent(Base):
    __tablename__ = "tournament_agents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tournament_id: Mapped[str] = mapped_column(
        String, ForeignKey("tournaments.id"), nullable=False
    )
    agent_id: Mapped[str] = mapped_column(String, ForeignKey("agents.id"), nullable=False)
