const express = require('express');
const projectsController = require('../controllers/projectsController');
const storiesController = require('../controllers/storiesController');
const ticketsController = require('../controllers/ticketsController');
const sprintsController = require('../controllers/sprintsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All project routes require authentication
router.use(authenticateToken);

// Project routes
router.get('/:projectId', projectsController.getProject);
router.put('/:projectId', projectsController.updateProject);
router.delete('/:projectId', projectsController.deleteProject);
router.get('/:projectId/stats', projectsController.getProjectStats);
router.get('/:projectId/members', projectsController.getProjectMembers);
router.post('/:projectId/members', projectsController.addProjectMember);
router.delete('/:projectId/members/:userId', projectsController.removeProjectMember);
router.put('/:projectId/members/:userId/role', projectsController.updateProjectMemberRole);

// Nested project resources
router.post('/:projectId/stories', storiesController.createStory);
router.get('/:projectId/stories', storiesController.getProjectStories);
router.post('/:projectId/tickets', ticketsController.createTicket);
router.get('/:projectId/tickets', ticketsController.getProjectTickets);
router.post('/:projectId/sprints', sprintsController.createSprint);
router.get('/:projectId/sprints', sprintsController.getProjectSprints);

module.exports = router;