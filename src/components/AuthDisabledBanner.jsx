import { AUTH_DISABLED } from '../lib/devAuth';

/**
 * Persistent marker that the auth bypass is on.
 *
 * Deliberately always visible and not dismissible. The failure mode this guards
 * against is forgetting: everything works, so you stop noticing you are signed in
 * as nobody, and then spend an afternoon on a permissions bug that only exists
 * because the flag is set. Renders nothing when the flag is off, and in a
 * production build AUTH_DISABLED is statically false, so the whole component
 * collapses to `return null`.
 *
 * Bottom-left rather than top: the dashboard header already owns the top strip,
 * and a bar there would push the layout around and change what you are testing.
 */
export default function AuthDisabledBanner() {
  if (!AUTH_DISABLED) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 11px',
        borderRadius: 999,
        background: 'var(--amber-soft, #fef3c7)',
        border: '1px solid var(--amber-border, #fcd34d)',
        color: 'var(--amber, #b45309)',
        font: '500 11.5px/1.2 var(--sans, system-ui, sans-serif)',
        boxShadow: '0 2px 8px rgb(0 0 0 / 12%)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      Auth disabled — requests are unauthenticated
    </div>
  );
}
