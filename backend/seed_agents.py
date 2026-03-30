"""
Seed the database with the 5 preset Cerebras AI agents.
Run from the backend/ directory: python seed_agents.py
"""
import os
import sys
import uuid

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use sync URL for seeding
db_url = os.environ["DATABASE_URL"].replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)

from app.models.agent import Agent
from app.database import Base
from app.services.cerebras_agent import PRESET_AGENTS

Base.metadata.create_all(engine)

with Session() as db:
    # Remove agents that are no longer in PRESET_AGENTS
    for a in db.query(Agent).all():
        if a.name not in PRESET_AGENTS:
            print(f"  DELETE {a.name}")
            db.delete(a)
    db.commit()

    for name, cfg in PRESET_AGENTS.items():
        existing = db.query(Agent).filter(Agent.name == name).first()
        if existing:
            existing.model = cfg["model"]
            existing.system_prompt = cfg["system_prompt"].replace("{agent_name}", name)
            existing.temperature = cfg["temperature"]
            db.commit()
            print(f"  UPDATE {name} ({cfg['model']}, ELO={existing.elo_rating})")
        else:
            agent = Agent(
                id=str(uuid.uuid4()),
                name=name,
                model=cfg["model"],
                system_prompt=cfg["system_prompt"].replace("{agent_name}", name),
                temperature=cfg["temperature"],
            )
            db.add(agent)
            db.commit()
            print(f"  CREATE {name} ({cfg['model']})")
