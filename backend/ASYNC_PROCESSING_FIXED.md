# Async Processing with Celery/Redis - Fixed Implementation

## Overview
The async processing has been reintroduced and fixed to address previous issues where jobs were getting stuck in PENDING state and not returning results.

## What Was Fixed

### 1. **Task Queueing** (`/process` endpoint)
- ✅ Now queues tasks using Celery instead of synchronous processing
- ✅ Checks cache first - returns cached results immediately (no queueing needed)
- ✅ Explicit queue routing: `queue='document_processing'`
- ✅ Returns `job_id` immediately for async processing

### 2. **Task Execution** (`tasks/document_processing.py`)
- ✅ Proper error handling - returns error results instead of raising exceptions
- ✅ Progress updates via `update_state()` throughout processing
- ✅ Caches results in Redis after successful processing
- ✅ Returns final result properly for retrieval

### 3. **Status Endpoint** (`/job/{job_id}/status`)
- ✅ Safe task state checking using `ready()`, `successful()`, `failed()` methods
- ✅ Handles all task states: PENDING, PROCESSING, SUCCESS, FAILURE
- ✅ Returns progress information for frontend
- ✅ No more "Exception information must include exception type" errors

### 4. **Result Endpoint** (`/job/{job_id}/result`)
- ✅ Gets result from `task.result` (most reliable method)
- ✅ Fallback to `task.info['result']` if needed
- ✅ Proper error handling for all states
- ✅ Returns complete processing result

### 5. **Queue Configuration** (`celery_app.py`)
- ✅ Proper queue routing configuration
- ✅ Task routing: `tasks.document_processing.*` → `document_processing` queue
- ✅ Worker listens to `document_processing` queue

## How It Works

### Flow:
1. **Upload Document** → `/process` endpoint
   - Checks cache first (instant return if cached)
   - If not cached: Queues task with Celery
   - Returns `job_id` immediately

2. **Frontend Polling** → `/job/{job_id}/status`
   - Polls every 2 seconds
   - Gets progress updates (0-100%)
   - Waits for status = "completed"

3. **Get Results** → `/job/{job_id}/result`
   - Called when status = "completed"
   - Returns full processing result
   - Frontend displays results

### Cache Integration:
- **Cache Hit**: Document processed before → Instant return (no queueing)
- **Cache Miss**: New document → Queue for processing → Cache result after completion

## Running the System

### 1. Start Redis (if not running)
```bash
redis-server
# Or check if running:
redis-cli ping  # Should return PONG
```

### 2. Start Celery Worker
```bash
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info --concurrency=2 --queues=document_processing --hostname=worker@%h
```

Or use the provided script:
```bash
cd backend
./start_celery_worker.sh
```

### 3. Start FastAPI Backend
```bash
cd backend
source venv/bin/activate
python run.py
```

### 4. Verify Everything is Running
```bash
# Check Redis
redis-cli ping

# Check Celery worker (from backend directory)
celery -A celery_app inspect registered
celery -A celery_app inspect active_queues

# Check backend
curl http://localhost:8000/health
```

## Testing

### Test 1: Queue a Task
```bash
curl -X POST http://localhost:8000/process \
  -F "file=@test.pdf" \
  -F "document_type=trial_balance"
```

Expected response:
```json
{
  "job_id": "abc123-...",
  "status": "queued",
  "message": "Document processing started. Use /job/{job_id}/status to check progress.",
  "filename": "test.pdf",
  "cached": false
}
```

### Test 2: Check Status
```bash
curl http://localhost:8000/job/{job_id}/status
```

Expected response (during processing):
```json
{
  "job_id": "abc123-...",
  "status": "processing",
  "state": "PROCESSING",
  "progress": 45,
  "message": "Extracting structured data..."
}
```

Expected response (completed):
```json
{
  "job_id": "abc123-...",
  "status": "completed",
  "state": "SUCCESS",
  "progress": 100,
  "message": "Processing completed successfully",
  "result": { ... }
}
```

### Test 3: Get Result
```bash
curl http://localhost:8000/job/{job_id}/result
```

Expected response:
```json
{
  "extracted_data": { ... },
  "reports": { ... },
  "document_type": "trial_balance",
  "filename": "test.pdf"
}
```

## Key Fixes Applied

1. **No More PENDING Stuck Jobs**
   - Explicit queue routing ensures tasks go to correct queue
   - Worker listens to correct queue
   - Proper task registration

2. **Results Are Returned**
   - Task returns result properly
   - Status endpoint includes result in response when completed
   - Result endpoint gets result from `task.result` (most reliable)

3. **Error Handling**
   - Tasks return error results instead of raising exceptions
   - Prevents serialization errors
   - Better error messages

4. **Progress Tracking**
   - Tasks update state with progress (0-100%)
   - Frontend can show real-time progress
   - Status endpoint returns progress information

## Troubleshooting

### Worker Not Picking Up Tasks
- Check worker is running: `ps aux | grep celery`
- Check worker is listening to correct queue: `celery -A celery_app inspect active_queues`
- Check Redis is running: `redis-cli ping`
- Restart worker: `pkill -f celery && ./start_celery_worker.sh`

### Tasks Stuck in PENDING
- Verify queue name matches: task uses `queue='document_processing'`, worker uses `--queues=document_processing`
- Check task registration: `celery -A celery_app inspect registered`
- Check for errors in worker logs

### Results Not Available
- Check task completed successfully: `curl /job/{job_id}/status`
- Check worker logs for errors
- Verify task.result is being set (task returns value properly)

### Cache Not Working
- Check Redis is running: `redis-cli ping`
- Check cache stats: `curl http://localhost:8000/cache/stats`
- Clear cache if needed: `curl http://localhost:8000/cache/clear`

## Monitoring

### Check Cache Statistics
```bash
curl http://localhost:8000/cache/stats
```

### Check Active Tasks
```bash
celery -A celery_app inspect active
```

### Check Registered Tasks
```bash
celery -A celery_app inspect registered
```

### Check Queue Status
```bash
celery -A celery_app inspect reserved
celery -A celery_app inspect active_queues
```

## Frontend Integration

The frontend (`ProcessingPage.jsx`) already handles async processing:
- Detects `job_id` in response
- Polls `/job/{job_id}/status` every 2 seconds
- Shows progress based on status response
- Fetches result from `/job/{job_id}/result` when completed
- Handles cached responses (direct result, no polling needed)

## Benefits

✅ **Non-blocking**: Server responds immediately, doesn't block during processing
✅ **Scalable**: Can handle multiple documents concurrently
✅ **Cached**: Repeated documents return instantly from cache
✅ **Progress tracking**: Real-time progress updates for users
✅ **Reliable**: Proper error handling and result storage
✅ **Production-ready**: Can handle long-running tasks without timeout issues

