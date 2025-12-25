# Job Queue Setup Guide - Async Processing

This guide explains how to set up and use the async job queue system for document processing.

## Overview

The system now uses **Celery** with **Redis** as the message broker to process documents asynchronously. This means:

- **Fast API responses**: Upload endpoint returns immediately with a job ID
- **Non-blocking**: Long-running processing doesn't block the API
- **Scalable**: Multiple workers can process jobs in parallel
- **Progress tracking**: Check job status and progress in real-time

## Architecture

```
Frontend → FastAPI → Redis (Queue) → Celery Workers → Processing → Results stored in Redis
                ↓
         Returns Job ID immediately
```

## Prerequisites

1. **Redis** must be installed and running
2. **Celery** and dependencies installed via `requirements.txt`
3. **Celery worker** process running to consume jobs

---

## Step 1: Install Redis

### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Verify Redis is running
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 2: Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

This will install:
- `celery>=5.3.0`
- `redis>=5.0.0`

---

## Step 3: Configure Environment

Make sure your `.env` file has Redis configuration:

```env
# Redis Configuration (for Celery job queue)
REDIS_URL=redis://localhost:6379/0

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## Step 4: Start Celery Worker

You need to run a Celery worker process to consume and process jobs from the queue.

### Option A: Using the provided script
```bash
cd backend
./start_celery_worker.sh
```

### Option B: Manual start
```bash
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info --concurrency=2
```

### Option C: Run in background
```bash
celery -A celery_app worker --loglevel=info --concurrency=2 --detach
```

---

## Step 5: Start FastAPI Server

In a separate terminal:

```bash
cd backend
source venv/bin/activate
python run.py
```

---

## API Usage

### 1. Upload Document (Queues Job)

**Endpoint**: `POST /process`

```bash
curl -X POST "http://localhost:8000/process" \
  -F "file=@document.pdf" \
  -F "document_type=bank_statement"
```

**Response** (immediate):
```json
{
  "job_id": "abc123-def456-...",
  "status": "queued",
  "message": "Document processing started. Use /job/{job_id}/status to check progress.",
  "filename": "document.pdf"
}
```

### 2. Check Job Status

**Endpoint**: `GET /job/{job_id}/status`

```bash
curl "http://localhost:8000/job/abc123-def456-.../status"
```

**Response** (while processing):
```json
{
  "job_id": "abc123-def456-...",
  "status": "processing",
  "state": "PROCESSING",
  "progress": 45,
  "message": "Extracting structured data..."
}
```

**Response** (completed):
```json
{
  "job_id": "abc123-def456-...",
  "status": "completed",
  "state": "SUCCESS",
  "progress": 100,
  "result": {
    "extracted_data": {...},
    "reports": {...},
    "document_type": "bank_statement",
    "filename": "document.pdf"
  },
  "message": "Processing completed successfully"
}
```

**Response** (failed):
```json
{
  "job_id": "abc123-def456-...",
  "status": "failed",
  "state": "FAILURE",
  "error": "Error message here",
  "error_type": "ValueError",
  "message": "Processing failed: Error message here"
}
```

### 3. Get Job Result

**Endpoint**: `GET /job/{job_id}/result`

```bash
curl "http://localhost:8000/job/abc123-def456-.../result"
```

Returns the full processing result when job is completed.

---

## Job States

- **PENDING**: Job is waiting to be processed
- **PROCESSING**: Job is currently being processed
- **SUCCESS**: Job completed successfully
- **FAILURE**: Job failed with an error

---

## Monitoring

### Check Celery Worker Status
```bash
celery -A celery_app inspect active
celery -A celery_app inspect stats
```

### Monitor Redis Queue
```bash
redis-cli
> KEYS *
> LLEN celery
```

### View Celery Flower (Web UI)
```bash
pip install flower
celery -A celery_app flower
# Visit http://localhost:5555
```

---

## Production Considerations

### 1. Multiple Workers

Run multiple workers for better throughput:
```bash
celery -A celery_app worker --concurrency=4
```

Or run multiple worker processes:
```bash
celery -A celery_app worker --hostname=worker1@%h &
celery -A celery_app worker --hostname=worker2@%h &
```

### 2. Redis Persistence

Configure Redis for persistence in production:
- Edit `/etc/redis/redis.conf`
- Enable `save` directives for persistence

### 3. Result Backend

Consider using a more persistent backend for results:
- PostgreSQL
- MongoDB
- Or keep results in Redis but with longer expiration

### 4. Error Handling

Failed jobs are automatically logged. Set up monitoring:
- Celery Flower for web UI
- Error tracking (Sentry, etc.)
- Log aggregation

### 5. Resource Limits

Adjust worker settings based on your resources:
- `--concurrency`: Number of concurrent tasks
- `task_time_limit`: Maximum time per task
- `worker_max_tasks_per_child`: Restart workers periodically

---

## Troubleshooting

### Issue: "Connection refused" to Redis

**Solution**: Make sure Redis is running
```bash
redis-cli ping  # Should return PONG
# If not, start Redis:
redis-server
```

### Issue: Jobs stuck in PENDING

**Solution**: 
1. Check if Celery worker is running
2. Check worker logs for errors
3. Verify Redis connection

### Issue: Tasks not executing

**Solution**:
1. Check worker logs: `celery -A celery_app worker --loglevel=debug`
2. Verify task registration: `celery -A celery_app inspect registered`
3. Check Redis queue: `redis-cli LLEN celery`

### Issue: Memory issues

**Solution**:
1. Reduce concurrency: `--concurrency=1`
2. Lower `worker_max_tasks_per_child`
3. Process smaller files or increase server memory

---

## Development Workflow

1. **Terminal 1**: Start Redis
   ```bash
   redis-server
   ```

2. **Terminal 2**: Start Celery Worker
   ```bash
   cd backend
   source venv/bin/activate
   celery -A celery_app worker --loglevel=info
   ```

3. **Terminal 3**: Start FastAPI Server
   ```bash
   cd backend
   source venv/bin/activate
   python run.py
   ```

4. **Upload documents** and check job status using the API endpoints.

---

## Benefits

✅ **Non-blocking API**: Fast responses, better user experience  
✅ **Scalable**: Add more workers to handle more load  
✅ **Reliable**: Failed jobs can be retried  
✅ **Progress tracking**: Real-time status updates  
✅ **Resource efficient**: Better CPU/memory utilization  

---

For more information, see:
- [Celery Documentation](https://docs.celeryq.dev/)
- [Redis Documentation](https://redis.io/docs/)

