const { prisma } = require('../utils/database');

const projectsController = {
  // Create a new project
  async createProject(req, res) {
    try {
      const teamId = req.params.teamId;
      const { name, description, key } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      // Generate key if not provided
      const projectKey = key || name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);

      // Check if key already exists
      const existingProject = await prisma.project.findUnique({
        where: { key: projectKey }
      });

      if (existingProject) {
        return res.status(400).json({ error: 'Project key already exists. Please choose a different name or provide a unique key.' });
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

      const project = await prisma.project.create({
        data: {
          name,
          description,
          key: projectKey,
          teamId
        },
        include: {
          team: {
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

      // Automatically add creator as project member with ADMIN role
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: req.user.userId,
          role: 'ADMIN'
        }
      });

      res.status(201).json({ project });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get team projects
  async getTeamProjects(req, res) {
    try {
      const teamId = req.params.teamId;

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

      const projects = await prisma.project.findMany({
        where: { teamId },
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true
                }
              }
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

      res.json({ projects });
    } catch (error) {
      console.error('Get team projects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get project by ID
  async getProject(req, res) {
    try {
      const projectId = req.params.projectId;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          },
          defaultAssignee: {
            select: {
              id: true,
              username: true,
              email: true
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

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check team membership
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

      res.json({ project });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update project
  async updateProject(req, res) {
    try {
      const projectId = req.params.projectId;
      const { name, description, defaultAssigneeId } = req.body;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          team: true
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to update this project' });
      }

      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(defaultAssigneeId !== undefined && { defaultAssigneeId: defaultAssigneeId || null })
        },
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          },
          defaultAssignee: {
            select: {
              id: true,
              username: true,
              email: true
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

      res.json({ project: updatedProject });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get project statistics
  async getProjectStats(req, res) {
    try {
      const projectId = req.params.projectId;

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check team membership
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

      // Get statistics
      const [storyStats, ticketStats, sprintStats] = await Promise.all([
        prisma.story.groupBy({
          by: ['status'],
          where: { projectId },
          _count: true
        }),
        prisma.ticket.groupBy({
          by: ['status'],
          where: { projectId },
          _count: true
        }),
        prisma.sprint.groupBy({
          by: ['status'],
          where: { projectId },
          _count: true
        })
      ]);

      res.json({
        stories: storyStats,
        tickets: ticketStats,
        sprints: sprintStats
      });
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get project members
  async getProjectMembers(req, res) {
    try {
      const projectId = req.params.projectId;

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check team membership
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

      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        }
      });

      const memberUsers = members.map(member => member.user);
      res.json({ members: memberUsers });
    } catch (error) {
      console.error('Get project members error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add project member
  async addProjectMember(req, res) {
    try {
      const projectId = req.params.projectId;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user has permission to add members (must be team member with ADMIN+ role)
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!teamMember || !['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return res.status(403).json({ error: 'You do not have permission to add members to this project' });
      }

      // Check if user being added is a team member
      const targetTeamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId: userId
          }
        }
      });

      if (!targetTeamMember) {
        return res.status(400).json({ error: 'User must be a team member before being added to a project' });
      }

      // Check if user is already a project member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: userId
          }
        }
      });

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this project' });
      }

      // Add user as project member
      const projectMember = await prisma.projectMember.create({
        data: {
          projectId,
          userId: userId,
          role: 'DEVELOPER'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        }
      });

      res.status(201).json({ 
        message: 'Member added successfully',
        member: projectMember.user
      });
    } catch (error) {
      console.error('Add project member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Remove project member
  async removeProjectMember(req, res) {
    try {
      const projectId = req.params.projectId;
      const userIdToRemove = req.params.userId;

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check requester's team membership and role
      const requesterTeamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!requesterTeamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get requester's project role (if any)
      const requesterProjectMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.userId
          }
        }
      });

      // Check if target user is a project member
      const targetProjectMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: userIdToRemove
          }
        }
      });

      if (!targetProjectMember) {
        return res.status(404).json({ error: 'User is not a member of this project' });
      }

      // Permission hierarchy: Team OWNER > Team ADMIN > Project ADMIN > Project DEVELOPER
      const teamRoleHierarchy = { 'OWNER': 4, 'ADMIN': 3, 'MEMBER': 1 };
      const projectRoleHierarchy = { 'ADMIN': 2, 'DEVELOPER': 1, 'VIEWER': 0 };

      const requesterTeamRank = teamRoleHierarchy[requesterTeamMember.role] || 0;
      const requesterProjectRank = projectRoleHierarchy[requesterProjectMember?.role] || 0;
      const targetProjectRank = projectRoleHierarchy[targetProjectMember.role] || 0;

      // Team owners and admins can remove any project member
      // Project admins can remove developers and viewers
      const canRemove = 
        requesterTeamRank >= 3 || // Team OWNER or ADMIN
        (requesterProjectRank >= 2 && targetProjectRank < requesterProjectRank) || // Project ADMIN removing lower rank
        (req.user.userId === userIdToRemove && targetProjectMember.role !== 'ADMIN'); // Self-removal (except for admins)

      if (!canRemove) {
        return res.status(403).json({ error: 'You do not have permission to remove this project member' });
      }

      // Prevent removing project admins (including self-removal) when they're the last admin
      if (targetProjectMember.role === 'ADMIN') {
        const adminCount = await prisma.projectMember.count({
          where: {
            projectId,
            role: 'ADMIN'
          }
        });

        if (adminCount <= 1) {
          if (req.user.userId === userIdToRemove) {
            return res.status(400).json({ error: 'Cannot remove yourself as the last admin. Transfer admin role to another member first, or delete the project.' });
          } else {
            return res.status(400).json({ error: 'Cannot remove the last admin from the project. Promote another member to admin first.' });
          }
        }
      }

      // Remove project member
      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId,
            userId: userIdToRemove
          }
        }
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove project member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update project member role
  async updateProjectMemberRole(req, res) {
    try {
      const projectId = req.params.projectId;
      const userIdToUpdate = req.params.userId;
      const { role } = req.body;

      if (!['ADMIN', 'DEVELOPER', 'VIEWER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be ADMIN, DEVELOPER, or VIEWER' });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check requester's permissions
      const requesterTeamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: project.teamId,
            userId: req.user.userId
          }
        }
      });

      if (!requesterTeamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const requesterProjectMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.userId
          }
        }
      });

      // Only team OWNER/ADMIN or project ADMIN can change roles
      const hasPermission = 
        ['OWNER', 'ADMIN'].includes(requesterTeamMember.role) || 
        (requesterProjectMember && requesterProjectMember.role === 'ADMIN');

      if (!hasPermission) {
        return res.status(403).json({ error: 'You do not have permission to change member roles' });
      }

      // Check if target user is a project member
      const targetProjectMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: userIdToUpdate
          }
        }
      });

      if (!targetProjectMember) {
        return res.status(404).json({ error: 'User is not a member of this project' });
      }

      // Prevent demoting the last admin
      if (targetProjectMember.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await prisma.projectMember.count({
          where: {
            projectId,
            role: 'ADMIN'
          }
        });

        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the last admin. Promote another member to admin first.' });
        }
      }

      // Update the role
      const updatedMember = await prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId,
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
      console.error('Update project member role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete project (only for team owners/admins or project admins)
  async deleteProject(req, res) {
    try {
      const projectId = req.params.projectId;

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permissions
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

      // Only team OWNER/ADMIN or project ADMIN can delete projects
      const hasPermission = 
        ['OWNER', 'ADMIN'].includes(teamMember.role) || 
        (projectMember && projectMember.role === 'ADMIN');

      if (!hasPermission) {
        return res.status(403).json({ error: 'You do not have permission to delete this project' });
      }

      // Delete the project (cascade will handle related data)
      await prisma.project.delete({
        where: { id: projectId }
      });

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = projectsController;