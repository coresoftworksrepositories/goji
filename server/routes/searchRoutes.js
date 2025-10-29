const express = require('express');
const searchController = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All search routes require authentication
router.get('/global', authenticateToken, searchController.globalSearch);

module.exports = router;