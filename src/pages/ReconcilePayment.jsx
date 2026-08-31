import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { money } from '../api/zoneTypes';
import { alignCode, distanceLabel } from '../lib/codeDiff';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/StatusBadge';

/**
 * Three-pane reconciler for one unmatched e-Transfer.
 *
 * Left is theirs — the bank's account of what happened, immutable. Right is ours — the orders it
 * might belong to. The centre is the resolution, and it shows its working.
 *
 * There is deliberately no score anywhere on this screen. A number is the one thing an operator
 * cannot check; every claim here is a field they can read and disagree with. The payer's name is
 * shown for the same reason it is never marked agree-or-conflict: a bank's name for an account is
 * routinely not the buyer's name on the order, so agreement proves little and disagreement proves
 * nothing.
 */

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

const CHAR_STYLE = {
  same: { background: 'var(--surface-3)', color: 'var(--text-2)' },
  differs: { background: 'var(--red-soft)', color: 'var(--red)' },
  missing: { background: 'var(--amber-soft)', color: 'var(--amber)' },
};

function CodeRow({ label, chars }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 92, flexShrink: 0, fontSize: 11.5, color: 'var(--text-3)', textAlign: 'right' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 2 }}>
        {chars.map((c, i) => (
          <span
            key={i}
            className="mono"
            style={{
              fontSize: 19, fontWeight: 500, width: 20, textAlign: 'center',
              padding: '3px 0', borderRadius: 5, ...CHAR_STYLE[c.state],
            }}
          >
            {c.char}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One comparison row. `mark` null means "shown, not scored". */
function CompareRow({ label, left, rlabel, right, mark, rightColor }) {
  const marks = {
    agree: { glyph: '=', background: 'var(--green-soft)', color: 'var(--green)' },
    conflict: { glyph: '≠', background: 'var(--red-soft)', color: 'var(--red)' },
    info: { glyph: '~', background: 'var(--surface-3)', color: 'var(--text-3)' },
  };
  const m = marks[mark] ?? marks.info;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 64px 1fr', alignItems: 'center',
      padding: '13px 20px', borderBottom: '1px solid var(--surface-3)',
    }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{left}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span className="mono" style={{
          fontSize: 14, fontWeight: 600, width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, background: m.background, color: m.color,
        }}>{m.glyph}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{rlabel}</div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: rightColor || 'var(--text)' }}>{right}</div>
      </div>
    </div>
  );
}

function PaneHeading({ children, dot, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px',
      borderBottom: '1px solid var(--border)',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
        textTransform: 'uppercase', color: 'var(--text-2)',
      }}>{children}</div>
      {count !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
          background: 'var(--surface-3)', color: 'var(--text-2)',
        }}>{count}</span>
      )}
    </div>
  );
}

export default function ReconcilePayment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [queue, setQueue] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [picked, setPicked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [outcome, setOutcome] = useState(null);

  // Manual lookup, for the payment no algorithm could place.
  const [manualCode, setManualCode] = useState('');
  const [manualFound, setManualFound] = useState(null);
  const [manualError, setManualError] = useState('');
  const [looking, setLooking] = useState(false);

  const [dismissOpen, setDismissOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([ordersApi.unmatchedPayments(), ordersApi.paymentSuggestions(id)])
      .then(([all, sugg]) => {
        if (cancelled) return;
        const list = all ?? [];
        setQueue(list);
        const found = list.find((p) => p.id === id);
        setPayment(found ?? null);
        setSuggestions(sugg ?? []);
        setPicked(0);
        if (!found) setError('This payment is no longer in the queue — it may have just been resolved.');
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load payment'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const selected = suggestions?.[picked] ?? null;
  const position = queue.findIndex((p) => p.id === id);
  const nextPayment = queue.find((p) => p.id !== id) ?? null;

  const link = useCallback(async (orderId) => {
    setBusy(orderId);
    setActionError('');
    try {
      const order = await ordersApi.linkPayment(id, orderId);
      // REFUND_PENDING is an outcome, not a failure: the hold lapsed and the seats were resold, so
      // the payment is recorded against the right order and someone owes the buyer a refund.
      setOutcome({ status: order?.status ?? 'PAID', code: order?.referenceCode, orderId });
    } catch (ex) {
      setActionError(ex.message || 'Could not link payment');
      setBusy(null);
    }
  }, [id]);

  // Merge-tool muscle memory: move the selection, commit the focused one.
  useEffect(() => {
    if (outcome || !suggestions?.length) return undefined;
    function onKey(e) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPicked((p) => Math.min(p + 1, suggestions.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPicked((p) => Math.max(p - 1, 0));
      } else if (e.key === 'Enter' && suggestions[picked] && !busy) {
        e.preventDefault();
        link(suggestions[picked].orderId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [suggestions, picked, busy, outcome, link]);

  const diff = useMemo(
    () => (selected ? alignCode(selected.memoExcerpt, selected.referenceCode) : null),
    [selected]
  );

  async function lookupManual() {
    const value = manualCode.trim();
    if (!value) return;
    setLooking(true);
    setManualError('');
    setManualFound(null);
    try {
      const matches = await ordersApi.byReferenceCode(value);
      if (!matches || matches.length === 0) setManualError(`No order has the code ${value.toUpperCase()}.`);
      else setManualFound(matches[0]);
    } catch (ex) {
      setManualError(ex.message || 'Lookup failed');
    } finally {
      setLooking(false);
    }
  }

  async function dismiss() {
    setBusy('dismiss');
    setActionError('');
    try {
      await ordersApi.dismissPayment(id, note);
      setOutcome({ status: 'DISMISSED' });
    } catch (ex) {
      setActionError(ex.message || 'Could not dismiss payment');
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-3)',
      }}>
        <Spinner size={22} dark />
        <span style={{ fontSize: 13.5 }}>Loading payment…</span>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 520, margin: '80px auto', padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 13.5, marginBottom: 12 }}>
            <Icon name="alert" size={15} color="var(--red)" />
            {error || 'Payment not found'}
          </div>
          <Button variant="ghost" onClick={() => navigate('/payments/unmatched')}>Back to the queue</Button>
        </div>
      </div>
    );
  }

  if (outcome) return <Outcome outcome={outcome} next={nextPayment} navigate={navigate} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, height: 56, padding: '0 20px',
        background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <Button variant="subtle" icon="chevleft" onClick={() => navigate('/payments/unmatched')} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Reconcile payment</div>
        {position >= 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            {position + 1} of {queue.length} unmatched
          </div>
        )}
        <div style={{ flexGrow: 1 }} />
        {suggestions?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-3)' }}>
            <Kbd>J</Kbd><Kbd>K</Kbd><span>move</span>
            <span style={{ marginLeft: 6 }}><Kbd>↵</Kbd></span><span>link</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {/* LEFT — theirs */}
        <div style={{
          display: 'flex', flexDirection: 'column', width: 360, flexShrink: 0,
          background: 'var(--surface)', borderRight: '1px solid var(--border)', overflowY: 'auto',
        }}>
          <PaneHeading dot="var(--amber)">Payment as received</PaneHeading>

          <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 3 }}>
              {money(payment.amount || 0, payment.currency || 'CAD')}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              from <span style={{ color: 'var(--text)', fontWeight: 500 }}>{payment.senderName || 'unknown sender'}</span>
            </div>
          </div>

          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Memo, verbatim</div>
            <div className="mono" style={{
              fontSize: 13, lineHeight: 1.55, padding: '11px 12px', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 'var(--r)', wordBreak: 'break-word',
              color: payment.memo ? 'var(--text)' : 'var(--text-3)',
              fontStyle: payment.memo ? 'normal' : 'italic',
            }}>
              {payment.memo || '(empty)'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '16px 18px' }}>
            <Field label="Interac ref" mono>{payment.interacReference || '—'}</Field>
            <Field label="Received">{formatDate(payment.emailReceivedAt)}</Field>
            {payment.bodyDateText && <Field label="Notice date">{payment.bodyDateText}</Field>}
            <Field label="Sender">{payment.senderEmail || '—'}</Field>
          </div>

          <div style={{ flexGrow: 1 }} />
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Nothing on this side can be edited. It is what the bank told us.
            </div>
          </div>
        </div>

        {/* CENTRE — the resolution */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '13px 22px',
            background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
              textTransform: 'uppercase', color: 'var(--text-2)',
            }}>Reconciliation</div>
            <div style={{ flexGrow: 1 }} />
            {selected && (
              <>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Comparing against</div>
                <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{selected.referenceCode}</div>
              </>
            )}
          </div>

          <div style={{ flexGrow: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {selected ? (
              <>
                {/* A name-only candidate has no code to diff, so say why it is here instead of
                    showing an empty comparison the operator has to interpret. */}
                {selected.suggestedByNameOnly && (
                  <div className="card" style={{
                    padding: '14px 18px', borderColor: 'var(--blue-border)', background: 'var(--blue-soft)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <Icon name="search" size={14} color="var(--blue)" />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>
                        Found by the payer's name, not the code
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                      The memo held nothing resembling this order's code. It is here because the name
                      on the payment appears on the order — which is a way of finding it, not proof
                      it belongs. Check the amount and the timing before linking.
                    </div>
                  </div>
                )}

                {diff && (
                  <div className="card" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Reference code</div>
                      <div style={{
                        fontSize: 12,
                        color: selected.codeDistance === 0 ? 'var(--green)'
                          : selected.codeDistance === 1 ? 'var(--amber)' : 'var(--red)',
                      }}>{distanceLabel(selected.codeDistance)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <CodeRow label="they typed" chars={diff.typed} />
                      <CodeRow label="order has" chars={diff.actual} />
                    </div>
                  </div>
                )}

                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 64px 1fr', padding: '9px 20px',
                    background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Payment</div>
                    <div />
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                      Order {selected.referenceCode}
                    </div>
                  </div>

                  <CompareRow
                    label="Amount received"
                    left={`${money(payment.amount || 0, payment.currency || 'CAD')} ${payment.currency || 'CAD'}`}
                    rlabel="Order total"
                    right={`${money(selected.amountTotal || 0, selected.currency || 'CAD')} ${selected.currency || 'CAD'}`}
                    rightColor={selected.amountMatches ? undefined : 'var(--red)'}
                    mark={selected.amountMatches ? 'agree' : 'conflict'}
                  />
                  <CompareRow
                    label="Payment arrived"
                    left={shortDate(payment.emailReceivedAt)}
                    rlabel={selected.withinHoldWindow ? 'Inside the hold window' : 'Hold had lapsed'}
                    right={selected.withinHoldWindow
                      ? `Order placed ${shortDate(selected.createdAt)}`
                      : `Expired ${shortDate(selected.expiresAt)}`}
                    rightColor={selected.withinHoldWindow ? undefined : 'var(--amber)'}
                    mark={selected.withinHoldWindow ? 'agree' : 'conflict'}
                  />
                  <CompareRow
                    label="Payer, per the bank"
                    left={payment.senderName || '—'}
                    rlabel={selected.nameMatch === 'FULL' ? 'Buyer on the order — name matches'
                      : selected.nameMatch === 'PARTIAL' ? 'Buyer on the order — name partly matches'
                        : 'Buyer on the order'}
                    right={selected.buyerEmail || '—'}
                    rightColor="var(--text-2)"
                    mark={null}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 20px' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      The payer's name is how this order was found, but it is never scored — a bank's
                      name for an account is routinely not the buyer's name on the order. A parent
                      pays for a student; a joint account carries one name.
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: '28px 24px', textAlign: 'center' }}>
                <Icon name="search" size={26} color="var(--text-3)" />
                <div style={{ fontSize: 14.5, fontWeight: 600, margin: '12px 0 6px' }}>No order to compare against</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
                  Nothing in the memo resembles an open order's code. If you can tell which order this
                  is from the amount, the payer or the timing, name it on the right.
                </div>
              </div>
            )}

            {manualFound && (
              <div className="card" style={{ overflow: 'hidden', borderColor: 'var(--orange)' }}>
                <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                    Order you named
                  </div>
                </div>
                <CompareRow
                  label="Amount received"
                  left={`${money(payment.amount || 0, payment.currency || 'CAD')} ${payment.currency || 'CAD'}`}
                  rlabel="Order total"
                  right={`${money(manualFound.amountTotal || 0, manualFound.currency || 'CAD')} ${manualFound.currency || 'CAD'}`}
                  rightColor={Number(manualFound.amountTotal) === Number(payment.amount) ? undefined : 'var(--red)'}
                  mark={Number(manualFound.amountTotal) === Number(payment.amount) ? 'agree' : 'conflict'}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 20px' }}>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{manualFound.referenceCode}</span>
                  <StatusBadge status={manualFound.status} />
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{manualFound.buyerEmail}</span>
                  <div style={{ flexGrow: 1 }} />
                  <Button variant="primary" size="sm" onClick={() => link(manualFound.id)} disabled={!!busy}>
                    {busy === manualFound.id ? <Spinner size={13} /> : `Link to ${manualFound.referenceCode}`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px',
            background: 'var(--surface)', borderTop: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            {actionError && (
              <div style={{ width: '100%', color: 'var(--red)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="alert" size={13} color="var(--red)" />
                {actionError}
              </div>
            )}
            <Button
              variant="primary"
              icon={busy ? undefined : 'check'}
              disabled={!selected || !!busy}
              onClick={() => selected && link(selected.orderId)}
            >
              {busy === selected?.orderId
                ? <><Spinner size={14} /> Linking…</>
                : selected ? `Link to ${selected.referenceCode} & settle` : 'Link & settle'}
            </Button>
            <Button variant="ghost" disabled={!!busy} onClick={() => navigate('/payments/unmatched')}>
              Skip for now
            </Button>
            <div style={{ flexGrow: 1 }} />
            <Button variant="danger" disabled={!!busy} onClick={() => setDismissOpen((v) => !v)}>
              Not one of ours…
            </Button>
          </div>

          {dismissOpen && (
            <div style={{ padding: '14px 22px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>Write this payment off?</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
                It leaves the queue but stays on record, with who wrote it off and why. Reversible.
              </div>
              <input
                className="inp"
                placeholder="Reason — e.g. sent to us by mistake, refunded by hand"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginBottom: 10, maxWidth: 520 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="danger" size="sm" onClick={dismiss} disabled={!!busy}>
                  {busy === 'dismiss' ? <Spinner size={13} /> : 'Dismiss'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDismissOpen(false)} disabled={!!busy}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — ours */}
        <div style={{
          display: 'flex', flexDirection: 'column', width: 316, flexShrink: 0,
          background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto',
        }}>
          <PaneHeading count={suggestions?.length ?? 0}>Candidates</PaneHeading>

          {suggestions?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 12 }}>
              {suggestions.map((s, i) => (
                <div
                  key={s.orderId}
                  onClick={() => setPicked(i)}
                  style={{
                    cursor: 'pointer', padding: '11px 12px', borderRadius: 'var(--r)',
                    border: `1px solid ${i === picked ? 'var(--orange)' : 'var(--border)'}`,
                    background: i === picked ? 'var(--orange-softer)' : 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{s.referenceCode}</span>
                    <div style={{ flexGrow: 1 }} />
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                      background: s.suggestedByNameOnly ? 'var(--blue-soft)'
                        : s.codeDistance === 0 ? 'var(--green-soft)' : 'var(--amber-soft)',
                      color: s.suggestedByNameOnly ? 'var(--blue)'
                        : s.codeDistance === 0 ? 'var(--green)' : 'var(--amber)',
                    }}>
                      {s.suggestedByNameOnly ? 'name' : s.codeDistance === 0 ? 'exact' : `${s.codeDistance} off`}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 6 }}>{s.buyerEmail}</div>
                  <div style={{ display: 'flex', gap: 9 }}>
                    <span style={{ fontSize: 11, color: s.amountMatches ? 'var(--green)' : 'var(--red)' }}>
                      {s.amountMatches ? 'amount ✓' : 'amount ✗'}
                    </span>
                    <span style={{ fontSize: 11, color: s.withinHoldWindow ? 'var(--green)' : 'var(--text-3)' }}>
                      {s.withinHoldWindow ? 'in hold ✓' : 'hold lapsed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Nothing scored close enough to suggest.
              </div>
            </div>
          )}

          <div style={{ flexGrow: 1 }} />

          <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 9, lineHeight: 1.5 }}>
              Know which order this is? Name it yourself.
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <input
                className="inp mono"
                style={{ fontSize: 12 }}
                placeholder="ABCD-EFGH"
                value={manualCode}
                onChange={(e) => { setManualCode(e.target.value); setManualFound(null); setManualError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') lookupManual(); }}
              />
              <Button variant="ghost" size="sm" onClick={lookupManual} disabled={looking || !manualCode.trim()}>
                {looking ? <Spinner size={13} /> : 'Find'}
              </Button>
            </div>
            {manualError && (
              <div style={{ color: 'var(--red)', fontSize: 11.5, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="alert" size={12} color="var(--red)" />
                {manualError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span className="mono" style={{
      padding: '2px 6px', background: 'var(--surface-3)',
      border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
    }}>{children}</span>
  );
}

function Field({ label, children, mono }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <span style={{ width: 96, flexShrink: 0, color: 'var(--text-3)', fontSize: 12.5 }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: mono ? 12 : 12.5, wordBreak: 'break-word' }}>
        {children}
      </span>
    </div>
  );
}

/**
 * What happened, stated distinctly. REFUND_PENDING gets its own treatment because it is an outcome,
 * not an error — the payment is correctly recorded and somebody now owes the buyer money. Folding it
 * into a generic success would leave an operator believing they had finished.
 */
function Outcome({ outcome, next, navigate }) {
  const refunding = outcome.status === 'REFUND_PENDING';
  const dismissed = outcome.status === 'DISMISSED';

  const tone = dismissed
    ? { fg: 'var(--text-2)', bg: 'var(--surface-3)', border: 'var(--border)' }
    : refunding
      ? { fg: 'var(--amber)', bg: 'var(--amber-soft)', border: 'var(--amber-border)' }
      : { fg: 'var(--green)', bg: 'var(--green-soft)', border: 'var(--green-border)' };

  const title = dismissed ? 'Written off'
    : refunding ? 'Linked — but the seats were gone'
      : 'Linked and settled';

  const body = dismissed
    ? 'It has left the queue and stays on record, with who wrote it off and why. You can put it back if this was premature.'
    : refunding
      ? 'The hold had lapsed and the seats were resold before anyone opened this queue. No tickets were issued; the order is queued for a refund instead. This is not a failed link — the payment is recorded against the right order, and someone now owes the buyer their money back.'
      : 'The seats were still held, so tickets have been issued and the buyer has been emailed. The Interac reference is now on the order.';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>
      <div style={{ maxWidth: 620, margin: '72px auto' }}>
        <div className="card" style={{ overflow: 'hidden', borderColor: tone.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', background: tone.bg }}>
            <Icon name={refunding ? 'alert' : dismissed ? 'ban' : 'check'} size={16} color={tone.fg} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: tone.fg }}>{title}</div>
            <div style={{ flexGrow: 1 }} />
            {outcome.code && (
              <span className="mono" style={{ fontSize: 12, color: tone.fg }}>
                {outcome.code} → {outcome.status}
              </span>
            )}
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>{body}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {next ? (
                <Button variant="primary" iconRight="arrowright" onClick={() => navigate(`/payments/unmatched/${next.id}`)}>
                  Next payment
                </Button>
              ) : (
                <Button variant="primary" onClick={() => navigate('/payments/unmatched')}>Back to the queue</Button>
              )}
              <Button variant="ghost" onClick={() => navigate('/payments/unmatched')}>Queue</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
