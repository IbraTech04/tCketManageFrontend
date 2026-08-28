import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';
import { useApp } from '../contexts/AppContext';

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error, clearError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from?.pathname || '/events', { replace: true });
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => clearError(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) {
      navigate(location.state?.from?.pathname || '/events', { replace: true });
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 36 }}>
        <Logo size={42} gap={12} wordmarkSize={22} wordmarkWeight={700} color="var(--text)" />
      </div>

      {/* Card */}
      <div className="pop-in" style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r-xl)',
        padding: '40px',
        width: '100%',
        maxWidth: 400,
        boxShadow: 'var(--shadow-pop)',
        border: '1px solid var(--border)',
      }}>
        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            margin: '0 0 6px',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--text)',
          }}>
            Welcome back
          </h1>
          <p style={{
            margin: 0,
            fontSize: 13.5,
            color: 'var(--text-2)',
            lineHeight: 1.5,
          }}>
            Sign in to your organizer account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 16,
            padding: '10px 13px',
            background: 'var(--red-soft)',
            borderRadius: 'var(--r)',
            border: '1px solid var(--red-border)',
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
          }}>
            <Icon name="alert" size={14} color="var(--red)" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--red)', lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>
              Email address
            </label>
            <input
              className="inp"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{ height: 40, fontSize: 13.5 }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="inp"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ height: 40, fontSize: 13.5, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  padding: 4, cursor: 'pointer',
                  color: 'var(--text-3)', display: 'flex',
                  borderRadius: 4,
                }}
                tabIndex={-1}
              >
                <Icon name={showPass ? 'lock' : 'lock'} size={15} />
              </button>
            </div>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%', height: 44, fontSize: 14,
              fontWeight: 600, marginTop: 4,
              justifyContent: 'center',
              borderRadius: 'var(--r)',
              gap: 8,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? <Spinner size={16} /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
