import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { PersonIcon, BackpackIcon, FileTextIcon } from '@radix-ui/react-icons';

const Sidebar = ({ isOpen, onToggle }) => {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, item: null });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadTeams();
    loadProjects();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await authService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const projectsData = await authService.getUserProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleTeamClick = (teamId) => {
    window.location.href = `/teams/${teamId}/projects`;
  };

  const handleProjectClick = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    const teamId = proj?.team?.id;
    if (teamId) window.location.href = `/teams/${teamId}/projects/${projectId}/work`;
    else window.location.href = `/projects/${projectId}`;
  };

  const handleTeamsClick = () => {
    window.location.href = '/teams';
  };

  // Context menu handlers
  useEffect(() => {
    const handleDocClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const handleTeamContextMenu = (e, team) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'team', item: team });
  };

  const handleProjectContextMenu = (e, project) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'project', item: project });
  };

  const openContextItem = (newTab = false) => {
    const { type, item } = contextMenu;
    if (!item) return;
    let path;
    if (type === 'team') path = `/teams/${item.id}/projects`;
    else {
      const teamId = item?.team?.id || projects.find(p => p.id === item.id)?.team?.id;
      if (teamId) path = `/teams/${teamId}/projects/${item.id}/work`;
      else path = `/projects/${item.id}`;
    }
    const url = window.location.origin + path;
    if (newTab) window.open(url, '_blank');
    else window.location.href = url;
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const copyContextLink = async () => {
    const { type, item } = contextMenu;
    if (!item) return;
    let path;
    if (type === 'team') path = `/teams/${item.id}/projects`;
    else {
      const teamId = item?.team?.id || projects.find(p => p.id === item.id)?.team?.id;
      if (teamId) path = `/teams/${teamId}/projects/${item.id}/work`;
      else path = `/projects/${item.id}`;
    }
    const url = window.location.origin + path;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error('Clipboard write failed', err);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const isActiveTeam = (teamId) => {
    return location.pathname.includes(`/teams/${teamId}`);
  };

  const isActiveProject = (projectId) => {
    return location.pathname.includes(`/projects/${projectId}`);
  };

  const isTeamsActive = () => {
    return location.pathname === '/teams' || location.pathname === '/';
  };



  return (
    <>
      {/* Sidebar Overlay for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle}></div>
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <div className="nav-section">
              <button 
                className={`nav-item ${isTeamsActive() ? 'active' : ''}`}
                onClick={handleTeamsClick}
                title={isOpen ? "Teams" : "Teams"}
              >
                <span className="nav-icon">
                    <PersonIcon />
                </span>
                {isOpen && <span className="nav-text">Teams</span>}
              </button>
            </div>

            {teams.length > 0 && isOpen && (
              <div className="nav-section">
                <div className="nav-section-title">Your Teams</div>
                <div className="team-list">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      className={`nav-item team-item ${isActiveTeam(team.id) ? 'active' : ''}`}
                      onClick={() => handleTeamClick(team.id)}
                      onContextMenu={(e) => handleTeamContextMenu(e, team)}
                      title={team.description || team.name}
                    >
                      <span className="nav-icon">
                        <BackpackIcon />
                      </span>
                      <span className="nav-text">{team.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {projects.length > 0 && isOpen && (
              <div className="nav-section">
                <div className="nav-section-title">Your Projects</div>
                <div className="project-list">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      className={`nav-item project-item ${isActiveProject(project.id) ? 'active' : ''}`}
                      onClick={() => handleProjectClick(project.id)}
                      onContextMenu={(e) => handleProjectContextMenu(e, project)}
                      title={`${project.name} - ${project.team.name}`}
                    >
                      <span className="nav-icon">
                        <FileTextIcon />
                      </span>
                      <span className="nav-text">
                        <div className="project-name">{project.name}</div>
                        <div className="project-team">{project.team.name}</div>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && isOpen && (
              <div className="nav-section">
                <div className="loading-teams">Loading teams...</div>
              </div>
            )}

            {projectsLoading && isOpen && (
              <div className="nav-section">
                <div className="loading-projects">Loading projects...</div>
              </div>
            )}
            
          </nav>
          <div className='nav-section-bottom'>
            <div className='nav-section-bottom-item'>
                <div className='core-logo' onClick={() => {
                  window.open('https://www.coresoftworks.com', '_blank');

                }}></div>
              </div>
              <div className='nav-section-bottom-item'>
  v.{__APP_VERSION__}
              </div>
            </div>

        </div>
      </div>
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item" onClick={() => openContextItem(false)}>Open</button>
          <button className="context-menu-item" onClick={() => openContextItem(true)}>Open in new tab</button>
          <button className="context-menu-item" onClick={() => copyContextLink()}>Copy link</button>
        </div>
      )}
    </>
  );
};

export default Sidebar;