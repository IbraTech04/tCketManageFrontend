// Mirrors the backend ticket status enum. The OpenAPI spec types `status` as a
// plain string, so keep these values in sync with the API by hand.
//   ACTIVE   — issued and valid for entry
//   REVOKED  — manually revoked; no longer admits the holder
export const TICKET_STATUS = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
};

// Display metadata: label + badge colour tokens (from index.css).
export const TICKET_STATUS_META = {
  ACTIVE:  { label: 'Active',  c: 'var(--green)', bg: 'var(--green-soft)' },
  REVOKED: { label: 'Revoked', c: 'var(--red)',   bg: 'var(--red-soft)'   },
};

export function ticketStatusMeta(status) {
  return TICKET_STATUS_META[status] || { label: status, c: 'var(--text-2)', bg: 'var(--surface-3)' };
}

export function ticketStatusLabel(status) {
  return ticketStatusMeta(status).label;
}

// A ticket is revoked only on the explicit REVOKED state; everything else
// (ACTIVE, or any future "live" state) is treated as revocable.
export function isRevoked(status) {
  return status === TICKET_STATUS.REVOKED;
}
