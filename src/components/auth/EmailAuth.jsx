import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function EmailAuth({ onBack }) {
  const { sendEmailLink, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendEmailLink(email.trim());
      setSent(true);
    } catch { /* error shown via context */ }
    finally { setLoading(false); }
  };

  if (sent) {
    return (
      <div className="auth-form">
        <div className="auth-sent-card">
          <div className="auth-sent-icon">✉️</div>
          <h2 className="auth-form-title">Check your inbox</h2>
          <p className="auth-form-hint">
            We sent a sign-in link to <strong>{email}</strong>.<br />
            Tap the link in the email to log in — no password needed.
          </p>
          <button className="auth-resend-btn" onClick={() => { setSent(false); setError(''); }}>
            Resend link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2 className="auth-form-title">Sign in</h2>
      <p className="auth-form-hint">Enter your email — we'll send you a magic link. No password, no captcha.</p>
      <form onSubmit={handleSend}>
        <input
          id="input-email"
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
        />
        {error && <p className="auth-error">{error}</p>}
        <button
          id="btn-send-link"
          type="submit"
          className="auth-submit-btn"
          disabled={loading || !email.trim()}
        >
          {loading ? <span className="spinner" /> : 'Send Sign-in Link →'}
        </button>
      </form>
    </div>
  );
}
