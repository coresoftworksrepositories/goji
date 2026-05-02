const express = require('express');
const backupController = require('../controllers/backupController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Backups contain full system data including password hashes, so restrict to superusers.
router.use(authenticateToken);
router.use(requireRole(['SUPERUSER']));

router.get('/export', backupController.exportBackup);
router.post('/import', backupController.importBackup);

module.exports = router;