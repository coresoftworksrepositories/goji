const { prisma } = require('../utils/database');

const searchController = {
  // Global search across teams, projects, and tickets
  async globalSearch(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user.userId;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
      }

      const searchTerm = query.trim().toLowerCase();

      // Search teams where user is a member
      const teams = await prisma.team.findMany({
        where: {
          AND: [
            {
              members: {
                some: {
                  userId: userId
                }
              }
            },
            {
              OR: [
                { name: { contains: searchTerm } },
                { description: { contains: searchTerm } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              members: true,
              projects: true
            }
          }
        },
        take: 5
      });

      // Search projects where user has access (through team membership or direct project access)
      const projects = await prisma.project.findMany({
        where: {
          AND: [
            {
              team: {
                members: {
                  some: {
                    userId: userId
                  }
                }
              }
            },
            {
              OR: [
                { name: { contains: searchTerm } },
                { description: { contains: searchTerm } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          team: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              stories: true,
              sprints: true
            }
          }
        },
        take: 5
      });

      // Search tickets/stories where user has access through team membership
      const tickets = await prisma.story.findMany({
        where: {
          AND: [
            {
              project: {
                team: {
                  members: {
                    some: {
                      userId: userId
                    }
                  }
                }
              }
            },
            {
              OR: [
                { title: { contains: searchTerm } },
                { description: { contains: searchTerm } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          project: {
            select: {
              id: true,
              name: true,
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        },
        take: 10
      });

      // Search individual tickets
      const individualTickets = await prisma.ticket.findMany({
        where: {
          AND: [
            {
              story: {
                project: {
                  team: {
                    members: {
                      some: {
                        userId: userId
                      }
                    }
                  }
                }
              }
            },
            {
              OR: [
                { title: { contains: searchTerm } },
                { description: { contains: searchTerm } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          story: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  team: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        take: 10
      });

      res.json({
        query: searchTerm,
        results: {
          teams: teams.map(team => ({
            ...team,
            type: 'team',
            url: `/teams/${team.id}/projects`
          })),
          projects: projects.map(project => ({
            ...project,
            type: 'project',
            url: `/teams/${project.team.id}/projects/${project.id}`
          })),
          stories: tickets.map(story => ({
            ...story,
            type: 'story',
            url: `/teams/${story.project.team.id}/projects/${story.project.id}/stories/${story.id}`
          })),
          tickets: individualTickets.map(ticket => ({
            ...ticket,
            type: 'ticket',
            url: `/teams/${ticket.story.project.team.id}/projects/${ticket.story.project.id}/stories/${ticket.story.id}/tickets/${ticket.id}`
          }))
        },
        totalResults: teams.length + projects.length + tickets.length + individualTickets.length
      });
    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = searchController;