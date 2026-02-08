import React from 'react';
import { authService } from '../services/auth';
import TextArea from './TextArea';

export default function CreateStoryModal({
    projectId,
    setShowCreateModal,
    createForm,
    setCreateForm,
    createLoading,
    setCreateLoading,
    createError,
    setCreateError,
    loadStoryData,
    sprints = []
}) {
    const handleSubmit = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError(null);

        try {
            await authService.createStory(
                projectId,
                createForm.title,
                createForm.description,
                createForm.priority,
                createForm.points ? parseInt(createForm.points) : null,
                null, // assigneeId
                createForm.sprintId || null
            );
            setShowCreateModal(false);
            setCreateForm({
                title: '',
                description: '',
                priority: 'MEDIUM',
                points: '',
                sprintId: ''
            });
            if (loadStoryData) {
                await loadStoryData();
            }
        } catch (error) {
            setCreateError(error.response?.data?.error || 'Failed to create story');
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Create New Story</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Story Title"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        required
                    />
                    <TextArea
                        value={createForm.description}
                        onChange={(value) => setCreateForm({ ...createForm, description: value })}
                        placeholder="Story Description"
                        showToolbar={true}
                        minHeight="120px"
                        maxHeight="300px"
                    />
                    <div className="form-row">
                        <select
                            value={createForm.priority}
                            onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                        >
                            <option value="LOW">Low Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="HIGH">High Priority</option>
                            <option value="CRITICAL">Critical Priority</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Story Points"
                            value={createForm.points}
                            onChange={(e) => setCreateForm({ ...createForm, points: e.target.value })}
                            min="1"
                            max="21"
                        />
                    </div>
                    <select
                        value={createForm.sprintId}
                        onChange={(e) => setCreateForm({ ...createForm, sprintId: e.target.value })}
                    >
                        <option value="">No Sprint (Backlog)</option>
                        {sprints.filter(sprint => sprint.status !== 'COMPLETED').map((sprint) => (
                            <option key={sprint.id} value={sprint.id}>
                                {sprint.name} ({sprint.status})
                            </option>
                        ))}
                    </select>
                    {createError && <div className="error">{createError}</div>}
                    <div className="modal-buttons">
                        <button type="submit" disabled={createLoading}>
                            {createLoading ? 'Creating...' : 'Create Story'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setShowCreateModal(false)}
                            disabled={createLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
