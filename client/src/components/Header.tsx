import React, { useState, useRef, useEffect } from 'react';
import { ChevronRightIcon, ChevronLeftIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';
import SearchDropdown from './SearchDropdown';

interface HeaderProps {
  user: { username: string; firstName?: string; lastName?: string };
  invitationCount: number;
  onLogout: () => void;
  isActive: (path: string) => boolean;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Header({ user, invitationCount, onLogout, isActive, onToggleSidebar, sidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUserIconClick = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  const handleAccountSettings = () => {
    setDropdownOpen(false);
    navigate('/settings');
  };

  return (
    <nav className="nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="sidebar-toggle-btn"
          onClick={() => onToggleSidebar && onToggleSidebar()}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          style={{ fontSize: '1.1rem', padding: '0.4rem 0.6rem', cursor: 'pointer' }}
        >
          {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>
      
        <div className='logo' onClick={() => navigate('/teams')} style={{ cursor: "pointer" }}>
        </div>
      </div>

      <div className='search-functions'>
        <SearchDropdown />
      </div>      <div className="user-info" ref={dropdownRef}>
       <div className='user-icon' onClick={handleUserIconClick} style={{ cursor: 'pointer' }}>
         {user.firstName?.charAt(0).toUpperCase()}
         {user.lastName?.charAt(0).toUpperCase()}
       </div>
       
       {dropdownOpen && (
         <div className="user-dropdown">
           <button onClick={handleAccountSettings} className="dropdown-item">
             Account Settings
           </button>
           <button onClick={handleLogout} className="dropdown-item">
             Logout
           </button>
         </div>
       )}
      </div>
    </nav>
  );
}