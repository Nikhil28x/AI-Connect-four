import json
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine
from app.models import Agent, Game, Move, Tournament
from app.models.tournament_agent import TournamentAgent
from app.routers import agents, games, leaderboard, tournaments
from app.services.ws_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import Base, AsyncSessionLocal
    from app.models.agent import Agent
    from app.services.cerebras_agent import PRESET_AGENTS
    import uuid
    from sqlalchemy import select

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-seed preset agents if they don't exist
    async with AsyncSessionLocal() as db:
        for name, cfg in PRESET_AGENTS.items():
            result = await db.execute(select(Agent).where(Agent.name == name))
            if result.scalar_one_or_none() is None:
                db.add(Agent(
                    id=str(uuid.uuid4()),
                    name=name,
                    model=cfg["model"],
                    system_prompt=cfg["system_prompt"].replace("{agent_name}", name),
                    temperature=cfg["temperature"],
                ))
        await db.commit()

    yield


settings = get_settings()

app = FastAPI(title="Connect4 AI Tournament", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(games.router)
app.include_router(leaderboard.router)
app.include_router(tournaments.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/games/{game_id}")
async def ws_game(websocket: WebSocket, game_id: str):
    channel = f"game:{game_id}"
    await manager.connect(websocket, channel)
    rc = aioredis.from_url(settings.REDIS_URL)
    pubsub = rc.pubsub()
    await pubsub.psubscribe(f"game:{game_id}:*")
    try:
        async for message in pubsub.listen():
            if message["type"] in ("pmessage", "message"):
                data = message.get("data")
                if isinstance(data, bytes):
                    await manager.broadcast(channel, json.loads(data))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, channel)
        await pubsub.punsubscribe(f"game:{game_id}:*")
        await rc.aclose()


@app.websocket("/ws/leaderboard")
async def ws_leaderboard(websocket: WebSocket):
    channel = "leaderboard"
    await manager.connect(websocket, channel)
    rc = aioredis.from_url(settings.REDIS_URL)
    pubsub = rc.pubsub()
    await pubsub.subscribe("leaderboard:update")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message.get("data")
                if isinstance(data, bytes):
                    await manager.broadcast(channel, json.loads(data))
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, channel)
        await pubsub.unsubscribe("leaderboard:update")
        await rc.aclose()
