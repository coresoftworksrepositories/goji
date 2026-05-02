const { prisma } = require('../utils/database');

const MODEL_KEYS = {
  approvedUsers: 'approvedUser',
  teams: 'team',
  teamMembers: 'teamMember',
  teamInvites: 'teamInvite',
  projects: 'project',
  projectMembers: 'projectMember',
  projectInvites: 'projectInvite',
  aiSupported: 'aISupported',
  sprints: 'sprint',
  stories: 'story',
  tickets: 'ticket',
  ticketComments: 'ticketComment',
  ticketWorkLogs: 'ticketWorkLog'
};

const expectedArray = (value) => (Array.isArray(value) ? value : []);

const toDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed;
};

const stripModelName = (entry) => {
  if (!entry || typeof entry !== 'object') return entry;
  const { __modelName, ...rest } = entry;
  return rest;
};

const validateBackupPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup payload must be an object');
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Backup payload is missing the data section');
  }

  Object.keys(MODEL_KEYS).forEach((collectionKey) => {
    if (!Array.isArray(payload.data[collectionKey])) {
      throw new Error(`Backup payload is missing array: data.${collectionKey}`);
    }
  });
};

const buildUserIdMap = (existingUsers, userRefs = []) => {
  const mapByEmail = new Map();
  const mapByUsername = new Map();

  existingUsers.forEach((user) => {
    if (user.email) mapByEmail.set(String(user.email).toLowerCase(), user.id);
    if (user.username) mapByUsername.set(String(user.username).toLowerCase(), user.id);
  });

  const idMap = new Map();
  const missing = [];

  expectedArray(userRefs).forEach((ref) => {
    const oldId = ref?.id;
    const emailKey = ref?.email ? String(ref.email).toLowerCase() : null;
    const usernameKey = ref?.username ? String(ref.username).toLowerCase() : null;
    const mappedId = (emailKey && mapByEmail.get(emailKey)) || (usernameKey && mapByUsername.get(usernameKey));

    if (!oldId) {
      return;
    }

    if (mappedId) {
      idMap.set(oldId, mappedId);
    } else {
      missing.push({
        id: oldId,
        email: ref?.email || null,
        username: ref?.username || null
      });
    }
  });

  return { idMap, missing };
};

const mapUserIdRequired = (idMap, oldId, fieldName) => {
  const mapped = idMap.get(oldId);
  if (!mapped) {
    throw new Error(`Missing user mapping for required field ${fieldName} with source user id ${oldId}`);
  }
  return mapped;
};

const mapUserIdOptional = (idMap, oldId) => {
  if (!oldId) return null;
  return idMap.get(oldId) || null;
};

const backupController = {
  async exportBackup(req, res) {
    try {
      const [
        userRefs,
        approvedUsers,
        teams,
        teamMembers,
        teamInvites,
        projects,
        projectMembers,
        projectInvites,
        aiSupported,
        sprints,
        stories,
        tickets,
        ticketComments,
        ticketWorkLogs
      ] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            username: true
          }
        }),
        prisma.approvedUser.findMany(),
        prisma.team.findMany(),
        prisma.teamMember.findMany(),
        prisma.teamInvite.findMany(),
        prisma.project.findMany(),
        prisma.projectMember.findMany(),
        prisma.projectInvite.findMany(),
        prisma.aISupported.findMany(),
        prisma.sprint.findMany(),
        prisma.story.findMany(),
        prisma.ticket.findMany(),
        prisma.ticketComment.findMany(),
        prisma.ticketWorkLog.findMany()
      ]);

      const backup = {
        metadata: {
          app: 'goji',
          version: 1,
          exportedAt: new Date().toISOString(),
          exportedBy: req.user.userId,
          userRefs
        },
        data: {
          approvedUsers,
          teams,
          teamMembers,
          teamInvites,
          projects,
          projectMembers,
          projectInvites,
          aiSupported,
          sprints,
          stories,
          tickets,
          ticketComments,
          ticketWorkLogs
        }
      };

      const fileName = `goji-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(JSON.stringify(backup, null, 2));
    } catch (error) {
      console.error('Export backup error:', error);
      res.status(500).json({ error: 'Failed to export backup' });
    }
  },

  async importBackup(req, res) {
    try {
      validateBackupPayload(req.body);

      const incoming = req.body.data;
      const approvedUsers = expectedArray(incoming.approvedUsers).map(stripModelName);
      const teams = expectedArray(incoming.teams).map(stripModelName);
      const teamMembers = expectedArray(incoming.teamMembers).map(stripModelName);
      const teamInvites = expectedArray(incoming.teamInvites).map(stripModelName);
      const projects = expectedArray(incoming.projects).map(stripModelName);
      const projectMembers = expectedArray(incoming.projectMembers).map(stripModelName);
      const projectInvites = expectedArray(incoming.projectInvites).map(stripModelName);
      const aiSupported = expectedArray(incoming.aiSupported).map(stripModelName);
      const sprints = expectedArray(incoming.sprints).map(stripModelName);
      const stories = expectedArray(incoming.stories).map(stripModelName);
      const tickets = expectedArray(incoming.tickets).map(stripModelName);
      const ticketComments = expectedArray(incoming.ticketComments).map(stripModelName);
      const ticketWorkLogs = expectedArray(incoming.ticketWorkLogs).map(stripModelName);

      const existingUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true
        }
      });

      const userRefs = req.body?.metadata?.userRefs;
      const { idMap: userIdMap, missing } = buildUserIdMap(existingUsers, userRefs);

      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Import cannot proceed. Some backup users do not exist in this instance by email/username.',
          missingUsers: missing
        });
      }

      await prisma.$transaction(async (tx) => {
        // Clear existing data in reverse dependency order.
        await tx.ticketWorkLog.deleteMany({});
        await tx.ticketComment.deleteMany({});
        await tx.ticket.deleteMany({});
        await tx.story.deleteMany({});
        await tx.sprint.deleteMany({});
        await tx.projectInvite.deleteMany({});
        await tx.projectMember.deleteMany({});
        await tx.project.deleteMany({});
        await tx.teamInvite.deleteMany({});
        await tx.teamMember.deleteMany({});
        await tx.aISupported.deleteMany({});
        await tx.team.deleteMany({});
        await tx.approvedUser.deleteMany({});

        for (const entry of approvedUsers) {
          await tx.approvedUser.create({
            data: {
              id: entry.id,
              email: entry.email,
              defaultRole: entry.defaultRole,
              createdAt: toDate(entry.createdAt),
              createdById: mapUserIdRequired(userIdMap, entry.createdById, 'approvedUsers.createdById')
            }
          });
        }

        for (const entry of teams) {
          await tx.team.create({
            data: {
              id: entry.id,
              name: entry.name,
              description: entry.description ?? null,
              ownerId: mapUserIdRequired(userIdMap, entry.ownerId, 'teams.ownerId'),
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt),
              premium: entry.premium ?? 'PREMIUM'
            }
          });
        }

        for (const entry of teamMembers) {
          await tx.teamMember.create({
            data: {
              id: entry.id,
              teamId: entry.teamId,
              userId: mapUserIdRequired(userIdMap, entry.userId, 'teamMembers.userId'),
              role: entry.role,
              joinedAt: toDate(entry.joinedAt)
            }
          });
        }

        for (const entry of teamInvites) {
          await tx.teamInvite.create({
            data: {
              id: entry.id,
              teamId: entry.teamId,
              userId: mapUserIdRequired(userIdMap, entry.userId, 'teamInvites.userId'),
              status: entry.status,
              role: entry.role,
              sentAt: toDate(entry.sentAt),
              respondedAt: toDateOrNull(entry.respondedAt)
            }
          });
        }

        for (const entry of projects) {
          await tx.project.create({
            data: {
              id: entry.id,
              name: entry.name,
              description: entry.description ?? null,
              key: entry.key,
              teamId: entry.teamId,
              defaultAssigneeId: mapUserIdOptional(userIdMap, entry.defaultAssigneeId),
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt)
            }
          });
        }

        for (const entry of projectMembers) {
          await tx.projectMember.create({
            data: {
              id: entry.id,
              projectId: entry.projectId,
              userId: mapUserIdRequired(userIdMap, entry.userId, 'projectMembers.userId'),
              role: entry.role,
              joinedAt: toDate(entry.joinedAt)
            }
          });
        }

        for (const entry of projectInvites) {
          await tx.projectInvite.create({
            data: {
              id: entry.id,
              projectId: entry.projectId,
              userId: mapUserIdRequired(userIdMap, entry.userId, 'projectInvites.userId'),
              status: entry.status,
              role: entry.role,
              sentAt: toDate(entry.sentAt),
              respondedAt: toDateOrNull(entry.respondedAt)
            }
          });
        }

        for (const entry of aiSupported) {
          await tx.aISupported.create({
            data: {
              id: entry.id,
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt),
              teamId: entry.teamId,
              enabled: Boolean(entry.enabled)
            }
          });
        }

        for (const entry of sprints) {
          await tx.sprint.create({
            data: {
              id: entry.id,
              name: entry.name,
              goal: entry.goal ?? null,
              startDate: toDateOrNull(entry.startDate),
              endDate: toDateOrNull(entry.endDate),
              status: entry.status,
              projectId: entry.projectId,
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt)
            }
          });
        }

        for (const entry of stories) {
          await tx.story.create({
            data: {
              id: entry.id,
              title: entry.title,
              description: entry.description ?? null,
              status: entry.status,
              priority: entry.priority,
              points: entry.points ?? null,
              startDate: toDateOrNull(entry.startDate),
              dueDate: toDateOrNull(entry.dueDate),
              projectId: entry.projectId,
              sprintId: entry.sprintId ?? null,
              assigneeId: mapUserIdOptional(userIdMap, entry.assigneeId),
              reporterId: mapUserIdRequired(userIdMap, entry.reporterId, 'stories.reporterId'),
              createdById: mapUserIdRequired(userIdMap, entry.createdById, 'stories.createdById'),
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt)
            }
          });
        }

        for (const entry of tickets) {
          await tx.ticket.create({
            data: {
              id: entry.id,
              title: entry.title,
              description: entry.description ?? null,
              status: entry.status,
              priority: entry.priority,
              type: entry.type,
              timeLogged: entry.timeLogged ?? 0,
              startDate: toDateOrNull(entry.startDate),
              dueDate: toDateOrNull(entry.dueDate),
              projectId: entry.projectId,
              sprintId: entry.sprintId ?? null,
              previousSprints: entry.previousSprints ?? null,
              storyId: entry.storyId ?? null,
              parentTicketId: null,
              assigneeId: mapUserIdOptional(userIdMap, entry.assigneeId),
              reporterId: mapUserIdRequired(userIdMap, entry.reporterId, 'tickets.reporterId'),
              createdById: mapUserIdRequired(userIdMap, entry.createdById, 'tickets.createdById'),
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt)
            }
          });
        }

        // Restore parent-child ticket hierarchy after all tickets exist.
        for (const entry of tickets) {
          if (entry.parentTicketId) {
            await tx.ticket.update({
              where: { id: entry.id },
              data: { parentTicketId: entry.parentTicketId }
            });
          }
        }

        for (const entry of ticketComments) {
          await tx.ticketComment.create({
            data: {
              id: entry.id,
              content: entry.content,
              ticketId: entry.ticketId,
              authorId: mapUserIdRequired(userIdMap, entry.authorId, 'ticketComments.authorId'),
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt)
            }
          });
        }

        for (const entry of ticketWorkLogs) {
          await tx.ticketWorkLog.create({
            data: {
              id: entry.id,
              hours: entry.hours,
              description: entry.description,
              ticketId: entry.ticketId,
              authorId: mapUserIdRequired(userIdMap, entry.authorId, 'ticketWorkLogs.authorId'),
              createdAt: toDate(entry.createdAt),
              updatedAt: toDate(entry.updatedAt)
            }
          });
        }
      });

      res.json({ message: 'Backup imported successfully' });
    } catch (error) {
      console.error('Import backup error:', error);
      res.status(400).json({ error: error.message || 'Failed to import backup' });
    }
  }
};

module.exports = backupController;