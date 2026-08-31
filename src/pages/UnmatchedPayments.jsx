import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { money } from '../api/zoneTypes';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Empty from '../components/ui/Empty';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/StatusBadge';
import ThemeToggle from '../components/ui/ThemeToggle';

/**
 * Review queue for e-Transfers that arrived but matched no order.
 *
 * Not scoped to an event, because an unmatched payment has no order and therefore
 * no event — which is exactly why it lives at its own top-level route rather than
 * as a tab inside the event dashboard.
 *
 * The screen deliberately shows evidence rather than a score. An operator is being
 * asked to attach real money to an order; "amount matches, code is one character
 * out" is a claim they can check against the memo in front of them, where "87%
 * confident" is one they can only defer to. Deferring is how the wrong order gets
 * confirmed, and nothing here settles anything without a click.
 */

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

/** How near the memo came to this order's code, in plain words. */
function codeConfidence(distance) {
  if (distance === 0) return { label: 'Code matches exactly', tone: 'green' };
  if (distance === 1) return { label: '1 character off', tone: 'amber' };
  return { label: `${distance} characters off`, tone: 'amber' };
}

function Evidence({ ok, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5,
      color: ok ? 'var(--green)' : 'var(--text-3)',
    }}>
      <Icon name={ok ? 'check' : 'x'} size={11} color={ok ? 'var(--green)' : 'var(--text-3)'} />
      {children}
    </span>
  );
}

function SuggestionRow({ suggestion, busy, onLink }) {
  const confidence = codeConfidence(suggestion.codeDistance);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 13px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
            {suggestion.referenceCode}
          </span>
          <StatusBadge status={suggestion.status} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5 }}>
          {suggestion.buyerEmail || '—'} · {money(suggestion.amountTotal || 0)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={{
            fontSize: 11.5,
            color: confidence.tone === 'green' ? 'var(--green)' : 'var(--amber)',
            fontWeight: 500,
          }}>
            {confidence.label}
          </span>
          <Evidence ok={suggestion.amountMatches}>
            {suggestion.amountMatches ? 'Amount matches' : 'Amount differs'}
          </Evidence>
          <Evidence ok={suggestion.withinHoldWindow}>
            {suggestion.withinHoldWindow ? 'Paid within hold' : 'Outside hold window'}
          </Evidence>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onLink(suggestion.orderId)}
        disabled={!!busy}
        style={{ flexShrink: 0 }}
      >
        {busy === suggestion.orderId ? <Spinner size={13} /> : 'Link & settle'}
      </Button>
    </div>
  );
}

function PaymentCard({ payment, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [dismissOpen, setDismissOpen] = useState(false);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState(null);

  // Suggestions are fetched only when a row is opened — see the API module for why
  // they are not part of the listing.
  useEffect(() => {
    if (!expanded || suggestions !== null) return;
    let cancelled = false;
    setLoadingSuggestions(true);
    ordersApi.paymentSuggestions(payment.id)
      .then((data) => { if (!cancelled) setSuggestions(data ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load suggestions'); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });
    return () => { cancelled = true; };
  }, [expanded, suggestions, payment.id]);

  async function handleLink(orderId) {
    setBusy(orderId);
    setError('');
    try {
      const order = await ordersApi.linkPayment(payment.id, orderId);
      // REFUND_PENDING means the seats were gone by the time anyone looked. That is
      // not a failure of the link — it is the answer — so it is reported, not hidden.
      setOutcome(order?.status ?? 'PAID');
      onResolved(payment.id, order);
    } catch (ex) {
      setError(ex.message || 'Could not link payment');
      setBusy(null);
    }
  }

  async function handleDismiss() {
    setBusy('dismiss');
    setError('');
    try {
      await ordersApi.dismissPayment(payment.id, note);
      onResolved(payment.id, null);
    } catch (ex) {
      setError(ex.message || 'Could not dismiss payment');
      setBusy(null);
    }
  }

  if (outcome) {
    const refunding = outcome === 'REFUND_PENDING';
    return (
      <div className="card" style={{
        padding: '14px 16px',
        borderColor: refunding ? 'var(--amber-border)' : 'var(--green-border)',
        background: refunding ? 'var(--amber-soft)' : 'var(--green-soft)',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: refunding ? 'var(--amber)' : 'var(--green)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name={refunding ? 'alert' : 'check'} size={13} color={refunding ? 'var(--amber)' : 'var(--green)'} />
          {refunding ? 'Linked — but the seats were gone' : 'Linked and settled'}
        </div>
        {refunding && (
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 6 }}>
            The hold had lapsed and the seats were resold, so the order is queued for a refund
            instead of issuing tickets.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Summary */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '13px 16px', cursor: 'pointer',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: 'var(--amber-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="card" size={15} color="var(--amber)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {money(payment.amount || 0)} from {payment.senderName || 'unknown sender'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            {formatDate(payment.emailReceivedAt)}
            {payment.interacReference && (
              <> · <span className="mono">{payment.interacReference}</span></>
            )}
          </div>
        </div>
        <Icon name={expanded ? 'chevdown' : 'chevright'} size={14} color="var(--text-3)" />
      </div>

      {/* The memo, always visible: it is what the operator reads to spot the typo. */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>Memo</div>
        <div className="mono" style={{ fontSize: 12.5, wordBreak: 'break-word' }}>
          {payment.memo || <span style={{ color: 'var(--text-3)' }}>(empty)</span>}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          {error && (
            <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={13} color="var(--red)" />
              {error}
            </div>
          )}

          {loadingSuggestions ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 12.5 }}>
              <Spinner size={14} dark /> Looking for matching orders…
            </div>
          ) : (
            <>
              <div style={{
                fontSize: 11, fontWeight: 500, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8,
              }}>
                {suggestions?.length ? 'Possible orders' : 'No matching orders'}
              </div>

              {suggestions?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                  {suggestions.map((s) => (
                    <SuggestionRow key={s.orderId} suggestion={s} busy={busy} onLink={handleLink} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
                  Nothing in the memo resembles an open order's code. This payment may belong to
                  someone else, or the order may already be paid.
                </div>
              )}

              {/* Dismissal */}
              {!dismissOpen ? (
                <Button variant="ghost" size="sm" onClick={() => setDismissOpen(true)} disabled={!!busy}>
                  Not one of ours…
                </Button>
              ) : (
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                    Write this payment off?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                    It leaves the queue but stays on record. Say why — "sent to us by mistake,
                    refunded by hand" is the difference between a resolved queue and a mystery in
                    six months.
                  </div>
                  <input
                    className="inp"
                    placeholder="Reason (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" size="sm" onClick={handleDismiss} disabled={!!busy}>
                      {busy === 'dismiss' ? <Spinner size={13} /> : 'Dismiss'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDismissOpen(false)} disabled={!!busy}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function UnmatchedPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    ordersApi.unmatchedPayments()
      .then((data) => { if (!cancelled) setPayments(data ?? []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load unmatched payments'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Resolved rows stay on screen showing their outcome rather than vanishing, so an
  // operator can see what just happened before it scrolls away. Only dismissals are
  // removed outright, since there is nothing further to report about them.
  function handleResolved(paymentId, order) {
    if (!order) setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={26} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ThemeToggle variant="ghost" />
          <Button variant="ghost" icon="chevleft" onClick={() => navigate('/events')}>
            Events
          </Button>
        </div>
      </header>

      <div className="fade-in page-content" style={{ maxWidth: 780, margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 19, fontWeight: 650, margin: '0 0 5px' }}>Unmatched payments</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
            e-Transfers that reached us but couldn't be tied to an order — usually a mistyped or
            missing reference code. Nothing flags these on the order itself, so until one is
            resolved the buyer's seats will expire and be resold even though they paid.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--red-soft)', border: '1px solid var(--red-border)',
            borderRadius: 'var(--r)', padding: '12px 16px', color: 'var(--red)', fontSize: 13,
            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="alert" size={14} color="var(--red)" />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 10, color: 'var(--text-3)' }}>
            <Spinner size={20} dark />
            <span style={{ fontSize: 13.5 }}>Loading payments…</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="card">
            <Empty
              icon="check"
              title="Nothing waiting"
              subtitle="Every e-Transfer that arrived has been matched to an order."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {payments.map((p) => (
              <PaymentCard key={p.id} payment={p} onResolved={handleResolved} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
