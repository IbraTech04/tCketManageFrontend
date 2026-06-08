import { useState, useMemo } from 'react';
import { eventsApi } from '../api/events';
import Icon from './ui/Icon';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Portal from './ui/Portal';

/**
 * Bulk ticket-send flow with deliberate guard rails. Sending real email to
 * every attendee is irreversible, so the user passes through three distinct
 * confirmation gates before anything is sent:
 *   1. Scope     — choose who receives email, see the recipient count.
 *   2. Acknowledge — explicitly tick that this sends real email.
 *   3. Confirm   — type the exact recipient count to arm the send button.
 * A fourth screen reports the delivery result.
 */

const SCOPES = {
  all: {
    id: 'all',
    label: 'Resend to everyone',
    desc: 'Send a fresh ticket email to every attendee, including those who already received one.',
    icon: 'users',
    endpoint: (id) => eventsApi.resendTickets(id),
  },
  missing: {
    id: 'missing',
    label: 'Send to missing only',
    desc: "Send only to attendees who have never received their ticket. Anyone already sent is skipped.",
    icon: 'mail',
    endpoint: (id) => eventsApi.sendMissingTickets(id),
  },
};

function Dots({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: i === step ? 18 : 6, height: 6, borderRadius: 3,
          background: i === step ? 'var(--orange)' : i < step ? 'var(--green)' : 'var(--border)',
          transition: 'all .2s',
        }} />
      ))}
    </div>
  );
}

function ScopeCard({ scope, count, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        all: 'unset', boxSizing: 'border-box', width: '100%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', borderRadius: 'var(--r-lg)',
        border: `1.5px solid ${selected ? 'var(--orange)' : 'var(--border)'}`,
        background: selected ? 'rgba(255,106,26,0.06)' : 'var(--surface)',
        transition: 'border-color .15s, background .15s',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? 'var(--orange)' : 'var(--surface-3)',
      }}>
        <Icon name={scope.icon} size={17} color={selected ? '#fff' : 'var(--text-2)'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{scope.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
            background: selected ? 'var(--orange)' : 'var(--surface-3)',
            color: selected ? '#fff' : 'var(--text-2)',
          }}>
            {count} {count === 1 ? 'email' : 'emails'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.45 }}>
          {disabled ? 'Everyone has already received their ticket.' : scope.desc}
        </div>
      </div>
      {selected && <Icon name="check" size={16} color="var(--orange)" />}
    </button>
  );
}

export default function SendTicketsWizard({ eventId, eventName, tickets = [], onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [scopeId, setScopeId] = useState('all');
  const [ack, setAck] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const counts = useMemo(() => {
    const total = tickets.length;
    const missing = tickets.filter((t) => !t.lastTicketSent).length;
    return { all: total, missing };
  }, [tickets]);

  const scope = SCOPES[scopeId];
  const recipientCount = counts[scopeId] ?? 0;
  const confirmed = confirmText.trim() === String(recipientCount);

  async function handleSend() {
    setSending(true);
    setError('');
    try {
      const res = await scope.endpoint(eventId);
      setResult(res);
      setStep(3);
    } catch (ex) {
      setError(ex.message || 'Failed to send tickets');
    } finally {
      setSending(false);
    }
  }

  function close() {
    // Tell the parent to refresh if anything was actually sent.
    if (result) onDone?.(result);
    else onClose();
  }

  const isLast = step === 3;

  return (
    <Portal>
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20,20,24,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={isLast ? undefined : onClose}
    >
      <div
        className="card pop-in"
        style={{ width: 480, maxWidth: '100%', padding: 0, boxShadow: 'var(--shadow-pop)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, background: 'var(--orange)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="mail" size={15} color="#fff" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Send tickets</span>
          </div>
          {!isLast && <Button variant="subtle" icon="x" onClick={onClose} />}
        </div>

        <div style={{ padding: '22px 24px', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
          {/* Step 0 — scope */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Who should receive an email?</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>
                  {eventName ? <><b>{eventName}</b> · </> : null}{counts.all} attendee{counts.all !== 1 ? 's' : ''} · {counts.missing} not yet sent
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ScopeCard scope={SCOPES.all} count={counts.all} selected={scopeId === 'all'} onClick={() => setScopeId('all')} />
                <ScopeCard scope={SCOPES.missing} count={counts.missing} selected={scopeId === 'missing'} disabled={counts.missing === 0} onClick={() => setScopeId('missing')} />
              </div>
            </div>
          )}

          {/* Step 1 — acknowledge */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--orange)' }}>
                  {recipientCount}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500, marginTop: 2 }}>
                  real email{recipientCount !== 1 ? 's' : ''} will be sent
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  {scope.label} · {eventName || 'this event'}
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 10, padding: '12px 14px',
                background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.22)',
                borderRadius: 'var(--r-lg)',
              }}>
                <Icon name="alert" size={16} color="var(--amber)" style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: 'var(--amber)', lineHeight: 1.5 }}>
                  Emails go out to attendees immediately and cannot be recalled. Double-check the recipient count before continuing.
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: 1, accentColor: 'var(--orange)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>
                  I understand this sends real ticket emails to {recipientCount} attendee{recipientCount !== 1 ? 's' : ''}.
                </span>
              </label>
            </div>
          )}

          {/* Step 2 — type-to-confirm */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em' }}>Final confirmation</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>
                  To send <b>{scope.label.toLowerCase()}</b>, type the number of recipients
                  {' '}<b style={{ color: 'var(--text)' }}>{recipientCount}</b> below to confirm.
                </div>
              </div>
              <input
                className="inp"
                inputMode="numeric"
                placeholder={`Type ${recipientCount} to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                style={{
                  fontSize: 16, textAlign: 'center', letterSpacing: '0.05em',
                  borderColor: confirmText && !confirmed ? 'var(--red)' : confirmed ? 'var(--green)' : undefined,
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && confirmed && !sending) handleSend(); }}
              />
              {confirmText && !confirmed && (
                <div style={{ fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="alert" size={12} color="var(--red)" /> That doesn't match {recipientCount}.
                </div>
              )}
              {error && (
                <div style={{
                  display: 'flex', gap: 8, padding: '10px 12px',
                  background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 'var(--r)', color: 'var(--red)', fontSize: 12.5,
                }}>
                  <Icon name="alert" size={14} color="var(--red)" /> {error}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — result */}
          {step === 3 && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: result.failed > 0 ? 'var(--amber-soft)' : 'var(--green-soft)',
              }}>
                <Icon name={result.failed > 0 ? 'alert' : 'check'} size={26} color={result.failed > 0 ? 'var(--amber)' : 'var(--green)'} stroke={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {result.failed > 0 ? 'Sent with some failures' : 'Tickets sent'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>
                  {result.sent} of {result.total} email{result.total !== 1 ? 's' : ''} delivered
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                {[['Total', result.total, 'var(--text)'], ['Sent', result.sent, 'var(--green)'], ['Failed', result.failed, result.failed > 0 ? 'var(--red)' : 'var(--text-3)']].map(([label, val, color]) => (
                  <div key={label} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 'var(--r-lg)',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
        }}>
          {isLast ? <span /> : <Dots step={step} total={3} />}
          <div style={{ display: 'flex', gap: 8 }}>
            {isLast ? (
              <Button variant="primary" icon="check" onClick={close}>Done</Button>
            ) : (
              <>
                {step > 0 && (
                  <Button variant="ghost" icon="arrowleft" onClick={() => setStep((s) => s - 1)} disabled={sending}>Back</Button>
                )}
                {step === 0 && (
                  <Button variant="primary" iconRight="arrowright" onClick={() => setStep(1)} disabled={recipientCount === 0}>Continue</Button>
                )}
                {step === 1 && (
                  <Button variant="primary" iconRight="arrowright" onClick={() => setStep(2)} disabled={!ack}>Continue</Button>
                )}
                {step === 2 && (
                  <Button variant="primary" icon={sending ? undefined : 'mail'} onClick={handleSend} disabled={!confirmed || sending}>
                    {sending ? <><Spinner size={14} /> Sending…</> : `Send ${recipientCount} email${recipientCount !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
