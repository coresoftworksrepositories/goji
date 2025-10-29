import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import Header from './Header';
import Sidebar from './Sidebar';

const MainDashboard = ({ user, onLogout }) => {
  const [invitationCount, setInvitationCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadInvitationCount();
  }, []);

  const loadInvitationCount = async () => {
    try {
      const [teamInvites, projectInvites] = await Promise.all([
        authService.getTeamInvitations(),
        authService.getProjectInvitations()
      ]);
      setInvitationCount(teamInvites.length + projectInvites.length);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', JSON.stringify(newState));
  };

  const isActive = (path) => {
    if (path === '/teams') {
      return location.pathname === '/teams' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  document.title = "Goji - Dashboard";

  return (
    <div>
   <Header
          user={user}
          invitationCount={invitationCount}
          onLogout={handleLogout}
          isActive={isActive}
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
      <div className='page-items'>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="dashboard-content">
          <Outlet context={{ user, loadInvitationCount }} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default MainDashboard;