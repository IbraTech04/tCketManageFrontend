import { useState } from 'react';
import { eventsApi } from '../api/events';
import Icon from './ui/Icon';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const ZONE_PALETTE = ['#FF6A1A', '#7c5cff', '#0ea5e9', '#ec4899', '#16a34a', '#d97706', '#14b8a6', '#f43f5e'];

const STEPS = [
  { id: 0, label: 'Event Details', icon: 'calendar' },
  { id: 1, label: 'Zones',         icon: 'layers' },
  { id: 2, label: 'Ticket Types',  icon: 'ticket' },
  { id: 3, label: 'Review',        icon: 'check' },
];

function StepRail({ current }) {
  return (
    <div style={{
      width: 210, background: '#18181b', borderRight: '1px solid #2a2e37',
      display: 'flex', flexDirection: 'column', padding: '28px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #2a2e37' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: 'var(--orange)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="ticket" size={15} color="#fff" stroke={2.2} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            New Event
          </span>
        </div>
      </div>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {STEPS.map((s) => {
          const done = current > s.id;
          const active = current === s.id;
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              background: active ? 'rgba(255,106,26,0.14)' : 'transparent',
              transition: 'background .15s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: done ? 'var(--green)' : active ? 'var(--orange)' : '#2a2e37',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background .15s',
              }}>
                {done
                  ? <Icon name="check" size={12} color="#fff" stroke={2.5} />
                  : <Icon name={s.icon} size={12} color={active ? '#fff' : '#8b8f99'} stroke={2} />
                }
              </div>
              <div style={{
                fontSize: 12.5, fontWeight: 500,
                color: active ? '#f4f4f5' : done ? '#a1a1aa' : '#71717a',
                transition: 'color .15s',
              }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', display: 'flex', gap: 4 }}>
        {label}
        {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{hint}</div>}
    </div>
  );
}

// Step 0: Event Details
function StepDetails({ data, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Event Details</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Basic information about your event.</div>
      </div>
      <Field label="Event name" required>
        <input
          className="inp"
          placeholder="e.g. Summer Music Fest 2025"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          autoFocus
        />
      </Field>
      <Field label="Date & Time" required hint="Use ISO format or select via browser date-time picker.">
        <input
          className="inp"
          type="datetime-local"
          value={data.time}
          onChange={(e) => onChange({ ...data, time: e.target.value })}
        />
      </Field>
      <Field label="Location">
        <input
          className="inp"
          placeholder="e.g. Rogers Centre, Toronto"
          value={data.location}
          onChange={(e) => onChange({ ...data, location: e.target.value })}
        />
      </Field>
      <Field label="Description">
        <textarea
          className="inp"
          rows={3}
          placeholder="Brief description of the event…"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
        />
      </Field>
    </div>
  );
}

// Step 1: Zones
function StepZones({ zones, onChange }) {
  const [draft, setDraft] = useState('');

  function addZone() {
    const name = draft.trim();
    if (!name) return;
    onChange([...zones, { tempId: Date.now(), name }]);
    setDraft('');
  }

  function removeZone(idx) {
    onChange(zones.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Zones</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Define the areas attendees can access (e.g. General, VIP, Backstage).</div>
      </div>
      {/* Existing zones */}
      {zones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {zones.map((z, i) => (
            <div key={z.tempId || i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: ZONE_PALETTE[i % ZONE_PALETTE.length],
              }} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{z.name}</span>
              <button
                style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4, borderRadius: 5 }}
                onClick={() => removeZone(i)}
                title="Remove zone"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Add zone input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="inp"
          placeholder="Zone name…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } }}
        />
        <Button variant="ghost" icon="plus" onClick={addZone} disabled={!draft.trim()}>
          Add zone
        </Button>
      </div>
      {zones.length === 0 && (
        <div style={{
          padding: '16px', background: 'var(--amber-soft)',
          border: '1px solid rgba(217,119,6,0.2)', borderRadius: 'var(--r)',
          fontSize: 12.5, color: 'var(--amber)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <Icon name="info" size={14} color="var(--amber)" style={{ marginTop: 1 }} />
          You can add zones later, but ticket types won't have zone entitlements until zones exist.
        </div>
      )}
    </div>
  );
}

// Step 2: Ticket Types
function StepTicketTypes({ ticketTypes, zones, onChange }) {
  const [draft, setDraft] = useState({ name: '', price: '', capacity: '' });

  function addType() {
    const name = draft.name.trim();
    const price = parseFloat(draft.price);
    const capacity = parseInt(draft.capacity, 10);
    if (!name) return;
    const ents = {};
    for (const z of zones) ents[z.tempId || z.name] = undefined;
    onChange([...ticketTypes, {
      tempId: Date.now(),
      name,
      price: isNaN(price) ? 0 : price,
      // null capacity = unlimited inventory.
      capacity: isNaN(capacity) ? null : capacity,
      entitlements: ents,
    }]);
    setDraft({ name: '', price: '', capacity: '' });
  }

  function removeType(idx) {
    onChange(ticketTypes.filter((_, i) => i !== idx));
  }

  function cycleEnt(ttIdx, zKey) {
    const tt = ticketTypes[ttIdx];
    const cur = tt.entitlements[zKey];
    let next;
    if (cur === undefined) next = null;
    else if (cur === null) next = 1;
    else if (cur === 1) next = 2;
    else if (cur === 2) next = 3;
    else if (cur === 3) next = 5;
    else next = undefined;

    const updated = ticketTypes.map((t, i) => {
      if (i !== ttIdx) return t;
      return { ...t, entitlements: { ...t.entitlements, [zKey]: next } };
    });
    onChange(updated);
  }

  function cellLabel(val) {
    if (val === undefined) return '—';
    if (val === null) return '∞';
    return `${val}×`;
  }

  function cellStyle(val) {
    if (val === undefined) return { color: 'var(--text-3)', background: 'transparent', borderColor: 'var(--border)' };
    if (val === null) return { color: 'var(--green)', background: 'var(--green-soft)', borderColor: 'transparent' };
    return { color: 'var(--blue)', background: 'var(--blue-soft)', borderColor: 'transparent' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Ticket Types</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Create ticket types and set zone entitlements. Click a cell to cycle access.</div>
      </div>

      {/* Add type form */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="inp"
          placeholder="Type name…"
          style={{ flex: '1 1 160px' }}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
        />
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-3)', fontSize: 13, pointerEvents: 'none',
          }}>$</span>
          <input
            className="inp"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            style={{ width: 110, paddingLeft: 22 }}
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
          />
        </div>
        <input
          className="inp"
          type="number"
          min="0"
          step="1"
          placeholder="Capacity (∞)"
          title="Total inventory for this ticket type. Leave blank for unlimited."
          style={{ width: 130 }}
          value={draft.capacity}
          onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
        />
        <Button variant="ghost" icon="plus" onClick={addType} disabled={!draft.name.trim()}>
          Add type
        </Button>
      </div>

      {/* Matrix */}
      {ticketTypes.length > 0 && zones.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Type / Price</th>
                {zones.map((z, i) => (
                  <th key={z.tempId || i} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ZONE_PALETTE[i % ZONE_PALETTE.length] }} />
                      {z.name}
                    </div>
                  </th>
                ))}
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((tt, ttIdx) => (
                <tr key={tt.tempId || ttIdx}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{tt.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                      ${Number(tt.price).toFixed(2)} · {tt.capacity == null ? '∞ cap' : `${tt.capacity} cap`}
                    </div>
                  </td>
                  {zones.map((z, zi) => {
                    const key = z.tempId || z.name;
                    const val = tt.entitlements[key];
                    const s = cellStyle(val);
                    return (
                      <td key={zi} style={{ textAlign: 'center', padding: '6px 4px' }}>
                        <button
                          onClick={() => cycleEnt(ttIdx, key)}
                          style={{
                            all: 'unset', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 48, height: 26, borderRadius: 6,
                            fontSize: 12, fontWeight: 600, border: '1px solid',
                            transition: 'background .1s', ...s,
                          }}
                        >
                          {cellLabel(val)}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <button
                      style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4, borderRadius: 5 }}
                      onClick={() => removeType(ttIdx)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 8 }}>
            — = no access · ∞ = unlimited · N× = limited entries
          </div>
        </div>
      )}

      {ticketTypes.length > 0 && zones.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 'var(--r)' }}>
          No zones defined — ticket types will have no zone entitlements.
        </div>
      )}
    </div>
  );
}

// Step 3: Review
function StepReview({ details, zones, ticketTypes }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Review & Publish</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Confirm your event details before publishing.</div>
      </div>

      {/* Event card */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Event</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{details.name || '(untitled)'}</div>
        {details.time && (
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Icon name="calendar" size={13} color="var(--text-3)" />
            {new Date(details.time).toLocaleString()}
          </div>
        )}
        {details.location && (
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="pin" size={13} color="var(--text-3)" />
            {details.location}
          </div>
        )}
        {details.description && (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>{details.description}</div>
        )}
      </div>

      {/* Zones */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          Zones ({zones.length})
        </div>
        {zones.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No zones — attendees won't be zone-restricted.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {zones.map((z, i) => (
              <span key={i} className="badge" style={{ background: ZONE_PALETTE[i % ZONE_PALETTE.length] + '18', color: ZONE_PALETTE[i % ZONE_PALETTE.length] }}>
                <span className="dot" style={{ background: ZONE_PALETTE[i % ZONE_PALETTE.length] }} />
                {z.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ticket types */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          Ticket Types ({ticketTypes.length})
        </div>
        {ticketTypes.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No ticket types — add some after publishing.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ticketTypes.map((tt, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{tt.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    ${Number(tt.price).toFixed(2)} · {tt.capacity == null ? 'unlimited' : tt.capacity} cap · {Object.values(tt.entitlements).filter((v) => v !== undefined).length} zone entitlements
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventWizard({ onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ name: '', time: '', location: '', description: '' });
  const [zones, setZones] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  function canContinue() {
    if (step === 0) return details.name.trim().length > 0 && details.time.length > 0;
    return true;
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError('');
    try {
      // Build the single atomic CreateFullEventRequest DTO. Zones carry a
      // client-generated `key` that ticket-type entitlements reference via
      // `zoneKey`, so the backend can wire entitlements without round-trips.
      const zonePayload = zones.map((z) => ({
        key: String(z.tempId || z.name),
        name: z.name,
      }));

      const ticketTypePayload = ticketTypes.map((tt) => {
        const entitlements = Object.entries(tt.entitlements)
          // undefined = no access (skip); null = unlimited (omit maxEntries);
          // number = limited entries.
          .filter(([, val]) => val !== undefined)
          .map(([zoneKey, maxEntries]) => ({
            zoneKey: String(zoneKey),
            ...(maxEntries === null ? {} : { maxEntries }),
          }));

        return {
          name: tt.name,
          price: Number(tt.price),
          isActive: true,
          // Omit capacity when unlimited; the DTO treats it as optional.
          ...(tt.capacity == null ? {} : { capacity: tt.capacity }),
          entitlements,
        };
      });

      // location and description are required fields on the DTO; send empty
      // strings rather than omitting them when the user left them blank.
      const result = await eventsApi.createFull({
        name: details.name.trim(),
        time: new Date(details.time).toISOString(),
        location: details.location.trim(),
        description: details.description.trim(),
        zones: zonePayload,
        ticketTypes: ticketTypePayload,
      });

      // FullEventResponse { event, ticketTypes } — consumers expect the event.
      onDone(result.event);
    } catch (ex) {
      setPublishError(ex.message || 'Failed to publish event');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(10,10,12,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}
      onClick={onClose}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', width: '100%', maxWidth: 820,
          height: 560, maxHeight: '90vh',
          background: 'var(--surface)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-pop)',
          overflow: 'hidden',
        }}
      >
        {/* Left rail */}
        <StepRail current={step} />

        {/* Right content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <Button variant="subtle" icon="x" onClick={onClose} />
          </div>

          {/* Content */}
          <div className="tm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
            {step === 0 && <StepDetails data={details} onChange={setDetails} />}
            {step === 1 && <StepZones zones={zones} onChange={setZones} />}
            {step === 2 && <StepTicketTypes ticketTypes={ticketTypes} zones={zones} onChange={setTicketTypes} />}
            {step === 3 && <StepReview details={details} zones={zones} ticketTypes={ticketTypes} />}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            <Button
              variant="ghost"
              icon="arrowleft"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || publishing}
            >
              Back
            </Button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {publishError && (
                <span style={{ fontSize: 12.5, color: 'var(--red)', maxWidth: 260 }}>{publishError}</span>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  variant="primary"
                  iconRight="arrowright"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canContinue()}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon={publishing ? undefined : 'sparkle'}
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? <><Spinner size={14} /> Publishing…</> : 'Publish event'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
