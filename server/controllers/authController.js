const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/database');

const authController = {
  // Register new user
  async register(req, res) {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
      }

      // Check registration settings
      const requireApproval = process.env.REQUIRE_USER_APPROVAL === 'true';
      const allowOpenRegistration = process.env.ALLOW_OPEN_REGISTRATION === 'true';
      const defaultRole = process.env.DEFAULT_USER_ROLE || 'USER';

      // If registration is completely closed
      if (!allowOpenRegistration && requireApproval) {
        // Check if email is pre-approved
        const approvedEmail = await prisma.approvedUser.findUnique({
          where: { email: email.toLowerCase() }
        });

        if (!approvedEmail) {
          return res.status(403).json({ 
            error: 'Registration is restricted. Your email address must be pre-approved by an administrator.' 
          });
        }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
        return res.status(409).json({ error: `User with this ${field} already exists` });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Determine user approval status and role
      let isApproved = true;
      let userRole = defaultRole.toUpperCase();
      let approvedAt = new Date();

      if (requireApproval) {
        // Check if email is pre-approved
        const approvedEmail = await prisma.approvedUser.findUnique({
          where: { email: email.toLowerCase() }
        });

        if (approvedEmail) {
          // User is pre-approved
          isApproved = true;
          userRole = approvedEmail.defaultRole || defaultRole.toUpperCase();
          approvedAt = new Date();
        } else if (allowOpenRegistration) {
          // Open registration but requires approval
          isApproved = false;
          approvedAt = null;
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role: userRole,
          isApproved,
          approvedAt
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

      // If user is not approved, return different response
      if (!isApproved) {
        return res.status(201).json({
          message: 'Registration successful. Your account is pending approval by an administrator.',
          user,
          requiresApproval: true
        });
      }

      // Generate JWT token for approved users
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { login, password } = req.body;

      if (!login || !password) {
        return res.status(400).json({ error: 'Login and password are required' });
      }

      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: login.toLowerCase() },
            { username: login.toLowerCase() }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is approved
      if (!user.isApproved) {
        return res.status(403).json({ 
          error: 'Your account is pending approval by an administrator. Please wait for approval before logging in.' 
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved,
        createdAt: user.createdAt
      };

      res.json({
        message: 'Login successful',
        token,
        user: userResponse
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isApproved: true,
          avatarUrl: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, email, username } = req.body;

      // Check if email/username already exists for another user
      if (email || username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: req.user.userId } },
              {
                OR: [
                  email ? { email } : {},
                  username ? { username } : {}
                ]
              }
            ]
          }
        });

        if (existingUser) {
          const field = existingUser.email === email ? 'email' : 'username';
          return res.status(409).json({ error: `This ${field} is already taken` });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(email !== undefined && { email }),
          ...(username !== undefined && { username })
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          createdAt: true
        }
      });

      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete user account
  async deleteAccount(req, res) {
    try {
      const userId = req.user.userId;

      // Check if user is the sole owner of any teams
      const teamsOwned = await prisma.team.findMany({
        where: { ownerId: userId },
        include: {
          members: {
            where: { role: 'OWNER' }
          }
        }
      });

      const soleOwnerTeams = teamsOwned.filter(team => team.members.length === 1);
      
      if (soleOwnerTeams.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete account. You are the sole owner of ${soleOwnerTeams.length} team(s). Please transfer ownership or delete these teams first.`,
          soleOwnerTeams: soleOwnerTeams.map(team => team.name)
        });
      }

      // Begin transaction to delete user and all related data
      await prisma.$transaction(async (tx) => {
        // Delete user's comments
        await tx.ticketComment.deleteMany({
          where: { authorId: userId }
        });

        // Delete user's work logs
        await tx.ticketWorkLog.deleteMany({
          where: { authorId: userId }
        });

        // Remove user assignments from tickets and stories
        await tx.ticket.updateMany({
          where: { assigneeId: userId },
          data: { assigneeId: null }
        });

        await tx.story.updateMany({
          where: { assigneeId: userId },
          data: { assigneeId: null }
        });

        // Delete user's team and project memberships
        await tx.teamMember.deleteMany({
          where: { userId: userId }
        });

        await tx.projectMember.deleteMany({
          where: { userId: userId }
        });

        // Delete pending invitations
        await tx.teamInvite.deleteMany({
          where: { userId: userId }
        });

        await tx.projectInvite.deleteMany({
          where: { userId: userId }
        });

        // Delete approved user entries created by this user
        await tx.approvedUser.deleteMany({
          where: { createdById: userId }
        });

        // Finally, delete the user
        await tx.user.delete({
          where: { id: userId }
        });
      });

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;