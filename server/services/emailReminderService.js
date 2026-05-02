/**
 * Email Reminder Service
 * 
 * This service checks for tickets and stories with upcoming due dates
 * and sends reminder emails to assignees.
 * 
 * Can be run as a cron job, for example:
 * 0 9 * * * cd /path/to/server && npm run send-email-reminders
 * 
 * Usage: node services/emailReminderService.js
 */

const { prisma } = require('../utils/database');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Encryption key - same as in controller
const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

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

/**
 * Calculate if a reminder should be sent based on due date
 */
const shouldSendReminder = (dueDate, reminderDaysBefore, reminderFrequencyDays, lastReminderSent) => {
  if (!dueDate) return false;

  const now = new Date();
  const reminder_date = new Date(dueDate);
  reminder_date.setDate(reminder_date.getDate() - reminderDaysBefore);

  // Check if we should send a reminder (due date is approaching)
  const daysUntilReminder = Math.floor((reminder_date - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilReminder < 0 || daysUntilReminder > 1) {
    return false; // Due date not approaching
  }

  // Check if reminder was recently sent
  if (lastReminderSent) {
    const daysSinceLastReminder = Math.floor((now - new Date(lastReminderSent)) / (1000 * 60 * 60 * 24));
    if (daysSinceLastReminder < reminderFrequencyDays) {
      return false; // Reminder already sent recently
    }
  }

  return true;
};

/**
 * Format a date for display
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Send ticket reminders
 */
const sendTicketReminders = async (emailSettings, transporter) => {
  try {
    const { teamId, enableTicketReminders, ticketReminderDaysBefore, reminderFrequencyDays, lastTicketReminderSent, fromEmail, fromName } = emailSettings;

    if (!enableTicketReminders) {
      console.log(`Ticket reminders disabled for team ${teamId}`);
      return 0;
    }

    // Get all projects for this team
    const projects = await prisma.project.findMany({
      where: { teamId }
    });

    if (projects.length === 0) {
      return 0;
    }

    const projectIds = projects.map(p => p.id);

    // Get tickets with upcoming due dates that are not resolved/closed
    const tickets = await prisma.ticket.findMany({
      where: {
        projectId: {
          in: projectIds
        },
        dueDate: {
          not: null
        },
        status: {
          notIn: ['RESOLVED', 'CLOSED']
        },
        assigneeId: {
          not: null
        }
      },
      include: {
        assignee: true,
        project: true
      }
    });

    let remindersSent = 0;

    // Group tickets by assignee
    const ticketsByAssignee = {};
    for (const ticket of tickets) {
      if (shouldSendReminder(ticket.dueDate, ticketReminderDaysBefore, reminderFrequencyDays, lastTicketReminderSent)) {
        if (!ticketsByAssignee[ticket.assigneeId]) {
          ticketsByAssignee[ticket.assigneeId] = [];
        }
        ticketsByAssignee[ticket.assigneeId].push(ticket);
      }
    }

    // Send reminders to each assignee
    for (const [assigneeId, assigneeTickets] of Object.entries(ticketsByAssignee)) {
      const assignee = assigneeTickets[0].assignee;
      
      if (!assignee || !assignee.email) {
        console.log(`Skipping ticket reminder - no email for user ${assigneeId}`);
        continue;
      }

      const ticketList = assigneeTickets
        .map(t => `
          <li>
            <strong>[${t.project.key}-${t.id.slice(0, 8)}]</strong> ${t.title}<br>
            <small>Project: ${t.project.name} | Due: ${formatDate(t.dueDate)} | Status: ${t.status}</small>
          </li>
        `)
        .join('');

      try {
        await transporter.sendMail({
          from: `"${fromName || 'Goji'}" <${fromEmail}>`,
          to: assignee.email,
          subject: `[Goji] Ticket Reminders - ${assigneeTickets.length} task(s) due soon`,
          html: `
            <h2>Ticket Reminders</h2>
            <p>Hi ${assignee.firstName || 'there'},</p>
            <p>You have <strong>${assigneeTickets.length}</strong> ticket(s) with upcoming due dates:</p>
            <ul>
              ${ticketList}
            </ul>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard">View in Goji</a></p>
            <hr>
            <p><em>This is an automated reminder from your Goji project management system.</em></p>
          `
        });

        remindersSent++;
        console.log(`Ticket reminder sent to ${assignee.email}`);
      } catch (error) {
        console.error(`Failed to send ticket reminder to ${assignee.email}:`, error.message);
      }
    }

    // Update last ticket reminder sent timestamp
    if (remindersSent > 0) {
      await prisma.emailSettings.update({
        where: { teamId },
        data: { lastTicketReminderSent: new Date() }
      });
    }

    return remindersSent;
  } catch (error) {
    console.error('Error sending ticket reminders:', error);
    return 0;
  }
};

/**
 * Send story reminders
 */
const sendStoryReminders = async (emailSettings, transporter) => {
  try {
    const { teamId, enableStoryReminders, storyReminderDaysBefore, reminderFrequencyDays, lastStoryReminderSent, fromEmail, fromName } = emailSettings;

    if (!enableStoryReminders) {
      console.log(`Story reminders disabled for team ${teamId}`);
      return 0;
    }

    // Get all projects for this team
    const projects = await prisma.project.findMany({
      where: { teamId }
    });

    if (projects.length === 0) {
      return 0;
    }

    const projectIds = projects.map(p => p.id);

    // Get stories with upcoming due dates that are not done
    const stories = await prisma.story.findMany({
      where: {
        projectId: {
          in: projectIds
        },
        dueDate: {
          not: null
        },
        status: {
          notIn: ['DONE']
        },
        assigneeId: {
          not: null
        }
      },
      include: {
        assignee: true,
        project: true
      }
    });

    let remindersSent = 0;

    // Group stories by assignee
    const storiesByAssignee = {};
    for (const story of stories) {
      if (shouldSendReminder(story.dueDate, storyReminderDaysBefore, reminderFrequencyDays, lastStoryReminderSent)) {
        if (!storiesByAssignee[story.assigneeId]) {
          storiesByAssignee[story.assigneeId] = [];
        }
        storiesByAssignee[story.assigneeId].push(story);
      }
    }

    // Send reminders to each assignee
    for (const [assigneeId, assigneeStories] of Object.entries(storiesByAssignee)) {
      const assignee = assigneeStories[0].assignee;
      
      if (!assignee || !assignee.email) {
        console.log(`Skipping story reminder - no email for user ${assigneeId}`);
        continue;
      }

      const storyList = assigneeStories
        .map(s => `
          <li>
            <strong>${s.title}</strong><br>
            <small>Project: ${s.project.name} | Due: ${formatDate(s.dueDate)} | Status: ${s.status} | Points: ${s.points || 'N/A'}</small>
          </li>
        `)
        .join('');

      try {
        await transporter.sendMail({
          from: `"${fromName || 'Goji'}" <${fromEmail}>`,
          to: assignee.email,
          subject: `[Goji] Story Reminders - ${assigneeStories.length} story/stories due soon`,
          html: `
            <h2>Story Reminders</h2>
            <p>Hi ${assignee.firstName || 'there'},</p>
            <p>You have <strong>${assigneeStories.length}</strong> story/stories with upcoming due dates:</p>
            <ul>
              ${storyList}
            </ul>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard">View in Goji</a></p>
            <hr>
            <p><em>This is an automated reminder from your Goji project management system.</em></p>
          `
        });

        remindersSent++;
        console.log(`Story reminder sent to ${assignee.email}`);
      } catch (error) {
        console.error(`Failed to send story reminder to ${assignee.email}:`, error.message);
      }
    }

    // Update last story reminder sent timestamp
    if (remindersSent > 0) {
      await prisma.emailSettings.update({
        where: { teamId },
        data: { lastStoryReminderSent: new Date() }
      });
    }

    return remindersSent;
  } catch (error) {
    console.error('Error sending story reminders:', error);
    return 0;
  }
};

/**
 * Main function to process all email reminders
 */
const processEmailReminders = async () => {
  console.log('='.repeat(50));
  console.log(`Starting email reminder service at ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  try {
    // Get all teams with email settings configured
    const emailSettingsConfigs = await prisma.emailSettings.findMany({
      include: {
        team: true
      }
    });

    console.log(`Found ${emailSettingsConfigs.length} team(s) with email settings configured`);

    let totalTicketReminders = 0;
    let totalStoryReminders = 0;

    for (const emailSettings of emailSettingsConfigs) {
      try {
        console.log(`\nProcessing team: ${emailSettings.team.name} (${emailSettings.teamId})`);

        // Decrypt password
        const decryptedPassword = decryptPassword(emailSettings.smtpPassword);
        if (!decryptedPassword) {
          console.error(`Failed to decrypt password for team ${emailSettings.teamId}`);
          continue;
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
          host: emailSettings.smtpHost,
          port: emailSettings.smtpPort,
          secure: emailSettings.smtpPort === 465,
          auth: {
            user: emailSettings.smtpUser,
            pass: decryptedPassword
          }
        });

        // Verify connection
        try {
          await transporter.verify();
          console.log('✓ SMTP connection verified');
        } catch (error) {
          console.error('✗ SMTP connection failed:', error.message);
          continue;
        }

        // Send reminders
        const ticketReminders = await sendTicketReminders(emailSettings, transporter);
        const storyReminders = await sendStoryReminders(emailSettings, transporter);

        totalTicketReminders += ticketReminders;
        totalStoryReminders += storyReminders;

        console.log(`Team ${emailSettings.team.name}: ${ticketReminders} ticket reminder(s), ${storyReminders} story reminder(s)`);
      } catch (error) {
        console.error(`Error processing team ${emailSettings.teamId}:`, error);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Email reminder service completed`);
    console.log(`Total reminders sent: ${totalTicketReminders} ticket(s), ${totalStoryReminders} story/stories`);
    console.log('='.repeat(50));

    return {
      success: true,
      ticketReminders: totalTicketReminders,
      storyReminders: totalStoryReminders,
      teamsProcessed: emailSettingsConfigs.length
    };
  } catch (error) {
    console.error('Fatal error in email reminder service:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
};

// Run if this is the main module
if (require.main === module) {
  processEmailReminders()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { processEmailReminders };
