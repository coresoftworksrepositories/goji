import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const SearchDropdown = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults(null);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async () => {
    if (query.trim().length < 2) return;

    try {
      setLoading(true);
      const searchResults = await authService.globalSearch(query.trim());
      setResults(searchResults);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults({ results: { teams: [], projects: [], stories: [], tickets: [] }, totalResults: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result) => {
    navigate(result.url);
    setQuery('');
    setResults(null);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (results && results.totalResults > 0) {
      setIsOpen(true);
    }
  };

  const renderResultItem = (item, index) => {
    const getTypeIcon = (type) => {
      switch (type) {
        case 'team': return '👥';
        case 'project': return '📁';
        case 'story': return '📋';
        case 'ticket': return '🎫';
        default: return '📄';
      }
    };

    const getTypeColor = (type) => {
      switch (type) {
        case 'team': return '#28a745';
        case 'project': return '#007bff';
        case 'story': return '#ffc107';
        case 'ticket': return '#dc3545';
        default: return '#6c757d';
      }
    };

    return (
      <div
        key={`${item.type}-${item.id}-${index}`}
        className="search-result-item"
        onClick={() => handleResultClick(item)}
        style={{
          padding: '0.75rem',
          borderBottom: '1px solid #eee',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
      >
        <span style={{ fontSize: '1.2rem' }}>{getTypeIcon(item.type)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: '#333',
            marginBottom: '0.25rem'
          }}>
            {item.name || item.title}
          </div>
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span 
              style={{ 
                background: getTypeColor(item.type),
                color: 'white',
                padding: '0.1rem 0.4rem',
                borderRadius: '0.2rem',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}
            >
              {item.type}
            </span>
            {item.team && <span>in {item.team.name}</span>}
            {item.project && !item.team && <span>in {item.project.name}</span>}
            {item.story && <span>in {item.story.title}</span>}
          </div>
          {item.description && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#888',
              marginTop: '0.25rem',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {item.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="search-container" ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <input
        type="text"
        placeholder="Search teams, projects, stories, tickets..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => {
          e.target.style.borderColor = '#007bff';
          handleInputFocus();
        }}
        onBlur={(e) => e.target.style.borderColor = '#ddd'}
        style={{
          width: '100%',
          padding: '0.5rem 1rem',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />

      {loading && (
        <div style={{
          position: 'absolute',
          right: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.8rem',
          color: '#666'
        }}>
          Searching...
        </div>
      )}

      {isOpen && results && (
        <div
          ref={dropdownRef}
          className="search-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '400px',
            overflowY: 'auto',
            marginTop: '0.25rem'
          }}
        >
          {results.totalResults === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              No results found for "{query}"
            </div>
          ) : (
            <>
              {results.results.teams.length > 0 && (
                <div>
                  <div style={{ 
                    padding: '0.5rem 0.75rem', 
                    backgroundColor: '#f8f9fa', 
                    fontWeight: 'bold', 
                    fontSize: '0.85rem',
                    color: '#666',
                    borderBottom: '1px solid #eee'
                  }}>
                    TEAMS ({results.results.teams.length})
                  </div>
                  {results.results.teams.map((team, index) => renderResultItem(team, index))}
                </div>
              )}

              {results.results.projects.length > 0 && (
                <div>
                  <div style={{ 
                    padding: '0.5rem 0.75rem', 
                    backgroundColor: '#f8f9fa', 
                    fontWeight: 'bold', 
                    fontSize: '0.85rem',
                    color: '#666',
                    borderBottom: '1px solid #eee'
                  }}>
                    PROJECTS ({results.results.projects.length})
                  </div>
                  {results.results.projects.map((project, index) => renderResultItem(project, index))}
                </div>
              )}

              {results.results.stories.length > 0 && (
                <div>
                  <div style={{ 
                    padding: '0.5rem 0.75rem', 
                    backgroundColor: '#f8f9fa', 
                    fontWeight: 'bold', 
                    fontSize: '0.85rem',
                    color: '#666',
                    borderBottom: '1px solid #eee'
                  }}>
                    STORIES ({results.results.stories.length})
                  </div>
                  {results.results.stories.map((story, index) => renderResultItem(story, index))}
                </div>
              )}

              {results.results.tickets.length > 0 && (
                <div>
                  <div style={{ 
                    padding: '0.5rem 0.75rem', 
                    backgroundColor: '#f8f9fa', 
                    fontWeight: 'bold', 
                    fontSize: '0.85rem',
                    color: '#666',
                    borderBottom: '1px solid #eee'
                  }}>
                    TICKETS ({results.results.tickets.length})
                  </div>
                  {results.results.tickets.map((ticket, index) => renderResultItem(ticket, index))}
                </div>
              )}

              <div style={{ 
                padding: '0.5rem 0.75rem', 
                backgroundColor: '#f8f9fa', 
                fontSize: '0.8rem',
                color: '#666',
                textAlign: 'center',
                borderTop: '1px solid #eee'
              }}>
                {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} found
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;