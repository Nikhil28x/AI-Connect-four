import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tournament import Tournament
from app.models.tournament_agent import TournamentAgent
from app.models.game import Game
from app.schemas.tournament import TournamentCreate, TournamentRead

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


@router.post("", response_model=TournamentRead, status_code=201)
async def create_tournament(payload: TournamentCreate, db: AsyncSession = Depends(get_db)):
    tournament = Tournament(
        id=str(uuid.uuid4()),
        name=payload.name,
        format=payload.format,
        scheduled_at=payload.scheduled_at,
    )
    db.add(tournament)
    await db.flush()

    for agent_id in payload.agent_ids:
        db.add(TournamentAgent(
            id=str(uuid.uuid4()),
            tournament_id=tournament.id,
            agent_id=agent_id,
        ))

    await db.commit()
    await db.refresh(tournament)
    return tournament


@router.get("", response_model=list[TournamentRead])
async def list_tournaments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tournament).order_by(Tournament.scheduled_at.desc()))
    return result.scalars().all()


@router.get("/{tournament_id}")
async def get_tournament(tournament_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    games_result = await db.execute(
        select(Game).where(Game.tournament_id == tournament_id)
    )
    games = games_result.scalars().all()

    return {
        "tournament": TournamentRead.model_validate(t).model_dump(),
        "games": [
            {
                "id": g.id,
                "agent_a_id": g.agent_a_id,
                "agent_b_id": g.agent_b_id,
                "winner_agent_id": g.winner_agent_id,
                "is_draw": g.is_draw,
                "status": g.status,
                "move_count": g.move_count,
            }
            for g in games
        ],
    }


@router.post("/{tournament_id}/start")
async def start_tournament(tournament_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if t.status != "pending":
        raise HTTPException(status_code=400, detail=f"Tournament is already {t.status}")

    from app.celery_app.tasks.tournament_tasks import run_tournament_round_robin

    task = run_tournament_round_robin.delay(tournament_id)
    return {"task_id": task.id, "tournament_id": tournament_id}
