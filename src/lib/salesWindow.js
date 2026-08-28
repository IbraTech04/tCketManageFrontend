// Ticket-type purchasing windows.
//
// The backend models each ticket type with an optional sales window:
//   salesStartAt / salesEndAt  (ISO date-time strings, nullable)
// A `null` bound means "no bound" — sales open immediately (no start) and/or
// never close (no end). That's rarely what an operator actually wants, so the
// UI surfaces a warning whenever a bound is left open.

// ISO string -> value for an <input type="datetime-local"> (viewer-local time).
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// datetime-local value -> ISO string (UTC), or null when empty/invalid.
export function localInputToIso(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Hard validation: an end that is not after the start is never valid.
// Returns an error string, or '' when the window is acceptable.
export function windowError(startIso, endIso) {
  if (startIso && endIso) {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    if (!isNaN(s) && !isNaN(e) && e <= s) {
      return 'Sales end must be after sales start.';
    }
  }
  return '';
}

// Non-blocking advisories for open-ended bounds (null = no bound).
export function windowWarnings(startIso, endIso) {
  const out = [];
  if (!startIso) out.push('No start date — tickets go on sale immediately.');
  if (!endIso) out.push('No end date — tickets stay on sale indefinitely.');
  return out;
}

// Is this ticket type purchasable right now? (within its window, both bounds
// optional). Does NOT consider isActive — callers combine the two.
export function isOnSale(tt, now = new Date()) {
  const t = now.getTime();
  const start = tt?.salesStartAt ? new Date(tt.salesStartAt).getTime() : null;
  const end = tt?.salesEndAt ? new Date(tt.salesEndAt).getTime() : null;
  if (start != null && t < start) return false;
  if (end != null && t > end) return false;
  return true;
}

// Derive the current state of a ticket type's sales window for display.
// -> { key, label, color, bg }
export function saleState(tt, now = new Date()) {
  const t = now.getTime();
  const start = tt?.salesStartAt ? new Date(tt.salesStartAt).getTime() : null;
  const end = tt?.salesEndAt ? new Date(tt.salesEndAt).getTime() : null;

  if (start != null && t < start) {
    return { key: 'scheduled', label: 'Scheduled', color: 'var(--blue)', bg: 'var(--blue-soft)' };
  }
  if (end != null && t > end) {
    return { key: 'ended', label: 'Sale ended', color: 'var(--text-3)', bg: 'var(--surface-3)' };
  }
  if (start == null && end == null) {
    return { key: 'always', label: 'Always on sale', color: 'var(--amber)', bg: 'var(--amber-soft)' };
  }
  return { key: 'on-sale', label: 'On sale', color: 'var(--green)', bg: 'var(--green-soft)' };
}

const FMT = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

export function formatBound(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, FMT);
}

// One-line human summary of the window, e.g.
//   "Jun 1, 2026, 9:00 AM → Jun 10, 2026, 5:00 PM"
//   "From Jun 1, 2026, 9:00 AM"  /  "Until Jun 10, 2026, 5:00 PM"
//   "No sales window"
export function formatWindow(tt) {
  const s = formatBound(tt?.salesStartAt);
  const e = formatBound(tt?.salesEndAt);
  if (s && e) return `${s} → ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return 'No sales window';
}
