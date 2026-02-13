import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserMenu.css';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-avatar"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <span className="avatar-initials">
          {getInitials(user.username)}
        </span>
        <div className="avatar-ring"></div>
      </button>

      {isOpen && (
        <div className="user-dropdown animate-fadeIn">
          <div className="dropdown-header">
            <div className="dropdown-avatar">
              <span className="dropdown-initials">
                {getInitials(user.username)}
              </span>
            </div>
            <div className="dropdown-user-info">
              <p className="dropdown-username">{user.username}</p>
              {user.email && (
                <p className="dropdown-email">{user.email}</p>
              )}
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <button 
            className="dropdown-item logout-item"
            onClick={handleLogout}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 13L11 9L7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 9H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M11 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;