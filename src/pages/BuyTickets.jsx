import { useState, useEffect } from 'react';
import { eventsApi } from '../api/events';
import { ordersApi } from '../api/orders';
import { money } from '../api/zoneTypes';
import { orderStatusLabel } from '../lib/orderStatus';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' }}>{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function BuyTickets() {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [eventId, setEventId] = useState('');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ttLoading, setTtLoading] = useState(false);
  const [ticketTypeId, setTicketTypeId] = useState('');

  const [buyerEmail, setBuyerEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [providerId, setProviderId] = useState('etransfer');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    eventsApi.list(0, 100)
      .then((page) => setEvents(page.content ?? []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    if (!eventId) { setTicketTypes([]); setTicketTypeId(''); return; }
    setTtLoading(true);
    eventsApi.getTicketTypes(eventId)
      .then((types) => {
        const active = (types ?? []).filter((t) => t.isActive !== false);
        setTicketTypes(active);
        setTicketTypeId(active.length === 1 ? active[0].id : '');
      })
      .catch(() => setTicketTypes([]))
      .finally(() => setTtLoading(false));
  }, [eventId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await ordersApi.create({
        buyerEmail,
        eventId,
        providerId: providerId || undefined,
        items: [{
          ticketTypeId,
          attendeeFirstName: firstName,
          attendeeLastName: lastName,
          attendeeEmail,
        }],
      });
      setOrder(result);
    } catch (ex) {
      setError(ex.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    const p = order.payment ?? {};
    return (
      <div style={pageStyle}>
        <div style={cardStyle} className="pop-in">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--green-soft)', margin: '0 auto 20px',
          }}>
            <Icon name="check" size={24} color="var(--green)" />
          </div>
          <h2 style={headingStyle}>Order placed</h2>
          <p style={subStyle}>Your order is pending payment. Follow the instructions below.</p>

          <div style={infoBox}>
            <Row label="Reference" value={order.referenceCode} mono />
            <Row label="Status" value={orderStatusLabel(order.status)} />
            <Row label="Total" value={money(order.amountTotal)} />
            <Row label="Currency" value={order.currency} />
          </div>

          {p.instructions && (
            <div style={{
              marginTop: 16, background: 'var(--amber-soft)',
              border: '1px solid rgba(217,119,6,0.25)', borderRadius: 'var(--r)',
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Payment Instructions
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {p.instructions}
              </p>
            </div>
          )}

          {p.details && Object.keys(p.details).length > 0 && (
            <div style={{ ...infoBox, marginTop: 12 }}>
              {Object.entries(p.details).map(([k, v]) => (
                <Row key={k} label={k} value={v} />
              ))}
            </div>
          )}

          {p.redirectUrl && (
            <a
              href={p.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ marginTop: 16, width: '100%', justifyContent: 'center', fontSize: 14 }}
            >
              Complete payment
              <Icon name="arrowright" size={15} />
            </a>
          )}

          <button
            className="btn btn-ghost"
            style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
            onClick={() => { setOrder(null); setFirstName(''); setLastName(''); setAttendeeEmail(''); setBuyerEmail(''); }}
          >
            Place another order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={headingStyle}>Buy Tickets</h1>
          <p style={subStyle}>Select an event and fill in attendee details.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Section title="Event">
            <Field label="Event">
              {eventsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
                  <Spinner size={14} /> Loading events…
                </div>
              ) : (
                <select
                  className="inp"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  required
                  style={{ height: 40, fontSize: 13.5 }}
                >
                  <option value="">Select an event…</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              )}
            </Field>

            {eventId && (
              <Field label="Ticket Type">
                {ttLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
                    <Spinner size={14} /> Loading ticket types…
                  </div>
                ) : ticketTypes.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No active ticket types for this event.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ticketTypes.map((tt) => {
                      const selected = ticketTypeId === tt.id;
                      return (
                        <label
                          key={tt.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 'var(--r)',
                            border: `1px solid ${selected ? 'var(--orange)' : 'var(--border-2)'}`,
                            background: selected ? 'var(--orange-softer)' : 'var(--surface-2)',
                            cursor: 'pointer', transition: 'border-color .12s, background .12s',
                          }}
                        >
                          <input
                            type="radio"
                            name="ticketType"
                            value={tt.id}
                            checked={selected}
                            onChange={() => setTicketTypeId(tt.id)}
                            style={{ accentColor: 'var(--orange)' }}
                          />
                          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{tt.name}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
                            {money(tt.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>
            )}
          </Section>

          {ticketTypeId && (
            <>
              <div style={{ height: 1, background: 'var(--border)' }} />

              <Section title="Attendee">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="First name">
                    <input className="inp" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      required placeholder="Jane" style={{ height: 40, fontSize: 13.5 }} />
                  </Field>
                  <Field label="Last name">
                    <input className="inp" value={lastName} onChange={(e) => setLastName(e.target.value)}
                      required placeholder="Doe" style={{ height: 40, fontSize: 13.5 }} />
                  </Field>
                </div>
                <Field label="Attendee email">
                  <input className="inp" type="email" value={attendeeEmail} onChange={(e) => setAttendeeEmail(e.target.value)}
                    required placeholder="jane@example.com" style={{ height: 40, fontSize: 13.5 }} />
                </Field>
              </Section>

              <div style={{ height: 1, background: 'var(--border)' }} />

              <Section title="Billing">
                <Field label="Buyer email (for receipt)">
                  <input className="inp" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
                    required placeholder="buyer@example.com" style={{ height: 40, fontSize: 13.5 }} />
                </Field>
                <Field label="Payment provider ID">
                  <input className="inp" value={providerId} onChange={(e) => setProviderId(e.target.value)}
                    placeholder="etransfer" style={{ height: 40, fontSize: 13.5 }} />
                </Field>
              </Section>

              {error && (
                <div style={{
                  background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 'var(--r)', padding: '10px 14px',
                  color: 'var(--red)', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Icon name="alert" size={14} color="var(--red)" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ height: 44, fontSize: 14, fontWeight: 600, justifyContent: 'center', borderRadius: 'var(--r)' }}
              >
                {submitting ? <><Spinner size={15} />&nbsp;Placing order…</> : 'Place order'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--text-3)', width: 90, flexShrink: 0 }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ color: 'var(--text)', fontSize: mono ? 12 : 13 }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '40px 16px',
};

const cardStyle = {
  background: 'var(--surface)',
  borderRadius: 'var(--r-xl)',
  padding: '36px 40px',
  width: '100%',
  maxWidth: 520,
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border)',
};

const headingStyle = {
  margin: '0 0 6px',
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: '-0.025em',
  color: 'var(--text)',
};

const subStyle = {
  margin: 0,
  fontSize: 13.5,
  color: 'var(--text-2)',
  lineHeight: 1.5,
};

const infoBox = {
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r)',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
