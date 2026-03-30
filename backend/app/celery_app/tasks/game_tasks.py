import json
import uuid
from datetime import datetime, timezone

import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.celery_app import celery_app
from app.config import get_settings
from app.services.cerebras_agent import CerebrasAgent
from app.services.connect4_engine import (
    board_to_string,
    check_winner,
    create_board,
    get_valid_moves,
    make_move,
)
from app.services.elo_service import new_ratings


def _sync_session() -> tuple[any, Session]:
    settings = get_settings()
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")
    engine = create_engine(sync_url, pool_pre_ping=True)
    factory = sessionmaker(bind=engine)
    return engine, factory()


def _redis_client():
    settings = get_settings()
    return redis.from_url(settings.REDIS_URL)


@celery_app.task(name="game_tasks.run_game_task", bind=True, time_limit=300)
def run_game_task(self, game_id: str) -> dict:
    from app.models.agent import Agent
    from app.models.game import Game
    from app.models.move import Move

    engine, db = _sync_session()
    rc = _redis_client()

    try:
        game: Game = db.query(Game).filter(Game.id == game_id).first()
        if not game:
            return {"error": f"Game {game_id} not found"}

        agent_a_row: Agent = db.query(Agent).filter(Agent.id == game.agent_a_id).first()
        agent_b_row: Agent = db.query(Agent).filter(Agent.id == game.agent_b_id).first()

        if not agent_a_row or not agent_b_row:
            return {"error": "One or both agents not found"}

        agent_a = CerebrasAgent(
            name=agent_a_row.name,
            model=agent_a_row.model,
            system_prompt=agent_a_row.system_prompt,
            temperature=agent_a_row.temperature,
        )
        agent_b = CerebrasAgent(
            name=agent_b_row.name,
            model=agent_b_row.model,
            system_prompt=agent_b_row.system_prompt,
            temperature=agent_b_row.temperature,
        )

        game.status = "running"
        game.started_at = datetime.now(timezone.utc)
        db.commit()

        board = create_board()
        move_number = 0
        winner_result = None

        while move_number < 42:
            valid = get_valid_moves(board)
            if not valid:
                break

            current_player = 1 if move_number % 2 == 0 else 2
            current_agent = agent_a if current_player == 1 else agent_b
            label = "A" if current_player == 1 else "B"

            col, reasoning = current_agent.get_move(board, valid, current_player)
            board = make_move(board, col, current_player)
            move_number += 1

            move_record = Move(
                id=str(uuid.uuid4()),
                game_id=game_id,
                move_number=move_number,
                player_label=label,
                column=col,
                board_state=board,
                reasoning_text=reasoning,
            )
            db.add(move_record)
            db.commit()

            rc.publish(
                f"game:{game_id}:state",
                json.dumps({"board": board, "move": move_number, "col": col, "player": label}),
            )

            winner_result = check_winner(board)
            if winner_result is not None:
                break

        game.move_count = move_number
        game.completed_at = datetime.now(timezone.utc)
        game.status = "complete"

        result_str = "draw"
        elo_result = 0.5

        if winner_result == 1:
            game.winner_agent_id = agent_a_row.id
            agent_a_row.wins += 1
            agent_b_row.losses += 1
            result_str = "A"
            elo_result = 1.0
        elif winner_result == 2:
            game.winner_agent_id = agent_b_row.id
            agent_b_row.wins += 1
            agent_a_row.losses += 1
            result_str = "B"
            elo_result = 0.0
        else:
            game.is_draw = True
            agent_a_row.draws += 1
            agent_b_row.draws += 1

        new_a, new_b = new_ratings(agent_a_row.elo_rating, agent_b_row.elo_rating, elo_result)
        agent_a_row.elo_rating = new_a
        agent_b_row.elo_rating = new_b

        db.commit()

        payload = {"game_id": game_id, "winner": result_str, "move_count": move_number}
        rc.publish(f"game:{game_id}:complete", json.dumps(payload))
        rc.publish("leaderboard:update", json.dumps({"event": "game_complete", "game_id": game_id}))

        return payload
    finally:
        db.close()
        engine.dispose()


def process_human_move(game_id: str, column: int) -> dict:
    """Run a human move + AI response synchronously. Called directly from the async router."""
    from app.models.agent import Agent
    from app.models.game import Game
    from app.models.move import Move

    engine, db = _sync_session()
    rc = _redis_client()

    try:
        game: Game = db.query(Game).filter(Game.id == game_id).first()
        if not game:
            return {"error": f"Game {game_id} not found"}

        agent_row: Agent = db.query(Agent).filter(Agent.id == game.agent_a_id).first()

        # Reconstruct board from move history
        moves = (
            db.query(Move)
            .filter(Move.game_id == game_id)
            .order_by(Move.move_number)
            .all()
        )
        board = create_board()
        for m in moves:
            player = 2 if m.player_label == "human" else 1
            board = make_move(board, m.column, player)

        move_number = len(moves)
        human_player = 2
        ai_player = 1

        valid = get_valid_moves(board)
        if column not in valid:
            return {"error": f"Column {column} is not a valid move"}

        board = make_move(board, column, human_player)
        move_number += 1

        human_move = Move(
            id=str(uuid.uuid4()),
            game_id=game_id,
            move_number=move_number,
            player_label="human",
            column=column,
            board_state=board,
            reasoning_text=None,
        )
        db.add(human_move)
        db.commit()

        winner = check_winner(board)
        valid_after = get_valid_moves(board)

        if winner is not None or not valid_after:
            game.status = "complete"
            game.completed_at = datetime.now(timezone.utc)
            game.move_count = move_number
            if winner == human_player:
                status_str = "human_wins"
            elif winner == ai_player:
                status_str = "ai_wins"
            else:
                status_str = "draw"
                game.is_draw = True
            db.commit()
            return {
                "board": board,
                "valid_moves": [],
                "status": status_str,
                "ai_column": None,
                "ai_reasoning": None,
            }

        # AI turn
        agent = CerebrasAgent(
            name=agent_row.name,
            model=agent_row.model,
            system_prompt=agent_row.system_prompt,
            temperature=agent_row.temperature,
        )
        ai_col, reasoning = agent.get_move(board, valid_after, ai_player)
        board = make_move(board, ai_col, ai_player)
        move_number += 1

        ai_move = Move(
            id=str(uuid.uuid4()),
            game_id=game_id,
            move_number=move_number,
            player_label="B",
            column=ai_col,
            board_state=board,
            reasoning_text=reasoning,
        )
        db.add(ai_move)
        db.commit()

        winner = check_winner(board)
        valid_final = get_valid_moves(board)

        if winner is not None or not valid_final:
            game.status = "complete"
            game.completed_at = datetime.now(timezone.utc)
            game.move_count = move_number
            if winner == ai_player:
                game.winner_agent_id = agent_row.id
                agent_row.wins += 1
                status_str = "ai_wins"
            elif winner == human_player:
                status_str = "human_wins"
            else:
                status_str = "draw"
                game.is_draw = True
            db.commit()
        else:
            status_str = "ongoing"

        payload = {
            "board": board,
            "valid_moves": valid_final,
            "status": status_str,
            "ai_column": ai_col,
            "ai_reasoning": reasoning,
        }
        rc.publish(f"game:{game_id}:state", json.dumps(payload))
        return payload
    finally:
        db.close()
        engine.dispose()


def process_ai_opening_move(game_id: str) -> dict:
    """Make the AI's first move on a fresh board (AI is player 1 / yellow)."""
    from app.models.agent import Agent
    from app.models.game import Game
    from app.models.move import Move

    engine, db = _sync_session()
    try:
        game: Game = db.query(Game).filter(Game.id == game_id).first()
        if not game:
            return {"error": f"Game {game_id} not found"}

        agent_row: Agent = db.query(Agent).filter(Agent.id == game.agent_a_id).first()
        board = create_board()
        valid = get_valid_moves(board)
        ai_player = 1

        agent = CerebrasAgent(
            name=agent_row.name,
            model=agent_row.model,
            system_prompt=agent_row.system_prompt,
            temperature=agent_row.temperature,
        )
        ai_col, reasoning = agent.get_move(board, valid, ai_player)
        board = make_move(board, ai_col, ai_player)

        move_record = Move(
            id=str(uuid.uuid4()),
            game_id=game_id,
            move_number=1,
            player_label="A",
            column=ai_col,
            board_state=board,
            reasoning_text=reasoning,
        )
        db.add(move_record)
        db.commit()

        return {
            "board": board,
            "valid_moves": get_valid_moves(board),
            "ai_column": ai_col,
            "status": "ongoing",
        }
    finally:
        db.close()
        engine.dispose()


@celery_app.task(name="game_tasks.run_human_move_task", bind=True, time_limit=60)
def run_human_move_task(self, game_id: str, column: int) -> dict:
    return process_human_move(game_id, column)
