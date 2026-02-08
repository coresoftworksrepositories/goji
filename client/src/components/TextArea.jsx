import React, { useRef, useState, useEffect } from 'react';
import '../styles/textarea.css';

export default function TextArea({ 
    value = '', 
    onChange, 
    placeholder = 'Start typing...', 
    disabled = false,
    showToolbar = true,
    minHeight = '200px',
    maxHeight = '600px',
    className = '',
    projectMembers = [],
    showMentions = false
}) {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionStartPos, setMentionStartPos] = useState(0);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerText !== value) {
            editorRef.current.innerText = value;
        }
    }, [value]);

    const handleInput = (e) => {
        const text = e.target.innerText;
        if (onChange) {
            onChange(text);
        }

        // Handle @ mentions if enabled
        if (showMentions && projectMembers.length > 0) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
                const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                
                if (lastAtIndex !== -1) {
                    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
                    if (!textAfterAt.includes(' ')) {
                        setShowMentionDropdown(true);
                        setMentionSearch(textAfterAt.toLowerCase());
                        setMentionStartPos(lastAtIndex);
                        setSelectedMentionIndex(0);
                        return;
                    }
                }
            }
            setShowMentionDropdown(false);
            setMentionSearch('');
        }
    };

    const handleKeyDown = (e) => {
        // Handle mentions dropdown navigation
        if (showMentionDropdown && showMentions) {
            const filteredMembers = projectMembers.filter(member =>
                member.username.toLowerCase().includes(mentionSearch)
            );

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex((prev) => 
                    prev < filteredMembers.length - 1 ? prev + 1 : prev
                );
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex((prev) => prev > 0 ? prev - 1 : 0);
                return;
            } else if (e.key === 'Enter' && filteredMembers.length > 0) {
                e.preventDefault();
                selectMention(filteredMembers[selectedMentionIndex]);
                return;
            } else if (e.key === 'Escape') {
                setShowMentionDropdown(false);
                setMentionSearch('');
                return;
            }
        }

        // Handle tab key
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }

        // Handle keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    formatText('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    formatText('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    formatText('underline');
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        document.execCommand('redo');
                    } else {
                        document.execCommand('undo');
                    }
                    break;
            }
        }
    };

    const selectMention = (member) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Get the text node and position
        const textNode = range.startContainer;
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        
        // Find the @ symbol before cursor
        const beforeCursor = text.substring(0, cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            // Replace from @ to cursor position with the mention
            const before = text.substring(0, lastAtIndex);
            const after = text.substring(cursorPos);
            const newText = `${before}@${member.username} ${after}`;
            
            textNode.textContent = newText;
            
            // Set cursor after the mention
            const newPos = lastAtIndex + member.username.length + 2;
            range.setStart(textNode, newPos);
            range.setEnd(textNode, newPos);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        setShowMentionDropdown(false);
        setMentionSearch('');
        
        if (onChange) {
            onChange(editor.innerText);
        }
    };

    const formatText = (command, value = null) => {
        if (disabled) return;
        
        editorRef.current.focus();
        document.execCommand(command, false, value);
        
        if (onChange) {
            onChange(editorRef.current.innerText);
        }
    };

    const insertList = (ordered = false) => {
        if (disabled) return;
        
        editorRef.current.focus();
        document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
        
        if (onChange) {
            onChange(editorRef.current.innerText);
        }
    };

    const setAlignment = (align) => {
        if (disabled) return;
        
        editorRef.current.focus();
        const alignCommands = {
            left: 'justifyLeft',
            center: 'justifyCenter',
            right: 'justifyRight',
            justify: 'justifyFull'
        };
        document.execCommand(alignCommands[align], false, null);
        
        if (onChange) {
            onChange(editorRef.current.innerText);
        }
    };

    const changeFontSize = (size) => {
        if (disabled) return;
        
        editorRef.current.focus();
        document.execCommand('fontSize', false, size);
        
        if (onChange) {
            onChange(editorRef.current.innerText);
        }
    };

    const clearFormatting = () => {
        if (disabled) return;
        
        editorRef.current.focus();
        document.execCommand('removeFormat');
        
        if (onChange) {
            onChange(editorRef.current.innerText);
        }
    };

    return (
        <div className={`textarea-wrapper ${isFocused ? 'focused' : ''} ${className}`}>
            {showToolbar && (
                <div className="textarea-toolbar">
                    <div className="toolbar-group">
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => formatText('bold')}
                            disabled={disabled}
                            title="Bold (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => formatText('italic')}
                            disabled={disabled}
                            title="Italic (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => formatText('underline')}
                            disabled={disabled}
                            title="Underline (Ctrl+U)"
                        >
                            <u>U</u>
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => formatText('strikeThrough')}
                            disabled={disabled}
                            title="Strikethrough"
                        >
                            <s>S</s>
                        </button>
                    </div>

                    <div className="toolbar-divider"></div>

                    <div className="toolbar-group">
                        <select
                            className="toolbar-select"
                            onChange={(e) => changeFontSize(e.target.value)}
                            disabled={disabled}
                            defaultValue="3"
                            title="Font Size"
                        >
                            <option value="1">Small</option>
                            <option value="3">Normal</option>
                            <option value="5">Large</option>
                            <option value="7">Huge</option>
                        </select>
                    </div>

                    <div className="toolbar-divider"></div>

                    <div className="toolbar-group">
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => setAlignment('left')}
                            disabled={disabled}
                            title="Align Left"
                        >
                            ≡
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => setAlignment('center')}
                            disabled={disabled}
                            title="Align Center"
                        >
                            ☰
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => setAlignment('right')}
                            disabled={disabled}
                            title="Align Right"
                        >
                            ≣
                        </button>
                    </div>

                    <div className="toolbar-divider"></div>

                    <div className="toolbar-group">
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => insertList(false)}
                            disabled={disabled}
                            title="Bullet List"
                        >
                            • List
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => insertList(true)}
                            disabled={disabled}
                            title="Numbered List"
                        >
                            1. List
                        </button>
                    </div>

                    <div className="toolbar-divider"></div>

                    <div className="toolbar-group">
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => document.execCommand('undo')}
                            disabled={disabled}
                            title="Undo (Ctrl+Z)"
                        >
                            ↶
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => document.execCommand('redo')}
                            disabled={disabled}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            ↷
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={clearFormatting}
                            disabled={disabled}
                            title="Clear Formatting"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="textarea-editor-container" style={{ position: 'relative' }}>
                <div
                    ref={editorRef}
                    className={`textarea-editor ${disabled ? 'disabled' : ''}`}
                    contentEditable={!disabled}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        setTimeout(() => setShowMentionDropdown(false), 200);
                    }}
                    style={{ 
                        minHeight, 
                        maxHeight,
                        overflowY: 'auto'
                    }}
                    data-placeholder={placeholder}
                    suppressContentEditableWarning
                />

                {showMentionDropdown && showMentions && (
                    <div className="mention-dropdown">
                        {projectMembers
                            .filter(member => member.username.toLowerCase().includes(mentionSearch))
                            .map((member, index) => (
                                <div
                                    key={member.id}
                                    className={`mention-item ${index === selectedMentionIndex ? 'selected' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectMention(member);
                                    }}
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
            </div>
        </div>
    );
}
