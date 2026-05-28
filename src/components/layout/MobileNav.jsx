import React from 'react';

export default function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="mobile-nav">
      <button
        id="mobile-tab-tree"
        className={`mobile-nav-tab ${activeTab === 'tree' ? 'active' : ''}`}
        onClick={() => onTabChange('tree')}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
          <line x1="12" y1="6.5" x2="12" y2="10" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
          <line x1="12" y1="10" x2="6" y2="15.5" stroke="currentColor" strokeWidth="1.8"/>
          <line x1="12" y1="10" x2="18" y2="15.5" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
        <span>Tree</span>
      </button>

      <button
        id="mobile-tab-note"
        className={`mobile-nav-tab ${activeTab === 'note' ? 'active' : ''}`}
        onClick={() => onTabChange('note')}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
          <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="8" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span>Note</span>
      </button>
    </nav>
  );
}
