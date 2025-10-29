const { prisma } = require('../utils/database');

const sprintsController = {
  // Create a new sprint
  async createSprint(req, res) {
    try {
      const projectId = req.params.projectId;
      const { name, description, startDate, endDate, goal } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Sprint name is required' });
      }

      // Check project access
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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

      const sprint = await prisma.sprint.create({
        data: {
          name,
          description,
          goal,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: 'PLANNED',
          projectId
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              stories: true,
              tickets: true
            }
          }
        }
      });

      res.status(201).json({ sprint });
    } catch (error) {
      console.error('Create sprint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get project sprints
  async getProjectSprints(req, res) {
    try {
      const projectId = req.params.projectId;

      // Check project access
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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

      const sprints = await prisma.sprint.findMany({
        where: { projectId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              stories: true,
              tickets: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ sprints });
    } catch (error) {
      console.error('Get project sprints error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get sprint by ID
  async getSprint(req, res) {
    try {
      const sprintId = req.params.sprintId;

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              teamId: true
            }
          },
          stories: {
            include: {
              reporter: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              },
              assignee: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              },
              _count: {
                select: {
                  tickets: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          tickets: {
            include: {
              story: {
                select: {
                  id: true,
                  title: true
                }
              },
              reporter: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              },
              assignee: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: sprint.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ sprint });
    } catch (error) {
      console.error('Get sprint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update sprint
  async updateSprint(req, res) {
    try {
      const sprintId = req.params.sprintId;
      const { name, description, goal, startDate, endDate, status } = req.body;

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: sprint.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedSprint = await prisma.sprint.update({
        where: { id: sprintId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(goal !== undefined && { goal }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(status && { status })
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              stories: true,
              tickets: true
            }
          }
        }
      });

      res.json({ sprint: updatedSprint });
    } catch (error) {
      console.error('Update sprint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete sprint
  async deleteSprint(req, res) {
    try {
      const sprintId = req.params.sprintId;

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: sprint.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Remove sprint reference from stories and tickets
      await prisma.$transaction([
        prisma.story.updateMany({
          where: { sprintId },
          data: { sprintId: null }
        }),
        prisma.ticket.updateMany({
          where: { sprintId },
          data: { sprintId: null }
        }),
        prisma.sprint.delete({
          where: { id: sprintId }
        })
      ]);

      res.json({ message: 'Sprint deleted successfully' });
    } catch (error) {
      console.error('Delete sprint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Start sprint
  async startSprint(req, res) {
    try {
      const sprintId = req.params.sprintId;

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: sprint.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to start sprints' });
      }

      if (sprint.status !== 'PLANNED') {
        return res.status(400).json({ error: 'Only planned sprints can be started' });
      }

      const updatedSprint = await prisma.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'ACTIVE',
          startDate: sprint.startDate || new Date()
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              stories: true,
              tickets: true
            }
          }
        }
      });

      res.json({ sprint: updatedSprint });
    } catch (error) {
      console.error('Start sprint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Complete sprint
  async completeSprint(req, res) {
    try {
      const sprintId = req.params.sprintId;

      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: sprint.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to complete sprints' });
      }

      if (sprint.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Only active sprints can be completed' });
      }

      const updatedSprint = await prisma.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'COMPLETED',
          endDate: sprint.endDate || new Date()
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              stories: true,
              tickets: true
            }
          }
        }
      });

      res.json({ sprint: updatedSprint });
    } catch (error) {
      console.error('Complete sprint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = sprintsController;