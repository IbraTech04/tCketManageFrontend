import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { money } from '../api/zoneTypes';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Empty from '../components/ui/Empty';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';
import ThemeToggle from '../components/ui/ThemeToggle';

/**
 * Triage list for e-Transfers that arrived but matched no order.
 *
 * Deliberately not where the work happens — reconciling one is a two-sided comparison that needs
 * the width, so it gets its own screen. This list exists to answer one question before anyone opens
 * anything: which of these is a click away from done, and which needs real thought?
 *
 * That is what the hint chip is for. It costs one suggestions call per row, which is why the list is
 * capped: past a certain size the chips stop being triage and start being a stampede of requests.
 */

/** Rows beyond this load without a hint chip — see the note above. */
const HINT_LIMIT = 25;

function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

/**
 * One line summarising what the matcher thinks, from the top suggestion.
 *
 * An exact code that still didn't settle is the loudest case in the queue: the buyer typed it
 * correctly, so something else — nearly always the amount — is wrong, and that deserves red rather
 * than the amber of an ordinary typo.
 */
function hintFor(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    return { label: 'No candidates', tone: 'muted' };
  }
  const top = suggestions[0];
  // A name-only lead is worth surfacing but is not a code match, and the chip must not imply it is.
  if (top.suggestedByNameOnly) {
    return { label: `Payer's name matches ${top.referenceCode}`, tone: 'info' };
  }
  if (top.codeDistance === 0 && !top.amountMatches) {
    return { label: 'Code matches — amount differs', tone: 'bad' };
  }
  if (top.codeDistance === 0) {
    return { label: `Code matches ${top.referenceCode}`, tone: 'good' };
  }
  const chars = top.codeDistance === 1 ? '1 character' : `${top.codeDistance} characters`;
  return { label: `${chars} off ${top.referenceCode}`, tone: 'warn' };
}

const TONES = {
  good: { bg: 'var(--green-soft)', fg: 'var(--green)' },
  warn: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
  bad: { bg: 'var(--red-soft)', fg: 'var(--red)' },
  info: { bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  muted: { bg: 'var(--surface-3)', fg: 'var(--text-3)' },
};

export default function UnmatchedPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [hints, setHints] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    ordersApi.unmatchedPayments()
      .then((data) => {
        if (cancelled) return;
        const list = data ?? [];
        setPayments(list);
        // Hints are best-effort and arrive per row: a failed or slow one leaves that row without a
        // chip rather than holding up the list or breaking it.
        list.slice(0, HINT_LIMIT).forEach((p) => {
          ordersApi.paymentSuggestions(p.id)
            .then((s) => { if (!cancelled) setHints((h) => ({ ...h, [p.id]: hintFor(s) })); })
            .catch(() => { /* row simply shows no chip */ });
        });
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load unmatched payments'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Logo size={26} />
        <div style={{ display: 'flex', gap: 8 }}>
          <ThemeToggle variant="ghost" />
          <Button variant="ghost" icon="chevleft" onClick={() => navigate('/events')}>Events</Button>
        </div>
      </header>

      <div className="fade-in page-content" style={{ maxWidth: 940, margin: '0 auto', padding: '26px 24px 48px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 19, fontWeight: 650, margin: '0 0 5px' }}>Unmatched payments</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.55, maxWidth: 640 }}>
            Money arrived that we couldn't tie to an order — almost always a mistyped or missing
            reference code. Until one is resolved the buyer's seats keep counting down and will be
            resold.
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
            {payments.map((p) => {
              const hint = hints[p.id];
              const tone = TONES[hint?.tone ?? 'muted'];
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/payments/unmatched/${p.id}`)}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 18px', cursor: 'pointer' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--r)', background: tone.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name="card" size={16} color={tone.fg} />
                  </div>

                  <div style={{ width: 132, flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em' }}>
                      {money(p.amount || 0, p.currency || 'CAD')}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{shortDate(p.emailReceivedAt)}</div>
                  </div>

                  <div style={{ width: 150, flexShrink: 0, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.senderName || 'Unknown sender'}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.interacReference || '—'}</div>
                  </div>

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Memo</div>
                    <div className="mono" style={{
                      fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      color: p.memo ? 'var(--text)' : 'var(--text-3)',
                      fontStyle: p.memo ? 'normal' : 'italic',
                    }}>
                      {p.memo || '(empty)'}
                    </div>
                  </div>

                  <div style={{ width: 190, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                    {hint && (
                      <span style={{
                        fontSize: 11.5, fontWeight: 500, padding: '4px 9px', borderRadius: 999,
                        background: tone.bg, color: tone.fg, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                      }}>{hint.label}</span>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" iconRight="chevright" style={{ flexShrink: 0 }}>
                    Reconcile
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
