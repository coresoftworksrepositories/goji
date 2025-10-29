const express = require('express');
const teamsController = require('../controllers/teamsController');
const projectsController = require('../controllers/projectsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All team routes require authentication
router.use(authenticateToken);

// Team routes
router.post('/', teamsController.createTeam);
router.get('/', teamsController.getUserTeams);
router.get('/:teamId', teamsController.getTeam);
router.put('/:teamId', teamsController.updateTeam);
router.delete('/:teamId', teamsController.deleteTeam);
router.get('/:teamId/members', teamsController.getTeamMembers);
router.post('/:teamId/invite', teamsController.inviteToTeam);
router.delete('/:teamId/members/:userId', teamsController.removeTeamMember);
router.put('/:teamId/members/:userId/role', teamsController.updateTeamMemberRole);
router.delete('/:teamId/invitations/:inviteId', teamsController.cancelTeamInvitation);

// Team project routes
router.post('/:teamId/projects', projectsController.createProject);
router.get('/:teamId/projects', projectsController.getTeamProjects);

module.exports = router;