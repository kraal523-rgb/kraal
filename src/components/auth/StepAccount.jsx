import React, { useState } from 'react';

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function StepAccount({ form, update, onSubmit, loading, error }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Google: set authMethod then call onSubmit on next tick
  // (state update is async; submitAccount reads form.authMethod)
  const handleGoogleSignIn = () => {
    update({ authMethod: 'google' });
    setTimeout(onSubmit, 0);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    update({ authMethod: 'email' });
    onSubmit();
  };

  const isGoogleLoading = loading && form.authMethod === 'google';
  const isEmailLoading = loading && form.authMethod === 'email';

  return (
    <form className="step-form" onSubmit={handleEmailSubmit} noValidate>
      <h2 className="step-title">Create your account</h2>
      <p className="step-sub">Start selling livestock in minutes — it's free to list.</p>

      <button
        type="button"
        className="btn-google"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <GoogleIcon />
        {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
      </button>

      <div className="divider">or sign up with email</div>

      <div className="field">
        <label htmlFor="email">
          Email address <span className="required">*</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={e => update({ email: e.target.value })}
          autoComplete="email"
          disabled={loading}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">
          Password <span className="required">*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            value={form.password}
            onChange={e => update({ password: e.target.value })}
            autoComplete="new-password"
            disabled={loading}
            style={{ paddingRight: '44px' }}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: '#6B6860',
              padding: 0, display: 'flex', alignItems: 'center',
            }}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">
          Confirm password <span className="required">*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={e => update({ confirmPassword: e.target.value })}
            autoComplete="new-password"
            disabled={loading}
            style={{ paddingRight: '44px' }}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: '#6B6860',
              padding: 0, display: 'flex', alignItems: 'center',
            }}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {isEmailLoading ? 'Creating account…' : 'Continue →'}
        </button>
      </div>

      <p className="step-footer">
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </form>
  );
}