import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { ClipboardIcon } from '@radix-ui/react-icons';
import ProjectSummary from './ProjectSummary';
const WorkBoard = () => {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('all'); // 'all', 'backlog', or sprint ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('board'); // 'board', 'list', or 'summary'
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
   const [teamMembers, setTeamMembers] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, item: null });
  
  const [storyForm, setStoryForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    points: '',
    sprintId: ''
  });
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    type: 'TASK',
    priority: 'MEDIUM',
    storyId: '',
    assigneeId: '',
    sprintId: ''
  });

  const storyColumns = [
    { status: 'BACKLOG', title: 'Backlog', color: '#6c757d' },
    { status: 'IN_PROGRESS', title: 'In Progress', color: '#007bff' },
    { status: 'IN_REVIEW', title: 'In Review', color: '#ffc107' },
    { status: 'DONE', title: 'Done', color: '#28a745' }
  ];

  const ticketColumns = [
    { status: 'OPEN', title: 'Open', color: '#6c757d' },
    { status: 'IN_PROGRESS', title: 'In Progress', color: '#007bff' },
    { status: 'IN_REVIEW', title: 'In Review', color: '#ffc107' },
    { status: 'RESOLVED', title: 'Resolved', color: '#28a745' },
    { status: 'CLOSED', title: 'Closed', color: '#17a2b8' }
  ];

  useEffect(() => {
    if (projectId) {
      loadProjectAndWorkItems();
    }
  }, [projectId]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleDocClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const loadProjectAndWorkItems = async () => {
    try {
      setLoading(true);
      const [projectData, storiesData, ticketsData, sprintsData] = await Promise.all([
        authService.getProject(projectId),
        authService.getProjectStories(projectId),
        authService.getProjectTickets(projectId),
        authService.getProjectSprints(projectId)
      ]);
      setSelectedProject(projectData);
      setStories(storiesData);
      setTickets(ticketsData);
      setSprints(sprintsData);
      const teamMembersData = await authService.getTeamMembers(teamId);
      setTeamMembers(teamMembersData);
    } catch (error) {
      setError('Failed to load work items');
      console.error('Error loading work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.createStory(
        projectId,
        storyForm.title,
        storyForm.description,
        storyForm.priority,
        storyForm.points ? parseInt(storyForm.points) : null,
        null // assigneeId
      );
      
      // If sprint is selected, assign the story to the sprint
      if (storyForm.sprintId) {
        await authService.updateStory(response.id, { sprintId: storyForm.sprintId });
      }
      
      setStoryForm({ title: '', description: '', priority: 'MEDIUM', points: '', sprintId: '' });
      setShowCreateStory(false);
      loadProjectAndWorkItems();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create story');
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.createTicket(
        projectId,
        ticketForm.title,
        ticketForm.description,
        ticketForm.type,
        ticketForm.priority,
        ticketForm.storyId || null,
        ticketForm.assigneeId || null
      );
      
      // If sprint is selected, assign the ticket to the sprint
      if (ticketForm.sprintId) {
        await authService.updateTicket(response.id, { sprintId: ticketForm.sprintId });
      }
      
      setTicketForm({ title: '', description: '', type: 'TASK', priority: 'MEDIUM', storyId: '', sprintId: '' });
      setShowCreateTicket(false);
      loadProjectAndWorkItems();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  const handleStoryStatusChange = async (storyId, newStatus) => {
    try {
      await authService.updateStoryStatus(storyId, newStatus);
      loadProjectAndWorkItems();
    } catch (error) {
      setError('Failed to update story status');
    }
  };

  const handleTicketStatusChange = async (ticketId, status) => {
    try {
      await authService.updateTicketStatus(ticketId, status);
      loadProjectAndWorkItems();
    } catch (error) {
      setError('Failed to update ticket status');
    }
  };

  const handleStoryContextMenu = (e, story) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'story', item: story });
  };

  const handleTicketContextMenu = (e, ticket) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'ticket', item: ticket });
  };

  const openContextItem = (newTab = false) => {
    const { type, item } = contextMenu;
    if (!item) return;
    let path;
    if (type === 'story') path = `/teams/${teamId}/projects/${projectId}/stories/${item.id}`;
    else path = `/teams/${teamId}/projects/${projectId}/tickets/${item.id}`;
    const url = window.location.origin + path;
    if (newTab) window.open(url, '_blank');
    else window.location.href = url;
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const copyContextLink = async () => {
    const { type, item } = contextMenu;
    if (!item) return;
    let path;
    if (type === 'story') path = `/teams/${teamId}/projects/${projectId}/stories/${item.id}`;
    else path = `/teams/${teamId}/projects/${projectId}/tickets/${item.id}`;
    const url = window.location.origin + path;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error('Clipboard write failed', err);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return '#dc3545';
      case 'HIGH': return '#fd7e14';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BUG': return '🐛';
      case 'FEATURE': return '✨';
      case 'IMPROVEMENT': return '⚡';
      case 'TASK': return <ClipboardIcon />;
      default: return <ClipboardIcon />;
    }
  };

  // Filter stories and tickets based on selected sprint
  const getFilteredStories = () => {
    if (selectedSprint === 'all') return stories;
    if (selectedSprint === 'backlog') return stories.filter(story => !story.sprintId);
    return stories.filter(story => story.sprintId === selectedSprint);
  };

  const getFilteredTickets = () => {
    if (selectedSprint === 'all') return tickets;
    if (selectedSprint === 'backlog') return tickets.filter(ticket => !ticket.sprintId);
    return tickets.filter(ticket => ticket.sprintId === selectedSprint);
  };

  if (loading) {
    return <div className="container"><h2>Loading work items...</h2></div>;
  }

  if (!selectedProject) {
    return <div className="container"><h2>Project not found</h2></div>;
  }

  return (
    <div className="work-board">
      <div className="work-board-header">
        <button 
          onClick={() => navigate(`/teams/${teamId}/projects`)} 
          className="back-button"
        >
          ← Back to Projects
        </button>
        <h2>{selectedProject.name} Work Board</h2>
        <div className="work-board-actions">
          <button 
            onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/sprints`)}
            className="btn btn-secondary"
          >
            Manage Sprints
          </button>
          <button 
            onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/settings`)}
            className="btn btn-secondary"
          >
            Project Settings
          </button>
        </div>
      </div>

      <div className="work-board-controls">
        <div className="sprint-filter">
          <label htmlFor="sprint-select">Filter by Sprint:</label>
          <select 
            id="sprint-select"
            value={selectedSprint} 
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="sprint-select"
          >
            <option value="all">All Items</option>
            <option value="backlog">Backlog (No Sprint)</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} ({sprint.status})
              </option>
            ))}
          </select>
        </div>
        <div className="view-controls">
          <button 
            className={activeView === 'board' ? 'active' : ''}
            onClick={() => setActiveView('board')}
          >
            Board View
          </button>
          <button 
            className={activeView === 'list' ? 'active' : ''}
            onClick={() => setActiveView('list')}
          >
            List View
          </button>
          <button 
            className={activeView === 'summary' ? 'active' : ''}
            onClick={() => setActiveView('summary')}
          >
            Summary
          </button>
        </div>
        <div className="work-actions">
          <button onClick={() => setShowCreateStory(true)}>Create Story</button>
          <button onClick={() => setShowCreateTicket(true)}>Create Ticket</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Create Story Modal */}
      {showCreateStory && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Story</h3>
            <form onSubmit={handleCreateStory}>
              <input
                type="text"
                placeholder="Story Title"
                value={storyForm.title}
                onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                required
              />
              <textarea
                placeholder="Story Description"
                value={storyForm.description}
                onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
                rows="3"
              />
              <div className="form-row">
                <select
                  value={storyForm.priority}
                  onChange={(e) => setStoryForm({ ...storyForm, priority: e.target.value })}
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical Priority</option>
                </select>
                <input
                  type="number"
                  placeholder="Story Points"
                  value={storyForm.points}
                  onChange={(e) => setStoryForm({ ...storyForm, points: e.target.value })}
                  min="1"
                  max="21"
                />
              </div>
              <select
                value={storyForm.sprintId}
                onChange={(e) => setStoryForm({ ...storyForm, sprintId: e.target.value })}
              >
                <option value="">No Sprint (Backlog)</option>
                {sprints.filter(sprint => sprint.status !== 'COMPLETED').map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </option>
                ))}
              </select>
              <div className="modal-buttons">
                <button type="submit">Create Story</button>
                <button type="button" onClick={() => setShowCreateStory(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Ticket</h3>
            <form onSubmit={handleCreateTicket}>
              <input
                type="text"
                placeholder="Ticket Title"
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                required
              />
              <textarea
                placeholder="Ticket Description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                rows="3"
              />
              <div className="form-row">
                <select
                  value={ticketForm.type}
                  onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}
                >
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE">Feature</option>
                  <option value="IMPROVEMENT">Improvement</option>
                </select>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical Priority</option>
                </select>
              </div>
              <select
                value={ticketForm.storyId}
                onChange={(e) => setTicketForm({ ...ticketForm, storyId: e.target.value })}
              >
                <option value="">No Parent Story</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
              <select
                value={ticketForm.assigneeId}
                onChange={(e) => setTicketForm({ ...ticketForm, assigneeId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username}
                  </option>
                ))}
              </select>
              <select
                value={ticketForm.sprintId}
                onChange={(e) => setTicketForm({ ...ticketForm, sprintId: e.target.value })}
              >
                <option value="">No Sprint (Backlog)</option>
                {sprints.filter(sprint => sprint.status !== 'COMPLETED').map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </option>
                ))}
              </select>
              <div className="modal-buttons">
                <button type="submit">Create Ticket</button>
                <button type="button" onClick={() => setShowCreateTicket(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeView === 'board' ? (
        <div className="kanban-board">
          {/* Stories Board */}
          <div className="board-section">
            <h3>Stories</h3>
            <div className="kanban-columns">
              {storyColumns.map((column) => (
                <div key={column.status} className="kanban-column">
                  <div className="column-header" style={{ borderColor: column.color }}>
                    <h4>{column.title}</h4>
                    <span className="count">
                      {getFilteredStories().filter(s => s.status === column.status).length}
                    </span>
                  </div>
                  <div className="column-items">
                    {getFilteredStories()
                      .filter(story => story.status === column.status)
                      .map((story) => (
                        <div 
                          key={story.id} 
                          className="kanban-item story-item"
                          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/stories/${story.id}`)}
                          onContextMenu={(e) => handleStoryContextMenu(e, story)}
                        >
                          <div className="item-header">
                            <span className="item-title">{story.title}</span>
                            <div 
                              className="priority-indicator"
                              style={{ backgroundColor: getPriorityColor(story.priority) }}
                            />
                          </div>
                          {story.description && (
                            <p className="item-description">{story.description}</p>
                          )}
                          <div className="item-footer">
                            {story.points && <span className="story-points">{story.points} pts</span>}
                            {story.assignee && (
                              <span className="assignee">{story.assignee.username}</span>
                            )}
                            {story.sprintId && selectedSprint === 'all' && (
                              <span className="sprint-badge">
                                Sprint: {sprints.find(s => s.id === story.sprintId)?.name || 'Unknown'}
                              </span>
                            )}
                          </div>
                          <select
                            value={story.status}
                            onChange={(e) => handleStoryStatusChange(story.id, e.target.value)}
                            className="status-select"
                          >
                            {storyColumns.map((col) => (
                              <option key={col.status} value={col.status}>{col.title}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets Board */}
          <div className="board-section">
            <h3>Tickets</h3>
            <div className="kanban-columns">
              {ticketColumns.map((column) => (
                <div key={column.status} className="kanban-column">
                  <div className="column-header" style={{ borderColor: column.color }}>
                    <h4>{column.title}</h4>
                    <span className="count">
                      {getFilteredTickets().filter(t => t.status === column.status).length}
                    </span>
                  </div>
                  <div className="column-items">
                    {getFilteredTickets()
                      .filter(ticket => ticket.status === column.status)
                      .map((ticket) => (
                        <div 
                          key={ticket.id} 
                          className="kanban-item ticket-item"
                          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/tickets/${ticket.id}`)}
                          onContextMenu={(e) => handleTicketContextMenu(e, ticket)}
                        >
                          <div className="item-header">
                            <span className="type-icon">{getTypeIcon(ticket.type)}</span>
                            <span className="item-title">{ticket.title}</span>
                            <div 
                              className="priority-indicator"
                              style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                            />
                          </div>
                          {ticket.description && (
                            <p className="item-description">{ticket.description}</p>
                          )}
                          <div className="item-footer">
                            <span className="ticket-type">{ticket.type}</span>
                            {ticket.story && (
                              <span className="parent-story">Story: {ticket.story.title}</span>
                            )}
                            {ticket.assignee && (
                              <span className="assignee">{ticket.assignee.username}</span>
                            )}
                            {ticket.sprintId && selectedSprint === 'all' && (
                              <span className="sprint-badge">
                                Sprint: {sprints.find(s => s.id === ticket.sprintId)?.name || 'Unknown'}
                              </span>
                            )}
                          </div>
                          <select
                            value={ticket.status}
                            onChange={(e) => handleTicketStatusChange(ticket.id, e.target.value)}
                            className="status-select"
                          >
                            {ticketColumns.map((col) => (
                              <option key={col.status} value={col.status}>{col.title}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeView === 'summary' ? (
        <ProjectSummary />
      ) : (
        <div className="list-view">
          <div className="list-section">
            <h3>Stories ({getFilteredStories().length})</h3>
            <div className="items-list">
              {getFilteredStories().map((story) => (
                <div key={story.id} className="list-item" onContextMenu={(e) => handleStoryContextMenu(e, story)}>
                  <div className="item-info">
                    <h4>{story.title}</h4>
                    <p>{story.description}</p>
                    <div className="item-meta">
                      <span className="status">{story.status}</span>
                      <span className="priority" style={{ color: getPriorityColor(story.priority) }}>
                        {story.priority}
                      </span>
                      {story.points && <span className="points">{story.points} pts</span>}
                      {story.sprintId && (
                        <span className="sprint">
                          Sprint: {sprints.find(s => s.id === story.sprintId)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="list-section">
            <h3>Tickets ({getFilteredTickets().length})</h3>
            <div className="items-list">
              {getFilteredTickets().map((ticket) => (
                <div key={ticket.id} className="list-item" onContextMenu={(e) => handleTicketContextMenu(e, ticket)}>
                  <div className="item-info">
                    <h4>
                      <span className="type-icon">{getTypeIcon(ticket.type)}</span>
                      {ticket.title}
                    </h4>
                    <p>{ticket.description}</p>
                    <div className="item-meta">
                      <span className="status">{ticket.status}</span>
                      <span className="type">{ticket.type}</span>
                      <span className="priority" style={{ color: getPriorityColor(ticket.priority) }}>
                        {ticket.priority}
                      </span>
                      {ticket.story && <span className="story">Story: {ticket.story.title}</span>}
                      {ticket.sprintId && (
                        <span className="sprint">
                          Sprint: {sprints.find(s => s.id === ticket.sprintId)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item" onClick={() => openContextItem(false)}>Open</button>
          <button className="context-menu-item" onClick={() => openContextItem(true)}>Open in new tab</button>
          <button className="context-menu-item" onClick={() => copyContextLink()}>Copy link</button>
        </div>
      )}
    </div>
  );
};

export default WorkBoard;