import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import MainDashboard from './components/MainDashboard';
import TeamsView from './components/TeamsView';
import TeamSettings from './components/TeamSettings';
import ProjectsView from './components/ProjectsView';
import WorkBoard from './components/WorkBoard';
import InvitationsView from './components/InvitationsView';
import ProjectSettings from './components/ProjectSettings';
import UserSettings from './components/UserSettings';
import StoryView from './components/StoryView';
import TicketView from './components/TicketView';
import SprintsView from './components/SprintsView';
import SprintDetailView from './components/SprintDetailView';
import { authService } from './services/auth';

function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = authService.getStoredUser();
    if (storedUser && authService.isAuthenticated()) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  if (loading) {
    return (
      <div className="container">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        {isLogin ? (
          <LoginForm onLogin={handleLogin} onToggleForm={toggleForm} />
        ) : (
          <RegisterForm onRegister={handleRegister} onToggleForm={toggleForm} />
        )}
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainDashboard user={user} onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/teams" replace />} />
          <Route path="teams" element={<TeamsView />} />
          <Route path="teams/:teamId/settings" element={<TeamSettings />} />
          <Route path="teams/:teamId/projects" element={<ProjectsView />} />
          <Route path="teams/:teamId/projects/:projectId/work" element={<WorkBoard />} />
          <Route path="teams/:teamId/projects/:projectId/sprints" element={<SprintsView />} />
          <Route path="teams/:teamId/projects/:projectId/sprints/:sprintId" element={<SprintDetailView />} />
          <Route path="teams/:teamId/projects/:projectId/settings" element={<ProjectSettings />} />
          <Route path="teams/:teamId/projects/:projectId/stories/:storyId" element={<StoryView />} />
          <Route path="teams/:teamId/projects/:projectId/tickets/:ticketId" element={<TicketView />} />
          <Route path="invitations" element={<InvitationsView />} />
          <Route path="settings" element={<UserSettings user={user} onUserUpdate={setUser} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;