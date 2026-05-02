import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import BackupView from './BackupView';

const UserSettings = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || ''
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [canDeleteAccount, setCanDeleteAccount] = useState(true);
  const [teamOwnershipCheck, setTeamOwnershipCheck] = useState(null);

  useEffect(() => {
    // Check if dark mode is enabled
    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkMode);
    applyTheme(darkMode);
    
    // Check team ownership status
    checkTeamOwnership();
  }, []);

  const checkTeamOwnership = async () => {
    try {
      const teams = await authService.getTeams();
      const ownedTeams = teams.filter(team => team.ownerId === user.id);
      
      // Check if user is the sole owner of any teams
      const soleOwnerTeams = [];
      for (const team of ownedTeams) {
        const members = await authService.getTeamMembers(team.id);
        const ownerCount = members.filter(member => member.role === 'OWNER').length;
        if (ownerCount === 1) {
          soleOwnerTeams.push(team);
        }
      }
      
      setCanDeleteAccount(soleOwnerTeams.length === 0);
      setTeamOwnershipCheck({
        ownedTeams: ownedTeams.length,
        soleOwnerTeams: soleOwnerTeams.length,
        soleOwnerTeamNames: soleOwnerTeams.map(team => team.name)
      });
    } catch (error) {
      console.error('Error checking team ownership:', error);
      setCanDeleteAccount(false);
    }
  };

  const applyTheme = (isDark) => {
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleThemeToggle = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    applyTheme(newDarkMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await authService.updateProfile(formData);
      const updatedUser = { ...user, ...formData };
      onUserUpdate(updatedUser);
      authService.setStoredUser(updatedUser);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount) {
      setMessage('Cannot delete account while you are the sole owner of teams. Please transfer ownership or delete the teams first.');
      return;
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will remove all your data.'
    );

    if (!confirmDelete) return;

    const finalConfirm = window.confirm(
      'This is your final warning. Deleting your account will permanently remove all your data, comments, work logs, and team memberships. Type "DELETE" to confirm.'
    );

    if (!finalConfirm) return;

    setDeleteLoading(true);
    setMessage('');

    try {
      await authService.deleteAccount();
      setMessage('Account deleted successfully. You will be logged out shortly.');
      
      // Log out and redirect after a brief delay
      setTimeout(() => {
        authService.logout();
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>User Settings</h2>
        <p>Manage your profile and preferences</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>Account Information</h3>
          <div className="account-info">
            <div className="info-item">
              <strong>User ID:</strong> 
              <span className="user-id">{user.id}</span>
            </div>
            <div className="info-item">
              <strong>Email Address:</strong> 
              <span className="user-email">{user.email}</span>
            </div>
            <div className="info-item">
              <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Profile Information</h3>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="theme-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={handleThemeToggle}
              />
              <span className="slider round"></span>
            </label>
            <span className="theme-label">
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>

        <BackupView user={user} />

        <div className="settings-section danger-zone">
          <h3>Danger Zone</h3>
          <div className="danger-content">
            <h4>Delete Account</h4>
            <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
            
            {teamOwnershipCheck && teamOwnershipCheck.soleOwnerTeams > 0 && (
              <div className="warning-message">
                <strong>⚠️ Cannot delete account:</strong> You are the sole owner of {teamOwnershipCheck.soleOwnerTeams} team(s): 
                {teamOwnershipCheck.soleOwnerTeamNames.join(', ')}. 
                Please transfer ownership or delete these teams first.
              </div>
            )}
            
            {teamOwnershipCheck && teamOwnershipCheck.ownedTeams > 0 && teamOwnershipCheck.soleOwnerTeams === 0 && (
              <div className="info-message">
                <strong>ℹ️ Note:</strong> You own {teamOwnershipCheck.ownedTeams} team(s) but are not the sole owner, 
                so account deletion is allowed.
              </div>
            )}

            <button 
              onClick={handleDeleteAccount}
              disabled={!canDeleteAccount || deleteLoading}
              className="btn btn-danger"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Account Information</h3>
          <div className="account-info">
            <div className="info-item">
              <strong>User ID:</strong> {user.id}
            </div>
            <div className="info-item">
              <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;