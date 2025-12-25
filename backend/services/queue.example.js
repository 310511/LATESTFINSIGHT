/**
 * Job Queue Implementation Example for FinSight
 * 
 * This file demonstrates how to implement a proper job queue system
 * using Bull Queue and Redis.
 * 
 * Installation:
 * npm install bull redis
 * 
 * Setup:
 * 1. Install Redis: https://redis.io/download
 * 2. Start Redis: redis-server
 * 3. Update your .env with REDIS_URL=redis://localhost:6379
 * 
 * Usage:
 * - Import this module in your routes
 * - Replace processDocument() calls with queue.add()
 * - Run workers separately: node workers/documentProcessor.js
 */

const Queue = require('bull');
const Redis = require('ioredis');

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Create document processing queue
const documentQueue = new Queue('document-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retry 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay, doubles each retry
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  },
});

// Priority levels for different document types
const DOCUMENT_PRIORITY = {
  'bank_statement': 1, // Highest priority
  'invoice': 2,
  'gst_return': 2,
  'trial_balance': 3,
  'balance_sheet': 3,
  'profit_loss': 3,
  'audit_papers': 4,
  'purchase_order': 5,
  'salary_slip': 5,
  'agreement_contract': 6, // Lowest priority
};

/**
 * Add a document processing job to the queue
 * @param {string} documentId - UUID of the document
 * @param {string} documentType - Type of document
 * @param {object} options - Additional options
 */
async function addDocumentProcessingJob(documentId, documentType, options = {}) {
  const priority = DOCUMENT_PRIORITY[documentType] || 10;
  
  const job = await documentQueue.add(
    'process-document',
    {
      documentId,
      documentType,
      ...options,
    },
    {
      priority,
      jobId: `doc-${documentId}`, // Ensure only one job per document
      delay: options.delay || 0,
    }
  );

  console.log(`📋 Job ${job.id} added to queue for document ${documentId}`);
  
  return job;
}

/**
 * Get job status by document ID
 * @param {string} documentId - UUID of the document
 */
async function getJobStatus(documentId) {
  const jobId = `doc-${documentId}`;
  const job = await documentQueue.getJob(jobId);
  
  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress();
  
  return {
    jobId: job.id,
    status: state,
    progress: progress || 0,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
  };
}

/**
 * Cancel a job
 * @param {string} documentId - UUID of the document
 */
async function cancelJob(documentId) {
  const jobId = `doc-${documentId}`;
  const job = await documentQueue.getJob(jobId);
  
  if (job) {
    await job.remove();
    return { success: true, message: 'Job cancelled' };
  }
  
  return { success: false, message: 'Job not found' };
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    documentQueue.getWaitingCount(),
    documentQueue.getActiveCount(),
    documentQueue.getCompletedCount(),
    documentQueue.getFailedCount(),
    documentQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Event listeners for monitoring
documentQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed for document ${job.data.documentId}`);
});

documentQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed for document ${job.data.documentId}:`, err);
  // Here you could send an alert, log to monitoring service, etc.
});

documentQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled for document ${job.data.documentId}`);
});

// Clean up on shutdown
process.on('SIGTERM', async () => {
  console.log('Closing queue connection...');
  await documentQueue.close();
  process.exit(0);
});

module.exports = {
  documentQueue,
  addDocumentProcessingJob,
  getJobStatus,
  cancelJob,
  getQueueStats,
};

