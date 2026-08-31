import { useEffect, useRef, useState } from 'react';
import { eventsApi } from '../api/events';
import Icon from './ui/Icon';
import LogoMark from './LogoMark';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import SalesWindowFields from './SalesWindowFields';
import { localInputToIso, windowError, formatWindow } from '../lib/salesWindow';

// Offered as one-click chips in the zone composer — the areas nearly every
// venue has. Filtered against what the user has already added.
const ZONE_SUGGESTIONS = ['General Admission', 'VIP', 'Backstage', 'Balcony', 'Floor'];

const ZONE_PALETTE = ['#FF6A1A', '#7c5cff', '#0ea5e9', '#ec4899', '#16a34a', '#d97706', '#14b8a6', '#f43f5e'];

const STEPS = [
  { id: 0, label: 'Event Details', icon: 'calendar' },
  { id: 1, label: 'Zones',         icon: 'layers' },
  { id: 2, label: 'Ticket Types',  icon: 'ticket' },
  { id: 3, label: 'Review',        icon: 'check' },
];

// Rail geometry, shared by the step chips and the progress spine drawn behind
// them. Keep these in sync rather than hard-coding the same numbers twice.
const RAIL = {
  padY: 20,
  gap: 4,
  rowPadY: 9,
  rowPadX: 10,
  chip: 22,
  get rowH() { return this.chip + this.rowPadY * 2 + this.gap; },
  get chipCenterX() { return 16 + this.rowPadX + this.chip / 2; },
};

function StepRail({ current }) {
  return (
    <div style={{
      width: 210, background: 'var(--rail-bg)', borderRight: '1px solid var(--rail-border)',
      display: 'flex', flexDirection: 'column', padding: '28px 0',
      flexShrink: 0, position: 'relative', overflow: 'hidden',
    }}>
      {/* Brand silhouette, bleeding off the bottom-left corner of the rail */}
      <div
        className="wiz-watermark"
        aria-hidden="true"
        style={{
          position: 'absolute', left: -52, bottom: -46,
          pointerEvents: 'none', userSelect: 'none', zIndex: 0,
        }}
      >
        <LogoMark size={200} color="rgba(255,106,26,0.12)" />
      </div>

      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--rail-border)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--rail-text)', letterSpacing: '-0.02em' }}>
            New Event
          </span>
        </div>
      </div>
      <div style={{ padding: `${RAIL.padY}px 16px`, display: 'flex', flexDirection: 'column', gap: RAIL.gap, position: 'relative', zIndex: 1 }}>
        {/* Progress spine behind the step chips — the fill height animates as
            you move between screens. Geometry is derived from RAIL so the line
            stays glued to the chip centres. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', width: 2, borderRadius: 1,
            left: RAIL.chipCenterX - 1,
            top: RAIL.padY + RAIL.rowPadY + RAIL.chip / 2,
            height: (STEPS.length - 1) * RAIL.rowH,
            background: 'var(--rail-chip)',
          }}
        >
          <div style={{
            width: '100%', borderRadius: 1,
            height: `${(current / (STEPS.length - 1)) * 100}%`,
            background: 'linear-gradient(180deg, var(--green-fill), var(--orange))',
            transition: 'height .34s cubic-bezier(.16,1,.3,1)',
          }} />
        </div>

        {STEPS.map((s) => {
          const done = current > s.id;
          const active = current === s.id;
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: `${RAIL.rowPadY}px ${RAIL.rowPadX}px`, borderRadius: 8,
              background: active ? 'rgba(255,106,26,0.14)' : 'transparent',
              transition: 'background .22s ease',
              position: 'relative',
            }}>
              <div style={{
                width: RAIL.chip, height: RAIL.chip, borderRadius: 6,
                background: done ? 'var(--green-fill)' : active ? 'var(--orange)' : 'var(--rail-chip)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background .22s ease, box-shadow .22s ease, transform .22s cubic-bezier(.16,1,.3,1)',
                transform: active ? 'scale(1.08)' : 'none',
                boxShadow: active ? '0 0 0 4px rgba(255,106,26,0.16)' : 'none',
              }}>
                {done
                  ? <Icon name="check" size={12} color="#fff" stroke={2.5} />
                  : <Icon name={s.icon} size={12} color={active ? '#fff' : '#8b8f99'} stroke={2} />
                }
              </div>
              <div style={{
                fontSize: 12.5, fontWeight: 500,
                color: active ? 'var(--rail-text)' : done ? 'var(--rail-text-2)' : 'var(--rail-text-3)',
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

// Blocking warning shown on a step that can't be completed yet. Same shape on
// every step so "you can't continue" always looks the same.
function Warning({ children }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'var(--amber-soft)',
      border: '1px solid var(--amber-border)', borderRadius: 'var(--r)',
      fontSize: 12.5, color: 'var(--amber)', lineHeight: 1.5,
      display: 'flex', alignItems: 'flex-start', gap: 9,
    }}>
      <Icon name="alert" size={14} color="var(--amber)" style={{ marginTop: 1, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

// Card that groups the inputs for adding one item, with the add action pinned
// to its footer. Both steps use it so "add a thing" looks the same everywhere.
function Composer({ title, hint, children, footer }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
      background: 'var(--surface-2)', overflow: 'hidden',
    }}>
      <div style={{ padding: '13px 16px 0' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '13px 16px' }}>
        {children}
      </div>
      {footer && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '11px 16px', borderTop: '1px solid var(--border)',
          background: 'var(--surface-3)',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// Header above a list of what has been added so far.
function SectionHead({ title, count, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '.06em',
      }}>
        {title}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{count}</span>
      {hint && <span style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 'auto' }}>{hint}</span>}
    </div>
  );
}

// Inline note under a composer field — why the add button won't fire.
function InlineNote({ tone = 'error', children }) {
  const color = tone === 'error' ? 'var(--red)' : 'var(--text-3)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color }}>
      <Icon name={tone === 'error' ? 'alert' : 'info'} size={12} color={color} />
      {children}
    </span>
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
  const inputRef = useRef(null);

  const clean = draft.trim();
  const dupe = clean.length > 0 && zones.some((z) => z.name.toLowerCase() === clean.toLowerCase());
  const suggestions = ZONE_SUGGESTIONS.filter(
    (name) => !zones.some((z) => z.name.toLowerCase() === name.toLowerCase())
  );

  function addZone(name = clean) {
    const value = name.trim();
    if (!value) return;
    if (zones.some((z) => z.name.toLowerCase() === value.toLowerCase())) return;
    onChange([...zones, { tempId: Date.now(), name: value }]);
    setDraft('');
    // Keep the cursor where it was so several zones can be typed in a row.
    inputRef.current?.focus();
  }

  function removeZone(idx) {
    onChange(zones.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Zones</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Define the areas attendees can access. Every ticket type grants entry to one or more of these.</div>
      </div>

      {zones.length === 0 && (
        <Warning>
          <strong style={{ fontWeight: 600 }}>At least one zone is required.</strong> Ticket types
          grant access per zone, so an event with no zones has nothing to sell entry to.
        </Warning>
      )}

      <Composer
        title="Add a zone"
        hint="Name an area of the venue, e.g. General Admission, VIP, Backstage."
        footer={
          <>
            {dupe
              ? <InlineNote>“{clean}” is already a zone.</InlineNote>
              : <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Press Enter to add</span>}
            <Button variant="ghost" icon="plus" onClick={() => addZone()} disabled={!clean || dupe}>
              Add zone
            </Button>
          </>
        }
      >
        <Field label="Zone name" required>
          <input
            ref={inputRef}
            className="inp"
            placeholder="General Admission"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } }}
            autoFocus
          />
        </Field>

        {suggestions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Quick add:</span>
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addZone(name)}
                style={{
                  all: 'unset', cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)',
                  padding: '3px 9px', borderRadius: 999,
                  border: '1px solid var(--border-2)', background: 'var(--surface)',
                  transition: 'background .12s, color .12s, border-color .12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--orange-soft)';
                  e.currentTarget.style.color = 'var(--orange)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--text-2)';
                  e.currentTarget.style.borderColor = 'var(--border-2)';
                }}
              >
                + {name}
              </button>
            ))}
          </div>
        )}
      </Composer>

      {zones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHead title="Zones" count={zones.length} hint="Colours are used across the dashboard" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zones.map((z, i) => (
              <div key={z.tempId || i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'var(--surface)',
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
                  title={`Remove ${z.name}`}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 2: Ticket Types
function StepTicketTypes({ ticketTypes, zones, onChange }) {
  const [draft, setDraft] = useState({ name: '', price: '', capacity: '', salesStart: '', salesEnd: '' });
  const [windowOpen, setWindowOpen] = useState(false);
  const nameRef = useRef(null);

  const draftStartIso = localInputToIso(draft.salesStart);
  const draftEndIso = localInputToIso(draft.salesEnd);
  const draftWinErr = windowError(draftStartIso, draftEndIso);

  const cleanName = draft.name.trim();
  const dupe = cleanName.length > 0 && ticketTypes.some((t) => t.name.toLowerCase() === cleanName.toLowerCase());
  const canAdd = !!cleanName && !dupe && !draftWinErr;

  function addType() {
    if (!canAdd) return;
    const price = parseFloat(draft.price);
    const capacity = parseInt(draft.capacity, 10);
    const ents = {};
    for (const z of zones) ents[z.tempId || z.name] = undefined;
    onChange([...ticketTypes, {
      tempId: Date.now(),
      name: cleanName,
      price: isNaN(price) ? 0 : price,
      // null capacity = unlimited inventory.
      capacity: isNaN(capacity) ? null : capacity,
      // null bound = no start/end (sells immediately / never closes).
      salesStartAt: draftStartIso,
      salesEndAt: draftEndIso,
      entitlements: ents,
    }]);
    setDraft({ name: '', price: '', capacity: '', salesStart: '', salesEnd: '' });
    setWindowOpen(false);
    nameRef.current?.focus();
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

  // Enter submits from any single-line field in the composer.
  function onFieldKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addType(); }
  }

  const hasWindow = !!(draft.salesStart || draft.salesEnd);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Ticket Types</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>What attendees can buy. After adding a type, set which zones it gets into.</div>
      </div>

      {ticketTypes.length === 0 && (
        <Warning>
          <strong style={{ fontWeight: 600 }}>At least one ticket type is required.</strong> Without
          one there is nothing for attendees to buy, and the event can't be published.
        </Warning>
      )}

      <Composer
        title="Add a ticket type"
        hint="Name it, set a price, then choose zone access below."
        footer={
          <>
            {dupe ? (
              <InlineNote>&ldquo;{cleanName}&rdquo; already exists.</InlineNote>
            ) : draftWinErr ? (
              <InlineNote>{draftWinErr}</InlineNote>
            ) : (
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Press Enter to add</span>
            )}
            <Button variant="ghost" icon="plus" onClick={addType} disabled={!canAdd}>
              Add ticket type
            </Button>
          </>
        }
      >
        <Field label="Ticket name" required>
          <input
            ref={nameRef}
            className="inp"
            placeholder="e.g. General Admission"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={onFieldKeyDown}
            autoFocus
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Field label="Price" hint="Leave at 0 for a free ticket.">
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-3)', fontSize: 13, pointerEvents: 'none',
              }}>$</span>
              <input
                className="inp"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                style={{ paddingLeft: 23 }}
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                onKeyDown={onFieldKeyDown}
              />
            </div>
          </Field>

          <Field label="Capacity" hint="Blank for unlimited.">
            <input
              className="inp"
              type="number"
              min="0"
              step="1"
              placeholder="Unlimited"
              value={draft.capacity}
              onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value }))}
              onKeyDown={onFieldKeyDown}
            />
          </Field>
        </div>

        {/* The purchasing window sits inside the composer so it reads as part
            of the type being added, not as a floating setting. */}
        <div>
          <button
            type="button"
            onClick={() => setWindowOpen((o) => !o)}
            style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)',
            }}
          >
            <Icon
              name="chevright"
              size={13}
              color="var(--text-3)"
              style={{ transform: windowOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
            />
            <Icon name="clock" size={13} color="var(--text-3)" />
            Purchasing window
            <span style={{ fontSize: 11.5, color: hasWindow ? 'var(--orange)' : 'var(--text-3)' }}>
              {hasWindow ? 'set' : 'optional'}
            </span>
          </button>
          {windowOpen && (
            <div style={{ marginTop: 10 }}>
              <SalesWindowFields
                start={draft.salesStart}
                end={draft.salesEnd}
                onChange={({ start, end }) => setDraft((d) => ({ ...d, salesStart: start, salesEnd: end }))}
                compact
              />
            </div>
          )}
        </div>
      </Composer>

      {ticketTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHead
            title="Ticket types"
            count={ticketTypes.length}
            hint={zones.length > 0 ? 'Click a zone cell to cycle access' : undefined}
          />

          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth: 150 }}>Type</th>
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
                        ${Number(tt.price).toFixed(2)} · {tt.capacity == null ? 'unlimited' : `${tt.capacity} cap`}
                      </div>
                      {(tt.salesStartAt || tt.salesEndAt) && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Icon name="clock" size={10} color="var(--text-3)" />
                          {formatWindow(tt)}
                        </div>
                      )}
                    </td>
                    {zones.map((z, zi) => {
                      const key = z.tempId || z.name;
                      const val = tt.entitlements[key];
                      const st = cellStyle(val);
                      return (
                        <td key={zi} style={{ textAlign: 'center', padding: '6px 4px' }}>
                          <button
                            onClick={() => cycleEnt(ttIdx, key)}
                            title={`${tt.name} to ${z.name}`}
                            style={{
                              all: 'unset', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 48, height: 26, borderRadius: 6,
                              fontSize: 12, fontWeight: 600, border: '1px solid',
                              transition: 'background .1s', ...st,
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
                        title={`Remove ${tt.name}`}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {zones.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              — no access · ∞ unlimited entries · N× limited entries
            </div>
          )}
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
                  <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Icon name="clock" size={10} color="var(--text-3)" />
                    {formatWindow(tt)}
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
  // +1 when moving forward, -1 when moving back — decides which way the step
  // body slides in.
  const [dir, setDir] = useState(1);
  const [shaking, setShaking] = useState(false);
  const scrollRef = useRef(null);
  const [details, setDetails] = useState({ name: '', time: '', location: '', description: '' });
  const [zones, setZones] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  // Each step starts at the top; without this a long step leaves the next one
  // scrolled halfway down.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  function goTo(next) {
    if (next === step) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function canContinue() {
    if (step === 0) return details.name.trim().length > 0 && details.time.length > 0;
    // Zones and ticket types are both required — an event with neither can't
    // sell or scan anything. Each step explains itself via <Warning>.
    if (step === 1) return zones.length > 0;
    if (step === 2) return ticketTypes.length > 0;
    return true;
  }

  // Continue stays clickable while blocked so the click can shake rather than
  // do nothing. Dropping the class first lets a repeat click restart it.
  function rejectContinue() {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
  }

  function handleContinue() {
    if (!canContinue()) {
      rejectContinue();
      return;
    }
    goTo(step + 1);
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
          // null = no bound (open-ended sales window).
          salesStartAt: tt.salesStartAt ?? null,
          salesEndAt: tt.salesEndAt ?? null,
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
      background: 'var(--overlay)',
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
          <div ref={scrollRef} className="tm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
            {/* Keyed on `step` so React remounts the wrapper and the slide-in
                animation replays on every transition. */}
            <div key={step} className={`wiz-step${dir < 0 ? ' wiz-step-back' : ''}`}>
              {step === 0 && <StepDetails data={details} onChange={setDetails} />}
              {step === 1 && <StepZones zones={zones} onChange={setZones} />}
              {step === 2 && <StepTicketTypes ticketTypes={ticketTypes} zones={zones} onChange={setTicketTypes} />}
              {step === 3 && <StepReview details={details} zones={zones} ticketTypes={ticketTypes} />}
            </div>
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
              onClick={() => goTo(Math.max(0, step - 1))}
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
                  className={[
                    canContinue() ? '' : 'btn-blocked',
                    shaking ? 'shake' : '',
                  ].filter(Boolean).join(' ')}
                  aria-disabled={canContinue() ? undefined : true}
                  onClick={handleContinue}
                  onAnimationEnd={() => setShaking(false)}
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
