import Icon from './ui/Icon';
import { localInputToIso, windowError, windowWarnings } from '../lib/salesWindow';

// Paired datetime-local inputs for a ticket type's purchasing window.
//
// `start` / `end` are <input type="datetime-local"> string values ('' = open
// bound). Empty bounds are allowed but flagged with an inline warning, since a
// missing start (sells immediately) or missing end (never closes) is rarely
// intended. A non-empty end that precedes the start is a hard error.
//
// The parent owns the values; this component only renders + advises.
export default function SalesWindowFields({ start, end, onChange, compact = false }) {
  const startIso = localInputToIso(start);
  const endIso = localInputToIso(end);
  const error = windowError(startIso, endIso);
  const warnings = windowWarnings(startIso, endIso);

  const labelStyle = { fontSize: 12.5, fontWeight: 500, color: 'var(--text)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 160px', minWidth: 0 }}>
          <label style={labelStyle}>On sale from</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              className="inp"
              type="datetime-local"
              style={{ width: '100%', paddingRight: start ? 28 : undefined }}
              value={start}
              onChange={(e) => onChange({ start: e.target.value, end })}
            />
            {start && (
              <ClearBtn onClick={() => onChange({ start: '', end })} title="Clear start" />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 160px', minWidth: 0 }}>
          <label style={labelStyle}>On sale until</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              className="inp"
              type="datetime-local"
              style={{ width: '100%', paddingRight: end ? 28 : undefined }}
              value={end}
              onChange={(e) => onChange({ start, end: e.target.value })}
            />
            {end && (
              <ClearBtn onClick={() => onChange({ start, end: '' })} title="Clear end" />
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--red)' }}>
          <Icon name="alert" size={13} color="var(--red)" />
          {error}
        </div>
      )}

      {!compact && warnings.map((w) => (
        <div key={w} style={{
          display: 'flex', alignItems: 'flex-start', gap: 7,
          fontSize: 12, color: 'var(--amber)',
          background: 'var(--amber-soft)', border: '1px solid var(--amber-border)',
          borderRadius: 'var(--r-sm)', padding: '7px 9px',
        }}>
          <Icon name="info" size={13} color="var(--amber)" style={{ marginTop: 1 }} />
          <span>{w} <span style={{ color: 'var(--text-3)' }}>Are you sure?</span></span>
        </div>
      ))}

      {compact && warnings.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--amber)' }}>
          <Icon name="info" size={12} color="var(--amber)" />
          {warnings.length === 2
            ? 'No start or end — on sale indefinitely.'
            : warnings[0]}
        </div>
      )}
    </div>
  );
}

function ClearBtn({ onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        all: 'unset', cursor: 'pointer', position: 'absolute', right: 7,
        display: 'flex', padding: 2, borderRadius: 4, color: 'var(--text-3)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-3)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = ''; }}
    >
      <Icon name="x" size={13} />
    </button>
  );
}
