import itertools
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.celery_app import celery_app
from app.config import get_settings


def _sync_session():
    settings = get_settings()
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")
    engine = create_engine(sync_url, pool_pre_ping=True)
    factory = sessionmaker(bind=engine)
    return engine, factory()


@celery_app.task(name="tournament_tasks.run_tournament_round_robin", bind=True)
def run_tournament_round_robin(self, tournament_id: str) -> dict:
    from app.celery_app.tasks.game_tasks import run_game_task
    from app.models.game import Game
    from app.models.tournament import Tournament

    engine, db = _sync_session()
    try:
        tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
        if not tournament:
            return {"error": f"Tournament {tournament_id} not found"}

        from app.models.tournament_agent import TournamentAgent
        agent_ids = [
            ta.agent_id
            for ta in db.query(TournamentAgent)
            .filter(TournamentAgent.tournament_id == tournament_id)
            .all()
        ]

        if len(agent_ids) < 2:
            return {"error": "Need at least 2 agents"}

        pairings = list(itertools.combinations(agent_ids, 2))
        game_ids = []

        for agent_a_id, agent_b_id in pairings:
            game = Game(
                id=str(uuid.uuid4()),
                tournament_id=tournament_id,
                agent_a_id=agent_a_id,
                agent_b_id=agent_b_id,
                status="pending",
            )
            db.add(game)
            db.flush()
            game_ids.append(game.id)

        tournament.status = "running"
        tournament.started_at = datetime.now(timezone.utc)
        db.commit()

        for gid in game_ids:
            run_game_task.delay(gid)

        return {"tournament_id": tournament_id, "games_scheduled": len(game_ids)}
    finally:
        db.close()
        engine.dispose()
