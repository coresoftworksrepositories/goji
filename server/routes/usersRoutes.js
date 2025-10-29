const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// User management routes (admin/superuser only)
router.get('/', requireRole(['ADMIN', 'SUPERUSER']), usersController.getAllUsers);
router.put('/:userId/approve', requireRole(['ADMIN', 'SUPERUSER']), usersController.approveUser);
router.put('/:userId/reject', requireRole(['ADMIN', 'SUPERUSER']), usersController.rejectUser);
router.put('/:userId/role', requireRole(['ADMIN', 'SUPERUSER']), usersController.updateUserRole);

// Approved users management routes (admin/superuser only)
router.get('/approved', requireRole(['ADMIN', 'SUPERUSER']), usersController.getApprovedUsers);
router.post('/approved', requireRole(['ADMIN', 'SUPERUSER']), usersController.addApprovedUser);
router.delete('/approved/:approvedUserId', requireRole(['ADMIN', 'SUPERUSER']), usersController.removeApprovedUser);

module.exports = router;