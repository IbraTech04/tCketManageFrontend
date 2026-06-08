import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../api/events';
import { ordersApi } from '../../api/orders';
import { scansApi } from '../../api/scans';
import { zoneColor, money } from '../../api/zoneTypes';
import { useApp } from '../../contexts/AppContext';
import Panel from '../../components/ui/Panel';
import Icon from '../../components/ui/Icon';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/StatusBadge';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: color ? color + '18' : 'var(--surface-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={16} color={color || 'var(--text-2)'} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function LoadingCenter() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 10, color: 'var(--text-3)' }}>
      <Spinner size={20} dark />
      <span style={{ fontSize: 13.5 }}>Loading...</span>
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div style={{
      margin: '24px', background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
      borderRadius: 'var(--r)', padding: '14px 16px', color: 'var(--red)', fontSize: 13.5,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Icon name="alert" size={15} color="var(--red)" />
      {msg}
    </div>
  );
}

function formatTs(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export default function Overview() {
  const { eventId } = useParams();
  const { currentEvent } = useApp();

  const [event, setEvent] = useState(currentEvent);
  const [ticketCount, setTicketCount] = useState(null);
  const [orders, setOrders] = useState([]);
  const [scans, setScans] = useState([]);
  const [totalScans, setTotalScans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      eventsApi.get(eventId),
      eventsApi.getTickets(eventId, 0, 1),
      ordersApi.list(eventId),
      scansApi.forEvent(eventId, 0, 10),
    ])
      .then(([ev, ticketsPage, orderList, scansPage]) => {
        if (cancelled) return;
        setEvent(ev);
        setTicketCount(ticketsPage?.totalElements ?? 0);
        setOrders(orderList ?? []);
        setScans(scansPage?.content ?? []);
        setTotalScans(scansPage?.totalElements ?? 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load overview data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) return <LoadingCenter />;
  if (error) return <ErrorMsg msg={error} />;

  const zones = event?.zones ?? [];
  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const revenue = paidOrders.reduce((sum, o) => sum + (o.amountTotal || 0), 0);
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard icon="ticket" label="Tickets Sold" value={ticketCount ?? '—'} color="var(--orange)" />
        <StatCard icon="dollar" label="Revenue" value={money(revenue)} sub={`${paidOrders.length} paid orders`} color="var(--green)" />
        <StatCard icon="layers" label="Active Zones" value={zones.length} color="var(--blue)" />
        <StatCard icon="scan" label="Total Scans" value={totalScans ?? '—'} color="var(--purple)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Zones */}
        <Panel title="Zones" icon="layers">
          {zones.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No zones configured.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {zones.map((zone, i) => (
                <div key={zone.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', background: 'var(--surface-2)',
                  borderRadius: 'var(--r)', border: '1px solid var(--border)',
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: zoneColor(zone.id), flexShrink: 0,
                    boxShadow: `0 0 0 3px ${zoneColor(zone.id)}22`,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{zone.name}</span>
                  {zone.description && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{zone.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Recent Scans */}
        <Panel title="Recent Scans" icon="scan">
          {scans.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No scan activity yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {scans.map((scan) => (
                <div key={scan.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 4px', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, background: 'var(--green-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name="check" size={13} color="var(--green)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                      {String(scan.ticketId || '').slice(0, 8)}…
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{scan.zoneName || '—'}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', flexShrink: 0 }}>
                    {formatTs(scan.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent Orders */}
      <Panel title="Recent Orders" icon="card" noPad>
        {recentOrders.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--text-3)' }}>No orders yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Buyer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="mono" style={{ fontSize: 12.5 }}>
                        {order.referenceCode || order.id?.slice(0, 8) || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                      {order.buyerEmail || '—'}
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                    </td>
                    <td style={{ fontWeight: 600 }}>{money(order.amountTotal || 0)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
