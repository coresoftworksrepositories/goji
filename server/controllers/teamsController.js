const { prisma } = require('../utils/database');

const teamsController = {
  // Create a new team
  async createTeam(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      const team = await prisma.team.create({
        data: {
          name,
          description,
          ownerId: req.user.userId,
          members: {
            create: {
              userId: req.user.userId,
              role: 'OWNER'
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              projects: true
            }
          }
        }
      });

      res.status(201).json({ team });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user's teams
  async getUserTeams(req, res) {
    try {
      const teams = await prisma.team.findMany({
        where: {
          members: {
            some: {
              userId: req.user.userId
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            },
            orderBy: {
              joinedAt: 'asc'
            }
          },
          invites: {
            where: {
              status: 'PENDING'
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              projects: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ teams });
    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get team by ID
  async getTeam(req, res) {
    try {
      const teamId = req.params.teamId;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            },
            orderBy: {
              joinedAt: 'asc'
            }
          },
          _count: {
            select: {
              projects: true
            }
          }, 
          aiSupported: {
            select: {
              enabled: true
            }
          }
        }
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user is a member
      const membership = team.members.find(member => member.userId === req.user.userId);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const aiSettings = team.aiSupported && team.aiSupported.length > 0
  ? team.aiSupported[0].enabled
  : false;

      res.json({ team, aiSettings });
    } catch (error) {
      console.error('Get team error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get team members
  async getTeamMembers(req, res) {
    try {
      const teamId = req.params.teamId;

      // Check team access
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

      const members = await prisma.teamMember.findMany({
        where: { teamId },
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
        }
      });

      const memberUsers = members.map(member => member.user);
      res.json({ members: memberUsers });
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Invite user to team
  async inviteToTeam(req, res) {
    try {
      const teamId = req.params.teamId;
      const { username, email, role = 'MEMBER' } = req.body;

      // Must provide either username or email
      if (!username && !email) {
        return res.status(400).json({ error: 'Username or email is required' });
      }

      // Check if user has permission to invite
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to invite users' });
      }

      // Find user to invite by username or email
      let userToInvite;
      if (username) {
        userToInvite = await prisma.user.findUnique({
          where: { username }
        });
      } else if (email) {
        userToInvite = await prisma.user.findUnique({
          where: { email }
        });
      }

      if (!userToInvite) {
        const identifier = username || email;
        return res.status(404).json({ error: `User with ${username ? 'username' : 'email'} "${identifier}" not found` });
      }

      // Check if user is already a member
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: userToInvite.id
          }
        }
      });

      if (existingMember) {
        return res.status(409).json({ error: 'User is already a team member' });
      }

      // Check if invitation already exists
      const existingInvite = await prisma.teamInvite.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: userToInvite.id
          }
        }
      });

      if (existingInvite) {
        return res.status(409).json({ error: 'Invitation already exists' });
      }

      // Create invitation
      const invite = await prisma.teamInvite.create({
        data: {
          teamId,
          userId: userToInvite.id,
          role,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json({ invite });
    } catch (error) {
      console.error('Invite to team error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Remove team member
  async removeTeamMember(req, res) {
    try {
      const teamId = req.params.teamId;
      const userIdToRemove = req.params.userId;

      // Check if user has permission to remove members
      const requesterMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!requesterMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get the member to be removed
      const targetMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: userIdToRemove
          }
        }
      });

      if (!targetMember) {
        return res.status(404).json({ error: 'User is not a member of this team' });
      }

      // Permission hierarchy: OWNER > ADMIN > MEMBER
      // You can only remove members with lower or equal rank
      const roleHierarchy = { 'OWNER': 3, 'ADMIN': 2, 'MEMBER': 1 };
      const requesterRank = roleHierarchy[requesterMember.role] || 0;
      const targetRank = roleHierarchy[targetMember.role] || 0;

      // Only OWNER and ADMIN can remove members
      if (!['OWNER', 'ADMIN'].includes(requesterMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to remove team members' });
      }

      // Can't remove someone with higher or equal rank (unless you're removing yourself and not an owner)
      if (targetRank >= requesterRank && req.user.userId !== userIdToRemove) {
        return res.status(403).json({ error: 'You cannot remove a member with equal or higher privileges' });
      }

      // Prevent owners from removing themselves
      if (targetMember.role === 'OWNER' && req.user.userId === userIdToRemove) {
        return res.status(403).json({ error: 'Team owners cannot remove themselves. Transfer ownership to another member first, or delete the team.' });
      }

      // Prevent removing the last owner
      if (targetMember.role === 'OWNER') {
        const ownerCount = await prisma.teamMember.count({
          where: {
            teamId,
            role: 'OWNER'
          }
        });

        if (ownerCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last owner of the team' });
        }
      }

      // Remove user from all projects in this team first
      const teamProjects = await prisma.project.findMany({
        where: { teamId },
        select: { id: true }
      });

      for (const project of teamProjects) {
        await prisma.projectMember.deleteMany({
          where: {
            projectId: project.id,
            userId: userIdToRemove
          }
        });
      }

      // Remove team membership
      await prisma.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId: userIdToRemove
          }
        }
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Cancel team invitation
  async cancelTeamInvitation(req, res) {
    try {
      const teamId = req.params.teamId;
      const inviteId = req.params.inviteId;

      // Check if user has permission to cancel invitations
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to cancel invitations' });
      }

      // Find the invitation
      const invite = await prisma.teamInvite.findUnique({
        where: { 
          id: inviteId,
          teamId: teamId,
          status: 'PENDING'
        }
      });

      if (!invite) {
        return res.status(404).json({ error: 'Invitation not found or already responded to' });
      }

      // Delete the invitation
      await prisma.teamInvite.delete({
        where: { id: inviteId }
      });

      res.json({ message: 'Invitation cancelled successfully' });
    } catch (error) {
      console.error('Cancel team invitation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update team member role
  async updateTeamMemberRole(req, res) {
    try {
      const teamId = req.params.teamId;
      const userIdToUpdate = req.params.userId;
      const { role } = req.body;

      if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be OWNER, ADMIN, or MEMBER' });
      }

      // Check if requester has permission
      const requesterMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!requesterMember || !['OWNER', 'ADMIN'].includes(requesterMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to change member roles' });
      }

      // Get the member to be updated
      const targetMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: userIdToUpdate
          }
        }
      });

      if (!targetMember) {
        return res.status(404).json({ error: 'User is not a member of this team' });
      }

      // Role hierarchy checks
      const roleHierarchy = { 'OWNER': 3, 'ADMIN': 2, 'MEMBER': 1 };
      const requesterRank = roleHierarchy[requesterMember.role] || 0;
      const targetRank = roleHierarchy[targetMember.role] || 0;
      const newRank = roleHierarchy[role] || 0;

      // Only owners can promote to owner or demote owners
      if ((newRank === 3 || targetRank === 3) && requesterMember.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only owners can manage owner roles' });
      }

      // Can't change someone with equal or higher rank (unless you're owner)
      if (targetRank >= requesterRank && requesterMember.role !== 'OWNER') {
        return res.status(403).json({ error: 'You cannot change the role of someone with equal or higher privileges' });
      }

      // Prevent demoting the last owner
      if (targetMember.role === 'OWNER' && role !== 'OWNER') {
        const ownerCount = await prisma.teamMember.count({
          where: {
            teamId,
            role: 'OWNER'
          }
        });

        if (ownerCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the last owner. Promote another member to owner first.' });
        }
      }

      // Update the role
      const updatedMember = await prisma.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId: userIdToUpdate
          }
        },
        data: { role },
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
        }
      });

      res.json({ 
        message: 'Member role updated successfully',
        member: updatedMember
      });
    } catch (error) {
      console.error('Update team member role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete team (only for owners)
  async deleteTeam(req, res) {
    try {
      const teamId = req.params.teamId;

      // Check if user has permission
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || teamMember.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only team owners can delete the team' });
      }

      // Delete the team (cascade will handle related data)
      await prisma.team.delete({
        where: { id: teamId }
      });

      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Delete team error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update team information (only for owners and admins)
  async updateTeam(req, res) {
    try {
      const teamId = req.params.teamId;
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      // Check if user has permission
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'Only team owners and admins can update team information' });
      }

      // Update the team
      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: {
          name,
          description
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            },
            orderBy: {
              joinedAt: 'asc'
            }
          },
          _count: {
            select: {
              projects: true
            }
          }
        }
      });

      res.json({ 
        message: 'Team updated successfully',
        team: updatedTeam
      });
    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = teamsController;