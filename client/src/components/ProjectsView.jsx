import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const ProjectsView = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    key: ''
  });

  useEffect(() => {
    if (teamId) {
      loadTeamAndProjects();
    }
  }, [teamId]);

  const loadTeamAndProjects = async () => {
    try {
      setLoading(true);
      const [teamData, projectsData] = await Promise.all([
        authService.getTeam(teamId),
        authService.getTeamProjects(teamId)
      ]);
      setSelectedTeam(teamData);
      setProjects(projectsData);
    } catch (error) {
      setError('Failed to load team and projects');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await authService.createProject(
        teamId,
        createForm.name,
        createForm.description,
        createForm.key
      );
      setCreateForm({ name: '', description: '', key: '' });
      setShowCreateForm(false);
      loadTeamAndProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create project');
    }
  };

  const handleProjectSelect = (project) => {
    navigate(`/teams/${teamId}/projects/${project.id}/work`);
  };

  const generateKey = (name) => {
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
  };

  if (loading) {
    return <div className="container"><h2>Loading projects...</h2></div>;
  }

  if (!selectedTeam) {
    return <div className="container"><h2>Team not found</h2></div>;
  }

  document.title = `Goji - Projects - ${selectedTeam.name}`;

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/teams')} className="back-button">← Back to Teams</button>
        <h2 style={{ marginLeft: '1rem' }}>Projects in {selectedTeam.name}</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate(`/teams/${teamId}/settings`)}>
          Team Settings
        </button>
        <button onClick={() => setShowCreateForm(true)}>Create Project</button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                placeholder="Project Name"
                value={createForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateForm({ 
                    ...createForm, 
                    name,
                    key: createForm.key || generateKey(name)
                  });
                }}
                required
              />
              <input
                type="text"
                placeholder="Project Key (e.g., PROJ)"
                value={createForm.key}
                onChange={(e) => setCreateForm({ ...createForm, key: e.target.value.toUpperCase() })}
                maxLength="10"
                required
              />
              <textarea
                placeholder="Project Description (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows="3"
              />
              <div className="modal-buttons">
                <button type="submit">Create Project</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="projects-grid">
        {projects.length === 0 ? (
          <p>No projects found. Create your first project to get started!</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <h3>{project.name}</h3>
                <span className="project-key">{project.key}</span>
              </div>
              
              {project.description && <p>{project.description}</p>}
              
              <div className="project-stats">
                <div className="stat">
                  <span className="stat-number">{project._count.stories}</span>
                  <span className="stat-label">Stories</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{project._count.tickets}</span>
                  <span className="stat-label">Tickets</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{project._count.sprints || 0}</span>
                  <span className="stat-label">Sprints</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{project.members?.length || 0}</span>
                  <span className="stat-label">Members</span>
                </div>
              </div>

              <div className="project-members">
                <h4>Team Members:</h4>
                <div className="members-list">
                  {(project.members || []).slice(0, 3).map((member) => (
                    <div key={member.id} className="member-avatar">
                      {member.user.username.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {(project.members?.length || 0) > 3 && (
                    <div className="member-avatar more">
                      +{(project.members?.length || 0) - 3}
                    </div>
                  )}
                </div>
              </div>

              <div className="project-actions">
                <button onClick={() => handleProjectSelect(project)}>
                  Open Work Board
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teams/${teamId}/projects/${project.id}/sprints`);
                  }}
                  className="btn-secondary"
                >
                  Manage Sprints
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectsView;