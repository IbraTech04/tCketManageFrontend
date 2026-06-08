import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { scansApi } from '../../api/scans';
import { zoneColor } from '../../api/zoneTypes';
import { useApp } from '../../contexts/AppContext';
import Panel from '../../components/ui/Panel';
import Icon from '../../components/ui/Icon';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Empty from '../../components/ui/Empty';
import Badge from '../../components/ui/Badge';

function formatTs(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function formatHour(h) {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function HourBarChart({ scans }) {
  const counts = useMemo(() => {
    const arr = new Array(24).fill(0);
    for (const s of scans) {
      if (s.timestamp) {
        const h = new Date(s.timestamp).getHours();
        arr[h]++;
      }
    }
    return arr;
  }, [scans]);

  const max = Math.max(...counts, 1);
  const activeHours = counts.map((c, h) => ({ h, c })).filter((x) => x.c > 0);

  if (activeHours.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>
        No scan timestamps available.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, paddingBottom: 0 }}>
        {counts.map((c, h) => {
          const pct = (c / max) * 100;
          const hasScans = c > 0;
          return (
            <div
              key={h}
              title={`${formatHour(h)}: ${c} scan${c !== 1 ? 's' : ''}`}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-end',
                gap: 3, minWidth: 0,
              }}
            >
              <div style={{ fontSize: 9, color: 'var(--text-3)', opacity: hasScans ? 1 : 0 }}>
                {c > 0 ? c : ''}
              </div>
              <div
                style={{
                  width: '100%', maxWidth: 28,
                  height: `${Math.max(pct, hasScans ? 6 : 0)}%`,
                  background: hasScans ? 'var(--orange)' : 'var(--surface-3)',
                  borderRadius: '3px 3px 2px 2px',
                  transition: 'height .3s',
                  minHeight: hasScans ? 4 : 0,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* X axis labels */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {counts.map((_, h) => (
          <div
            key={h}
            style={{
              flex: 1, textAlign: 'center', fontSize: 9,
              color: 'var(--text-3)', minWidth: 0,
              display: h % 6 === 0 ? 'block' : 'none',
            }}
          >
            {formatHour(h)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Scanning() {
  const { eventId } = useParams();
  const { currentEvent } = useApp();
  const [scans, setScans] = useState([]);
  const [totalScans, setTotalScans] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const zones = currentEvent?.zones ?? [];

  function load() {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    scansApi.forEvent(eventId, 0, 50)
      .then((data) => {
        setScans(data?.content ?? []);
        setTotalScans(data?.totalElements ?? 0);
      })
      .catch((err) => setError(err.message || 'Failed to load scans'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [eventId]);

  // Scan counts by zone
  const zoneCounts = useMemo(() => {
    const m = {};
    for (const s of scans) {
      if (s.zoneId) m[s.zoneId] = (m[s.zoneId] || 0) + 1;
    }
    return m;
  }, [scans]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 10, color: 'var(--text-3)' }}>
        <Spinner size={20} dark />
        <span style={{ fontSize: 13.5 }}>Loading scan data...</span>
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

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Total Scans</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{totalScans}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Active Zones</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{zones.length}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Recent (shown)</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{scans.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Scans by hour chart */}
        <Panel
          title="Scans by Hour"
          icon="chart"
          right={
            <Button variant="subtle" size="sm" icon="refresh" onClick={load}>Refresh</Button>
          }
        >
          <HourBarChart scans={scans} />
        </Panel>

        {/* Zone breakdown */}
        <Panel title="Zone Activity" icon="layers">
          {zones.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No zones configured.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {zones.map((zone) => {
                const count = zoneCounts[zone.id] || 0;
                const maxCount = Math.max(...Object.values(zoneCounts), 1);
                return (
                  <div key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: zoneColor(zone.id), flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{zone.name}</span>
                    <div style={{ flex: '0 0 80px', background: 'var(--surface-3)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(count / maxCount) * 100}%`,
                        height: '100%',
                        background: zoneColor(zone.id),
                        borderRadius: 999,
                        minWidth: count > 0 ? 6 : 0,
                        transition: 'width .4s',
                      }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)', width: 28, textAlign: 'right' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Scan log */}
      <Panel title="Recent Scan Log" icon="history" noPad>
        {scans.length === 0 ? (
          <Empty
            icon="scan"
            title="No scans yet"
            subtitle="Scan activity will appear here once gate scanning begins."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Zone</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 6, background: 'var(--green-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon name="check" size={12} color="var(--green)" />
                        </div>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
                          {String(scan.ticketId || '').slice(0, 8)}…
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {scan.zoneId && (
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: zoneColor(scan.zoneId), flexShrink: 0,
                          }} />
                        )}
                        <span style={{ fontSize: 13 }}>{scan.zoneName || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                      {formatTs(scan.timestamp)}
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
