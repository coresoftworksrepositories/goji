const { prisma } = require('../utils/database');

const storiesController = {
  async createStory(req, res) {
  /* 
  Creating a story here. Params receive the project ID, then reads required fields from the request body. It attempts to associate the story with the project and the user creating it, while also checking for proper permissions.
  */

    try {
      const projectId = req.params.projectId;
      const { title, description, priority, status, points, reporterId, assigneeId, sprintId, startDate, dueDate } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Story title is required' });
      }
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

      const story = await prisma.story.create({
        data: {
          title,
          description,
          priority: priority || 'MEDIUM',
          status: status || 'BACKLOG',
          points,
          projectId,
          reporterId: reporterId || req.user.userId,
          createdById: req.user.userId,
          assigneeId,
          sprintId: sprintId ? sprintId : null,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        }
      });

      res.status(201).json({ story });
    } catch (error) {
      console.error('Create story error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getProjectStories(req, res) {
    /* 
    This retrieves all stories for a given project. It first checks if the user has access to the project by verifying their team membership, then fetches and returns the stories associated with that project.
    */
    try {
      const projectId = req.params.projectId;
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
      const stories = await prisma.story.findMany({
        where: { projectId },
        include: {
          project: {
            select: {
              id: true,
              name: true
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
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
      });

      res.json({ stories });
    } catch (error) {
      console.error('Get project stories error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getStory(req, res) {
    /* 
    This fetches a specific story by its ID. It checks if the story exists and whether the requesting user has access to it by verifying their team membership. If all checks pass, it returns the story details.
    */
    try {
      const storyId = req.params.storyId;

      const story = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              teamId: true
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          tickets: {
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
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: story.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ story });
    } catch (error) {
      console.error('Get story error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateStory(req, res) {
    /* 
    This updates an existing story. It first retrieves the story by its ID and checks if the user has permission to modify it by verifying their team membership. It then updates the story with any provided fields from the request body.
    */
    try {
      const storyId = req.params.storyId;
      const { title, description, priority, status, points, assigneeId, sprintId, startDate, dueDate } = req.body;

      const story = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: story.project.teamId,
            userId: req.user.userId
          }
        }
      });
      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(priority && { priority }),
          ...(status && { status }),
          ...(points !== undefined && { points: points ? parseInt(points) : null }),
          ...(assigneeId !== undefined && { assigneeId: assigneeId ? assigneeId : null }),
          ...(sprintId !== undefined && { sprintId: sprintId ? sprintId : null }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        }
      });

      res.json({ story: updatedStory });
    } catch (error) {
      console.error('Update story error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteStory(req, res) {
    /* 
    This deletes a story by its ID. It first checks if the story exists and whether the user has permission to delete it by verifying their team membership. If all checks pass, it deletes the story.
    */
    try {
      const storyId = req.params.storyId;

      const story = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });
      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: story.project.teamId,
            userId: req.user.userId
          }
        }
      });
      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
      await prisma.story.delete({
        where: { id: storyId }
      });
      res.json({ message: 'Story deleted successfully' });
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateStoryStatus(req, res) {
  /*
    This updates the status of a story. It checks if the story exists and whether the user has access to it by verifying their team membership. If all checks pass, it updates the story's status.
  */
    try {
      const storyId = req.params.storyId;
      const { status } = req.body;
      if (!['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const story = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
          project: {
            select: {
              id: true,
              teamId: true
            }
          }
        }
      });

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: story.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update story status
      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: { status },
        include: {
          project: {
            select: {
              id: true,
              name: true
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      });

      res.json({ 
        message: 'Story status updated successfully',
        story: updatedStory
      });
    } catch (error) {
      console.error('Update story status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = storiesController;