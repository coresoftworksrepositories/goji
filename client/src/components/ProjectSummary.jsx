import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';
import { authService } from '../services/auth';

const ProjectSummary = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, storiesData, ticketsData, sprintsData] = await Promise.all([
        authService.getProject(projectId),
        authService.getProjectStories(projectId),
        authService.getProjectTickets(projectId),
        authService.getProjectSprints(projectId)
      ]);
      
      setProject(projectData);
      setStories(storiesData);
      setTickets(ticketsData);
      setSprints(sprintsData);
      
      // Find active sprint
      const active = sprintsData.find(sprint => sprint.status === 'ACTIVE');
      setActiveSprint(active);
    } catch (error) {
      setError('Failed to load project data');
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Data processing functions
  const getStatusDistribution = (items, type = 'stories') => {
    const statusCounts = {};
    items.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const statusColors = type === 'stories' 
      ? { BACKLOG: '#6c757d', IN_PROGRESS: '#007bff', IN_REVIEW: '#ffc107', DONE: '#28a745' }
      : { OPEN: '#6c757d', IN_PROGRESS: '#007bff', IN_REVIEW: '#ffc107', RESOLVED: '#28a745', CLOSED: '#17a2b8' };
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      color: statusColors[status] || '#6c757d'
    }));
  };

  const getPriorityDistribution = (items) => {
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    items.forEach(item => {
      priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    });
    
    const priorityColors = { LOW: '#28a745', MEDIUM: '#ffc107', HIGH: '#fd7e14', CRITICAL: '#dc3545' };
    
    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority,
      value: count,
      color: priorityColors[priority]
    }));
  };

  const getSprintProgress = () => {
    return sprints.map(sprint => {
      const sprintStories = stories.filter(story => story.sprintId === sprint.id);
      const sprintTickets = tickets.filter(ticket => ticket.sprintId === sprint.id);
      
      const completedStories = sprintStories.filter(s => s.status === 'DONE').length;
      const completedTickets = sprintTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
      
      return {
        name: sprint.name,
        stories: sprintStories.length,
        tickets: sprintTickets.length,
        completedStories,
        completedTickets,
        storyProgress: sprintStories.length > 0 ? (completedStories / sprintStories.length) * 100 : 0,
        ticketProgress: sprintTickets.length > 0 ? (completedTickets / sprintTickets.length) * 100 : 0
      };
    });
  };

  const getWorkloadByUser = () => {
    const userWorkload = {};
    
    [...stories, ...tickets].forEach(item => {
      if (item.assignee) {
        const userId = item.assignee.id;
        const userName = item.assignee.username;
        
        if (!userWorkload[userId]) {
          userWorkload[userId] = {
            name: userName,
            stories: 0,
            tickets: 0,
            storyPoints: 0
          };
        }
        
        if (item.points) {
          userWorkload[userId].storyPoints += item.points;
          userWorkload[userId].stories += 1;
        } else {
          userWorkload[userId].tickets += 1;
        }
      }
    });
    
    return Object.values(userWorkload);
  };

  const getTicketTypeDistribution = () => {
    const typeCounts = { TASK: 0, BUG: 0, FEATURE: 0, IMPROVEMENT: 0 };
    tickets.forEach(ticket => {
      typeCounts[ticket.type] = (typeCounts[ticket.type] || 0) + 1;
    });
    
    const typeColors = { TASK: '#007bff', BUG: '#dc3545', FEATURE: '#28a745', IMPROVEMENT: '#ffc107' };
    
    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type,
      value: count,
      color: typeColors[type]
    }));
  };

  const getSprintBurndownData = () => {
    if (!activeSprint) return [];
    
    const sprintStories = stories.filter(story => story.sprintId === activeSprint.id);
    const sprintTickets = tickets.filter(ticket => ticket.sprintId === activeSprint.id);
    
    // Create a simple burndown chart based on creation vs completion dates
    const allItems = [...sprintStories, ...sprintTickets];
    const dateMap = {};
    
    allItems.forEach(item => {
      const createdDate = new Date(item.createdAt).toLocaleDateString();
      const isCompleted = (item.status === 'DONE' || ['RESOLVED', 'CLOSED'].includes(item.status));
      
      if (!dateMap[createdDate]) {
        dateMap[createdDate] = { date: createdDate, added: 0, completed: 0, remaining: 0 };
      }
      
      dateMap[createdDate].added += 1;
      if (isCompleted) {
        dateMap[createdDate].completed += 1;
      }
    });
    
    let runningTotal = 0;
    return Object.values(dateMap).map(day => {
      runningTotal += day.added - day.completed;
      return {
        ...day,
        remaining: Math.max(0, runningTotal)
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getSprintVelocityData = () => {
    return sprints
      .filter(sprint => sprint.status === 'COMPLETED')
      .map(sprint => {
        const sprintStories = stories.filter(story => story.sprintId === sprint.id && story.status === 'DONE');
        const velocity = sprintStories.reduce((sum, story) => sum + (story.points || 0), 0);
        
        return {
          sprintName: sprint.name,
          velocity,
          storiesCompleted: sprintStories.length
        };
      });
  };

  const getActiveSprintProgress = () => {
    if (!activeSprint) return null;
    
    const sprintStories = stories.filter(story => story.sprintId === activeSprint.id);
    const sprintTickets = tickets.filter(ticket => ticket.sprintId === activeSprint.id);
    
    const storyStatusCounts = {};
    const ticketStatusCounts = {};
    
    sprintStories.forEach(story => {
      storyStatusCounts[story.status] = (storyStatusCounts[story.status] || 0) + 1;
    });
    
    sprintTickets.forEach(ticket => {
      ticketStatusCounts[ticket.status] = (ticketStatusCounts[ticket.status] || 0) + 1;
    });
    
    return {
      stories: Object.entries(storyStatusCounts).map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: count,
        color: { BACKLOG: '#6c757d', IN_PROGRESS: '#007bff', IN_REVIEW: '#ffc107', DONE: '#28a745' }[status] || '#6c757d'
      })),
      tickets: Object.entries(ticketStatusCounts).map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: count,
        color: { OPEN: '#6c757d', IN_PROGRESS: '#007bff', IN_REVIEW: '#ffc107', RESOLVED: '#28a745', CLOSED: '#17a2b8' }[status] || '#6c757d'
      }))
    };
  };

  const getStoryPointsDistribution = () => {
    const pointsData = {};
    stories.forEach(story => {
      if (story.points) {
        pointsData[story.points] = (pointsData[story.points] || 0) + 1;
      }
    });
    
    return Object.entries(pointsData)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([points, count]) => ({
        points: parseInt(points),
        count
      }));
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return <div className="container"><h2>Loading project summary...</h2></div>;
  }

  if (error) {
    return <div className="container"><div className="error">{error}</div></div>;
  }

  const statusData = getStatusDistribution(stories);
  const ticketStatusData = getStatusDistribution(tickets, 'tickets');
  const priorityData = getPriorityDistribution([...stories, ...tickets]);
  const sprintData = getSprintProgress();
  const workloadData = getWorkloadByUser();
  const ticketTypeData = getTicketTypeDistribution();
  const storyPointsData = getStoryPointsDistribution();
  const burndownData = getSprintBurndownData();
  const velocityData = getSprintVelocityData();
  const activeSprintProgressData = getActiveSprintProgress();

  return (
    <div className="project-summary">
      <div className="summary-header">
        <h2>{project?.name} Summary</h2>
        {activeSprint && (
          <div className="active-sprint-badge">
            <span className="active-sprint-label">Active Sprint:</span>
            <span className="active-sprint-name">{activeSprint.name}</span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Stories</h3>
          <div className="metric-value">{stories.length}</div>
          <div className="metric-subtitle">
            {stories.filter(s => s.status === 'DONE').length} completed
          </div>
        </div>
        <div className="metric-card">
          <h3>Total Tickets</h3>
          <div className="metric-value">{tickets.length}</div>
          <div className="metric-subtitle">
            {tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length} resolved
          </div>
        </div>
        <div className="metric-card">
          <h3>Story Points</h3>
          <div className="metric-value">
            {stories.reduce((sum, story) => sum + (story.points || 0), 0)}
          </div>
          <div className="metric-subtitle">
            {stories.filter(s => s.status === 'DONE').reduce((sum, story) => sum + (story.points || 0), 0)} completed
          </div>
        </div>
        <div className="metric-card">
          <h3>Sprints</h3>
          <div className="metric-value">{sprints.length}</div>
          <div className="metric-subtitle">
            {sprints.filter(s => s.status === 'COMPLETED').length} completed
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Story Status Distribution */}
        <div className="chart-card">
          <h3>Story Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Status Distribution */}
        <div className="chart-card">
          <h3>Ticket Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ticketStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ticketStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="chart-card">
          <h3>Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Type Distribution */}
        <div className="chart-card">
          <h3>Ticket Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ticketTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ticketTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sprint Progress */}
        {sprintData.length > 0 && (
          <div className="chart-card wide">
            <h3>Sprint Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sprintData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stories" fill="#8884d8" name="Total Stories" />
                <Bar dataKey="completedStories" fill="#82ca9d" name="Completed Stories" />
                <Bar dataKey="tickets" fill="#ffc658" name="Total Tickets" />
                <Bar dataKey="completedTickets" fill="#ff7300" name="Completed Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Workload by User */}
        {workloadData.length > 0 && (
          <div className="chart-card wide">
            <h3>Workload by Team Member</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stories" fill="#8884d8" name="Stories" />
                <Bar dataKey="tickets" fill="#82ca9d" name="Tickets" />
                <Bar dataKey="storyPoints" fill="#ffc658" name="Story Points" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Story Points Distribution */}
        {storyPointsData.length > 0 && (
          <div className="chart-card">
            <h3>Story Points Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storyPointsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="points" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sprint Velocity Trend */}
        {velocityData.length > 0 && (
          <div className="chart-card wide">
            <h3>Sprint Velocity Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sprintName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="velocity" stroke="#8884d8" strokeWidth={3} name="Story Points" />
                <Line type="monotone" dataKey="storiesCompleted" stroke="#82ca9d" strokeWidth={2} name="Stories Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active Sprint Burndown */}
        {activeSprint && burndownData.length > 0 && (
          <div className="chart-card wide">
            <h3>Active Sprint Burndown Chart</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="remaining" stackId="1" stroke="#dc3545" fill="#dc3545" fillOpacity={0.6} name="Remaining Work" />
                <Area type="monotone" dataKey="completed" stackId="2" stroke="#28a745" fill="#28a745" fillOpacity={0.6} name="Completed Work" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active Sprint Progress Detail */}
        {activeSprint && activeSprintProgressData && (
          <>
            <div className="chart-card">
              <h3>Active Sprint - Story Progress</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activeSprintProgressData.stories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {activeSprintProgressData.stories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Active Sprint - Ticket Progress</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activeSprintProgressData.tickets}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {activeSprintProgressData.tickets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Active Sprint Details */}
      {activeSprint && (
        <div className="active-sprint-section">
          <h3>Active Sprint: {activeSprint.name}</h3>
          <div className="sprint-details">
            <div className="sprint-info">
              <p><strong>Goal:</strong> {activeSprint.goal || 'No goal set'}</p>
              <p><strong>Start Date:</strong> {activeSprint.startDate ? new Date(activeSprint.startDate).toLocaleDateString() : 'Not set'}</p>
              <p><strong>End Date:</strong> {activeSprint.endDate ? new Date(activeSprint.endDate).toLocaleDateString() : 'Not set'}</p>
            </div>
            <div className="sprint-progress">
              <div className="progress-item">
                <span>Stories Progress:</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${sprintData.find(s => s.name === activeSprint.name)?.storyProgress || 0}%`,
                      backgroundColor: '#28a745'
                    }}
                  />
                </div>
                <span>{Math.round(sprintData.find(s => s.name === activeSprint.name)?.storyProgress || 0)}%</span>
              </div>
              <div className="progress-item">
                <span>Tickets Progress:</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${sprintData.find(s => s.name === activeSprint.name)?.ticketProgress || 0}%`,
                      backgroundColor: '#007bff'
                    }}
                  />
                </div>
                <span>{Math.round(sprintData.find(s => s.name === activeSprint.name)?.ticketProgress || 0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSummary;