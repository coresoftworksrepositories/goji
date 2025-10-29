const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../utils/database');

const router = express.Router();

// All work log routes require authentication
router.use(authenticateToken);

// Update work log
router.put('/:workLogId', async (req, res) => {
  try {
    const workLogId = parseInt(req.params.workLogId);
    const { hours, description } = req.body;

    if (!hours || typeof hours !== 'number' || hours <= 0) {
      return res.status(400).json({ error: 'Valid hours is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Work log description is required' });
    }

    // Check if work log exists and user has access
    const workLog = await prisma.ticketWorkLog.findUnique({
      where: { id: workLogId },
      include: {
        ticket: {
          include: {
            project: {
              select: {
                teamId: true
              }
            }
          }
        }
      }
    });

    if (!workLog) {
      return res.status(404).json({ error: 'Work log not found' });
    }

    // Check if user is the author or a team member
    const isAuthor = workLog.authorId === req.user.userId;
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: workLog.ticket.project.teamId,
          userId: req.user.userId
        }
      }
    });

    if (!isAuthor && !teamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate the difference in hours for updating ticket's total logged time
    const hoursDifference = hours - workLog.hours;

    // Update work log and ticket time logged in a transaction
    const [updatedWorkLog] = await prisma.$transaction([
      prisma.ticketWorkLog.update({
        where: { id: workLogId },
        data: {
          hours,
          description: description.trim()
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
        where: { id: workLog.ticketId },
        data: {
          timeLogged: workLog.ticket.timeLogged + hoursDifference
        }
      })
    ]);

    res.json({ workLog: updatedWorkLog });
  } catch (error) {
    console.error('Update work log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete work log
router.delete('/:workLogId', async (req, res) => {
  try {
    const workLogId = parseInt(req.params.workLogId);

    // Check if work log exists and user has access
    const workLog = await prisma.ticketWorkLog.findUnique({
      where: { id: workLogId },
      include: {
        ticket: {
          include: {
            project: {
              select: {
                teamId: true
              }
            }
          }
        }
      }
    });

    if (!workLog) {
      return res.status(404).json({ error: 'Work log not found' });
    }

    // Check if user is the author or a team member
    const isAuthor = workLog.authorId === req.user.userId;
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: workLog.ticket.project.teamId,
          userId: req.user.userId
        }
      }
    });

    if (!isAuthor && !teamMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete work log and update ticket time logged in a transaction
    await prisma.$transaction([
      prisma.ticketWorkLog.delete({
        where: { id: workLogId }
      }),
      prisma.ticket.update({
        where: { id: workLog.ticketId },
        data: {
          timeLogged: Math.max(0, workLog.ticket.timeLogged - workLog.hours)
        }
      })
    ]);

    res.json({ message: 'Work log deleted successfully' });
  } catch (error) {
    console.error('Delete work log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;