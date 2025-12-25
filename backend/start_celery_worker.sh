#!/bin/bash
# Script to start Celery worker for document processing

echo "Starting Celery worker for document processing..."
echo "Make sure Redis is running: redis-server"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start Celery worker
celery -A celery_app worker \
    --loglevel=info \
    --concurrency=2 \
    --queues=document_processing \
    --hostname=worker@%h

