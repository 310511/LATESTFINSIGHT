/**
 * Document Processing Worker
 * 
 * This worker processes jobs from the document-processing queue.
 * 
 * Run this separately from your main server:
 * node workers/documentProcessor.js
 * 
 * Or use PM2 for process management:
 * pm2 start workers/documentProcessor.js --name document-worker
 */

require('dotenv').config();
const { documentQueue } = require('../services/queue.example');
const { processDocument } = require('../services/documentProcessor');

// Process documents with concurrency of 2
// Adjust based on your server capacity and API rate limits
const CONCURRENCY = parseInt(process.env.DOCUMENT_PROCESSING_CONCURRENCY || '2');

documentQueue.process('process-document', CONCURRENCY, async (job) => {
  const { documentId, documentType } = job.data;
  
  console.log(`🔄 Processing job ${job.id} for document ${documentId} (${documentType})`);
  
  // Update progress
  await job.progress(10);
  
  try {
    // Update progress throughout processing
    // You'll need to modify processDocument to accept a progress callback
    await processDocument(documentId);
    
    await job.progress(100);
    
    console.log(`✅ Successfully processed document ${documentId}`);
    
    return {
      documentId,
      status: 'completed',
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    
    // Throw error to trigger retry mechanism
    throw error;
  }
});

// Event listeners
documentQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

documentQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
  
  // If max attempts reached, you might want to:
  // - Send notification to user
  // - Log to error tracking service
  // - Mark document as failed in database
});

documentQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

console.log(`🚀 Document processing worker started with concurrency ${CONCURRENCY}`);
console.log(`📊 Waiting for jobs...`);

// Keep process alive
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await documentQueue.close();
  process.exit(0);
});

