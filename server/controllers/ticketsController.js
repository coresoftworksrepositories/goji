const { prisma } = require('../utils/database');

const ticketsController = {
  // Create a new ticket
  async createTicket(req, res) {
    try {
      const { title, description, type, priority, status, storyId, reporterId, assigneeId, sprintId, startDate, dueDate } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Ticket title is required' });
      }

      let projectId = req.params.projectId ? req.params.projectId : null;
      let teamId;

      // If storyId is provided, get the project from the story
      if (storyId) {
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

        projectId = story.project.id;
        teamId = story.project.teamId;
      } else if (projectId) {
        // Get project directly
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            teamId: true
          }
        });

        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        teamId = project.teamId;
      } else {
        return res.status(400).json({ error: 'Either projectId or storyId is required' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const ticket = await prisma.ticket.create({
        data: {
          title,
          description,
          type: type || 'TASK',
          priority: priority || 'MEDIUM',
          status: status || 'OPEN',
          projectId,
          storyId: storyId ? storyId : null,
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

      res.status(201).json({ ticket });
    } catch (error) {
      console.error('Create ticket error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get project tickets
  async getProjectTickets(req, res) {
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

      const tickets = await prisma.ticket.findMany({
        where: { projectId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ tickets });
    } catch (error) {
      console.error('Get project tickets error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get story tickets
  async getStoryTickets(req, res) {
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

      const tickets = await prisma.ticket.findMany({
        where: { storyId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
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
          },
          sprint: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ tickets });
    } catch (error) {
      console.error('Get story tickets error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get ticket by ID
  async getTicket(req, res) {
    try {
      const ticketId = req.params.ticketId;

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              teamId: true
            }
          },
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

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ ticket });
    } catch (error) {
      console.error('Get ticket error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update ticket
  async updateTicket(req, res) {
    try {
      const ticketId = req.params.ticketId;
      const { title, description, type, priority, status, assigneeId, storyId, sprintId, startDate, dueDate } = req.body;

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(type && { type }),
          ...(priority && { priority }),
          ...(status && { status }),
          ...(assigneeId !== undefined && { assigneeId: assigneeId ? assigneeId : null }),
          ...(sprintId !== undefined && { sprintId: sprintId ? sprintId : null }),
          ...(storyId !== undefined && { storyId: storyId ? storyId : null }),
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

      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error('Update ticket error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete ticket
  async deleteTicket(req, res) {
    try {
      const ticketId = req.params.ticketId;

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.ticket.delete({
        where: { id: ticketId }
      });

      res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
      console.error('Delete ticket error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update ticket status
  async updateTicketStatus(req, res) {
    try {
      const ticketId = req.params.ticketId;
      const { status } = req.body;

      if (!['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Check if ticket exists and user has access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              id: true,
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update ticket status
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
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
        message: 'Ticket status updated successfully',
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Update ticket status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Log time on ticket
  async logTime(req, res) {
    try {
      const ticketId = req.params.ticketId;
      const { timeToAdd } = req.body;

      if (!timeToAdd || typeof timeToAdd !== 'number' || timeToAdd <= 0) {
        return res.status(400).json({ error: 'Valid time to add is required' });
      }

      // Check if ticket exists and user has access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              id: true,
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Add time to existing logged time
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { 
          timeLogged: ticket.timeLogged + timeToAdd 
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
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
        message: 'Time logged successfully',
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Log time error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get ticket comments
  async getTicketComments(req, res) {
    try {
      const ticketId = req.params.ticketId;

      // Check if ticket exists and user has access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const comments = await prisma.ticketComment.findMany({
        where: { ticketId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      res.json({ comments });
    } catch (error) {
      console.error('Get ticket comments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add ticket comment
  async addTicketComment(req, res) {
    try {
      const ticketId = req.params.ticketId;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      // Check if ticket exists and user has access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const comment = await prisma.ticketComment.create({
        data: {
          content: content.trim(),
          ticketId,
          authorId: req.user.userId
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.status(201).json({ comment });
    } catch (error) {
      console.error('Add ticket comment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get ticket work logs
  async getTicketWorkLogs(req, res) {
    try {
      const ticketId = req.params.ticketId;

      // Check if ticket exists and user has access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const workLogs = await prisma.ticketWorkLog.findMany({
        where: { ticketId },
        include: {
          author: {
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
      });

      res.json({ workLogs });
    } catch (error) {
      console.error('Get ticket work logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add ticket work log
  async addTicketWorkLog(req, res) {
    try {
      const ticketId = req.params.ticketId;
      const { hours, description } = req.body;

      if (!hours || typeof hours !== 'number' || hours <= 0) {
        return res.status(400).json({ error: 'Valid hours is required' });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Work log description is required' });
      }

      // Check if ticket exists and user has access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          project: {
            select: {
              teamId: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if user is a team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: ticket.project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create work log and update ticket time logged
      const [workLog] = await prisma.$transaction([
        prisma.ticketWorkLog.create({
          data: {
            hours,
            description: description.trim(),
            ticketId,
            authorId: req.user.userId
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: {
            timeLogged: ticket.timeLogged + hours
          }
        })
      ]);

      res.status(201).json({ workLog });
    } catch (error) {
      console.error('Add ticket work log error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = ticketsController;