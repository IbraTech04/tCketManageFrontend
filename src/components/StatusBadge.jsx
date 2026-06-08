const STYLES = {
  PAID:              { c: 'var(--green)',  bg: 'var(--green-soft)',  label: 'Paid' },
  PENDING:           { c: 'var(--amber)',  bg: 'var(--amber-soft)',  label: 'Pending' },
  CANCELLED:         { c: 'var(--red)',    bg: 'var(--red-soft)',    label: 'Cancelled' },
  EXPIRED:           { c: 'var(--text-3)',bg: 'var(--surface-3)',   label: 'Expired' },
  ALLOWED:           { c: 'var(--green)',  bg: 'var(--green-soft)',  label: 'Allowed' },
  DENIED:            { c: 'var(--red)',    bg: 'var(--red-soft)',    label: 'Denied' },
  LIMIT:             { c: 'var(--amber)',  bg: 'var(--amber-soft)',  label: 'Limit reached' },
  'checked-in':      { c: 'var(--green)',  bg: 'var(--green-soft)',  label: 'Checked in' },
  'not-arrived':     { c: 'var(--text-3)',bg: 'var(--surface-3)',   label: 'Not arrived' },
  SUCCESS:           { c: 'var(--green)',  bg: 'var(--green-soft)',  label: 'Allowed' },
  INVALID_QR:        { c: 'var(--red)',    bg: 'var(--red-soft)',    label: 'Invalid QR' },
  NO_ZONE_ENTITLEMENT:{ c: 'var(--red)',  bg: 'var(--red-soft)',    label: 'Access denied' },
  ENTRY_LIMIT_REACHED:{ c: 'var(--amber)',bg: 'var(--amber-soft)',  label: 'Limit reached' },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || { c: 'var(--text-2)', bg: 'var(--surface-3)', label: status };
  return (
    <span className="badge" style={{ color: s.c, background: s.bg }}>
      <span className="dot" style={{ background: s.c }} />
      {s.label}
    </span>
  );
}
