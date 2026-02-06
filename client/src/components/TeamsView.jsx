import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const TeamsView = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await authService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      setError('Failed to load teams');
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await authService.createTeam(createForm.name, createForm.description);
      setCreateForm({ name: '', description: '' });
      setShowCreateForm(false);
      loadTeams();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create team');
    }
  };

  const handleTeamSelect = (team) => {
    navigate(`/teams/${team.id}/projects`);
  };

  if (loading) {
    return <div className="container"><h2>Loading teams...</h2></div>;
  }

  return (
    <div className="container">
      <div className="container-team" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="your-teams">Your Teams</div>
        <button onClick={() => setShowCreateForm(true)}>Create Team</button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Team</h3>
            <form onSubmit={handleCreateTeam}>
              <input
                type="text"
                placeholder="Team Name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Team Description (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows="3"
              />
              <div className="modal-buttons">
                <button type="submit">Create Team</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="teams-list">
        <div className='teams-list-header'>
          <div className="team-name-header">Team Name</div>
          <div className="team-members-header">Members</div>
          <div className="team-projects-header">Projects</div>
          <div className="team-actions-header">Actions</div>
        </div>
        {teams.length === 0 ? (
          <p>No teams found. Create your first team to get started!</p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="team-row">
              <div className="team-name">{team.name}</div>
              <div className="team-members">{team.members?.length || 0} members</div>
              <div className="team-projects">{team._count.projects} projects</div>
              <div className="team-actions">
                <button onClick={() => handleTeamSelect(team)}>
                  View Projects
                </button>
                <button onClick={() => navigate(`/teams/${team.id}/settings`)}>
                  Settings
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamsView;