import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { openRouterService } from '../services/openrouter';
import TodoGenerationModal from './TodoGenerationModal';

const StoryView = () => {
  const { teamId, projectId, storyId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [generatedTodos, setGeneratedTodos] = useState([]);
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoError, setTodoError] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    loadStoryData();
    checkAiEnabled();
  }, [storyId, teamId]);

  const checkAiEnabled = async () => {
    try {
      const enabled = await openRouterService.isEnabledForTeam(teamId);
      setAiEnabled(enabled);
    } catch (error) {
      console.error('Error checking AI enabled status:', error);
      setAiEnabled(false);
    }
  };

  const loadStoryData = async () => {
    try {
      setLoading(true);
      const [storyData, ticketsData, membersData, sprintsData] = await Promise.all([
        authService.getStory(storyId),
        authService.getStoryTickets(storyId),
        authService.getProjectMembers(projectId),
        authService.getProjectSprints(projectId)
      ]);
      
      setStory(storyData);
      setTickets(ticketsData);
      setProjectMembers(membersData);
      setSprints(sprintsData);
      setEditForm({
        title: storyData.title,
        description: storyData.description || '',
        priority: storyData.priority,
        points: storyData.points || '',
        assigneeId: storyData.assigneeId || '',
        sprintId: storyData.sprintId || '',
        startDate: storyData.startDate ? storyData.startDate.split('T')[0] : '',
        dueDate: storyData.dueDate ? storyData.dueDate.split('T')[0] : ''
      });
    } catch (error) {
      console.error('Error loading story:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await authService.updateStory(storyId, {
        ...editForm,
        points: editForm.points || null,
        assigneeId: editForm.assigneeId || null,
        sprintId: editForm.sprintId || null,
        startDate: editForm.startDate || null,
        dueDate: editForm.dueDate || null
      });
      setEditing(false);
      loadStoryData();
    } catch (error) {
      console.error('Error updating story:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await authService.updateStoryStatus(storyId, newStatus);
      loadStoryData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleGenerateTodos = async () => {
    if (!aiEnabled) {
      setTodoError('AI todo generation is not enabled for this team. Please check team settings.');
      setShowTodoModal(true);
      return;
    }

    try {
      setTodoLoading(true);
      setTodoError(null);
      setShowTodoModal(true);
      
      const todos = await openRouterService.generateTodos(story.title, story.description, teamId);
      setGeneratedTodos(todos);
    } catch (error) {
      console.error('Error generating todos:', error);
      setTodoError(error.message);
    } finally {
      setTodoLoading(false);
    }
  };

  const handleCreateTickets = async (selectedTodos) => {
    try {
      setTodoLoading(true);
      
      // Create tickets for each selected todo
      const createPromises = selectedTodos.map(todo => 
        authService.createTicket(
          projectId,
          todo.title,
          todo.description,
          todo.type,
          todo.priority,
          storyId,
          null // assigneeId - let user assign later
        )
      );
      
      await Promise.all(createPromises);
      
      // Close modal and refresh data
      setShowTodoModal(false);
      setGeneratedTodos([]);
      loadStoryData();
    } catch (error) {
      console.error('Error creating tickets:', error);
      setTodoError('Failed to create tickets. Please try again.');
    } finally {
      setTodoLoading(false);
    }
  };

  const handleCloseTodoModal = () => {
    setShowTodoModal(false);
    setGeneratedTodos([]);
    setTodoError(null);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'BACKLOG': return '#6c757d';
      case 'IN_PROGRESS': return '#007bff';
      case 'IN_REVIEW': return '#ffc107';
      case 'DONE': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div className="loading">Loading story...</div>;
  }

  if (!story) {
    return <div className="error">Story not found</div>;
  }

  return (
    <div className="story-view-container">
      <div className="story-header">
        <button 
          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/work`)}
          className="btn btn-secondary"
        >
          ← Back to Work Board
        </button>
        <div className="story-title-section">
          <div className="story-meta">
            <span className="story-key">STORY-{story.id}</span>
            <div 
              className="priority-indicator"
              style={{ backgroundColor: getPriorityColor(story.priority) }}
            ></div>
            <span className="priority-text">{story.priority}</span>
          </div>
          {editing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              className="story-title-input"
            />
          ) : (
            <h1 className="story-title">{story.title}</h1>
          )}
        </div>
        <div className="story-actions">
          {editing ? (
            <>
              <button onClick={handleEdit} className="btn btn-primary">Save</button>
              <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn btn-primary">Edit</button>
          )}
        </div>
      </div>

      <div className="story-content">
        <div className="story-main">
          <div className="story-section">
            <h3>Description</h3>
            {editing ? (
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows="4"
                className="form-control"
              />
            ) : (
              <div className="story-description">
                {story.description || 'No description provided'}
              </div>
            )}
          </div>

          <div className="story-section">
            <div className="section-header">
              <h3>Related Tickets</h3>
              {aiEnabled && (
                <button 
                  onClick={handleGenerateTodos}
                  className="btn btn-secondary"
                  disabled={todoLoading}
                >
                  {todoLoading ? 'Generating...' : 'Generate Todos'}
                </button>
              )}
            </div>
            <div className="tickets-list">
              {tickets.length === 0 ? (
                <p>No tickets associated with this story</p>
              ) : (
                tickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    className="ticket-item"
                    onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/tickets/${ticket.id}`)}
                  >
                    <div className="ticket-header">
                      <span className="ticket-key">TICKET-{ticket.id}</span>
                      <span className="ticket-type">{ticket.type}</span>
                      <div 
                        className="priority-indicator"
                        style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                      ></div>
                    </div>
                    <div className="ticket-title">{ticket.title}</div>
                    <div className="ticket-status" style={{ color: getStatusColor(ticket.status) }}>
                      {ticket.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="story-sidebar">
          <div className="story-details">
            <h3>Details</h3>
            
            <div className="detail-item">
              <label>Status</label>
              <select
                value={story.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={editing}
                className="form-control"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div className="detail-item">
              <label>Assignee</label>
              {editing ? (
                <select
                  value={editForm.assigneeId}
                  onChange={(e) => setEditForm({...editForm, assigneeId: e.target.value})}
                  className="form-control"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.username}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{story.assignee ? story.assignee.username : 'Unassigned'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Reporter</label>
              <div>{story.reporter ? story.reporter.username : 'Unknown'}</div>
            </div>

            <div className="detail-item">
              <label>Sprint</label>
              {editing ? (
                <select
                  value={editForm.sprintId}
                  onChange={(e) => setEditForm({...editForm, sprintId: e.target.value})}
                  className="form-control"
                >
                  <option value="">No Sprint</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{story.sprint ? story.sprint.name : 'No Sprint'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Story Points</label>
              {editing ? (
                <input
                  type="number"
                  value={editForm.points}
                  onChange={(e) => setEditForm({...editForm, points: e.target.value})}
                  className="form-control"
                  min="0"
                />
              ) : (
                <div>{story.points || 'Not estimated'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Start Date</label>
              {editing ? (
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                  className="form-control"
                />
              ) : (
                <div>{story.startDate ? new Date(story.startDate).toLocaleDateString() : 'Not set'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Due Date</label>
              {editing ? (
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                  className="form-control"
                />
              ) : (
                <div>{story.dueDate ? new Date(story.dueDate).toLocaleDateString() : 'Not set'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Created</label>
              <div>{new Date(story.createdAt).toLocaleDateString()}</div>
            </div>

            <div className="detail-item">
              <label>Updated</label>
              <div>{new Date(story.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      <TodoGenerationModal
        isOpen={showTodoModal}
        onClose={handleCloseTodoModal}
        todos={generatedTodos}
        onCreateTickets={handleCreateTickets}
        loading={todoLoading}
        error={todoError}
      />
    </div>
  );
};

export default StoryView;