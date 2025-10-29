import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';

const Dashboard = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await authService.getUsers();
      setUsers(usersData);
    } catch (error) {
      setError('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <div>
      

      <div className="container">
        <h3>Your Profile</h3>
        <div className="user-item">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>

        <h3>All Users</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="user-list">
            {users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="user-item">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                  <p><strong>Last updated:</strong> {new Date(user.updatedAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;