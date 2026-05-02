import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(email, username, password, firstName, lastName) {
    const response = await api.post('/api/auth/register', { 
      email, 
      username, 
      password, 
      firstName, 
      lastName 
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(login, password) {
    const response = await api.post('/api/auth/login', { login, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/api/auth/me');
    return response.data.user;
  },

  async searchUsers(username) {
    const response = await api.get(`/api/users/search?username=${username}`);
    return response.data.users;
  },

  async globalSearch(query) {
    const response = await api.get(`/api/search/global?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getStoredUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // Team Management
  async createTeam(name, description) {
    const response = await api.post('/api/teams', { name, description });
    return response.data.team;
  },

  async getTeams() {
    const response = await api.get('/api/teams');
    return response.data.teams;
  },

  async getTeam(teamId) {
    const response = await api.get(`/api/teams/${teamId}`);
    return response.data;
  },

  async inviteToTeam(teamId, identifier, role = 'MEMBER') {
    // Determine if identifier is email or username
    const isEmail = identifier.includes('@');
    const requestBody = isEmail 
      ? { email: identifier, role }
      : { username: identifier, role };
    
    const response = await api.post(`/api/teams/${teamId}/invite`, requestBody);
    return response.data.invite;
  },

  async getTeamInvitations() {
    const response = await api.get('/api/invitations/teams');
    return response.data.invites;
  },

  async respondToTeamInvitation(inviteId, action) {
    const response = await api.post(`/api/invitations/teams/${inviteId}/respond`, { action });
    return response.data;
  },

  async removeTeamMember(teamId, userId) {
    const response = await api.delete(`/api/teams/${teamId}/members/${userId}`);
    return response.data;
  },

  async cancelTeamInvitation(teamId, inviteId) {
    const response = await api.delete(`/api/teams/${teamId}/invitations/${inviteId}`);
    return response.data;
  },

  async updateTeamMemberRole(teamId, userId, role) {
    const response = await api.put(`/api/teams/${teamId}/members/${userId}/role`, { role });
    return response.data;
  },

  async updateTeam(teamId, name, description) {
    const response = await api.put(`/api/teams/${teamId}`, { name, description });
    return response.data;
  },

  async deleteTeam(teamId) {
    const response = await api.delete(`/api/teams/${teamId}`);
    return response.data;
  },

  // Project Management
  async createProject(teamId, name, description, key) {
    const response = await api.post(`/api/teams/${teamId}/projects`, { name, description, key });
    return response.data.project;
  },

  async getTeamProjects(teamId) {
    const response = await api.get(`/api/teams/${teamId}/projects`);
    return response.data.projects;
  },

  async getUserProjects() {
    // Get all teams first, then get projects for each team
    const teams = await this.getTeams();
    let allProjects = [];
    
    for (const team of teams) {
      try {
        const teamProjects = await this.getTeamProjects(team.id);
        // Add team info to each project for context
        const projectsWithTeam = teamProjects.map(project => ({
          ...project,
          team: { id: team.id, name: team.name }
        }));
        allProjects = [...allProjects, ...projectsWithTeam];
      } catch (error) {
        console.error(`Error loading projects for team ${team.id}:`, error);
      }
    }
    
    return allProjects;
  },

  async getProject(projectId) {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  },

  async inviteToProject(projectId, username, role = 'DEVELOPER') {
    const response = await api.post(`/api/projects/${projectId}/invite`, { username, role });
    return response.data.invite;
  },

  async getProjectInvitations() {
    const response = await api.get('/api/invitations/projects');
    return response.data.invites;
  },

  async respondToProjectInvitation(inviteId, action) {
    const response = await api.post(`/api/invitations/projects/${inviteId}/respond`, { action });
    return response.data;
  },

  // Work Items
  async createStory(projectId, title, description, priority, points, assigneeId, sprintId) {
    const response = await api.post(`/api/projects/${projectId}/stories`, {
      title, description, priority, points, assigneeId, sprintId
    });
    return response.data.story;
  },

  async getProjectStories(projectId, status) {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/projects/${projectId}/stories${params}`);
    return response.data.stories;
  },

  async updateStoryStatus(storyId, status) {
    const response = await api.patch(`/api/stories/${storyId}/status`, { status });
    return response.data.story;
  },

  async createTicket(projectId, title, description, type, priority, storyId, assigneeId, sprintId, parentTicketId) {
    const response = await api.post(`/api/projects/${projectId}/tickets`, {
      title, description, type, priority, storyId, assigneeId, sprintId, parentTicketId
    });
    return response.data.ticket;
  },

  async getProjectTickets(projectId, status, type, storyId) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    if (storyId) params.append('storyId', storyId);
    
    const queryString = params.toString();
    const response = await api.get(`/api/projects/${projectId}/tickets${queryString ? '?' + queryString : ''}`);
    return response.data.tickets;
  },

  async updateTicketStatus(ticketId, status) {
    const response = await api.patch(`/api/tickets/${ticketId}/status`, { status });
    return response.data.ticket;
  },

  // User profile methods
  async updateProfile(profileData) {
    const response = await api.put('/api/auth/profile', profileData);
    return response.data.user;
  },

  async deleteAccount() {
    const response = await api.delete('/api/auth/account');
    return response.data;
  },

  setStoredUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Project management methods
  async getProject(projectId) {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data.project;
  },

  async updateProject(projectId, data) {
    const response = await api.put(`/api/projects/${projectId}`, data);
    return response.data.project;
  },

  async deleteProject(projectId) {
    const response = await api.delete(`/api/projects/${projectId}`);
    return response.data;
  },

  async getProjectMembers(projectId) {
    const response = await api.get(`/api/projects/${projectId}/members`);
    return response.data.members;
  },

  async addProjectMember(projectId, userId) {
    const response = await api.post(`/api/projects/${projectId}/members`, { userId });
    return response.data;
  },

  async removeProjectMember(projectId, userId) {
    const response = await api.delete(`/api/projects/${projectId}/members/${userId}`);
    return response.data;
  },

  async cancelProjectInvitation(projectId, inviteId) {
    const response = await api.delete(`/api/projects/${projectId}/invitations/${inviteId}`);
    return response.data;
  },

  async getProjectOutgoingInvitations(projectId) {
    const response = await api.get(`/api/projects/${projectId}/invitations`);
    return response.data.invites;
  },

  async updateProjectMemberRole(projectId, userId, role) {
    const response = await api.put(`/api/projects/${projectId}/members/${userId}/role`, { role });
    return response.data;
  },

  async deleteProject(projectId) {
    const response = await api.delete(`/api/projects/${projectId}`);
    return response.data;
  },

  async getTeam(teamId) {
    const response = await api.get(`/api/teams/${teamId}`);
    return response.data.team;
  },

  async getTeamMembers(teamId) {
    const response = await api.get(`/api/teams/${teamId}/members`);
    return response.data.members;
  },

  // Individual story and ticket methods
  async getStory(storyId) {
    const response = await api.get(`/api/stories/${storyId}`);
    return response.data.story;
  },

  async getStoryTickets(storyId) {
    const response = await api.get(`/api/stories/${storyId}/tickets`);
    return response.data.tickets;
  },

  async updateStory(storyId, data) {
    const response = await api.put(`/api/stories/${storyId}`, data);
    return response.data.story;
  },

  async getTicket(ticketId) {
    const response = await api.get(`/api/tickets/${ticketId}`);
    return response.data.ticket;
  },

  async updateTicket(ticketId, data) {
    const response = await api.put(`/api/tickets/${ticketId}`, data);
    return response.data.ticket;
  },

  async logTimeOnTicket(ticketId, timeToAdd) {
    const response = await api.patch(`/api/tickets/${ticketId}/log-time`, { timeToAdd });
    return response.data.ticket;
  },

  async deleteTicket(ticketId) {
    const response = await api.delete(`/api/tickets/${ticketId}`);
    return response.data;
  },

  // Comments methods
  async getTicketComments(ticketId) {
    const response = await api.get(`/api/tickets/${ticketId}/comments`);
    return response.data.comments;
  },

  async addTicketComment(ticketId, content) {
    const response = await api.post(`/api/tickets/${ticketId}/comments`, { content });
    return response.data.comment;
  },

  async updateTicketComment(commentId, content) {
    const response = await api.put(`/api/tickets/comments/${commentId}`, { content });
    return response.data.comment;
  },

  async deleteTicketComment(commentId) {
    const response = await api.delete(`/api/tickets/comments/${commentId}`);
    return response.data;
  },

  // Work log methods
  async getTicketWorkLogs(ticketId) {
    const response = await api.get(`/api/tickets/${ticketId}/worklogs`);
    return response.data.workLogs;
  },

  async addTicketWorkLog(ticketId, data) {
    const response = await api.post(`/api/tickets/${ticketId}/worklogs`, data);
    return response.data.workLog;
  },

  async updateTicketWorkLog(workLogId, data) {
    const response = await api.put(`/api/worklogs/${workLogId}`, data);
    return response.data.workLog;
  },

  async deleteTicketWorkLog(workLogId) {
    const response = await api.delete(`/api/worklogs/${workLogId}`);
    return response.data;
  },

  async getTicketPreviousSprints(ticketId) {
    const response = await api.get(`/api/tickets/${ticketId}/previous-sprints`);
    return response.data.previousSprints;
  },

  // Sprint methods
  async getProjectSprints(projectId) {
    const response = await api.get(`/api/projects/${projectId}/sprints`);
    return response.data.sprints;
  },

  async getSprint(sprintId) {
    const response = await api.get(`/api/sprints/${sprintId}`);
    return response.data.sprint;
  },

  async createSprint(projectId, name, goal, startDate, endDate) {
    const response = await api.post(`/api/projects/${projectId}/sprints`, {
      name, goal, startDate, endDate
    });
    return response.data.sprint;
  },

  async updateSprint(sprintId, data) {
    const response = await api.put(`/api/sprints/${sprintId}`, data);
    return response.data.sprint;
  },

  async deleteSprint(sprintId) {
    const response = await api.delete(`/api/sprints/${sprintId}`);
    return response.data;
  },

  // Team AI Settings
  async updateTeamAiSettings(teamId, settings) {
    const response = await api.put(`/api/teams/${teamId}/ai-settings`, settings);
    return response.data;
  },

  async getTeamAiSettings(teamId) {
    const response = await api.get(`/api/teams/${teamId}/ai-settings`);
    return response.data;
  },

  // System backup methods (superuser only)
  async exportSystemBackup() {
    const response = await api.get('/api/backup/export', {
      responseType: 'blob'
    });
    return response.data;
  },

  async importSystemBackup(backupPayload) {
    const response = await api.post('/api/backup/import', backupPayload);
    return response.data;
  }
};

export default api;