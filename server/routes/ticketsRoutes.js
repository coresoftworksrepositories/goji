const express = require('express');
const ticketsController = require('../controllers/ticketsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All ticket routes require authentication
router.use(authenticateToken);

// Ticket routes
router.post('/', ticketsController.createTicket); // For creating tickets with storyId
router.get('/:ticketId', ticketsController.getTicket);
router.put('/:ticketId', ticketsController.updateTicket);
router.patch('/:ticketId/status', ticketsController.updateTicketStatus);
router.patch('/:ticketId/log-time', ticketsController.logTime);
router.delete('/:ticketId', ticketsController.deleteTicket);

// Comments routes
router.get('/:ticketId/comments', ticketsController.getTicketComments);
router.post('/:ticketId/comments', ticketsController.addTicketComment);
router.put('/comments/:commentId', ticketsController.updateTicketComment);
router.delete('/comments/:commentId', ticketsController.deleteTicketComment);

// Work logs routes
router.get('/:ticketId/worklogs', ticketsController.getTicketWorkLogs);
router.post('/:ticketId/worklogs', ticketsController.addTicketWorkLog);

// Previous sprints route
router.get('/:ticketId/previous-sprints', ticketsController.getTicketPreviousSprints);

module.exports = router;