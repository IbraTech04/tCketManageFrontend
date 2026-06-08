import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../api/events';
import { ordersApi } from '../../api/orders';
import { scansApi } from '../../api/scans';
import { zoneTypesApi, zoneColor, money } from '../../api/zoneTypes';
import { useApp } from '../../contexts/AppContext';
import Panel from '../../components/ui/Panel';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
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
  const { currentEvent, setCurrentEvent } = useApp();

  const [event, setEvent] = useState(currentEvent);
  const [ticketCount, setTicketCount] = useState(null);
  const [orders, setOrders] = useState([]);
  const [scans, setScans] = useState([]);
  const [totalScans, setTotalScans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Zone management
  const [addingZone, setAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [deletingZoneId, setDeletingZoneId] = useState(null);
  const [zoneBusy, setZoneBusy] = useState(false);
  const [zoneError, setZoneError] = useState('');

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

  function patchZones(newZones) {
    const updated = { ...event, zones: newZones };
    setEvent(updated);
    setCurrentEvent(updated);
  }

  async function handleAddZone() {
    if (!newZoneName.trim()) return;
    setZoneBusy(true);
    setZoneError('');
    try {
      const zone = await eventsApi.addZone(eventId, newZoneName.trim());
      patchZones([...(event?.zones ?? []), zone]);
      setNewZoneName('');
      setAddingZone(false);
    } catch (ex) {
      setZoneError(ex.message || 'Failed to add zone');
    } finally {
      setZoneBusy(false);
    }
  }

  async function handleSaveEdit(zoneId) {
    if (!editZoneName.trim()) return;
    setZoneBusy(true);
    setZoneError('');
    try {
      const updated = await zoneTypesApi.updateZone(zoneId, { name: editZoneName.trim() });
      patchZones((event?.zones ?? []).map((z) =>
        z.id === zoneId ? { ...z, ...(updated || {}), name: editZoneName.trim() } : z
      ));
      setEditingZoneId(null);
    } catch (ex) {
      setZoneError(ex.message || 'Failed to update zone');
    } finally {
      setZoneBusy(false);
    }
  }

  async function handleDeleteZone(zoneId) {
    setZoneBusy(true);
    setZoneError('');
    try {
      await zoneTypesApi.deleteZone(zoneId);
      patchZones((event?.zones ?? []).filter((z) => z.id !== zoneId));
      setDeletingZoneId(null);
    } catch (ex) {
      setZoneError(ex.message || 'Failed to delete zone');
    } finally {
      setZoneBusy(false);
    }
  }

  if (loading) return <LoadingCenter />;
  if (error) return <ErrorMsg msg={error} />;

  const zones = event?.zones ?? [];
  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const revenue = paidOrders.reduce((sum, o) => sum + (o.amountTotal || 0), 0);
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  return (
    <div className="fade-in page-content">
      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <StatCard icon="ticket" label="Tickets Sold" value={ticketCount ?? '—'} color="var(--orange)" />
        <StatCard icon="dollar" label="Revenue" value={money(revenue)} sub={`${paidOrders.length} paid orders`} color="var(--green)" />
        <StatCard icon="layers" label="Active Zones" value={zones.length} color="var(--blue)" />
        <StatCard icon="scan" label="Total Scans" value={totalScans ?? '—'} color="var(--purple)" />
      </div>

      <div className="panel-grid" style={{ marginBottom: 14 }}>
        {/* Zones */}
        <Panel
          title="Zones"
          icon="layers"
          right={
            !addingZone && (
              <Button
                variant="ghost"
                size="sm"
                icon="plus"
                onClick={() => { setAddingZone(true); setNewZoneName(''); setZoneError(''); setEditingZoneId(null); setDeletingZoneId(null); }}
              >
                Add zone
              </Button>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zones.length === 0 && !addingZone && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0' }}>No zones configured.</div>
            )}

            {zones.map((zone) => {
              const isEditing = editingZoneId === zone.id;
              const isDeleting = deletingZoneId === zone.id;
              return (
                <div
                  key={zone.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 'var(--r)',
                    border: `1px solid ${isDeleting ? 'rgba(220,38,38,0.25)' : 'var(--border)'}`,
                    background: isDeleting ? 'var(--red-soft)' : 'var(--surface-2)',
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: zoneColor(zone.id),
                    boxShadow: `0 0 0 3px ${zoneColor(zone.id)}22`,
                  }} />

                  {isEditing ? (
                    <>
                      <input
                        className="inp"
                        style={{ flex: 1, height: 28, fontSize: 13 }}
                        value={editZoneName}
                        onChange={(e) => setEditZoneName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(zone.id);
                          if (e.key === 'Escape') setEditingZoneId(null);
                        }}
                        autoFocus
                      />
                      <Button variant="primary" size="sm" onClick={() => handleSaveEdit(zone.id)} disabled={zoneBusy || !editZoneName.trim()}>
                        {zoneBusy ? <Spinner size={12} /> : 'Save'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingZoneId(null)}>Cancel</Button>
                    </>
                  ) : isDeleting ? (
                    <>
                      <span style={{ fontSize: 12.5, color: 'var(--red)', flex: 1 }}>Delete &ldquo;{zone.name}&rdquo;?</span>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteZone(zone.id)} disabled={zoneBusy}>
                        {zoneBusy ? <Spinner size={12} /> : 'Delete'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingZoneId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{zone.name}</span>
                      <button
                        title="Edit zone"
                        onClick={() => { setEditingZoneId(zone.id); setEditZoneName(zone.name); setDeletingZoneId(null); setZoneError(''); }}
                        style={{ all: 'unset', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6, color: 'var(--text-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = ''; }}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        title="Delete zone"
                        onClick={() => { setDeletingZoneId(zone.id); setEditingZoneId(null); setZoneError(''); }}
                        style={{ all: 'unset', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6, color: 'var(--text-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-soft)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = ''; }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Add zone input */}
            {addingZone && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--r)',
                border: '1px solid rgba(255,106,26,0.25)',
                background: 'var(--orange-softer)',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--surface-3)', border: '1px dashed var(--border-2)', flexShrink: 0 }} />
                <input
                  className="inp"
                  style={{ flex: 1, height: 28, fontSize: 13 }}
                  placeholder="Zone name"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddZone();
                    if (e.key === 'Escape') { setAddingZone(false); setNewZoneName(''); }
                  }}
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleAddZone} disabled={zoneBusy || !newZoneName.trim()}>
                  {zoneBusy ? <Spinner size={12} /> : 'Add'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingZone(false); setNewZoneName(''); setZoneError(''); }}>Cancel</Button>
              </div>
            )}

            {zoneError && (
              <div style={{ fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="alert" size={12} color="var(--red)" />
                {zoneError}
              </div>
            )}
          </div>
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
