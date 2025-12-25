const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticket_id: {
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
  subject: {
    type: String,
    required: true,
    maxlength: 500
  },
  message: {
    type: String,
    required: true
  },
  document_id: {
    type: String,
    ref: 'Document',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
supportTicketSchema.index({ user_id: 1 });
supportTicketSchema.index({ status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

