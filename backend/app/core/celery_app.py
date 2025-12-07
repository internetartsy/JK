from celery import Celery
import os
from app.core.config import settings

# Redis URL for Broker and Backend
# Using separate DB for broker (0) and result backend (1)
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
BACKEND_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"

celery_app = Celery(
    "land_records",
    broker=BROKER_URL,
    backend=BACKEND_URL,
    include=["app.services.task_queue.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Karachi",
    enable_utc=True,
)
