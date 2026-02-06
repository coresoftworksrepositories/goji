
import React, { useEffect } from 'react';
import { authService } from '../services/auth';

export default function CreateTicketModal({
    projectId,
    storyId,
    setShowCreateModal,
    createForm,
    setCreateForm,
    createLoading,
    setCreateLoading,
    createError,
    setCreateError,
    loadStoryData,
    projectMembers = [],
    project
}) {

    // Set default assignee when modal opens if configured and assignee is a project member
    useEffect(() => {
        if (project?.defaultAssigneeId && !createForm.assigneeId) {
            const defaultAssignee = projectMembers.find(m => m.id === project.defaultAssigneeId);
            if (defaultAssignee) {
                setCreateForm(prev => ({ ...prev, assigneeId: project.defaultAssigneeId }));
            }
        }
    }, [project, projectMembers]);

    const onClose = () => {
        setShowCreateModal(false);
    }
    return (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
 <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                    <h2>Create Ticket</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                        setCreateLoading(true);
                        setCreateError(null);
                        await authService.createTicket(
                            projectId,
                            createForm.title,
                            createForm.description,
                            createForm.type,
                            createForm.priority,
                            storyId,
                            createForm.assigneeId || null
                        );
                        setShowCreateModal(false);
                        setCreateForm({ title: '', description: '', type: 'TASK', priority: 'MEDIUM', assigneeId: '' });
                        loadStoryData();
                    } catch (err) {
                        console.error('Error creating ticket:', err);
                        setCreateError(err.message || 'Failed to create ticket');
                    } finally {
                        setCreateLoading(false);
                    }
                }}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                required
                                className="form-control"
                                value={createForm.title}
                                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                className="form-control"
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1, marginRight: '8px' }}>
                                <label>Type</label>
                                <select
                                    className="form-control"
                                    value={createForm.type}
                                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                                >
                                    <option value="TASK">Task</option>
                                    <option value="BUG">Bug</option>
                                    <option value="STORY">Story</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ width: '140px' }}>
                                <label>Priority</label>
                                <select
                                    className="form-control"
                                    value={createForm.priority}
                                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                                >
                                    <option value="CRITICAL">Critical</option>
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Assignee</label>
                            <select
                                className="form-control"
                                value={createForm.assigneeId}
                                onChange={(e) => setCreateForm({ ...createForm, assigneeId: e.target.value })}
                            >
                                <option value="">Unassigned</option>
                                {projectMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.username}</option>
                                ))}
                            </select>
                        </div>
                        {createError && (
                            <div className="error-section">
                                <p className="error-message">{createError}</p>
                                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Close</button>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={createLoading}>{createLoading ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}