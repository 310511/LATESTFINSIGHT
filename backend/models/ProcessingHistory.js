const mongoose = require('mongoose');

const processingHistorySchema = new mongoose.Schema({
  history_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  document_id: {
    type: String,
    ref: 'Document',
    index: true
  },
  user_id: {
    type: String,
    ref: 'User',
    index: true
  },
  action_type: {
    type: String,
    required: true
  },
  action_timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: false
});

// Indexes
processingHistorySchema.index({ user_id: 1 });
processingHistorySchema.index({ document_id: 1 });
processingHistorySchema.index({ action_timestamp: -1 });

module.exports = mongoose.model('ProcessingHistory', processingHistorySchema);

