const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  document_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  original_filename: {
    type: String,
    required: true
  },
  file_type: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  storage_path: {
    type: String,
    required: true
  },
  document_type: {
    type: String,
    default: 'unknown'
  },
  processing_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  processing_started_at: {
    type: Date,
    default: null
  },
  processing_completed_at: {
    type: Date,
    default: null
  },
  error_message: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
documentSchema.index({ user_id: 1, created_at: -1 });
documentSchema.index({ processing_status: 1 });
documentSchema.index({ document_id: 1 });

module.exports = mongoose.model('Document', documentSchema);

