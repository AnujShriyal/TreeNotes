import React, { useRef, useState } from 'react';

export default function OtpInput({ length = 6, onComplete, loading }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[idx] = val;
    setValues(next);

    if (val && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }

    if (next.every(v => v !== '')) {
      onComplete(next.join(''));
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !values[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = Array(length).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setValues(next);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
    if (pasted.length === length) onComplete(pasted);
  };

  return (
    <div className="otp-container" onPaste={handlePaste}>
      {values.map((v, i) => (
        <input
          key={i}
          id={`otp-digit-${i}`}
          ref={el => inputs.current[i] = el}
          className="otp-input"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          disabled={loading}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
