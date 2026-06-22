import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ordersApi } from '../../api/orders';
import { money } from '../../api/zoneTypes';
import Button from '../../components/ui/Button';
import Drawer from '../../components/ui/Drawer';
import DrawerHeader from '../../components/ui/DrawerHeader';
import Tabs from '../../components/ui/Tabs';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/StatusBadge';
import Empty from '../../components/ui/Empty';
import { ORDER_STATUS, ORDER_STATUS_TABS, orderStatusLabel } from '../../lib/orderStatus';

const TABS = [
  { id: 'ALL', label: 'All' },
  ...ORDER_STATUS_TABS.map((id) => ({ id, label: orderStatusLabel(id) })),
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function ActionError({ msg }) {
  return (
    <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name="alert" size={13} color="var(--red)" />
      {msg}
    </div>
  );
}

function OrderDrawer({ order, open, onClose, onUpdated }) {
  // Which action is currently running (by id), shared error, and the two
  // multi-step confirmations (deny funds choice + refund confirm).
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [denyOpen, setDenyOpen] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState(false);

  // Reset transient UI whenever the drawer opens or the order changes.
  useEffect(() => {
    setBusy(null);
    setActionError('');
    setDenyOpen(false);
    setRefundConfirm(false);
  }, [open, order?.id]);

  // Run an action, then fold the returned order back into list + drawer so the
  // new status (and its available actions) render immediately.
  async function run(id, fn) {
    setBusy(id);
    setActionError('');
    try {
      const updated = await fn();
      if (updated) onUpdated(updated);
    } catch (ex) {
      setActionError(ex.message || 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  if (!order) return null;
  const items = order.items ?? [];

  return (
    <Drawer open={open} onClose={onClose} width={480}>
      <DrawerHeader
        title={order.referenceCode || `Order ${String(order.id).slice(0, 8)}`}
        subtitle={order.buyerEmail}
        onClose={onClose}
      />

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Status banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={order.status} />
          {order.paidAt && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Paid {formatDate(order.paidAt)}
            </span>
          )}
        </div>

        {/* Line items */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Items
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((item) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 12px', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 7, background: 'var(--orange-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name="ticket" size={14} color="var(--orange)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {item.attendeeFirstName} {item.attendeeLastName}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    {item.ticketTypeName} · {item.attendeeEmail}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {money(item.unitPrice || 0)}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0' }}>No items.</div>
            )}
          </div>
        </div>

        {/* Total */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: 'var(--surface-3)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{money(order.amountTotal || 0)}</span>
        </div>

        {/* Payment info */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Payment Info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              ['Reference', order.referenceCode || '—'],
              ['Provider', order.providerId || '—'],
              ['Currency', order.currency || '—'],
              ['Placed', formatDate(order.createdAt)],
              order.expiresAt ? ['Expires', formatDate(order.expiresAt)] : null,
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-3)', width: 80, flexShrink: 0 }}>{label}</span>
                <span className={label === 'Reference' ? 'mono' : ''} style={{ color: 'var(--text)', fontSize: label === 'Reference' ? 12 : 13 }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quarantine review ── */}
        {order.status === ORDER_STATUS.QUARANTINED && (
          <div style={{
            background: 'var(--purple-soft)', border: '1px solid rgba(124,92,255,0.25)',
            borderRadius: 'var(--r)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={13} color="var(--purple)" />
              Held for review
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
              This order was quarantined and needs a manual decision before tickets are issued.
            </div>
            {actionError && <ActionError msg={actionError} />}

            {!denyOpen ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="primary"
                  icon={busy === 'approve' ? undefined : 'check'}
                  onClick={() => run('approve', () => ordersApi.approveQuarantine(order.id))}
                  disabled={!!busy}
                >
                  {busy === 'approve' ? <><Spinner size={14} /> Approving…</> : 'Approve & issue'}
                </Button>
                <Button variant="ghost" onClick={() => { setActionError(''); setDenyOpen(true); }} disabled={!!busy}>
                  Deny…
                </Button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  Were funds received for this order?
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                  If funds were received, the order is queued for a refund. Otherwise it's voided.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    onClick={() => run('deny', () => ordersApi.denyQuarantine(order.id, true))}
                    disabled={!!busy}
                  >
                    {busy === 'deny' ? <Spinner size={14} /> : 'Funds received → refund'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => run('deny', () => ordersApi.denyQuarantine(order.id, false))}
                    disabled={!!busy}
                  >
                    No funds — void
                  </Button>
                </div>
                <button
                  onClick={() => setDenyOpen(false)}
                  disabled={!!busy}
                  style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: 'var(--text-3)', marginTop: 10, display: 'inline-block' }}
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Awaiting manual payment ── */}
        {order.status === ORDER_STATUS.AWAITING_PAYMENT && (
          <div style={{
            background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: 'var(--r)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 6 }}>
              Payment pending
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
              Confirm that you have received payment for this order.
            </div>
            {actionError && <ActionError msg={actionError} />}
            <Button
              variant="primary"
              onClick={() => run('confirm', () => ordersApi.confirmPayment(order.id))}
              disabled={!!busy}
              icon={busy === 'confirm' ? undefined : 'check'}
            >
              {busy === 'confirm' ? <><Spinner size={14} /> Confirming…</> : 'Confirm payment received'}
            </Button>
          </div>
        )}

        {/* ── Paid: resend or refund ── */}
        {order.status === ORDER_STATUS.PAID && (
          !refundConfirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" icon="mail" onClick={() => alert('Coming soon')}>
                Resend tickets
              </Button>
              <Button variant="ghost" onClick={() => { setActionError(''); setRefundConfirm(true); }} disabled={!!busy}>
                Refund
              </Button>
            </div>
          ) : (
            <div style={{
              background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: 'var(--r)', padding: '14px 16px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
                Refund this order?
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
                The order moves to <strong>Refund pending</strong>. Issue the refund through your payment provider, then mark it complete.
              </div>
              {actionError && <ActionError msg={actionError} />}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="primary"
                  onClick={() => run('refund', () => ordersApi.refund(order.id))}
                  disabled={!!busy}
                >
                  {busy === 'refund' ? <Spinner size={14} /> : `Refund ${money(order.amountTotal || 0)}`}
                </Button>
                <Button variant="ghost" onClick={() => setRefundConfirm(false)} disabled={!!busy}>Cancel</Button>
              </div>
            </div>
          )
        )}

        {/* ── Refund in progress ── */}
        {order.status === ORDER_STATUS.REFUND_PENDING && (
          <div style={{
            background: 'var(--amber-soft)', border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: 'var(--r)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 6 }}>
              Refund in progress
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
              Once you've issued the refund through your payment provider, mark it settled.
            </div>
            {actionError && <ActionError msg={actionError} />}
            <Button
              variant="primary"
              icon={busy === 'completeRefund' ? undefined : 'check'}
              onClick={() => run('completeRefund', () => ordersApi.completeRefund(order.id))}
              disabled={!!busy}
            >
              {busy === 'completeRefund' ? <><Spinner size={14} /> Completing…</> : 'Mark refund complete'}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default function Orders() {
  const { eventId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function loadOrders() {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    ordersApi.list(eventId)
      .then((data) => setOrders(data ?? []))
      .catch((err) => setError(err.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOrders(); }, [eventId]);

  const tabsWithCount = TABS.map((t) => ({
    ...t,
    count: t.id === 'ALL' ? orders.length : orders.filter((o) => o.status === t.id).length,
  }));

  const filtered = useMemo(() => {
    if (tab === 'ALL') return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return orders
      .filter((o) => o.status === tab)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, tab]);

  function openDrawer(order) {
    setSelected(order);
    setDrawerOpen(true);
  }

  // Fold an action's updated order back into the list + open drawer so the new
  // status (and its tab/count) reflect immediately without a full reload.
  function handleOrderUpdated(updated) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    setSelected((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 10, color: 'var(--text-3)' }}>
        <Spinner size={20} dark />
        <span style={{ fontSize: 13.5 }}>Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="fade-in page-content">
      {error && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--r)', padding: '12px 16px', color: 'var(--red)', fontSize: 13,
          marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alert" size={14} color="var(--red)" />
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <Tabs tabs={tabsWithCount} active={tab} onChange={(id) => setTab(id)} />
        </div>

        {filtered.length === 0 ? (
          <Empty
            icon="card"
            title="No orders"
            subtitle={tab === 'ALL' ? 'Orders will appear here once placed.' : `No ${tab.toLowerCase()} orders.`}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Buyer</th>
                  <th>Items</th>
                  <th>Provider</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Placed</th>
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDrawer(order)}
                  >
                    <td>
                      <span className="mono" style={{ fontSize: 12.5 }}>
                        {order.referenceCode || String(order.id).slice(0, 8)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                      {order.buyerEmail || '—'}
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                      {(order.items ?? []).length > 0
                        ? (order.items ?? []).slice(0, 2).map((it) =>
                            `${it.attendeeFirstName} ${it.attendeeLastName}`
                          ).join(', ') + ((order.items?.length ?? 0) > 2 ? ` +${(order.items?.length ?? 0) - 2}` : '')
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      {order.providerId || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{money(order.amountTotal || 0)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td style={{ color: 'var(--text-3)', fontSize: 11.5 }}>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                        : '—'}
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

      <OrderDrawer
        order={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleOrderUpdated}
      />
    </div>
  );
}
