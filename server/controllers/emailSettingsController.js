const { prisma } = require('../utils/database');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Encryption helpers for sensitive data
const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

const encryptPassword = (password) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32)),
    iv
  );
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decryptPassword = (encryptedPassword) => {
  try {
    const [iv, encrypted] = encryptedPassword.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32)),
      Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

const emailSettingsController = {
  // Get email settings for a team
  async getEmailSettings(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;

      // Verify user is team member
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const emailSettings = await prisma.emailSettings.findUnique({
        where: { teamId }
      });

      if (!emailSettings) {
        return res.status(404).json({ error: 'Email settings not found' });
      }

      // Don't return encrypted password to frontend
      const { smtpPassword, ...safeSettings } = emailSettings;
      res.json(safeSettings);
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch email settings' });
    }
  },

  // Create or update email settings (superuser only)
  async updateEmailSettings(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Check if user is superuser
      if (user.role !== 'SUPERUSER') {
        return res.status(403).json({ error: 'Only superusers can configure email settings' });
      }

      // Verify team exists
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
        enableTicketReminders,
        enableStoryReminders,
        reminderFrequencyDays,
        ticketReminderDaysBefore,
        storyReminderDaysBefore,
        reminderTime
      } = req.body;

      // Validate required fields
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !fromEmail) {
        return res.status(400).json({ error: 'Missing required email configuration fields' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(fromEmail)) {
        return res.status(400).json({ error: 'Invalid from email format' });
      }

      // Validate reminder time format (HH:MM)
      if (reminderTime && !/^\d{2}:\d{2}$/.test(reminderTime)) {
        return res.status(400).json({ error: 'Reminder time must be in HH:MM format' });
      }

      // Encrypt password
      const encryptedPassword = encryptPassword(smtpPassword);

      // Check if settings already exist
      const existingSettings = await prisma.emailSettings.findUnique({
        where: { teamId }
      });

      let emailSettings;

      if (existingSettings) {
        emailSettings = await prisma.emailSettings.update({
          where: { teamId },
          data: {
            smtpHost,
            smtpPort: parseInt(smtpPort),
            smtpUser,
            smtpPassword: encryptedPassword,
            fromEmail,
            fromName,
            enableTicketReminders: enableTicketReminders !== undefined ? enableTicketReminders : true,
            enableStoryReminders: enableStoryReminders !== undefined ? enableStoryReminders : true,
            reminderFrequencyDays: reminderFrequencyDays || 1,
            ticketReminderDaysBefore: ticketReminderDaysBefore || 1,
            storyReminderDaysBefore: storyReminderDaysBefore || 1,
            reminderTime: reminderTime || '09:00'
          }
        });
      } else {
        emailSettings = await prisma.emailSettings.create({
          data: {
            teamId,
            smtpHost,
            smtpPort: parseInt(smtpPort),
            smtpUser,
            smtpPassword: encryptedPassword,
            fromEmail,
            fromName,
            enableTicketReminders: enableTicketReminders !== undefined ? enableTicketReminders : true,
            enableStoryReminders: enableStoryReminders !== undefined ? enableStoryReminders : true,
            reminderFrequencyDays: reminderFrequencyDays || 1,
            ticketReminderDaysBefore: ticketReminderDaysBefore || 1,
            storyReminderDaysBefore: storyReminderDaysBefore || 1,
            reminderTime: reminderTime || '09:00'
          }
        });
      }

      // Don't return encrypted password
      const { smtpPassword: _, ...safeSettings } = emailSettings;
      res.json({ message: 'Email settings updated successfully', settings: safeSettings });
    } catch (error) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  },

  // Test email settings by sending a test email
  async testEmailSettings(req, res) {
    try {
      const { teamId } = req.params;
      const { testEmail } = req.body;
      const userId = req.user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Check if user is superuser
      if (user.role !== 'SUPERUSER') {
        return res.status(403).json({ error: 'Only superusers can test email settings' });
      }

      if (!testEmail) {
        return res.status(400).json({ error: 'Test email address is required' });
      }

      const emailSettings = await prisma.emailSettings.findUnique({
        where: { teamId }
      });

      if (!emailSettings) {
        return res.status(404).json({ error: 'Email settings not found' });
      }

      // Decrypt password
      const decryptedPassword = decryptPassword(emailSettings.smtpPassword);
      if (!decryptedPassword) {
        return res.status(500).json({ error: 'Failed to decrypt email password' });
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        secure: emailSettings.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: emailSettings.smtpUser,
          pass: decryptedPassword
        }
      });

      // Send test email
      await transporter.sendMail({
        from: `"${emailSettings.fromName || 'Goji'}" <${emailSettings.fromEmail}>`,
        to: testEmail,
        subject: 'Goji Email Settings Test',
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email from your Goji project management system.</p>
          <p>If you received this email, your email settings are configured correctly!</p>
          <hr>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Host: ${emailSettings.smtpHost}</li>
            <li>SMTP Port: ${emailSettings.smtpPort}</li>
            <li>From Email: ${emailSettings.fromEmail}</li>
          </ul>
        `
      });

      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ error: 'Failed to send test email: ' + error.message });
    }
  },

  // Disable email settings for a team
  async disableEmailSettings(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Check if user is superuser
      if (user.role !== 'SUPERUSER') {
        return res.status(403).json({ error: 'Only superusers can disable email settings' });
      }

      const emailSettings = await prisma.emailSettings.findUnique({
        where: { teamId }
      });

      if (!emailSettings) {
        return res.status(404).json({ error: 'Email settings not found' });
      }

      // Delete email settings
      await prisma.emailSettings.delete({
        where: { teamId }
      });

      res.json({ message: 'Email settings disabled successfully' });
    } catch (error) {
      console.error('Error disabling email settings:', error);
      res.status(500).json({ error: 'Failed to disable email settings' });
    }
  }
};

// Export encryption helpers for use in email service
module.exports = { ...emailSettingsController, encryptPassword, decryptPassword };
