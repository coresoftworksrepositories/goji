import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const SprintDetailView = () => {
  const { teamId, projectId, sprintId } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (sprintId) {
      loadSprint();
    }
  }, [sprintId]);

  const loadSprint = async () => {
    try {
      setLoading(true);
      const sprintData = await authService.getSprint(sprintId);
      setSprint(sprintData);
      setEditForm({
        name: sprintData.name,
        goal: sprintData.goal || '',
        startDate: sprintData.startDate ? sprintData.startDate.split('T')[0] : '',
        endDate: sprintData.endDate ? sprintData.endDate.split('T')[0] : ''
      });
    } catch (error) {
      setError('Failed to load sprint');
      console.error('Error loading sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSprint = async (e) => {
    e.preventDefault();
    try {
      await authService.updateSprint(sprintId, {
        name: editForm.name,
        goal: editForm.goal,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null
      });
      setShowEditForm(false);
      loadSprint();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update sprint');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await authService.updateSprint(sprintId, { status: newStatus });
      loadSprint();
    } catch (error) {
      setError('Failed to update sprint status');
    }
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
      case 'PLANNED': return '#6c757d';
      case 'ACTIVE': return '#007bff';
      case 'COMPLETED': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="container"><h2>Loading sprint...</h2></div>;
  }

  if (!sprint) {
    return <div className="container"><h2>Sprint not found</h2></div>;
  }

  return (
    <div className="container">
      <div className="sprint-detail-header">
        <button 
          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/sprints`)} 
          className="back-button"
        >
          ← Back to Sprints
        </button>
        <div className="sprint-title-section">
          <h2>{sprint.name}</h2>
          <span 
            className="sprint-status"
            style={{ backgroundColor: getStatusColor(sprint.status), color: 'white' }}
          >
            {sprint.status}
          </span>
        </div>
        <div className="sprint-actions">
          <button onClick={() => setShowEditForm(true)} className="btn btn-secondary">
            Edit Sprint
          </button>
          {sprint.status === 'PLANNED' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="btn btn-success"
            >
              Start Sprint
            </button>
          )}
          {sprint.status === 'ACTIVE' && (
            <button
              onClick={() => handleStatusChange('COMPLETED')}
              className="btn btn-primary"
            >
              Complete Sprint
            </button>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Edit Sprint Modal */}
      {showEditForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Sprint</h3>
            <form onSubmit={handleEditSprint}>
              <input
                type="text"
                placeholder="Sprint Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Sprint Goal"
                value={editForm.goal}
                onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                rows="3"
              />
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => setShowEditForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="sprint-details">
        <div className="sprint-info-section">
          <div className="info-card">
            <h3>Sprint Information</h3>
            {sprint.goal && (
              <div className="info-item">
                <strong>Goal:</strong>
                <p>{sprint.goal}</p>
              </div>
            )}
            <div className="info-item">
              <strong>Duration:</strong>
              <p>{formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</p>
            </div>
            <div className="info-item">
              <strong>Created:</strong>
              <p>{formatDateTime(sprint.createdAt)}</p>
            </div>
          </div>

          <div className="info-card">
            <h3>Sprint Stats</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-number">{sprint._count?.stories || 0}</span>
                <span className="stat-label">Stories</span>
              </div>
              <div className="stat">
                <span className="stat-number">{sprint._count?.tickets || 0}</span>
                <span className="stat-label">Tickets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stories in Sprint */}
        {sprint.stories && sprint.stories.length > 0 && (
          <div className="sprint-stories">
            <h3>Stories in Sprint ({sprint.stories.length})</h3>
            <div className="work-items-list">
              {sprint.stories.map((story) => (
                <div 
                  key={story.id} 
                  className="work-item story-item"
                  onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/stories/${story.id}`)}
                >
                  <div className="item-header">
                    <h4>{story.title}</h4>
                    <div className="item-meta">
                      <span className="status">{story.status}</span>
                      <span 
                        className="priority"
                        style={{ backgroundColor: getPriorityColor(story.priority) }}
                      >
                        {story.priority}
                      </span>
                      {story.points && <span className="points">{story.points} pts</span>}
                    </div>
                  </div>
                  {story.description && <p className="item-description">{story.description}</p>}
                  <div className="item-footer">
                    {story.assignee && (
                      <span className="assignee">
                        Assigned to: {story.assignee.firstName} {story.assignee.lastName} ({story.assignee.username})
                      </span>
                    )}
                    {story._count?.tickets > 0 && (
                      <span className="ticket-count">{story._count.tickets} tickets</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tickets in Sprint */}
        {sprint.tickets && sprint.tickets.length > 0 && (
          <div className="sprint-tickets">
            <h3>Tickets in Sprint ({sprint.tickets.length})</h3>
            <div className="work-items-list">
              {sprint.tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="work-item ticket-item"
                  onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/tickets/${ticket.id}`)}
                >
                  <div className="item-header">
                    <h4>{ticket.title}</h4>
                    <div className="item-meta">
                      <span className="type">{ticket.type}</span>
                      <span className="status">{ticket.status}</span>
                      <span 
                        className="priority"
                        style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  {ticket.description && <p className="item-description">{ticket.description}</p>}
                  <div className="item-footer">
                    {ticket.story && (
                      <span className="parent-story">Story: {ticket.story.title}</span>
                    )}
                    {ticket.assignee && (
                      <span className="assignee">
                        Assigned to: {ticket.assignee.firstName} {ticket.assignee.lastName} ({ticket.assignee.username})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty states */}
        {(!sprint.stories || sprint.stories.length === 0) && (!sprint.tickets || sprint.tickets.length === 0) && (
          <div className="empty-sprint">
            <p>This sprint is empty. Add stories and tickets to get started!</p>
            <button 
              onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/work`)}
              className="btn btn-primary"
            >
              Go to Work Board
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintDetailView;