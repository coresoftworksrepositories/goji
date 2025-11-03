import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { PersonIcon, BackpackIcon, FileTextIcon } from '@radix-ui/react-icons';

const Sidebar = ({ isOpen, onToggle }) => {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
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
    navigate(`/teams/${teamId}/projects`);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleTeamsClick = () => {
    navigate('/teams');
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
               v.{import.meta.env.VITE_VERSION_NUMBER || '0.1.1'}
              </div>
            </div>

        </div>
      </div>
    </>
  );
};

export default Sidebar;