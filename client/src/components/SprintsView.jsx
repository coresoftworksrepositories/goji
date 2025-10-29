import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const SprintsView = () => {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (projectId) {
      loadProjectAndSprints();
    }
  }, [projectId]);

  const loadProjectAndSprints = async () => {
    try {
      setLoading(true);
      const [projectData, sprintsData] = await Promise.all([
        authService.getProject(projectId),
        authService.getProjectSprints(projectId)
      ]);
      setProject(projectData);
      setSprints(sprintsData);
    } catch (error) {
      setError('Failed to load project and sprints');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      await authService.createSprint(
        projectId,
        createForm.name,
        createForm.goal,
        createForm.startDate || null,
        createForm.endDate || null
      );
      setCreateForm({ name: '', goal: '', startDate: '', endDate: '' });
      setShowCreateForm(false);
      loadProjectAndSprints();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create sprint');
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      await authService.updateSprint(sprintId, { status: 'ACTIVE' });
      loadProjectAndSprints();
    } catch (error) {
      setError('Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await authService.updateSprint(sprintId, { status: 'COMPLETED' });
      loadProjectAndSprints();
    } catch (error) {
      setError('Failed to complete sprint');
    }
  };

  const handleDeleteSprint = async (sprintId) => {
    if (window.confirm('Are you sure you want to delete this sprint? All associated stories and tickets will be moved to the backlog.')) {
      try {
        await authService.deleteSprint(sprintId);
        loadProjectAndSprints();
      } catch (error) {
        setError('Failed to delete sprint');
      }
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

  if (loading) {
    return <div className="container"><h2>Loading sprints...</h2></div>;
  }

  if (!project) {
    return <div className="container"><h2>Project not found</h2></div>;
  }

  return (
    <div className="container">
      <div className="sprints-header">
        <button 
          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/work`)} 
          className="back-button"
        >
          ← Back to Work Board
        </button>
        <h2>{project.name} - Sprints</h2>
        <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
          Create Sprint
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Create Sprint Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Sprint</h3>
            <form onSubmit={handleCreateSprint}>
              <input
                type="text"
                placeholder="Sprint Name (e.g., Sprint 1, Feature Release)"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Sprint Goal (What do you want to achieve?)"
                value={createForm.goal}
                onChange={(e) => setCreateForm({ ...createForm, goal: e.target.value })}
                rows="3"
              />
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date (optional)</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (optional)</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit">Create Sprint</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="sprints-grid">
        {sprints.length === 0 ? (
          <p>No sprints found. Create your first sprint to start planning work!</p>
        ) : (
          sprints.map((sprint) => (
            <div key={sprint.id} className="sprint-card">
              <div className="sprint-header">
                <div className="sprint-title">
                  <h3>{sprint.name}</h3>
                  <span 
                    className="sprint-status"
                    style={{ backgroundColor: getStatusColor(sprint.status), color: 'white' }}
                  >
                    {sprint.status}
                  </span>
                </div>
                <div className="sprint-actions">
                  {sprint.status === 'PLANNED' && (
                    <button
                      onClick={() => handleStartSprint(sprint.id)}
                      className="btn btn-sm btn-success"
                      title="Start Sprint"
                    >
                      Start
                    </button>
                  )}
                  {sprint.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleCompleteSprint(sprint.id)}
                      className="btn btn-sm btn-primary"
                      title="Complete Sprint"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/sprints/${sprint.id}`)}
                    className="btn btn-sm btn-secondary"
                    title="View Sprint Details"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteSprint(sprint.id)}
                    className="btn btn-sm btn-danger"
                    title="Delete Sprint"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {sprint.goal && (
                <div className="sprint-goal">
                  <strong>Goal:</strong> {sprint.goal}
                </div>
              )}

              <div className="sprint-dates">
                <div className="date-info">
                  <strong>Start:</strong> {formatDate(sprint.startDate)}
                </div>
                <div className="date-info">
                  <strong>End:</strong> {formatDate(sprint.endDate)}
                </div>
              </div>

              <div className="sprint-stats">
                <div className="stat">
                  <span className="stat-number">{sprint._count?.stories || 0}</span>
                  <span className="stat-label">Stories</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{sprint._count?.tickets || 0}</span>
                  <span className="stat-label">Tickets</span>
                </div>
              </div>

              <div className="sprint-meta">
                <small>Created: {formatDate(sprint.createdAt)}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SprintsView;