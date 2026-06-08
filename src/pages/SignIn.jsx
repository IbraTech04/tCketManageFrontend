import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Icon from '../components/ui/Icon';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // JWT auth not yet wired — form is UI-complete only
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0e11',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: 'var(--orange)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255,106,26,0.45)',
          }}>
            <Icon name="ticket" size={24} color="#fff" stroke={2.2} />
          </div>
          <span style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
            color: '#f4f4f5',
          }}>
            t<span style={{ color: 'var(--orange)' }}>C</span>ketManage
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="pop-in" style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r-xl)',
        padding: '40px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.55)',
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
            style={{
              width: '100%', height: 44, fontSize: 14,
              fontWeight: 600, marginTop: 4,
              justifyContent: 'center',
              borderRadius: 'var(--r)',
            }}
          >
            Sign in
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '20px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Continue without signing in */}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate('/events')}
          style={{
            width: '100%', height: 40, fontSize: 13.5,
            justifyContent: 'center', gap: 8,
            borderRadius: 'var(--r)',
          }}
        >
          Continue without signing in
          <Icon name="arrowright" size={15} />
        </button>

        {/* Notice */}
        <div style={{
          marginTop: 20,
          padding: '10px 13px',
          background: 'var(--surface-3)',
          borderRadius: 'var(--r)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: 9,
          alignItems: 'flex-start',
        }}>
          <Icon name="info" size={14} color="var(--text-3)" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--text-3)',
            lineHeight: 1.55,
          }}>
            Authentication is being finalized. Continue without signing in to use the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
