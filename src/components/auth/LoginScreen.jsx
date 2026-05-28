import React from 'react';
import EmailAuth from './EmailAuth';

export default function LoginScreen() {
  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="8" r="5" fill="var(--accent)" />
              <line x1="18" y1="13" x2="18" y2="20" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="10" cy="26" r="4" fill="var(--accent-dim-solid)" stroke="var(--accent)" strokeWidth="1.5" />
              <circle cx="26" cy="26" r="4" fill="var(--accent-dim-solid)" stroke="var(--accent)" strokeWidth="1.5" />
              <line x1="18" y1="20" x2="10" y2="22" stroke="var(--accent)" strokeWidth="1.5" />
              <line x1="18" y1="20" x2="26" y2="22" stroke="var(--accent)" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="login-title">TreeNotes</h1>
          <p className="login-subtitle">Your thoughts, beautifully branched.</p>
        </div>

        <EmailAuth />
      </div>
    </div>
  );
}
