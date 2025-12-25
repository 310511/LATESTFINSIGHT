const mongoose = require('mongoose');

const processingResultSchema = new mongoose.Schema({
  result_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  document_id: {
    type: String,
    required: true,
    ref: 'Document',
    index: true
  },
  extracted_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  insights: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  summary_stats: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  anomalies: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  output_files: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
processingResultSchema.index({ document_id: 1 });

module.exports = mongoose.model('ProcessingResult', processingResultSchema);

