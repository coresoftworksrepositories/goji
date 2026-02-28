import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { ClipboardIcon } from '@radix-ui/react-icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ProjectSummary from './ProjectSummary';
import { TriangleAlert } from 'lucide-react';
import CreateTicketModal from './CreateTicketModal';
import CreateStoryModal from './CreateStoryModal';
import '../styles/list-view.css';
const DraggableStoryItem = ({ story, onStatusChange, navigate, teamId, projectId, onContextMenu, getPriorityColor, sprints, selectedSprint, storyColumns }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'STORY',
    item: { id: story.id, status: story.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag}
      className="kanban-item story-item"
      style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move' }}
      onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/stories/${story.id}`)}
      onContextMenu={(e) => onContextMenu(e, story)}
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
        onChange={(e) => onStatusChange(story.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="status-select"
      >
        {storyColumns.map((col) => (
          <option key={col.status} value={col.status}>{col.title}</option>
        ))}
      </select>
    </div>
  );
};

const DraggableTicketItem = ({ ticket, onStatusChange, navigate, teamId, projectId, onContextMenu, getPriorityColor, getTypeIcon, sprints, selectedSprint, ticketColumns }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TICKET',
    item: { id: ticket.id, status: ticket.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag}
      className={`kanban-item ticket-item ${ticket.parentTicketId ? 'subticket' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move' }}
      onContextMenu={(e) => onContextMenu(e, ticket)}
    >
      <div className="item-header" 
        onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/tickets/${ticket.id}`)}
      >
        {ticket.parentTicketId && <span className="subticket-indicator">↳</span>}
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
        {ticket.parentTicketId && (
          <span className="subticket-badge">Subticket</span>
        )}
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
        onChange={(e) => onStatusChange(ticket.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="status-select"
      >
        {ticketColumns.map((col) => (
          <option key={col.status} value={col.status}>{col.title}</option>
        ))}
      </select>
    </div>
  );
};

const DroppableColumn = ({ column, children, onDrop, itemType }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: itemType,
    drop: (item) => onDrop(item, column.status),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div ref={drop} className={`kanban-column ${column.status.toLowerCase()} ${isOver ? 'drag-over' : ''}`} style={{ backgroundColor: isOver ? '#f0f0f0' : 'transparent' }}>
      {children}
    </div>
  );
};

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
  const [sprintsEndingSoon, setSprintsEndingSoon] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  
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

  // Check for sprints ending soon (within 7 days)
  useEffect(() => {
    const checkSprintsEndingSoon = () => {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const endingSoon = sprints.filter(sprint => {
        if (sprint.status !== 'ACTIVE' && sprint.status !== 'IN_PROGRESS') return false;
        if (!sprint.endDate) return false;
        
        const endDate = new Date(sprint.endDate);
        return endDate >= now && endDate <= sevenDaysFromNow;
      });
      
      setSprintsEndingSoon(endingSoon);
    };
    
    checkSprintsEndingSoon();
  }, [sprints]);

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

  const handleStoryDrop = async (item, newStatus) => {
    if (item.status !== newStatus) {
      await handleStoryStatusChange(item.id, newStatus);
    }
  };

  const handleTicketDrop = async (item, newStatus) => {
    if (item.status !== newStatus) {
      await handleTicketStatusChange(item.id, newStatus);
    }
  };

  const handleStoryAssigneeChange = async (storyId, assigneeId) => {
    try {
      await authService.updateStory(storyId, { 
        assigneeId: assigneeId || null 
      });
      loadProjectAndWorkItems();
    } catch (error) {
      setError('Failed to update story assignee');
    }
  };

  const handleTicketAssigneeChange = async (ticketId, assigneeId) => {
    try {
      await authService.updateTicket(ticketId, { 
        assigneeId: assigneeId || null 
      });
      loadProjectAndWorkItems();
    } catch (error) {
      setError('Failed to update ticket assignee');
    }
  };

  const handleStorySprintChange = async (storyId, sprintId) => {
    try {
      await authService.updateStory(storyId, { 
        sprintId: sprintId || null 
      });
      loadProjectAndWorkItems();
    } catch (error) {
      setError('Failed to update story sprint');
    }
  };

  const handleTicketSprintChange = async (ticketId, sprintId) => {
    try {
      await authService.updateTicket(ticketId, { 
        sprintId: sprintId || null 
      });
      loadProjectAndWorkItems();
    } catch (error) {
      setError('Failed to update ticket sprint');
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
    <DndProvider backend={HTML5Backend}>
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

      {sprintsEndingSoon.length > 0 && (
        <div className="sprint-warning-banner">
          <span className="warning-icon">
            <TriangleAlert color="#ffffff" strokeWidth={1.25} />
          </span>
          <div className="warning-content">
            {sprintsEndingSoon.map(sprint => {
              const endDate = new Date(sprint.endDate);
              const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={sprint.id} className="warning-message">
                  <strong>{sprint.name}</strong> ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''} ({endDate.toLocaleDateString()})
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        <CreateStoryModal
          projectId={projectId}
          setShowCreateModal={setShowCreateStory}
          createForm={storyForm}
          setCreateForm={setStoryForm}
          createLoading={createLoading}
          setCreateLoading={setCreateLoading}
          createError={createError}
          setCreateError={setCreateError}
          loadStoryData={loadProjectAndWorkItems}
          sprints={sprints}
        />
      )}

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <CreateTicketModal
          projectId={projectId}
          storyId={null}
          setShowCreateModal={setShowCreateTicket}
          createForm={ticketForm}
          setCreateForm={setTicketForm}
          createLoading={createLoading}
          setCreateLoading={setCreateLoading}
          createError={createError}
          setCreateError={setCreateError}
          loadStoryData={loadProjectAndWorkItems}
          projectMembers={teamMembers}
          project={selectedProject}
        />
      )}

      {activeView === 'board' ? (
        <div className="kanban-board">
          {/* Stories Board */}
          <div className="board-section">
            <h3>Stories</h3>
            <div className="kanban-columns">
              {storyColumns.map((column) => (
                <DroppableColumn 
                  key={column.status} 
                  column={column} 
                  onDrop={handleStoryDrop}
                  itemType="STORY"
                >
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
                        <DraggableStoryItem
                          key={story.id}
                          story={story}
                          onStatusChange={handleStoryStatusChange}
                          navigate={navigate}
                          teamId={teamId}
                          projectId={projectId}
                          onContextMenu={handleStoryContextMenu}
                          getPriorityColor={getPriorityColor}
                          sprints={sprints}
                          selectedSprint={selectedSprint}
                          storyColumns={storyColumns}
                        />
                      ))}
                  </div>
                </DroppableColumn>
              ))}
            </div>
          </div>

          {/* Tickets Board */}
          <div className="board-section">
            <h3>Tickets</h3>
            <div className="kanban-columns">
              {ticketColumns.map((column) => (
                <DroppableColumn 
                  key={column.status} 
                  column={column} 
                  onDrop={handleTicketDrop}
                  itemType="TICKET"
                >
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
                        <DraggableTicketItem
                          key={ticket.id}
                          ticket={ticket}
                          onStatusChange={handleTicketStatusChange}
                          navigate={navigate}
                          teamId={teamId}
                          projectId={projectId}
                          onContextMenu={handleTicketContextMenu}
                          getPriorityColor={getPriorityColor}
                          getTypeIcon={getTypeIcon}
                          sprints={sprints}
                          selectedSprint={selectedSprint}
                          ticketColumns={ticketColumns}
                        />
                      ))}
                  </div>
                </DroppableColumn>
              ))}
            </div>
          </div>
        </div>
      ) : activeView === 'summary' ? (
        <ProjectSummary />
      ) : (
        <div className="list-view">
          {/* Stories Table */}
          <div className="list-view-table">
            <h3>Stories ({getFilteredStories().length})</h3>
            <div className="table-header">
              <div className="table-cell">Item</div>
              <div className="table-cell">Assignee</div>
              <div className="table-cell">Sprint</div>
              <div className="table-cell">Status</div>
              <div className="table-cell">Priority</div>
              <div className="table-cell">Points</div>
              <div className="table-cell">Created</div>
            </div>
            {getFilteredStories().length === 0 ? (
              <div className="table-empty">No stories found</div>
            ) : (
              getFilteredStories().map((story) => (
                <div 
                  key={story.id} 
                  className="table-row"
                  onContextMenu={(e) => handleStoryContextMenu(e, story)}
                >
                  <div 
                    className="table-cell item-title clickable-title"
                    onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/stories/${story.id}`)}
                  >
                    {story.title}
                  </div>
                  <div className="table-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="table-cell-select"
                      value={story.assigneeId || ''}
                      onChange={(e) => handleStoryAssigneeChange(story.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="table-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="table-cell-select"
                      value={story.sprintId || ''}
                      onChange={(e) => handleStorySprintChange(story.id, e.target.value)}
                    >
                      <option value="">No Sprint</option>
                      {sprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${story.status}`}>
                      {story.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="table-cell">
                    <span className={`priority-badge ${story.priority}`}>
                      {story.priority}
                    </span>
                  </div>
                  <div className="table-cell">
                    {story.points ? (
                      <span className="points-display">{story.points}</span>
                    ) : (
                      <span className="sprint-none">-</span>
                    )}
                  </div>
                  <div className="table-cell">
                    <span className="date-display">
                      {story.createdAt ? new Date(story.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tickets Table */}
          <div className="list-view-table">
            <h3>Tickets ({getFilteredTickets().length})</h3>
            <div className="table-header">
              <div className="table-cell">Item</div>
              <div className="table-cell">Assignee</div>
              <div className="table-cell">Story</div>
              <div className="table-cell">Sprint</div>
              <div className="table-cell">Status</div>
              <div className="table-cell">Priority</div>
              <div className="table-cell">Type</div>
            </div>
            {getFilteredTickets().length === 0 ? (
              <div className="table-empty">No tickets found</div>
            ) : (
              getFilteredTickets().map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="table-row"
                  onContextMenu={(e) => handleTicketContextMenu(e, ticket)}
                >
                  <div 
                    className="table-cell item-title clickable-title"
                    onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/tickets/${ticket.id}`)}
                  >
                    {ticket.parentTicketId && <span className="subticket-indicator">↳</span>}
                    <span className="type-icon">{getTypeIcon(ticket.type)}</span>
                    {ticket.title}
                  </div>
                  <div className="table-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="table-cell-select"
                      value={ticket.assigneeId || ''}
                      onChange={(e) => handleTicketAssigneeChange(ticket.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="table-cell">
                    {ticket.story ? (
                      <span className="sprint-display">{ticket.story.title}</span>
                    ) : (
                      <span className="sprint-none">-</span>
                    )}
                  </div>
                  <div className="table-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="table-cell-select"
                      value={ticket.sprintId || ''}
                      onChange={(e) => handleTicketSprintChange(ticket.id, e.target.value)}
                    >
                      <option value="">No Sprint</option>
                      {sprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${ticket.status}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="table-cell">
                    <span className={`priority-badge ${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="table-cell">
                    <span className="type-badge">{ticket.type}</span>
                  </div>
                </div>
              ))
            )}
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
    </DndProvider>
  );
};

export default WorkBoard;