import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { ClipboardIcon } from '@radix-ui/react-icons';

const TicketView = () => {
  const { teamId, projectId, ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [comments, setComments] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [timeToLog, setTimeToLog] = useState('');
  const [loggingTime, setLoggingTime] = useState(false);
  const [tabPage, setTabPage] = useState('comments');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [newWorkLog, setNewWorkLog] = useState({ hours: '', description: '' });
  const [addingWorkLog, setAddingWorkLog] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState(null);
  const [editWorkLogForm, setEditWorkLogForm] = useState({ hours: '', description: '' });
  const [updatingWorkLog, setUpdatingWorkLog] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const commentTextareaRef = React.useRef(null);

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  const loadTicketData = async () => {
    try {
      setLoading(true);
      const [ticketData, membersData, storiesData, sprintsData, commentsData, workLogsData] = await Promise.all([
        authService.getTicket(ticketId),
        authService.getProjectMembers(projectId),
        authService.getProjectStories(projectId),
        authService.getProjectSprints(projectId),
        authService.getTicketComments(ticketId),
        authService.getTicketWorkLogs(ticketId)
      ]);
      
      setTicket(ticketData);
      setProjectMembers(membersData);
      setStories(storiesData);
      setSprints(sprintsData);
      setComments(commentsData);
      setWorkLogs(workLogsData);
      setEditForm({
        title: ticketData.title,
        description: ticketData.description || '',
        priority: ticketData.priority,
        type: ticketData.type,
        assigneeId: ticketData.assigneeId || '',
        storyId: ticketData.storyId || '',
        sprintId: ticketData.sprintId || '',
        startDate: ticketData.startDate ? ticketData.startDate.split('T')[0] : '',
        dueDate: ticketData.dueDate ? ticketData.dueDate.split('T')[0] : ''
      });
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await authService.updateTicket(ticketId, {
        ...editForm,
        assigneeId: editForm.assigneeId || null,
        storyId: editForm.storyId || null,
        sprintId: editForm.sprintId || null,
        startDate: editForm.startDate || null,
        dueDate: editForm.dueDate || null
      });
      setEditing(false);
      loadTicketData();
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await authService.updateTicketStatus(ticketId, newStatus);
      loadTicketData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!timeToLog || isNaN(timeToLog) || parseFloat(timeToLog) <= 0) {
      alert('Please enter a valid time amount');
      return;
    }

    try {
      setLoggingTime(true);
      await authService.logTimeOnTicket(ticketId, parseFloat(timeToLog));
      setTimeToLog('');
      loadTicketData();
    } catch (error) {
      console.error('Error logging time:', error);
      alert('Failed to log time. Please try again.');
    } finally {
      setLoggingTime(false);
    }
  };

  const handleDeleteTicket = async () => {
    try {
      setDeleting(true);
      await authService.deleteTicket(ticketId);
      navigate(`/teams/${teamId}/projects/${projectId}/work`);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket. Please try again.');
      setDeleting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setAddingComment(true);
      await authService.addTicketComment(ticketId, newComment);
      setNewComment('');
      setShowMentionDropdown(false);
      setMentionSearch('');
      // Reload comments
      const commentsData = await authService.getTicketComments(ticketId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space after @ (which would end the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartPos(lastAtIndex);
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowMentionDropdown(false);
    setMentionSearch('');
  };

  const handleCommentKeyDown = (e) => {
    if (!showMentionDropdown) return;

    const filteredMembers = projectMembers.filter(member =>
      member.username.toLowerCase().includes(mentionSearch)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev => 
        prev < filteredMembers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredMembers.length > 0) {
        e.preventDefault();
        selectMention(filteredMembers[selectedMentionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
      setMentionSearch('');
    }
  };

  const selectMention = (member) => {
    const beforeMention = newComment.substring(0, mentionStartPos);
    const afterMention = newComment.substring(commentTextareaRef.current.selectionStart);
    const newValue = `${beforeMention}@${member.username} ${afterMention}`;
    setNewComment(newValue);
    setShowMentionDropdown(false);
    setMentionSearch('');
    
    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPos = mentionStartPos + member.username.length + 2; // +2 for @ and space
      commentTextareaRef.current.selectionStart = newCursorPos;
      commentTextareaRef.current.selectionEnd = newCursorPos;
      commentTextareaRef.current.focus();
    }, 0);
  };

  const handleAddWorkLog = async (e) => {
    e.preventDefault();
    if (!newWorkLog.hours || !newWorkLog.description.trim()) {
      alert('Please enter both hours and description');
      return;
    }

    if (isNaN(newWorkLog.hours) || parseFloat(newWorkLog.hours) <= 0) {
      alert('Please enter a valid time amount');
      return;
    }

    try {
      setAddingWorkLog(true);
      await authService.addTicketWorkLog(ticketId, {
        hours: parseFloat(newWorkLog.hours),
        description: newWorkLog.description
      });
      setNewWorkLog({ hours: '', description: '' });
      // Reload work logs and ticket data to update total time
      const [workLogsData] = await Promise.all([
        authService.getTicketWorkLogs(ticketId)
      ]);
      setWorkLogs(workLogsData);
      loadTicketData(); // Reload to update total time logged
    } catch (error) {
      console.error('Error adding work log:', error);
      alert('Failed to add work log. Please try again.');
    } finally {
      setAddingWorkLog(false);
    }
  };

  const handleEditWorkLog = (workLog) => {
    setEditingWorkLog(workLog.id);
    setEditWorkLogForm({
      hours: workLog.hours.toString(),
      description: workLog.description
    });
  };

  const handleUpdateWorkLog = async (workLogId) => {
    if (!editWorkLogForm.hours || !editWorkLogForm.description.trim()) {
      alert('Please enter both hours and description');
      return;
    }

    if (isNaN(editWorkLogForm.hours) || parseFloat(editWorkLogForm.hours) <= 0) {
      alert('Please enter a valid time amount');
      return;
    }

    try {
      setUpdatingWorkLog(true);
      await authService.updateTicketWorkLog(workLogId, {
        hours: parseFloat(editWorkLogForm.hours),
        description: editWorkLogForm.description
      });
      setEditingWorkLog(null);
      setEditWorkLogForm({ hours: '', description: '' });
      // Reload work logs and ticket data to update total time
      const [workLogsData] = await Promise.all([
        authService.getTicketWorkLogs(ticketId)
      ]);
      setWorkLogs(workLogsData);
      loadTicketData(); // Reload to update total time logged
    } catch (error) {
      console.error('Error updating work log:', error);
      alert('Failed to update work log. Please try again.');
    } finally {
      setUpdatingWorkLog(false);
    }
  };

  const handleCancelEditWorkLog = () => {
    setEditingWorkLog(null);
    setEditWorkLogForm({ hours: '', description: '' });
  };

  const handleDeleteWorkLog = async (workLogId) => {
    if (!confirm('Are you sure you want to delete this work log entry?')) {
      return;
    }

    try {
      await authService.deleteTicketWorkLog(workLogId);
      // Reload work logs and ticket data to update total time
      const [workLogsData] = await Promise.all([
        authService.getTicketWorkLogs(ticketId)
      ]);
      setWorkLogs(workLogsData);
      loadTicketData(); // Reload to update total time logged
    } catch (error) {
      console.error('Error deleting work log:', error);
      alert('Failed to delete work log. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return '#dc3545';
      case 'HIGH': return '#fd7e14';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#6c757d';
      case 'IN_PROGRESS': return '#007bff';
      case 'IN_REVIEW': return '#ffc107';
      case 'RESOLVED': return '#28a745';
      case 'CLOSED': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BUG': return '🐛';
      case 'FEATURE': return '✨';
      case 'IMPROVEMENT': return '⚡';
      case 'TASK': return <ClipboardIcon />;
      default: return <ClipboardIcon />;
    }
  };

  if (loading) {
    return <div className="loading">Loading ticket...</div>;
  }

  if (!ticket) {
    return <div className="error">Ticket not found</div>;
  }

  const relatedTickets = (
    <>
      {ticket.story && (
        <div className="ticket-section">
          <h3>Parent Story</h3>
          <div
            className="story-link"
            onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/stories/${ticket.story.id}`)}
          >
            <span className="story-key">STORY-{ticket.story.id}</span>
            <span className="story-title">{ticket.story.title}</span>
          </div>
        </div>
      )}
    </>
  );

  const commentsTab = (
    <div className="comments-section">
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">No comments yet</div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{comment.author?.username || 'Unknown'}</span>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="comment-content">{comment.content}</div>
            </div>
          ))
        )}
      </div>
      
      <form onSubmit={handleAddComment} className="add-comment-form" style={{ position: 'relative' }}>
        <textarea
          ref={commentTextareaRef}
          value={newComment}
          onChange={handleCommentChange}
          onKeyDown={handleCommentKeyDown}
          placeholder="Add a comment... (Type @ to mention someone)"
          rows="3"
          className="form-control"
          disabled={addingComment}
        />
        {showMentionDropdown && (
          <div className="mention-dropdown">
            {projectMembers
              .filter(member => member.username.toLowerCase().includes(mentionSearch))
              .map((member, index) => (
                <div
                  key={member.id}
                  className={`mention-item ${index === selectedMentionIndex ? 'selected' : ''}`}
                  onClick={() => selectMention(member)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
                >
                  <span className="mention-username">@{member.username}</span>
                  {member.email && <span className="mention-email">{member.email}</span>}
                </div>
              ))}
            {projectMembers.filter(member => member.username.toLowerCase().includes(mentionSearch)).length === 0 && (
              <div className="mention-item mention-no-results">No users found</div>
            )}
          </div>
        )}
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={addingComment || !newComment.trim()}
        >
          {addingComment ? 'Adding...' : 'Add Comment'}
        </button>
      </form>
    </div>
  );

  const workLogTab = (
    <div className="work-log-section">
      <div className="work-log-list">
        {workLogs.length === 0 ? (
          <div className="no-work-logs">No work logged yet</div>
        ) : (
          workLogs.map(workLog => (
            <div key={workLog.id} className="work-log-item">
              {editingWorkLog === workLog.id ? (
                // Edit mode
                <div className="work-log-edit">
                  <div className="work-log-edit-header">
                    <span className="work-log-author">{workLog.author?.username || 'Unknown'}</span>
                    <span className="work-log-date">
                      {new Date(workLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="work-log-edit-inputs">
                    <div className="input-group">
                      <label>Hours</label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={editWorkLogForm.hours}
                        onChange={(e) => setEditWorkLogForm({...editWorkLogForm, hours: e.target.value})}
                        className="form-control"
                        disabled={updatingWorkLog}
                      />
                    </div>
                    <div className="input-group">
                      <label>Description</label>
                      <textarea
                        value={editWorkLogForm.description}
                        onChange={(e) => setEditWorkLogForm({...editWorkLogForm, description: e.target.value})}
                        rows="2"
                        className="form-control"
                        disabled={updatingWorkLog}
                      />
                    </div>
                  </div>
                  <div className="work-log-edit-actions">
                    <button 
                      onClick={() => handleUpdateWorkLog(workLog.id)}
                      className="btn btn-sm btn-primary"
                      disabled={updatingWorkLog || !editWorkLogForm.hours || !editWorkLogForm.description.trim()}
                    >
                      {updatingWorkLog ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEditWorkLog}
                      className="btn btn-sm btn-secondary"
                      disabled={updatingWorkLog}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="work-log-header">
                    <span className="work-log-author">{workLog.author?.username || 'Unknown'}</span>
                    <span className="work-log-hours">{workLog.hours}h</span>
                    <span className="work-log-date">
                      {new Date(workLog.createdAt).toLocaleString()}
                    </span>
                    <div className="work-log-actions">
                      <button
                        onClick={() => handleEditWorkLog(workLog)}
                        className="btn btn-xs btn-secondary"
                        title="Edit work log"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteWorkLog(workLog.id)}
                        className="btn btn-xs btn-danger"
                        title="Delete work log"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="work-log-description">{workLog.description}</div>
                </>
              )}
            </div>
          ))
        )}
      </div>
      
      <form onSubmit={handleAddWorkLog} className="add-work-log-form">
        <div className="work-log-inputs">
          <div className="input-group">
            <label>Hours</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={newWorkLog.hours}
              onChange={(e) => setNewWorkLog({...newWorkLog, hours: e.target.value})}
              className="form-control"
              disabled={addingWorkLog}
              placeholder="0.5"
            />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea
              value={newWorkLog.description}
              onChange={(e) => setNewWorkLog({...newWorkLog, description: e.target.value})}
              placeholder="Describe the work done..."
              rows="2"
              className="form-control"
              disabled={addingWorkLog}
            />
          </div>
        </div>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={addingWorkLog || !newWorkLog.hours || !newWorkLog.description.trim()}
        >
          {addingWorkLog ? 'Adding...' : 'Log Work'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="ticket-view-container">
      <div className="ticket-view-controls">
         <button 
          onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/work`)}
          className="btn btn-secondary"
        >
          ← Back to Work Board
        </button>
      </div>
      <div className="ticket-header">
       
        <div className="ticket-title-section">
          <div className="ticket-meta">
            <span className="ticket-key">TICKET-{ticket.id}</span>
            <span className="type-icon">{getTypeIcon(ticket.type)}</span>
            <span className="type-text">{ticket.type}</span>
            <div 
              className="priority-indicator"
              style={{ backgroundColor: getPriorityColor(ticket.priority) }}
            ></div>
            <span className="priority-text">{ticket.priority}</span>
          </div>
          {editing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              className="ticket-title-input"
            />
          ) : (
            <h1 className="ticket-title">{ticket.title}</h1>
          )}
        </div>
        <div className="ticket-actions">
          {editing ? (
            <>
              <button onClick={handleEdit} className="btn btn-primary">Save</button>
              <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn btn-primary">Edit</button>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="btn btn-danger"
                style={{ marginLeft: '0.5rem' }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ticket-content">
        <div className="ticket-main">
          <div className="ticket-section">
            <h3>Description</h3>
            {editing ? (
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows="6"
                className="form-control"
              />
            ) : (
              <div className="ticket-description">
                {ticket.description || 'No description provided'}
              </div>
            )}
          </div>

         <div className='ticket-tabs'>
          <div className='ticket-tab-container'>
            <div 
              className={`ticket-tab ${tabPage === 'comments' ? 'active' : ''}`}
              onClick={() => setTabPage('comments')}
            >
              Comments ({comments.length})
            </div>
            <div 
              className={`ticket-tab ${tabPage === 'worklog' ? 'active' : ''}`}
              onClick={() => setTabPage('worklog')}
            >
              Work Log ({workLogs.length})
            </div>
            <div 
              className={`ticket-tab ${tabPage === 'related' ? 'active' : ''}`}
              onClick={() => setTabPage('related')}
            >
              Related Tickets
            </div>
          </div>
          <div className='ticket-tab-page'>
            {tabPage === 'comments' && commentsTab}
            {tabPage === 'worklog' && workLogTab}
            {tabPage === 'related' && relatedTickets}
          </div>
         </div>
        </div>

        <div className="ticket-sidebar">
          <div className="ticket-details">
            <h3>Details</h3>
            
            <div className="detail-item">
              <label>Status</label>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={editing}
                className="form-control"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="detail-item">
              <label>Type</label>
              {editing ? (
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                  className="form-control"
                >
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE">Feature</option>
                  <option value="IMPROVEMENT">Improvement</option>
                </select>
              ) : (
                <div>{ticket.type}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Priority</label>
              {editing ? (
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                  className="form-control"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              ) : (
                <div>{ticket.priority}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Assignee</label>
              {editing ? (
                <select
                  value={editForm.assigneeId}
                  onChange={(e) => setEditForm({...editForm, assigneeId: e.target.value})}
                  className="form-control"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.username}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{ticket.assignee ? ticket.assignee.username : 'Unassigned'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Reporter</label>
              <div>{ticket.reporter ? ticket.reporter.username : 'Unknown'}</div>
            </div>

            <div className="detail-item">
              <label>Parent Story</label>
              {editing ? (
                <select
                  value={editForm.storyId}
                  onChange={(e) => setEditForm({...editForm, storyId: e.target.value})}
                  className="form-control"
                >
                  <option value="">No Story</option>
                  {stories.map(story => (
                    <option key={story.id} value={story.id}>
                      STORY-{story.id}: {story.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  {ticket.story ? (
                    <span 
                      className="story-link"
                      onClick={() => navigate(`/teams/${teamId}/projects/${projectId}/stories/${ticket.story.id}`)}
                    >
                      STORY-{ticket.story.id}: {ticket.story.title}
                    </span>
                  ) : (
                    'No Story'
                  )}
                </div>
              )}
            </div>

            <div className="detail-item">
              <label>Sprint</label>
              {editing ? (
                <select
                  value={editForm.sprintId}
                  onChange={(e) => setEditForm({...editForm, sprintId: e.target.value})}
                  className="form-control"
                >
                  <option value="">No Sprint</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{ticket.sprint ? ticket.sprint.name : 'No Sprint'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Start Date</label>
              {editing ? (
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                  className="form-control"
                />
              ) : (
                <div>{ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : 'Not set'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Due Date</label>
              {editing ? (
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                  className="form-control"
                />
              ) : (
                <div>{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'Not set'}</div>
              )}
            </div>

            <div className="detail-item">
              <label>Created</label>
              <div>{new Date(ticket.createdAt).toLocaleDateString()}</div>
            </div>

            <div className="detail-item">
              <label>Updated</label>
              <div>{new Date(ticket.updatedAt).toLocaleDateString()}</div>
            </div>

            <div className="detail-item">
              <label>Time Logged</label>
              <div className="time-logged-section">
                <div className="current-time">
                  {ticket.timeLogged || 0} hours
                </div>
                {!editing && (
                  <form onSubmit={handleLogTime} className="log-time-form">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        placeholder="Hours"
                        value={timeToLog}
                        onChange={(e) => setTimeToLog(e.target.value)}
                        className="form-control"
                        style={{ width: '80px', fontSize: '0.9rem' }}
                        disabled={loggingTime}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-sm btn-primary"
                        disabled={loggingTime || !timeToLog}
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      >
                        {loggingTime ? 'Adding...' : 'Log'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this ticket? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                onClick={handleDeleteTicket}
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketView;