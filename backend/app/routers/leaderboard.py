from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.agent import Agent
from app.schemas.agent import AgentRead

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[dict])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).order_by(Agent.elo_rating.desc()))
    agents = result.scalars().all()
    leaderboard = []
    for rank, agent in enumerate(agents, start=1):
        total = agent.wins + agent.losses + agent.draws
        win_rate = round(agent.wins / total * 100, 1) if total > 0 else 0.0
        leaderboard.append(
            {
                "rank": rank,
                "id": agent.id,
                "name": agent.name,
                "model": agent.model,
                "elo_rating": agent.elo_rating,
                "wins": agent.wins,
                "losses": agent.losses,
                "draws": agent.draws,
                "win_rate": win_rate,
            }
        )
    return leaderboard
