import { useState, useEffect, useRef } from 'react';
import { watchEmailJob } from '../lib/stomp';
import Icon from './ui/Icon';
import Spinner from './ui/Spinner';

function ProgressBar({ pct }) {
  return (
    <div style={{
      height: 6, borderRadius: 3,
      background: 'var(--surface-3)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        borderRadius: 3,
        background: 'linear-gradient(90deg, var(--orange), #ff9f57)',
        transition: 'width 0.4s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: '12px 8px', borderRadius: 'var(--r-lg)',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// Shows real-time progress for an async email job via STOMP.
// Calls onComplete(finalStatus) when state === 'COMPLETED'.
export default function EmailJobProgress({ jobId, total, onComplete, onError }) {
  const [status, setStatus] = useState({
    state: 'RUNNING',
    processed: 0,
    sent: 0,
    failed: 0,
    lastEmail: null,
    lastSuccess: null,
    total,
  });
  const [connErr, setConnErr] = useState(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    completedRef.current = false;
    const stop = watchEmailJob(
      jobId,
      (s) => {
        setStatus(s);
        if (s.state === 'COMPLETED' && !completedRef.current) {
          completedRef.current = true;
          onComplete?.(s);
        }
      },
      (msg) => {
        setConnErr(msg);
        onError?.(msg);
      },
    );
    return stop;
  }, [jobId]);

  const effectiveTotal = status.total ?? total ?? 0;
  const pct = effectiveTotal > 0 ? Math.round((status.processed / effectiveTotal) * 100) : 0;
  const remaining = Math.max(0, effectiveTotal - (status.processed ?? 0));
  const isRunning = status.state === 'RUNNING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isRunning ? (
          <Spinner size={15} />
        ) : (
          <Icon name="check" size={15} color="var(--green)" stroke={2.5} />
        )}
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
          {isRunning ? 'Sending emails…' : 'All emails dispatched'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
          {status.processed ?? 0} / {effectiveTotal}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ProgressBar pct={pct} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)' }}>
          <span>{pct}% complete</span>
          {isRunning && remaining > 0 && <span>{remaining} remaining</span>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatBox label="Sent" value={status.sent} color="var(--green)" />
        <StatBox label="Failed" value={status.failed} color={status.failed > 0 ? 'var(--red)' : 'var(--text-3)'} />
        <StatBox label="Total" value={effectiveTotal} color="var(--text)" />
      </div>

      {/* Last processed email */}
      {status.lastEmail && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 'var(--r)',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          fontSize: 12.5, color: 'var(--text-2)',
          transition: 'opacity 0.2s',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: status.lastSuccess === false ? 'var(--red)' : 'var(--green)',
          }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status.lastEmail}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: status.lastSuccess === false ? 'var(--red)' : 'var(--green)',
          }}>
            {status.lastSuccess === false ? 'failed' : 'sent'}
          </span>
        </div>
      )}

      {/* Connection error */}
      {connErr && (
        <div style={{
          display: 'flex', gap: 8, padding: '9px 12px',
          background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.22)',
          borderRadius: 'var(--r)', color: 'var(--amber)', fontSize: 12.5,
        }}>
          <Icon name="alert" size={14} color="var(--amber)" />
          Live updates unavailable: {connErr}. Check the email jobs endpoint for final status.
        </div>
      )}
    </div>
  );
}
