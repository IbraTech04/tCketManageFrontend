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

const TABS = [
  { id: 'ALL',       label: 'All' },
  { id: 'PAID',      label: 'Paid' },
  { id: 'PENDING',   label: 'Pending' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'EXPIRED',   label: 'Expired' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function OrderDrawer({ order, open, onClose, onRefresh }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  async function handleConfirm() {
    setConfirming(true);
    setConfirmError('');
    try {
      await ordersApi.confirmPayment(order.id);
      onRefresh();
      onClose();
    } catch (ex) {
      setConfirmError(ex.message || 'Failed to confirm payment');
    } finally {
      setConfirming(false);
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

        {/* Actions */}
        {order.status === 'PENDING' && (
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
            {confirmError && (
              <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="alert" size={13} color="var(--red)" />
                {confirmError}
              </div>
            )}
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={confirming}
              icon={confirming ? undefined : 'check'}
            >
              {confirming ? <><Spinner size={14} /> Confirming…</> : 'Confirm payment received'}
            </Button>
          </div>
        )}

        {order.status === 'PAID' && (
          <Button variant="ghost" icon="mail" onClick={() => alert('Coming soon')}>
            Resend tickets
          </Button>
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 10, color: 'var(--text-3)' }}>
        <Spinner size={20} dark />
        <span style={{ fontSize: 13.5 }}>Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
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
        onRefresh={loadOrders}
      />
    </div>
  );
}
