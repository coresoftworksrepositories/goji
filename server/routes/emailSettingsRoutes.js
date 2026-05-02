const express = require('express');
const emailSettingsController = require('../controllers/emailSettingsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All email settings routes require authentication
router.use(authenticateToken);

// Get email settings for a team
router.get('/:teamId', emailSettingsController.getEmailSettings);

// Update email settings for a team (superuser only)
router.put('/:teamId', emailSettingsController.updateEmailSettings);

// Test email settings
router.post('/:teamId/test', emailSettingsController.testEmailSettings);

// Disable email settings
router.delete('/:teamId', emailSettingsController.disableEmailSettings);

module.exports = router;
