const express = require('express');
const sprintsController = require('../controllers/sprintsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All sprint routes require authentication
router.use(authenticateToken);

// Sprint routes
router.get('/:sprintId', sprintsController.getSprint);
router.put('/:sprintId', sprintsController.updateSprint);
router.delete('/:sprintId', sprintsController.deleteSprint);
router.post('/:sprintId/start', sprintsController.startSprint);
router.post('/:sprintId/complete', sprintsController.completeSprint);

module.exports = router;