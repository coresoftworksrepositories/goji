import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { authService } from '../services/auth';

const InvitationsView = () => {
  const { loadInvitationCount } = useOutletContext();
  const [teamInvites, setTeamInvites] = useState([]);
  const [projectInvites, setProjectInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const [teamInvitesData, projectInvitesData] = await Promise.all([
        authService.getTeamInvitations(),
        authService.getProjectInvitations()
      ]);
      setTeamInvites(teamInvitesData);
      setProjectInvites(projectInvitesData);
    } catch (error) {
      setError('Failed to load invitations');
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamInviteResponse = async (inviteId, action) => {
    try {
      await authService.respondToTeamInvitation(inviteId, action);
      loadInvitations();
      loadInvitationCount();
    } catch (error) {
      setError(error.response?.data?.error || `Failed to ${action} invitation`);
    }
  };

  const handleProjectInviteResponse = async (inviteId, action) => {
    try {
      await authService.respondToProjectInvitation(inviteId, action);
      loadInvitations();
      loadInvitationCount();
    } catch (error) {
      setError(error.response?.data?.error || `Failed to ${action} invitation`);
    }
  };

  if (loading) {
    return <div className="container"><h2>Loading invitations...</h2></div>;
  }

  const totalInvites = teamInvites.length + projectInvites.length;

  return (
    <div className="container">
      <h2>Your Invitations</h2>

      {error && <div className="error">{error}</div>}

      {totalInvites === 0 ? (
        <div className="no-invitations">
          <p>You have no pending invitations.</p>
        </div>
      ) : (
        <>
          {teamInvites.length > 0 && (
            <div className="invitations-section">
              <h3>Team Invitations ({teamInvites.length})</h3>
              <div className="invitations-list">
                {teamInvites.map((invite) => (
                  <div key={invite.id} className="invitation-card">
                    <div className="invitation-header">
                      <h4>{invite.team.name}</h4>
                      <span className="role-badge">{invite.role}</span>
                    </div>
                    
                    <div className="invitation-details">
                      <p>
                        <strong>{invite.team.owner.username}</strong> invited you to join{' '}
                        <strong>{invite.team.name}</strong> as a <strong>{invite.role.toLowerCase()}</strong>
                      </p>
                      {invite.team.description && (
                        <p className="team-description">{invite.team.description}</p>
                      )}
                      <p className="invitation-date">
                        Invited on {new Date(invite.sentAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="invitation-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleTeamInviteResponse(invite.id, 'accept')}
                      >
                        Accept
                      </button>
                      <button 
                        className="decline-btn"
                        onClick={() => handleTeamInviteResponse(invite.id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projectInvites.length > 0 && (
            <div className="invitations-section">
              <h3>Project Invitations ({projectInvites.length})</h3>
              <div className="invitations-list">
                {projectInvites.map((invite) => (
                  <div key={invite.id} className="invitation-card">
                    <div className="invitation-header">
                      <h4>{invite.project.name}</h4>
                      <span className="role-badge">{invite.role}</span>
                    </div>
                    
                    <div className="invitation-details">
                      <p>
                        You've been invited to join the <strong>{invite.project.name}</strong> project 
                        as a <strong>{invite.role.toLowerCase()}</strong>
                      </p>
                      <div className="project-info">
                        <span className="project-key">{invite.project.key}</span>
                        <span className="team-name">Team: {invite.project.team.name}</span>
                      </div>
                      <p className="invitation-date">
                        Invited on {new Date(invite.sentAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="invitation-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleProjectInviteResponse(invite.id, 'accept')}
                      >
                        Accept
                      </button>
                      <button 
                        className="decline-btn"
                        onClick={() => handleProjectInviteResponse(invite.id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvitationsView;