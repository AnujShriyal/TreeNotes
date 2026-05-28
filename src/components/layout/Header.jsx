import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotes } from '../../context/NotesContext';

export default function Header({ onMenuOpen }) {
  const { user, logout } = useAuth();
  const { saving, isOnline } = useNotes();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = user?.phoneNumber || user?.email || 'User';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <header className="header">
      <button
        id="btn-mobile-menu"
        className="header-menu-btn"
        onClick={onMenuOpen}
        aria-label="Open tree"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="header-center">
        {!isOnline && <span className="header-offline-badge">Offline</span>}
        {saving && <span className="header-saving">● saving…</span>}
      </div>

      <div className="header-right" ref={dropdownRef}>
        <div className="header-user">
          <button
            id="btn-user-avatar"
            className="user-avatar"
            onClick={() => setOpen(o => !o)}
            aria-label="Account menu"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </button>

          {open && (
            <div className="user-dropdown">
              <div className="user-name">{displayName}</div>
              <button
                id="btn-logout"
                className="user-logout-btn"
                onClick={() => { logout(); setOpen(false); }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
