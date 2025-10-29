const { prisma } = require('../utils/database');

const usersController = {
  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const where = {};
      
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (status === 'pending') {
        where.isApproved = false;
      } else if (status === 'approved') {
        where.isApproved = true;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            isApproved: true,
            approvedAt: true,
            createdAt: true,
            approvedBy: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          },
          orderBy: [
            { isApproved: 'asc' },
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Approve a user (admin only)
  async approveUser(req, res) {
    try {
      const { userId } = req.params;
      const { role = 'USER' } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isApproved) {
        return res.status(400).json({ error: 'User is already approved' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedById: req.user.userId,
          role: role.toUpperCase()
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isApproved: true,
          approvedAt: true,
          createdAt: true
        }
      });

      res.json({
        message: 'User approved successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Reject/revoke user approval (admin only)
  async rejectUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent revoking superuser access
      if (user.role === 'SUPERUSER') {
        return res.status(403).json({ error: 'Cannot revoke superuser access' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isApproved: false,
          approvedAt: null,
          approvedById: null
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isApproved: true,
          createdAt: true
        }
      });

      res.json({
        message: 'User approval revoked successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user role (admin only)
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['USER', 'ADMIN', 'SUPERUSER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only superusers can create other superusers
      if (role === 'SUPERUSER' && req.user.role !== 'SUPERUSER') {
        return res.status(403).json({ error: 'Only superusers can grant superuser role' });
      }

      // Prevent removing the last superuser
      if (user.role === 'SUPERUSER' && role !== 'SUPERUSER') {
        const superuserCount = await prisma.user.count({
          where: { role: 'SUPERUSER' }
        });

        if (superuserCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last superuser' });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isApproved: true,
          createdAt: true
        }
      });

      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get approved users list (admin only)
  async getApprovedUsers(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const where = {};
      
      if (search) {
        where.email = { contains: search, mode: 'insensitive' };
      }

      const [approvedUsers, total] = await Promise.all([
        prisma.approvedUser.findMany({
          where,
          select: {
            id: true,
            email: true,
            defaultRole: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.approvedUser.count({ where })
      ]);

      res.json({
        approvedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get approved users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add approved user email (admin only)
  async addApprovedUser(req, res) {
    try {
      const { email, defaultRole = 'USER' } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (!['USER', 'ADMIN'].includes(defaultRole)) {
        return res.status(400).json({ error: 'Invalid default role' });
      }

      // Check if email is already approved
      const existingApproval = await prisma.approvedUser.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingApproval) {
        return res.status(409).json({ error: 'Email is already in approved list' });
      }

      const approvedUser = await prisma.approvedUser.create({
        data: {
          email: email.toLowerCase(),
          defaultRole: defaultRole.toUpperCase(),
          createdById: req.user.userId
        },
        select: {
          id: true,
          email: true,
          defaultRole: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Email added to approved list successfully',
        approvedUser
      });
    } catch (error) {
      console.error('Add approved user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Remove approved user email (admin only)
  async removeApprovedUser(req, res) {
    try {
      const { approvedUserId } = req.params;

      const approvedUser = await prisma.approvedUser.findUnique({
        where: { id: approvedUserId }
      });

      if (!approvedUser) {
        return res.status(404).json({ error: 'Approved user not found' });
      }

      await prisma.approvedUser.delete({
        where: { id: approvedUserId }
      });

      res.json({ message: 'Email removed from approved list successfully' });
    } catch (error) {
      console.error('Remove approved user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = usersController;