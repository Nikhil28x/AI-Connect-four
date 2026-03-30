# Connect4 AI

A Connect4 platform powered by [Cerebras](https://cerebras.ai) LLMs. Play against an AI or watch two models battle each other.

## Features

- **Quick Play** — AI moves first (🟡), you respond as 🔴. Pick your opponent model
- **Tournament** — pit any two models against each other and see who wins
- **Leaderboard** — ELO-rated scores across all games

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + async SQLAlchemy + PostgreSQL 15 |
| AI | Cerebras Cloud SDK |
| Queue | Celery 5 + Redis 7 (AI vs AI games run async) |
| Infra | Docker Compose |

## Quick Start

**Prerequisites:** Docker Desktop, a [Cerebras API key](https://cloud.cerebras.ai).

```bash
# 1. Clone and configure
git clone <repo-url> && cd game-builder
cp .env.example .env
# Set CEREBRAS_API_KEY in .env

# 2. Start all services
docker compose up --build -d

# 3. Seed the AI agents
docker exec game-builder-backend-1 python /app/seed_agents.py
```

Open **http://localhost:3000**

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Celery monitor | http://localhost:5555 |

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `CEREBRAS_API_KEY` | Your Cerebras Cloud API key |
| `DATABASE_URL` | PostgreSQL async connection string |
| `REDIS_URL` | Redis connection string |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | DB credentials |
| `SECRET_KEY` | Random secret for internal signing |

## Models

| Model ID | Display Name |
|----------|-------------|
| `llama3.1-8b` | Llama 3.1 8B |
| `qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B |

## Development

After editing code, rebuild only what changed:

```bash
# Backend + Celery worker
docker compose build --no-cache backend celery_worker && docker compose up -d backend celery_worker

# Frontend
docker compose build --no-cache frontend && docker compose up -d frontend
```

Watch live AI move logs:
```bash
docker logs game-builder-celery_worker-1 -f
```

Re-seed agents (safe to re-run, preserves ELO):
```bash
docker exec game-builder-backend-1 python /app/seed_agents.py
```

## Project Structure

```
game-builder/
├── backend/
│   ├── app/
│   │   ├── routers/               # FastAPI endpoints (games, agents, leaderboard)
│   │   ├── services/
│   │   │   ├── cerebras_agent.py  # LLM move generation
│   │   │   └── connect4_engine.py # Game logic
│   │   └── celery_app/tasks/      # Async AI vs AI game tasks
│   └── seed_agents.py             # DB seed script
├── frontend/
│   └── src/
│       └── pages/                 # QuickPlay, Tournament, Leaderboard
├── docker-compose.yml
└── .env.example
```
