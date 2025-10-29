const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { prisma, gracefulShutdown } = require('./utils/database');
const { authenticateToken } = require('./middleware/auth');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const aiSupportedRoutes = require('./routes/aiSupportedRoutes');
const teamsRoutes = require('./routes/teamsRoutes');
const projectsRoutes = require('./routes/projectsRoutes');
const storiesRoutes = require('./routes/storiesRoutes');
const ticketsRoutes = require('./routes/ticketsRoutes');
const sprintsRoutes = require('./routes/sprintsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const workLogsRoutes = require('./routes/workLogsRoutes');
const usersRoutes = require('./routes/usersRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/sprints', sprintsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/worklogs', workLogsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', aiSupportedRoutes);


// User search endpoint (for invitations)
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username query parameter is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            username: {
              contains: username,
              mode: 'insensitive'
            }
          },
          {
            isApproved: true
          }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      },
      take: 10
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Team invitations endpoints
app.get('/api/invitations/teams', authenticateToken, async (req, res) => {
  try {
    const invites = await prisma.teamInvite.findMany({
      where: {
        userId: req.user.userId,
        status: 'PENDING'
      },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    });

    res.json({ invites });
  } catch (error) {
    console.error('Get team invites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invitations/teams/:inviteId/respond', authenticateToken, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { action } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "accept" or "decline"' });
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: {
        team: true
      }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invite.userId !== req.user.userId) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    if (invite.status !== 'PENDING') {
      return res.status(400).json({ error: 'This invitation has already been responded to' });
    }

    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: {
        status,
        respondedAt: new Date()
      }
    });

    if (action === 'accept') {
      // Check if user is already a team member
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: invite.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!existingMember) {
        await prisma.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId: req.user.userId,
            role: invite.role
          }
        });
      }
    }

    res.json({ message: `Invitation ${action}ed successfully` });
  } catch (error) {
    console.error('Respond to invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project invitations endpoints
app.get('/api/invitations/projects', authenticateToken, async (req, res) => {
  try {
    const invites = await prisma.projectInvite.findMany({
      where: {
        userId: req.user.userId,
        status: 'PENDING'
      },
      include: {
        project: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    });

    res.json({ invites });
  } catch (error) {
    console.error('Get project invites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invitations/projects/:inviteId/respond', authenticateToken, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { action } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "accept" or "decline"' });
    }

    const invite = await prisma.projectInvite.findUnique({
      where: { id: inviteId }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invite.userId !== req.user.userId) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    if (invite.status !== 'PENDING') {
      return res.status(400).json({ error: 'This invitation has already been responded to' });
    }

    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

    await prisma.projectInvite.update({
      where: { id: inviteId },
      data: {
        status,
        respondedAt: new Date()
      }
    });

    if (action === 'accept') {
      // Check if user is already a project member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invite.projectId,
            userId: req.user.userId
          }
        }
      });

      if (!existingMember) {
        await prisma.projectMember.create({
          data: {
            projectId: invite.projectId,
            userId: req.user.userId,
            role: invite.role
          }
        });
      }
    }

    res.json({ message: `Invitation ${action}ed successfully` });
  } catch (error) {
    console.error('Respond to project invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project outgoing invitations (for admins to manage)
app.get('/api/projects/:projectId/invitations', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has permission to view invitations (team admin/owner or project admin)
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: project.teamId,
          userId: req.user.userId
        }
      }
    });

    if (!teamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: req.user.userId
        }
      }
    });

    const hasPermission = 
      ['OWNER', 'ADMIN'].includes(teamMember.role) || 
      (projectMember && projectMember.role === 'ADMIN');

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to view invitations' });
    }

    const invites = await prisma.projectInvite.findMany({
      where: {
        projectId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    });

    res.json({ invites });
  } catch (error) {
    console.error('Get project outgoing invites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel project invitation
app.delete('/api/projects/:projectId/invitations/:inviteId', authenticateToken, async (req, res) => {
  try {
    const { projectId, inviteId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has permission to cancel invitations (team admin/owner or project admin)
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: project.teamId,
          userId: req.user.userId
        }
      }
    });

    if (!teamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user is project admin or team admin/owner
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: req.user.userId
        }
      }
    });

    const hasPermission = 
      ['OWNER', 'ADMIN'].includes(teamMember.role) || 
      (projectMember && projectMember.role === 'ADMIN');

    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to cancel invitations' });
    }

    // Find the invitation
    const invite = await prisma.projectInvite.findUnique({
      where: { 
        id: inviteId,
        projectId: projectId,
        status: 'PENDING'
      }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found or already responded to' });
    }

    // Delete the invitation
    await prisma.projectInvite.delete({
      where: { id: inviteId }
    });

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel project invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await gracefulShutdown();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});