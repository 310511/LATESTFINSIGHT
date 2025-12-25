const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  setting_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    unique: true,
    ref: 'User',
    index: true
  },
  email_notifications: {
    type: Boolean,
    default: true
  },
  push_notifications: {
    type: Boolean,
    default: true
  },
  dark_mode: {
    type: Boolean,
    default: false
  },
  preferred_export_format: {
    type: String,
    enum: ['pdf', 'excel', 'json'],
    default: 'excel'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: false, updatedAt: 'updated_at' }
});

// Indexes
userSettingsSchema.index({ user_id: 1 });

module.exports = mongoose.model('UserSettings', userSettingsSchema);

