/**
 * Improved Documents Route with Job Queue Integration
 * 
 * This is an example of how to update your existing documents.js route
 * to use the job queue system instead of direct async processing.
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');
const pool = require('../config/database');
const { uploadToS3, getSignedUrl, deleteFromS3 } = require('../config/s3');
// OLD: const { processDocument } = require('../services/documentProcessor');
// NEW: Use queue instead
const { addDocumentProcessingJob, getJobStatus } = require('../services/queue.example');

const router = express.Router();

// ... (keep existing multer configuration) ...

// Upload Document - IMPROVED VERSION
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { document_type } = req.body;
    const userId = req.user.uid;
    const documentId = uuidv4();
    
    // Generate S3 key
    const fileExtension = req.file.originalname.split('.').pop();
    const s3Key = `uploads/${userId}/${documentId}/original.${fileExtension}`;

    // Upload to S3
    const uploadResult = await uploadToS3(req.file, s3Key, req.file.mimetype);

    // Save to database
    const result = await pool.query(
      `INSERT INTO documents (
        document_id, user_id, original_filename, file_type, 
        file_size, storage_path, document_type, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        documentId,
        userId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        s3Key,
        document_type || 'unknown',
        'pending'
      ]
    );

    // OLD WAY (unreliable):
    // processDocument(documentId).catch(console.error);

    // NEW WAY (with job queue):
    await addDocumentProcessingJob(documentId, document_type || 'unknown');

    res.status(201).json({
      success: true,
      document: {
        document_id: documentId,
        filename: req.file.originalname,
        file_size: req.file.size,
        status: 'pending',
        uploaded_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload document'
    });
  }
});

// Get Document Status - IMPROVED VERSION with Queue Status
router.get('/:documentId/status', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.uid;

    // Get document from database
    const docResult = await pool.query(
      `SELECT 
        document_id, processing_status, 
        processing_started_at, processing_completed_at,
        error_message, created_at
      FROM documents 
      WHERE document_id = $1 AND user_id = $2`,
      [documentId, userId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const doc = docResult.rows[0];
    
    // Get job status from queue (more accurate than database)
    const jobStatus = await getJobStatus(documentId);
    
    // Combine database status with queue status
    let progress = 0;
    let currentStep = 'Waiting';
    
    if (doc.processing_status === 'completed') {
      progress = 100;
      currentStep = 'Completed';
    } else if (doc.processing_status === 'processing') {
      // Use queue progress if available
      progress = jobStatus.progress || 50;
      currentStep = 'Processing';
      
      // Map queue state to step
      if (jobStatus.status === 'waiting') {
        currentStep = 'Queued';
      } else if (jobStatus.status === 'active') {
        currentStep = 'Processing';
      } else if (jobStatus.status === 'failed') {
        currentStep = 'Failed';
      }
    } else if (doc.processing_status === 'failed') {
      progress = 0;
      currentStep = 'Failed';
    }

    res.json({
      success: true,
      document_id: documentId,
      status: doc.processing_status,
      queue_status: jobStatus.status,
      progress,
      current_step: currentStep,
      attempts_made: jobStatus.attemptsMade,
      uploaded_at: doc.created_at,
      error_message: doc.error_message || jobStatus.failedReason
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document status'
    });
  }
});

// New endpoint: Get queue statistics (for admins)
router.get('/queue/stats', verifyToken, async (req, res) => {
  try {
    // TODO: Add admin check
    const { getQueueStats } = require('../services/queue.example');
    const stats = await getQueueStats();
    
    res.json({
      success: true,
      queue: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ... (keep rest of existing routes) ...

module.exports = router;

