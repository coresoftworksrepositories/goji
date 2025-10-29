const express = require('express');
const router = express.Router();
const aiSupportedController = require('../controllers/aiSupportedController');

router.post('/', aiSupportedController.createAISupported);
router.get('/', aiSupportedController.getAllAISupported);
router.get('/teams/:teamid/ai-settings', aiSupportedController.getTeamAISupported);
router.put('/teams/:teamid/ai-settings', aiSupportedController.setTeamAISupported);

module.exports = router;