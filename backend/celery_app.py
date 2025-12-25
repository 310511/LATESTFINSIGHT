"""
Celery configuration for async job processing
"""
import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Redis connection URL
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "finsight",
    broker=redis_url,
    backend=redis_url,
    include=["tasks.document_processing"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max per task
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    worker_prefetch_multiplier=1,  # Process one task at a time for better resource management
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks to prevent memory leaks
    task_acks_late=True,  # Acknowledge tasks only after completion
    task_reject_on_worker_lost=True,  # Re-queue tasks if worker dies
    result_expires=3600,  # Results expire after 1 hour
    task_routes={
        "tasks.document_processing.*": {"queue": "document_processing"},
        "tasks.document_processing.process_document_task": {"queue": "document_processing"},
    },
    task_default_queue="document_processing",
    task_default_exchange="document_processing",
    task_default_routing_key="document_processing",
)

# Tasks will be imported when needed to avoid circular imports

