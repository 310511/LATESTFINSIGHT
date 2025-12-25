#!/bin/bash
# Restart Celery worker

echo "Stopping existing Celery workers..."
pkill -f "celery.*worker.*document_processing" || true
sleep 2

echo "Starting Celery worker..."
cd "$(dirname "$0")"
source venv/bin/activate
celery -A celery_app worker --loglevel=info --concurrency=2 --queues=document_processing --hostname=worker@%h

