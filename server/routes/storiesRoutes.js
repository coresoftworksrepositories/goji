const express = require('express');
const storiesController = require('../controllers/storiesController');
const ticketsController = require('../controllers/ticketsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All story routes require authentication
router.use(authenticateToken);

// Story routes
router.get('/:storyId', storiesController.getStory);
router.put('/:storyId', storiesController.updateStory);
router.patch('/:storyId/status', storiesController.updateStoryStatus);
router.delete('/:storyId', storiesController.deleteStory);

// Story tickets
router.get('/:storyId/tickets', ticketsController.getStoryTickets);

module.exports = router;