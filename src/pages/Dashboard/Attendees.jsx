import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../api/events';
import { ticketsApi } from '../../api/tickets';
import { zoneTypesApi, zoneColor, entitlementMap } from '../../api/zoneTypes';
import { watchEmailJob } from '../../lib/stomp';
import { useApp } from '../../contexts/AppContext';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import DrawerHeader from '../../components/ui/DrawerHeader';
import FilterSelect from '../../components/ui/FilterSelect';
import Empty from '../../components/ui/Empty';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import Badge from '../../components/ui/Badge';
import Portal from '../../components/ui/Portal';
import TypePill from '../../components/TypePill';
import ImportWizard from '../../components/ImportWizard';
import SendTicketsWizard from '../../components/SendTicketsWizard';

function relTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function DeliveryBadge({ lastSent }) {
  if (lastSent) {
    return (
      <span
        title={`Sent ${new Date(lastSent).toLocaleString()}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11.5, fontWeight: 500, color: 'var(--green)',
          background: 'var(--green-soft)', padding: '2px 8px', borderRadius: 20,
        }}
      >
        <Icon name="check" size={11} color="var(--green)" stroke={2.5} />
        Sent · {relTime(lastSent)}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)',
      background: 'var(--surface-3)', padding: '2px 8px', borderRadius: 20,
    }}>
      <Icon name="clock" size={11} color="var(--text-3)" />
      Not sent
    </span>
  );
}

const PAGE_SIZE = 9;

function LoadingCenter() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 10, color: 'var(--text-3)' }}>
      <Spinner size={20} dark />
      <span style={{ fontSize: 13.5 }}>Loading attendees...</span>
    </div>
  );
}

function TicketDrawer({ ticket, open, onClose, onResend, onResendComplete, onUpdate }) {
  const { currentEvent } = useApp();

  const [resending, setResending] = useState(false);
  const [resendErr, setResendErr] = useState('');
  const [resendJobId, setResendJobId] = useState(null);

  // Change ticket type
  const [changingType, setChangingType] = useState(false);
  const [allTypes, setAllTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [typeChangeSaving, setTypeChangeSaving] = useState(false);
  const [typeChangeErr, setTypeChangeErr] = useState('');

  // Add zone
  const [addZoneStep, setAddZoneStep] = useState(null); // null | 'pick' | 'scope'
  const [pickedZoneId, setPickedZoneId] = useState('');
  const [pickedMaxEntries, setPickedMaxEntries] = useState('');
  const [addZoneSaving, setAddZoneSaving] = useState(false);
  const [addZoneErr, setAddZoneErr] = useState('');

  // Reset sub-flows when ticket changes or drawer re-opens
  useEffect(() => {
    if (!open) return;
    setChangingType(false);
    setAddZoneStep(null);
    setTypeChangeErr('');
    setAddZoneErr('');
    setPickedZoneId('');
    setPickedMaxEntries('');
    setResendJobId(null);
  }, [open, ticket?.id]);

  // Track single-ticket resend job via STOMP
  useEffect(() => {
    if (!resendJobId || !ticket?.id) return;
    return watchEmailJob(
      resendJobId,
      (s) => {
        if (s.state === 'COMPLETED') {
          setResending(false);
          setResendJobId(null);
          onResendComplete?.(ticket.id);
        }
      },
      (err) => {
        setResending(false);
        setResendJobId(null);
        setResendErr(err);
      },
    );
  }, [resendJobId, ticket?.id]);

  if (!ticket) return null;

  const entitlements = ticket.ticketType?.entitlements ?? [];
  const allZones = currentEvent?.zones ?? [];
  const existingZoneIds = new Set(entitlements.map((e) => e.zoneId));
  const availableZones = allZones.filter((z) => !existingZoneIds.has(z.id));

  // ── resend ──
  async function handleResend() {
    setResending(true);
    setResendErr('');
    try {
      const { jobId } = await onResend(ticket);
      setResendJobId(jobId);
      // resending stays true until STOMP reports COMPLETED
    } catch (ex) {
      setResendErr(ex.message || 'Failed to resend');
      setResending(false);
    }
  }

  // ── change ticket type ──
  async function openChangeType() {
    setChangingType(true);
    setSelectedTypeId(ticket.ticketType?.id || '');
    setTypesLoading(true);
    setTypeChangeErr('');
    try {
      const types = await eventsApi.getTicketTypes(ticket.eventId);
      setAllTypes(types ?? []);
    } catch {
      setTypeChangeErr('Failed to load ticket types');
    } finally {
      setTypesLoading(false);
    }
  }

  async function saveTypeChange() {
    if (selectedTypeId === ticket.ticketType?.id) { setChangingType(false); return; }
    setTypeChangeSaving(true);
    setTypeChangeErr('');
    try {
      const updated = await ticketsApi.update(ticket.id, {
        firstName: ticket.firstName,
        lastName: ticket.lastName,
        email: ticket.email,
        ticketTypeId: selectedTypeId,
      });
      onUpdate(updated);
      setChangingType(false);
    } catch (ex) {
      setTypeChangeErr(ex.message || 'Failed to change ticket type');
    } finally {
      setTypeChangeSaving(false);
    }
  }

  // ── add zone ──
  async function confirmAddZone(scope) {
    setAddZoneSaving(true);
    setAddZoneErr('');
    const zone = allZones.find((z) => z.id === pickedZoneId);
    const maxEntries = pickedMaxEntries === '' ? null : parseInt(pickedMaxEntries, 10);
    const newEnt = { zoneId: pickedZoneId, ...(maxEntries !== null ? { maxEntries } : {}) };
    const tt = ticket.ticketType;
    const existingEnts = (tt?.entitlements ?? []).map((e) => ({
      zoneId: e.zoneId,
      ...(e.maxEntries != null ? { maxEntries: e.maxEntries } : {}),
    }));

    try {
      if (scope === 'all') {
        await zoneTypesApi.updateTicketType(tt.id, {
          name: tt.name, price: tt.price, isActive: tt.isActive,
          entitlements: [...existingEnts, newEnt],
        });
        const updated = await ticketsApi.get(ticket.id);
        onUpdate(updated);
      } else {
        const newType = await eventsApi.createTicketType(ticket.eventId, {
          name: `${tt?.name ?? 'Custom'} +${zone?.name ?? 'Zone'}`,
          price: tt?.price ?? 0,
          isActive: true,
          entitlements: [...existingEnts, newEnt],
        });
        const updated = await ticketsApi.update(ticket.id, {
          firstName: ticket.firstName,
          lastName: ticket.lastName,
          email: ticket.email,
          ticketTypeId: newType.id,
        });
        onUpdate(updated);
      }
      setAddZoneStep(null);
      setPickedZoneId('');
      setPickedMaxEntries('');
    } catch (ex) {
      setAddZoneErr(ex.message || 'Failed to add zone');
    } finally {
      setAddZoneSaving(false);
    }
  }

  const sectionLabel = {
    fontSize: 11, fontWeight: 500, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
  };

  return (
    <Drawer open={open} onClose={onClose} width={440}>
      <DrawerHeader
        title={`${ticket.firstName} ${ticket.lastName}`}
        subtitle={ticket.email}
        onClose={onClose}
      />
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Ticket ID */}
        <div>
          <div style={sectionLabel}>Ticket ID</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '10px 12px',
          }}>
            <span className="mono" style={{ fontSize: 12.5, flex: 1, wordBreak: 'break-all' }}>{ticket.id}</span>
            <button
              style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
              onClick={() => navigator.clipboard?.writeText(ticket.id)}
              title="Copy"
            >
              <Icon name="copy" size={14} />
            </button>
          </div>
        </div>

        {/* Ticket type */}
        <div>
          <div style={sectionLabel}>Ticket Type</div>
          {changingType ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {typesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
                  <Spinner size={14} dark /> Loading types…
                </div>
              ) : (
                <select
                  className="inp"
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                >
                  {allTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · ${Number(t.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              )}
              {typeChangeErr && (
                <div style={{ fontSize: 12, color: 'var(--red)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  <Icon name="alert" size={12} color="var(--red)" /> {typeChangeErr}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={saveTypeChange} disabled={typeChangeSaving || typesLoading || !selectedTypeId}>
                  {typeChangeSaving ? <Spinner size={12} /> : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setChangingType(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TypePill ticketType={ticket.ticketType} />
              {ticket.ticketType?.price != null && (
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                  ${Number(ticket.ticketType.price).toFixed(2)}
                </span>
              )}
              <button
                onClick={openChangeType}
                style={{ all: 'unset', cursor: 'pointer', marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                <Icon name="edit" size={12} /> Change
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <div style={sectionLabel}>Email</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--text)' }}>
            <Icon name="mail" size={14} color="var(--text-3)" />
            {ticket.email}
          </div>
        </div>

        {/* Ticket delivery */}
        <div>
          <div style={sectionLabel}>Ticket Delivery</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '10px 12px',
          }}>
            <div style={{ flex: 1 }}>
              <DeliveryBadge lastSent={ticket.lastTicketSent} />
              {ticket.lastTicketSent && (
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5 }}>
                  Last sent {new Date(ticket.lastTicketSent).toLocaleString()}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" icon={resending ? undefined : 'mail'} onClick={handleResend} disabled={resending}>
              {resending ? <Spinner size={13} /> : ticket.lastTicketSent ? 'Resend' : 'Send'}
            </Button>
          </div>
          {resendErr && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={12} color="var(--red)" /> {resendErr}
            </div>
          )}
        </div>

        {/* Zone access */}
        <div>
          <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Zone Access</span>
            {addZoneStep === null && !changingType && (
              <button
                onClick={() => setAddZoneStep('pick')}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 3, textTransform: 'none', letterSpacing: 0 }}
              >
                <Icon name="plus" size={11} color="var(--orange)" /> Add zone
              </button>
            )}
          </div>

          {entitlements.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: addZoneStep ? 12 : 0 }}>
              {entitlements.map((ent) => (
                <div key={ent.zoneId} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRadius: 'var(--r)',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: zoneColor(ent.zoneId), flexShrink: 0 }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{ent.zoneName}</span>
                  <Badge color="var(--text-2)" bg="var(--surface-3)">
                    {ent.maxEntries == null ? '∞' : `${ent.maxEntries}×`}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {entitlements.length === 0 && addZoneStep === null && (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No zone entitlements on this ticket type.</div>
          )}

          {/* Step 1: pick zone + max entries */}
          {addZoneStep === 'pick' && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Add zone access</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select className="inp" value={pickedZoneId} onChange={(e) => setPickedZoneId(e.target.value)} disabled={availableZones.length === 0}>
                  <option value="">
                    {availableZones.length === 0 ? 'All zones already assigned' : 'Select zone…'}
                  </option>
                  {availableZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                    Max entries <span style={{ color: 'var(--text-3)' }}>(blank = unlimited)</span>
                  </label>
                  <input
                    className="inp"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={pickedMaxEntries}
                    onChange={(e) => setPickedMaxEntries(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" size="sm" onClick={() => setAddZoneStep(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={() => setAddZoneStep('scope')} disabled={!pickedZoneId || availableZones.length === 0}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: choose scope */}
          {addZoneStep === 'scope' && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
                Adding <strong style={{ color: 'var(--text)' }}>{allZones.find((z) => z.id === pickedZoneId)?.name}</strong> — who should this apply to?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => confirmAddZone('all')}
                  disabled={addZoneSaving}
                  style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'border-color .12s, background .12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.background = 'var(--orange-softer)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--orange-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="users" size={14} color="var(--orange)" />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                    All {ticket.ticketType?.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                    Updates zone access for every holder of this ticket type
                  </div>
                </button>
                <button
                  onClick={() => confirmAddZone('individual')}
                  disabled={addZoneSaving}
                  style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'border-color .12s, background .12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--blue-soft)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="user" size={14} color="var(--blue)" />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                    {ticket.firstName} only
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                    Clones this ticket type with the new zone just for them
                  </div>
                </button>
              </div>
              {addZoneErr && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8, display: 'flex', gap: 5, alignItems: 'center' }}>
                  <Icon name="alert" size={12} color="var(--red)" /> {addZoneErr}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button variant="ghost" size="sm" onClick={() => setAddZoneStep('pick')} disabled={addZoneSaving}>← Back</Button>
                {addZoneSaving && (
                  <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Spinner size={12} dark /> Applying…
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </Drawer>
  );
}

function AddAttendeeModal({ eventId, onClose, onCreated }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    eventsApi.getTicketTypes(eventId)
      .then((data) => {
        if (cancelled) return;
        const list = data ?? [];
        setTypes(list);
        if (list.length) setTicketTypeId(list[0].id);
      })
      .catch((ex) => { if (!cancelled) setErr(ex.message || 'Failed to load ticket types'); })
      .finally(() => { if (!cancelled) setTypesLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return setErr('First and last name are required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Enter a valid email');
    if (!ticketTypeId) return setErr('Select a ticket type');
    setSaving(true);
    setErr('');
    try {
      const created = await ticketsApi.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        eventId,
        ticketTypeId,
        sendEmail,
      });
      onCreated(created);
    } catch (ex) {
      setErr(ex.message || 'Failed to add attendee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(20,20,24,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={onClose}
    >
      <div
        className="card pop-in"
        style={{ width: 400, maxWidth: 'calc(100vw - 32px)', padding: '28px', boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add attendee</div>
          <Button variant="subtle" icon="x" onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>First name</label>
              <input
                className="inp"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Last name</label>
              <input
                className="inp"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Email</label>
            <input
              className="inp"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Ticket type</label>
            <select
              className="inp"
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
              disabled={typesLoading || types.length === 0}
            >
              {typesLoading ? (
                <option value="">Loading…</option>
              ) : types.length === 0 ? (
                <option value="">No ticket types — create one first</option>
              ) : (
                types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.price != null ? ` · $${Number(t.price).toFixed(2)}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer',
            padding: '10px 12px', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 'var(--r)',
          }}>
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              style={{ width: 15, height: 15, marginTop: 1, accentColor: 'var(--orange)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>
              Email the ticket now
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                Otherwise it's created silently and can be sent later.
              </span>
            </span>
          </label>
          {err && (
            <div style={{ color: 'var(--red)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={13} color="var(--red)" />
              {err}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving || typesLoading || types.length === 0}>
              {saving ? <Spinner size={14} /> : 'Add attendee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}

export default function Attendees() {
  const { eventId } = useParams();
  const { currentEvent } = useApp();
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    eventsApi.getTickets(eventId, 0, 200)
      .then((data) => {
        if (!cancelled) setAllTickets(data?.content ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load attendees');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId]);

  function reloadTickets() {
    return eventsApi.getTickets(eventId, 0, 200)
      .then((data) => setAllTickets(data?.content ?? []))
      .catch(() => {});
  }

  // Single-ticket resend — kicks off async job, returns { jobId } for STOMP tracking in drawer.
  async function handleResend(ticket) {
    return ticketsApi.resend(ticket.id);
  }

  // Called by the drawer once the STOMP job reports COMPLETED; refreshes the row.
  async function handleResendComplete(ticketId) {
    try {
      const updated = await ticketsApi.get(ticketId);
      setAllTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updated } : t)));
      setSelected((cur) => (cur && cur.id === ticketId ? { ...cur, ...updated } : cur));
    } catch {}
  }

  function handleTicketUpdated(updated) {
    setAllTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setSelected((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
  }

  const typeOptions = useMemo(() => {
    const seen = new Map();
    for (const t of allTickets) {
      if (t.ticketType && !seen.has(t.ticketType.id)) {
        seen.set(t.ticketType.id, t.ticketType.name);
      }
    }
    return [['', 'All types'], ...Array.from(seen.entries()).map(([id, name]) => [id, name])];
  }, [allTickets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTickets.filter((t) => {
      const name = `${t.firstName} ${t.lastName}`.toLowerCase();
      const email = (t.email || '').toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;
      if (typeFilter && t.ticketType?.id !== typeFilter) return false;
      return true;
    });
  }, [allTickets, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function openDrawer(ticket) {
    setSelected(ticket);
    setDrawerOpen(true);
  }

  function handleSearch(v) {
    setSearch(v);
    setPage(0);
  }

  function handleTypeFilter(v) {
    setTypeFilter(v);
    setPage(0);
  }

  if (loading) return <LoadingCenter />;

  return (
    <div className="fade-in page-content">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex' }}>
            <Icon name="search" size={14} />
          </span>
          <input
            className="inp"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <FilterSelect
          value={typeFilter}
          onChange={handleTypeFilter}
          options={typeOptions}
          icon="ticket"
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button variant="ghost" icon="mail" onClick={() => setSendOpen(true)} disabled={allTickets.length === 0}>
            Send tickets
          </Button>
          <Button variant="ghost" icon="upload" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>
            Add attendee
          </Button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--r)', padding: '12px 16px',
          color: 'var(--red)', fontSize: 13, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alert" size={14} color="var(--red)" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {pageItems.length === 0 ? (
          <Empty
            icon="users"
            title={search || typeFilter ? 'No matching attendees' : 'No attendees yet'}
            subtitle={search || typeFilter ? 'Try a different search or filter.' : 'Import a CSV or add attendees manually.'}
            action={
              !search && !typeFilter
                ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" icon="upload" onClick={() => setImportOpen(true)}>Import CSV</Button>
                    <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Add attendee</Button>
                  </div>
                )
                : null
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Ticket Type</th>
                  <th>Delivery</th>
                  <th>Ticket ID</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((ticket) => (
                  <tr
                    key={ticket.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDrawer(ticket)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={`${ticket.firstName} ${ticket.lastName}`} size={30} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {ticket.firstName} {ticket.lastName}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{ticket.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <TypePill ticketType={ticket.ticketType} />
                    </td>
                    <td>
                      <DeliveryBadge lastSent={ticket.lastTicketSent} />
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                        {String(ticket.id || '').slice(0, 8)}…
                      </span>
                    </td>
                    <td>
                      <Icon name="chevright" size={14} color="var(--text-3)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 4 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            {filtered.length} attendee{filtered.length !== 1 ? 's' : ''} · Page {safePage + 1} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button
              variant="ghost"
              size="sm"
              icon="arrowleft"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="arrowright"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </div>
        </div>
      )}

      {/* Ticket Drawer */}
      <TicketDrawer
        ticket={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onResend={handleResend}
        onResendComplete={handleResendComplete}
        onUpdate={handleTicketUpdated}
      />

      {/* Bulk Send Wizard */}
      {sendOpen && (
        <SendTicketsWizard
          eventId={eventId}
          eventName={currentEvent?.name}
          tickets={allTickets}
          onClose={() => setSendOpen(false)}
          onDone={() => {
            setSendOpen(false);
            reloadTickets();
          }}
        />
      )}

      {/* Add Attendee Modal */}
      {addOpen && (
        <AddAttendeeModal
          eventId={eventId}
          onClose={() => setAddOpen(false)}
          onCreated={(ticket) => {
            setAddOpen(false);
            setAllTickets((prev) => [ticket, ...prev]);
            setPage(0);
          }}
        />
      )}

      {/* Import Wizard */}
      {importOpen && (
        <ImportWizard
          onClose={() => setImportOpen(false)}
          onDone={(count) => {
            setImportOpen(false);
            setLoading(true);
            eventsApi.getTickets(eventId, 0, 200)
              .then((data) => setAllTickets(data?.content ?? []))
              .catch(() => {})
              .finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}
