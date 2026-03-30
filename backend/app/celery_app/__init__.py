import os

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery("game_builder")

celery_app.conf.update(
    broker_url=settings.REDIS_URL,
    result_backend=settings.REDIS_URL,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,
    timezone="UTC",
    enable_utc=True,
    imports=[
        "app.celery_app.tasks.game_tasks",
        "app.celery_app.tasks.tournament_tasks",
    ],
)
