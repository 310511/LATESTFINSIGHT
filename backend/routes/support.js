const express = require('express');
const { verifyToken } = require('../middleware/auth');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Create Support Ticket
router.post('/contact',
  verifyToken,
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('document_id').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { subject, message, document_id } = req.body;
      const userId = req.user.uid;
      const ticketId = uuidv4();

      // Save ticket to database
      await pool.query(
        `INSERT INTO support_tickets 
         (ticket_id, user_id, subject, message, document_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ticketId, userId, subject, message, document_id || null, 'open']
      );

      // TODO: Send email notification to support team
      // TODO: Send confirmation email to user

      res.status(201).json({
        success: true,
        ticket_id: ticketId,
        message: 'Support ticket created successfully'
      });
    } catch (error) {
      console.error('Support ticket error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create support ticket'
      });
    }
  }
);

module.exports = router;
