// Export all models from a single file for easy importing
module.exports = {
  User: require('./User'),
  Document: require('./Document'),
  ProcessingResult: require('./ProcessingResult'),
  ProcessingHistory: require('./ProcessingHistory'),
  UserSettings: require('./UserSettings'),
  SupportTicket: require('./SupportTicket'),
  Analytics: require('./Analytics')
};

