import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import OtpInput from './OtpInput';

export default function PhoneAuth({ onBack }) {
  const { sendPhoneOtp, verifyPhoneOtp, error, setError } = useAuth();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const result = await sendPhoneOtp(phone.trim());
      setConfirmation(result);
      setStep('otp');
    } catch { /* error shown via context */ }
    finally { setLoading(false); }
  };

  const handleVerify = async (otp) => {
    if (!confirmation) return;
    setLoading(true);
    try {
      await verifyPhoneOtp(confirmation, otp);
    } catch { /* error shown via context */ }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-form">
      <button className="auth-back-btn" onClick={onBack}>
        ← Back
      </button>

      {step === 'phone' ? (
        <>
          <h2 className="auth-form-title">Enter your phone</h2>
          <p className="auth-form-hint">Include country code (e.g. +91 98765 43210)</p>
          <form onSubmit={handleSendOtp}>
            <input
              id="input-phone"
              className="auth-input"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoFocus
            />
            {error && <p className="auth-error">{error}</p>}
            <button
              id="btn-send-otp"
              type="submit"
              className="auth-submit-btn"
              disabled={loading || !phone.trim()}
            >
              {loading ? <span className="spinner" /> : 'Send OTP'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="auth-form-title">Enter OTP</h2>
          <p className="auth-form-hint">Sent to {phone}</p>
          <OtpInput length={6} onComplete={handleVerify} loading={loading} />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-resend-btn" onClick={() => setStep('phone')}>
            Try different number
          </button>
        </>
      )}
    </div>
  );
}
