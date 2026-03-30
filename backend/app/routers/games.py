import uuid
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.move import Move
from app.models.agent import Agent
from app.schemas.game import GameRead, HumanGameCreate
from app.services.connect4_engine import create_board, get_valid_moves

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/battle", status_code=201)
async def start_battle(payload: dict, db: AsyncSession = Depends(get_db)):
    """Instantly start an AI vs AI game and return the game_id for live viewing."""
    agent_a_id = payload.get("agent_a_id")
    agent_b_id = payload.get("agent_b_id")

    if not agent_a_id or not agent_b_id:
        raise HTTPException(status_code=422, detail="agent_a_id and agent_b_id are required")
    if agent_a_id == agent_b_id:
        raise HTTPException(status_code=422, detail="Agents must be different")

    for aid in (agent_a_id, agent_b_id):
        result = await db.execute(select(Agent).where(Agent.id == aid))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Agent {aid} not found")

    game = Game(
        id=str(uuid.uuid4()),
        agent_a_id=agent_a_id,
        agent_b_id=agent_b_id,
        status="pending",
    )
    db.add(game)
    await db.commit()
    await db.refresh(game)

    from app.celery_app.tasks.game_tasks import run_game_task
    run_game_task.delay(game.id)

    return {"game_id": game.id}


@router.get("/{game_id}", response_model=dict)
async def get_game(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    moves_result = await db.execute(
        select(Move).where(Move.game_id == game_id).order_by(Move.move_number)
    )
    moves = moves_result.scalars().all()

    return {
        "game": GameRead.model_validate(game).model_dump(),
        "moves": [
            {
                "move_number": m.move_number,
                "player_label": m.player_label,
                "column": m.column,
                "board_state": m.board_state,
                "reasoning_text": m.reasoning_text,
            }
            for m in moves
        ],
    }


@router.post("/human", status_code=201)
async def create_human_game(payload: HumanGameCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == payload.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    session_id = str(uuid.uuid4())
    game = Game(
        id=str(uuid.uuid4()),
        agent_a_id=payload.agent_id,
        human_session_id=session_id,
        status="running",
    )
    db.add(game)
    await db.commit()
    await db.refresh(game)

    from app.celery_app.tasks.game_tasks import process_ai_opening_move
    loop = asyncio.get_event_loop()
    try:
        opening = await loop.run_in_executor(None, process_ai_opening_move, game.id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI opening move failed: {exc}")
    if "error" in opening:
        raise HTTPException(status_code=500, detail=opening["error"])

    return {
        "game_id": game.id,
        "session_id": session_id,
        "board": opening["board"],
        "valid_moves": opening["valid_moves"],
        "ai_column": opening["ai_column"],
        "human_player": 2,
        "ai_player": 1,
        "agent_name": agent.name,
    }


@router.post("/{game_id}/move")
async def human_move(game_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    column = payload.get("column")
    if column is None:
        raise HTTPException(status_code=422, detail="column is required")

    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status == "complete":
        raise HTTPException(status_code=400, detail="Game is already complete")

    from app.celery_app.tasks.game_tasks import process_human_move

    loop = asyncio.get_event_loop()
    try:
        result_data = await loop.run_in_executor(None, process_human_move, game_id, int(column))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Move failed: {exc}")

    if "error" in result_data:
        raise HTTPException(status_code=400, detail=result_data["error"])

    return result_data
