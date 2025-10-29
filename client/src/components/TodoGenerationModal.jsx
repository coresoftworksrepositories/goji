import React, { useState } from 'react';

const TodoGenerationModal = ({ 
  isOpen, 
  onClose, 
  todos, 
  onCreateTickets, 
  loading,
  error 
}) => {
  const [selectedTodos, setSelectedTodos] = useState({});

  const handleTodoToggle = (index) => {
    setSelectedTodos(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = todos.every((_, index) => selectedTodos[index]);
    const newSelection = {};
    todos.forEach((_, index) => {
      newSelection[index] = !allSelected;
    });
    setSelectedTodos(newSelection);
  };

  const handleCreateTickets = () => {
    const selectedItems = todos.filter((_, index) => selectedTodos[index]);
    onCreateTickets(selectedItems);
  };

  const selectedCount = Object.values(selectedTodos).filter(Boolean).length;

  if (!isOpen) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return '#dc3545';
      case 'HIGH': return '#fd7e14';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generated Todo Items</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Generating todo items using AI...</p>
            </div>
          )}

          {error && (
            <div className="error-section">
              <p className="error-message">{error}</p>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          )}

          {!loading && !error && todos && todos.length > 0 && (
            <>
              <div className="todos-header">
                <p>Select the todo items you'd like to convert into tickets:</p>
                <div className="selection-controls">
                  <button 
                    className="btn btn-link"
                    onClick={handleSelectAll}
                  >
                    {selectedCount === todos.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="selection-count">
                    {selectedCount} of {todos.length} selected
                  </span>
                </div>
              </div>

              <div className="todos-list">
                {todos.map((todo, index) => (
                  <div 
                    key={index} 
                    className={`todo-item ${selectedTodos[index] ? 'selected' : ''}`}
                  >
                    <div className="todo-checkbox">
                      <input
                        type="checkbox"
                        id={`todo-${index}`}
                        checked={selectedTodos[index] || false}
                        onChange={() => handleTodoToggle(index)}
                      />
                    </div>
                    <div className="todo-content">
                      <div className="todo-header">
                        <h4 className="todo-title">{todo.title}</h4>
                        <div className="todo-meta">
                          <span className="todo-type">{todo.type}</span>
                          <div 
                            className="priority-indicator"
                            style={{ backgroundColor: getPriorityColor(todo.priority) }}
                          ></div>
                          <span className="priority-text">{todo.priority}</span>
                          <span className="estimated-hours">{todo.estimatedHours}h</span>
                        </div>
                      </div>
                      <p className="todo-description">{todo.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !error && todos && todos.length === 0 && (
            <div className="empty-state">
              <p>No todo items were generated. Please try again.</p>
            </div>
          )}
        </div>

        {!loading && !error && todos && todos.length > 0 && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleCreateTickets}
              disabled={selectedCount === 0}
            >
              Create {selectedCount} Ticket{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoGenerationModal;