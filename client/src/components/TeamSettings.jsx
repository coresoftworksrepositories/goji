import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { GearIcon } from '@radix-ui/react-icons';
const TeamSettings = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    identifier: '',
    role: 'MEMBER'
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [aiSettings, setAiSettings] = useState({
    enabled: false
  });
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  useEffect(() => {
    if (team) {
      setEditForm({
        name: team.name,
        description: team.description || ''
      });
    }
  }, [team]);

 const loadTeamData = async () => {
  try {
    setLoading(true);
    const teamData = await authService.getTeam(teamId);
    setTeam(teamData);
    const aiEnabled = teamData.aiSupported[0]?.enabled || false;
    setAiSettings({
      enabled: aiEnabled
    });
  } catch (error) {
    setError('Failed to load team data');
    console.error('Error loading team:', error);
  } finally {
    setLoading(false);
  }
};

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      await authService.inviteToTeam(teamId, inviteForm.identifier, inviteForm.role);
      setInviteForm({ identifier: '', role: 'MEMBER' });
      setShowInviteForm(false);
      setMessage('Invitation sent successfully!');
      loadTeamData(); // Refresh team data
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to invite user');
    }
  };

  const handleRemoveTeamMember = async (userId, username) => {
    if (!confirm(`Are you sure you want to remove ${username} from the team?`)) return;

    try {
      await authService.removeTeamMember(teamId, userId);
      setMessage('Member removed successfully!');
      setError('');
      loadTeamData(); // Refresh team data
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to remove team member');
    }
  };

  const handleCancelTeamInvitation = async (inviteId, username) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${username}?`)) return;

    try {
      await authService.cancelTeamInvitation(teamId, inviteId);
      setMessage('Invitation cancelled successfully!');
      setError('');
      loadTeamData(); // Refresh team data
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await authService.updateTeamMemberRole(teamId, userId, newRole);
      setMessage('Member role updated successfully!');
      setError('');
      setShowRoleModal(false);
      setSelectedMember(null);
      loadTeamData(); // Refresh team data
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update member role');
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This will delete all projects and cannot be undone.`)) return;

    try {
      await authService.deleteTeam(teamId);
      setMessage('Team deleted successfully!');
      // Navigate back to teams list
      setTimeout(() => navigate('/teams'), 1500);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const response = await authService.updateTeam(teamId, editForm.name.trim(), editForm.description.trim());
      setTeam(response.team);
      setMessage('Team updated successfully!');
      setShowEditForm(false);
      setError('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update team');
    }
  };

  const canDeleteTeam = () => {
    const currentUser = authService.getStoredUser();
    if (!currentUser || !team) return false;

    const currentMember = team.members?.find(m => m.user.id === currentUser.id);
    return currentMember && currentMember.role === 'OWNER';
  };

  const canManageTeam = () => {
    const currentUser = authService.getStoredUser();
    if (!currentUser || !team) return false;

    const currentMember = team.members?.find(m => m.user.id === currentUser.id);
    return currentMember && ['OWNER', 'ADMIN'].includes(currentMember.role);
  };

  const canRemoveMember = (member) => {
    const currentUser = authService.getStoredUser();
    if (!currentUser || !team) return false;

    const currentMember = team.members.find(m => m.user.id === currentUser.id);
    if (!currentMember) return false;

    // Role hierarchy: OWNER > ADMIN > MEMBER
    const roleHierarchy = { 'OWNER': 3, 'ADMIN': 2, 'MEMBER': 1 };
    const currentRank = roleHierarchy[currentMember.role] || 0;
    const targetRank = roleHierarchy[member.role] || 0;

    // Can remove if you're OWNER/ADMIN and target has lower rank, or you're removing yourself
    return (currentRank >= 2 && targetRank < currentRank) || (currentUser.id === member.user.id);
  };

  const isLastOwner = (member) => {
    if (!team) return false;
    // Count total owners in the team
    const ownerCount = team.members.filter(m => m.role === 'OWNER').length;
    // Check if this member is an owner and is the only one
    return member.role === 'OWNER' && ownerCount === 1;
  };

  const canChangeToRole = (member, targetRole) => {
    const currentUser = authService.getStoredUser();
    if (!currentUser || !team) return false;

    // If trying to demote the last owner, prevent it
    if (member.user.id === currentUser.id && isLastOwner(member) && targetRole !== 'OWNER') {
      return false;
    }

    return true;
  };

  const handleAiSettingsChange = async (setting, value) => {
    try {
      setSavingAiSettings(true);
      setError('');
      
      const updatedSettings = { ...aiSettings, [setting]: value };
      setAiSettings(updatedSettings);
      
      await authService.updateTeamAiSettings(teamId, updatedSettings);
      setMessage('AI settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      // Revert the setting on error
      setAiSettings(prev => ({ ...prev, [setting]: !value }));
      setError(error.response?.data?.error || 'Failed to update AI settings');
    } finally {
      setSavingAiSettings(false);
    }
  };

  if (loading) {
    return <div className="container"><h2>Loading team settings...</h2></div>;
  }

  if (!team) {
    return <div className="container"><h2>Team not found</h2></div>;
  }

  if (!canManageTeam()) {
    return (
      <div className="container">
        <h2>Access Denied</h2>
        <p>You don't have permission to access team settings.</p>
        <button onClick={() => navigate(`/teams/${teamId}/projects`)}>
          Back to Projects
        </button>
      </div>
    );
  }

  document.title = `Goji - Team Settings - ${team.name}`;
  console.log({aiSettings})

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Team Settings - {team.name}</h2>
        <button onClick={() => navigate(`/teams/${teamId}/projects`)}>
          Back to Projects
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Invite User to Team</h3>
            <form onSubmit={handleInviteUser}>
              <input
                type="text"
                placeholder="Username or Email"
                value={inviteForm.identifier}
                onChange={(e) => setInviteForm({ ...inviteForm, identifier: e.target.value })}
                required
              />
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div className="modal-buttons">
                <button type="submit">Send Invitation</button>
                <button type="button" onClick={() => setShowInviteForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Change Role for {selectedMember.user.username}</h3>
            <p>Current role: <strong>{selectedMember.role}</strong></p>
            {isLastOwner(selectedMember) && (
              <p className="warning" style={{color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                ⚠️ You are the only owner. At least one owner must remain.
              </p>
            )}
            <div className="role-options" style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
              {['OWNER', 'ADMIN', 'MEMBER'].map(role => {
                const isCurrentRole = selectedMember.role === role;
                const canChange = canChangeToRole(selectedMember, role);
                
                return (
                  <button
                    key={role}
                    className={`role-option-btn ${isCurrentRole ? 'current' : ''}`}
                    onClick={() => handleUpdateMemberRole(selectedMember.user.id, role)}
                    disabled={isCurrentRole || !canChange}
                    title={!canChange && !isCurrentRole ? 'Cannot demote the last owner' : ''}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isCurrentRole ? '#007bff' : '#f8f9fa',
                      color: isCurrentRole ? 'white' : '#333',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: (isCurrentRole || !canChange) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
            <div className="modal-buttons">
              <button type="button" onClick={() => {
                setShowRoleModal(false);
                setSelectedMember(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-sections">
        <div className="settings-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Team Information</h3>
            {canManageTeam() && (
              <button 
                onClick={() => {
                  setShowEditForm(!showEditForm);
                  setError('');
                  setMessage('');
                }}
                className="btn btn-secondary"
              >
                {showEditForm ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>

          {showEditForm ? (
            <form onSubmit={handleUpdateTeam} className="team-edit-form">
              <div className="form-group">
                <label htmlFor="teamName">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  placeholder="Enter team name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="teamDescription">Description</label>
                <textarea
                  id="teamDescription"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Enter team description (optional)"
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditForm(false);
                    setEditForm({
                      name: team.name,
                      description: team.description || ''
                    });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="team-info">
              <p><strong>Name:</strong> {team.name}</p>
              {team.description ? (
                <p><strong>Description:</strong> {team.description}</p>
              ) : (
                <p><strong>Description:</strong> <em>No description provided</em></p>
              )}
              <p><strong>Owner:</strong> {team.owner.username}</p>
              <p><strong>Members:</strong> {team.members?.length || 0}</p>
              <p><strong>Projects:</strong> {team._count?.projects || 0}</p>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>AI Features</h3>
          <div className="ai-settings">
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="aiTicketGeneration">AI Ticket Generation</label>
                <p className="setting-description">
                  Allow team members to use AI to generate todo items from stories that can be converted into tickets.
                  This feature requires OpenRouter API configuration.
                </p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    id="aiTicketGeneration"
                    type="checkbox"
                    checked={aiSettings.enabled}
                    onChange={(e) => handleAiSettingsChange('enabled', e.target.checked)}
                    disabled={savingAiSettings || !canManageTeam()}
                  />
                  <span className="toggle-slider"></span>
                </label>
                {savingAiSettings && <span className="saving-indicator">Saving...</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Team Members</h3>
            {canManageTeam() && (
              <button onClick={() => setShowInviteForm(true)} className="btn btn-primary">
                Invite User
              </button>
            )}
          </div>
          
          <div className="members-list">
            {team.members?.map((member) => (
              <div key={member.id} className="member-item">
                <div className="member-info">
                  <span className="member-name">{member.user.username}</span>
                  <span className="role">{member.role}</span>
                </div>
                <div className="member-actions">
                  {canManageTeam() && (
                    <button 
                      className="role-btn"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowRoleModal(true);
                      }}
                      title="Change role"
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <GearIcon />
                    </button>
                  )}
                  {canRemoveMember(member) && member.role !== 'OWNER' && (
                    <button 
                      className="remove-member-btn"
                      onClick={() => handleRemoveTeamMember(member.user.id, member.user.username)}
                      title="Remove member"
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {team.invites && team.invites.length > 0 && (
            <div className="pending-invites" style={{ marginTop: '1.5rem' }}>
              <h4>Pending Invites:</h4>
              {team.invites.map((invite) => (
                <div key={invite.id} className="invite-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  backgroundColor: '#fff3cd'
                }}>
                  <div className="member-info">
                    <span style={{ fontWeight: 'bold' }}>{invite.user.username}</span>
                    <span className="role" style={{ 
                      marginLeft: '1rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}>{invite.role}</span>
                    <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#856404' }}>
                      (Pending)
                    </span>
                  </div>
                  {canManageTeam() && (
                    <button 
                      className="remove-member-btn"
                      onClick={() => handleCancelTeamInvitation(invite.id, invite.user.username)}
                      title="Cancel invitation"
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {canDeleteTeam() && (
          <div className="settings-section danger-zone">
            <h3>Danger Zone</h3>
            <div className="danger-content">
              <div className="danger-info">
                <h4>Delete Team</h4>
                <p>
                  Permanently delete this team and all associated projects. 
                  This action cannot be undone and will remove all data, including:
                </p>
                <ul>
                  <li>All team projects and their data</li>
                  <li>All team member associations</li>
                  <li>All pending invitations</li>
                  <li>All project members and permissions</li>
                </ul>
                <p><strong>This action is irreversible.</strong></p>
              </div>
              <button 
                className="delete-team-btn"
                onClick={handleDeleteTeam}
              >
                Delete Team
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSettings;