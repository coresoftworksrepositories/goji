import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { GearIcon } from '@radix-ui/react-icons';
const ProjectSettings = () => {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [outgoingInvites, setOutgoingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    loadProjectData();
  }, [teamId, projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, teamData, membersData, invitesData] = await Promise.all([
        authService.getProject(projectId),
        authService.getTeam(teamId),
        authService.getProjectMembers(projectId),
        authService.getProjectOutgoingInvitations(projectId).catch(() => []) // Fail silently if no permission
      ]);
      
      setProject(projectData);
      setTeam(teamData);
      setProjectMembers(membersData);
      setOutgoingInvites(invitesData);
      setNewProjectName(projectData.name);

      // Get team members who are not yet project members
      const teamMembersData = await authService.getTeamMembers(teamId);
      const nonProjectMembers = teamMembersData.filter(
        teamMember => !membersData.some(projectMember => projectMember.id === teamMember.id)
      );
      setTeamMembers(nonProjectMembers);
    } catch (error) {
      console.error('Error loading project data:', error);
      setMessage('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await authService.updateProject(projectId, { name: newProjectName });
      setProject(prev => ({ ...prev, name: newProjectName }));
      setMessage('Project renamed successfully!');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to rename project');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await authService.addProjectMember(projectId, selectedUser);
      setMessage('User added successfully!');
      setShowAddUserModal(false);
      setSelectedUser('');
      loadProjectData(); // Refresh data
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to add user');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user from the project?')) return;

    try {
      await authService.removeProjectMember(projectId, userId);
      setMessage('User removed successfully!');
      loadProjectData(); // Refresh data
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to remove user');
    }
  };

  const canRemoveProjectMember = (member) => {
    const currentUser = authService.getStoredUser();
    if (!currentUser) return false;

    // Find current user in team and project
    const currentTeamMember = team?.members?.find(m => m.user.id === currentUser.id);
    const currentProjectMember = projectMembers.find(m => m.id === currentUser.id);

    if (!currentTeamMember) return false;

    // Team owners and admins can remove anyone
    if (['OWNER', 'ADMIN'].includes(currentTeamMember.role)) return true;

    // Project admins can remove developers and viewers
    if (currentProjectMember?.role === 'ADMIN') {
      // Get the member's project role by checking if they're in projectMembers
      const targetProjectMember = projectMembers.find(m => m.id === member.id);
      return targetProjectMember && ['DEVELOPER', 'VIEWER'].includes(targetProjectMember.role);
    }

    // Users can remove themselves
    return currentUser.id === member.id;
  };

  const handleCancelProjectInvitation = async (inviteId, username) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${username}?`)) return;

    try {
      await authService.cancelProjectInvitation(projectId, inviteId);
      setMessage('Invitation cancelled successfully!');
      loadProjectData(); // Refresh data
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  const canCancelProjectInvitation = () => {
    const currentUser = authService.getStoredUser();
    if (!currentUser) return false;

    const currentTeamMember = team?.members?.find(m => m.user.id === currentUser.id);
    const currentProjectMember = projectMembers.find(m => m.id === currentUser.id);

    // Team owners and admins can cancel invitations
    if (currentTeamMember && ['OWNER', 'ADMIN'].includes(currentTeamMember.role)) return true;

    // Project admins can cancel invitations
    return currentProjectMember && currentProjectMember.role === 'ADMIN';
  };

  const handleUpdateProjectMemberRole = async (userId, newRole) => {
    try {
      await authService.updateProjectMemberRole(projectId, userId, newRole);
      setMessage('Member role updated successfully!');
      setShowRoleModal(false);
      setSelectedMember(null);
      loadProjectData(); // Refresh data
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update member role');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) return;

    try {
      await authService.deleteProject(projectId);
      navigate(`/teams/${teamId}/projects`);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete project');
    }
  };

  const isLastProjectAdmin = (member) => {
    // Count total admins in the project
    const adminCount = projectMembers.filter(m => m.role === 'ADMIN').length;
    // Check if this member is an admin and is the only one
    return (member.role === 'ADMIN' || member.role === undefined) && adminCount === 1;
  };

  const canChangeToProjectRole = (member, targetRole) => {
    const currentUser = authService.getStoredUser();
    if (!currentUser) return false;

    const currentTeamMember = team?.members?.find(m => m.user.id === currentUser.id);
    
    // Team owners and admins can always change roles
    if (currentTeamMember && ['OWNER', 'ADMIN'].includes(currentTeamMember.role)) {
      return true;
    }

    // If trying to demote the last admin, prevent it (unless requester is team admin/owner)
    if (member.id === currentUser.id && isLastProjectAdmin(member) && targetRole !== 'ADMIN') {
      return false;
    }

    return true;
  };

  const canManageProjectRoles = () => {
    const currentUser = authService.getStoredUser();
    if (!currentUser) return false;

    const currentTeamMember = team?.members?.find(m => m.user.id === currentUser.id);
    const currentProjectMember = projectMembers.find(m => m.id === currentUser.id);

    // Team owners and admins can manage roles
    if (currentTeamMember && ['OWNER', 'ADMIN'].includes(currentTeamMember.role)) return true;

    // Project admins can manage roles
    return currentProjectMember && currentProjectMember.role === 'ADMIN';
  };

  if (loading) {
    return <div className="loading">Loading project settings...</div>;
  }

  if (!project) {
    return <div className="error">Project not found</div>;
  }


  return (
    <div className="project-settings-container">
      <div className="settings-header">
        <button 
          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/work`)}
          className="btn btn-secondary"
        >
          ← Back to Work Board
        </button>
        <h2>Project Settings</h2>
        <p>Manage "{project.name}" project</p>
      </div>

      <div className="settings-content">
        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="settings-section">
          <h3>Project Information</h3>
          <form onSubmit={handleRenameProject} className="settings-form">
            <div className="form-group">
              <label htmlFor="projectName">Project Name</label>
              <input
                type="text"
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Update Name
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h3>Default Ticket Assignee</h3>
          <p className="section-description">
            Set a default assignee for new tickets in this project. When creating tickets, 
            this user will be automatically selected as the assignee.
          </p>
          <div className="form-group">
            <label htmlFor="defaultAssignee">Default Assignee</label>
            <select
              id="defaultAssignee"
              value={project.defaultAssigneeId || ''}
              onChange={async (e) => {
                try {
                  await authService.updateProject(projectId, { defaultAssigneeId: e.target.value || null });
                  setMessage('Default assignee updated successfully!');
                  loadProjectData(); // Refresh to ensure UI reflects server state
                } catch (error) {
                  setMessage(error.response?.data?.error || 'Failed to update default assignee');
                }
              }}
              className="form-control"
            >
              <option value="">No default assignee</option>
              {projectMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Project Members</h3>
          <div className="members-header">
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="btn btn-primary"
              disabled={teamMembers.length === 0}
            >
              Add Member
            </button>
            {teamMembers.length === 0 && (
              <p className="info-text">All team members are already in this project</p>
            )}
          </div>

          <div className="members-list">
            {projectMembers.map(member => (
              <div key={member.id} className="member-item">
                <div className="member-info">
                  <span className="member-name">{member.username}</span>
                  <span className="member-email">{member.email}</span>
                  <span className="role">
                    {team?.members?.find(m => m.user.id === member.id)?.role || 'DEVELOPER'}
                  </span>
                </div>
                <div className="member-actions">
                  {canManageProjectRoles() && (
                    <button 
                      className="role-btn"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowRoleModal(true);
                      }}
                      title="Change role"
                    >
                      <GearIcon />
                    </button>
                  )}
                  {canRemoveProjectMember(member) && (
                    <button 
                      onClick={() => handleRemoveUser(member.id)}
                      className="btn btn-danger btn-small"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {outgoingInvites.length > 0 && canCancelProjectInvitation() && (
            <div className="pending-invites-section">
              <h4>Pending Invitations:</h4>
              <div className="invites-list">
                {outgoingInvites.map(invite => (
                  <div key={invite.id} className="invite-item">
                    <div className="member-info">
                      <span className="member-name">{invite.user.username}</span>
                      <span className="member-email">{invite.user.email}</span>
                      <span className="role">{invite.role}</span>
                    </div>
                    <button 
                      onClick={() => handleCancelProjectInvitation(invite.id, invite.user.username)}
                      className="btn btn-danger btn-small"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="settings-section danger-zone">
          <h3>Danger Zone</h3>
          <div className="danger-actions">
            <button 
              onClick={handleDeleteProject}
              className="btn btn-danger"
            >
              Delete Project
            </button>
            <p className="warning-text">
              This will permanently delete the project and all its work items. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add Project Member</h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-group">
                <label htmlFor="userSelect">Select Team Member</label>
                <select
                  id="userSelect"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                >
                  <option value="">Choose a team member...</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.username} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Add Member
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRoleModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Change Role for {selectedMember.username}</h3>
              <button 
                onClick={() => setShowRoleModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <p>Current role: <strong>{selectedMember.role || 'DEVELOPER'}</strong></p>
            {isLastProjectAdmin(selectedMember) && (
              <p className="warning" style={{color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                ⚠️ You are the only admin. At least one admin must remain.
              </p>
            )}
            <div className="role-options">
              {['ADMIN', 'DEVELOPER', 'VIEWER'].map(role => {
                const isCurrentRole = (selectedMember.role || 'DEVELOPER') === role;
                const canChange = canChangeToProjectRole(selectedMember, role);
                
                return (
                  <button
                    key={role}
                    className={`role-option-btn ${isCurrentRole ? 'current' : ''}`}
                    onClick={() => handleUpdateProjectMemberRole(selectedMember.id, role)}
                    disabled={isCurrentRole || !canChange}
                    title={!canChange && !isCurrentRole ? 'Cannot demote the last admin' : ''}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowRoleModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;