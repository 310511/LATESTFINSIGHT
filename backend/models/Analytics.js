const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  analytics_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    ref: 'User',
    index: true
  },
  document_id: {
    type: String,
    ref: 'Document',
    index: true
  },
  processing_time_ms: {
    type: Number,
    default: null
  },
  success_rate: {
    type: Number,
    default: null
  },
  document_type: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
analyticsSchema.index({ user_id: 1 });
analyticsSchema.index({ document_id: 1 });
analyticsSchema.index({ created_at: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);

