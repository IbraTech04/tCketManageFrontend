import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../api/events';
import { zoneTypesApi, zoneColor, entitlementMap, money } from '../../api/zoneTypes';
import { useApp } from '../../contexts/AppContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';
import Panel from '../../components/ui/Panel';
import TypePill from '../../components/TypePill';

// Cycle: no access → unlimited (null) → 1 → 2 → 3 → 5 → no access
const CYCLE = [undefined, null, 1, 2, 3, 5];

function nextCycle(current) {
  if (current === undefined) return null;
  if (current === null) return 1;
  if (current === 1) return 2;
  if (current === 2) return 3;
  if (current === 3) return 5;
  return undefined;
}

function cellLabel(val) {
  if (val === undefined) return '—';
  if (val === null) return '∞';
  return `${val}×`;
}

function cellStyle(val) {
  if (val === undefined) return { color: 'var(--text-3)', background: 'transparent' };
  if (val === null) return { color: 'var(--green)', background: 'var(--green-soft)' };
  return { color: 'var(--blue)', background: 'var(--blue-soft)' };
}

function NewTypeModal({ zones, onClose, onCreated, eventId }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setErr('Name is required');
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) return setErr('Enter a valid price (0 for free)');
    setSaving(true);
    setErr('');
    try {
      const created = await eventsApi.createTicketType(eventId, {
        name: name.trim(),
        price: p,
        isActive: true,
        entitlements: [],
      });
      onCreated(created);
    } catch (ex) {
      setErr(ex.message || 'Failed to create ticket type');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(20,20,24,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={onClose}
    >
      <div
        className="card pop-in"
        style={{ width: 380, padding: '28px', boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>New ticket type</div>
          <Button variant="subtle" icon="x" onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Name</label>
            <input
              className="inp"
              placeholder="e.g. General Admission"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>Price (CAD)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          {err && (
            <div style={{ color: 'var(--red)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={13} color="var(--red)" />
              {err}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? <Spinner size={14} /> : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TicketTypes() {
  const { eventId } = useParams();
  const { currentEvent } = useApp();

  const [ticketTypes, setTicketTypes] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrix, setMatrix] = useState({}); // { [ttId]: { [zoneId]: maxEntries|null|undefined } }
  const [dirty, setDirty] = useState({}); // { [ttId]: true }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      eventsApi.getTicketTypes(eventId),
      currentEvent?.zones ? Promise.resolve(currentEvent.zones) : eventsApi.getZones(eventId),
    ])
      .then(([types, zoneList]) => {
        if (cancelled) return;
        const tList = types ?? [];
        const zList = zoneList ?? [];
        setTicketTypes(tList);
        setZones(zList);
        // Build initial matrix
        const m = {};
        for (const tt of tList) {
          m[tt.id] = {};
          for (const z of zList) {
            const emap = entitlementMap(tt);
            m[tt.id][z.id] = Object.prototype.hasOwnProperty.call(emap, z.id)
              ? emap[z.id]  // null = unlimited, number = limited
              : undefined;  // no access
          }
        }
        setMatrix(m);
        setDirty({});
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load ticket types');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  function cycleCell(ttId, zoneId) {
    setMatrix((prev) => {
      const cur = prev[ttId]?.[zoneId];
      const next = nextCycle(cur);
      return { ...prev, [ttId]: { ...prev[ttId], [zoneId]: next } };
    });
    setDirty((prev) => ({ ...prev, [ttId]: true }));
    setSaveSuccess(false);
  }

  async function saveChanges() {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const dirtyIds = Object.keys(dirty).filter((id) => dirty[id]);
      await Promise.all(dirtyIds.map((ttId) => {
        const tt = ticketTypes.find((t) => t.id === ttId);
        if (!tt) return Promise.resolve();
        const cellMap = matrix[ttId] || {};
        const entitlements = Object.entries(cellMap)
          .filter(([, val]) => val !== undefined)
          .map(([zoneId, maxEntries]) => ({
            zoneId,
            ...(maxEntries === null ? {} : { maxEntries }),
          }));
        return zoneTypesApi.updateTicketType(ttId, {
          name: tt.name,
          price: tt.price,
          isActive: tt.isActive,
          entitlements,
        });
      }));
      setDirty({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (ex) {
      setSaveError(ex.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleTypeCreated(created) {
    setShowModal(false);
    setTicketTypes((prev) => [...prev, created]);
    setMatrix((prev) => {
      const row = {};
      for (const z of zones) row[z.id] = undefined;
      return { ...prev, [created.id]: row };
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 10, color: 'var(--text-3)' }}>
        <Spinner size={20} dark />
        <span style={{ fontSize: 13.5 }}>Loading ticket types...</span>
      </div>
    );
  }

  const hasDirty = Object.values(dirty).some(Boolean);

  return (
    <div className="fade-in page-content">
      {error && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--r)', padding: '12px 16px', color: 'var(--red)', fontSize: 13,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alert" size={14} color="var(--red)" />
          {error}
        </div>
      )}

      {/* Entitlement Matrix */}
      <Panel
        title="Zone Access Matrix"
        icon="grid"
        noPad
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saveSuccess && (
              <span style={{ fontSize: 12.5, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="check" size={13} color="var(--green)" /> Saved
              </span>
            )}
            {saveError && (
              <span style={{ fontSize: 12.5, color: 'var(--red)' }}>{saveError}</span>
            )}
            {hasDirty && (
              <Button
                variant="primary"
                size="sm"
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? <Spinner size={12} /> : 'Save changes'}
              </Button>
            )}
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        {ticketTypes.length === 0 ? (
          <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-3)' }}>
            No ticket types yet. Create one below.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Ticket Type</th>
                  {zones.map((z) => (
                    <th key={z.id} style={{ textAlign: 'center', minWidth: 90 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: zoneColor(z.id), flexShrink: 0,
                        }} />
                        {z.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticketTypes.map((tt) => (
                  <tr key={tt.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TypePill ticketType={tt} />
                        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{money(tt.price)}</span>
                      </div>
                    </td>
                    {zones.map((z) => {
                      const val = matrix[tt.id]?.[z.id];
                      const s = cellStyle(val);
                      return (
                        <td key={z.id} style={{ textAlign: 'center', padding: '8px 6px' }}>
                          <button
                            onClick={() => cycleCell(tt.id, z.id)}
                            title="Click to cycle access level"
                            style={{
                              all: 'unset',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 52, height: 28,
                              borderRadius: 'var(--r-sm)',
                              fontSize: 12.5, fontWeight: 600,
                              transition: 'background .1s, color .1s',
                              border: '1px solid',
                              borderColor: val === undefined ? 'var(--border)' : 'transparent',
                              ...s,
                            }}
                          >
                            {cellLabel(val)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Click a cell to cycle:</span>
          {[
            { val: undefined, label: '— No access' },
            { val: null, label: '∞ Unlimited' },
            { val: 1, label: 'N× Limited entries' },
          ].map(({ val, label }) => {
            const s = cellStyle(val);
            return (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: s.color }}>
                <span style={{
                  width: 22, height: 17, borderRadius: 4,
                  background: s.background, border: val === undefined ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: s.color,
                }}>
                  {val === undefined ? '—' : val === null ? '∞' : 'N'}
                </span>
                {label}
              </span>
            );
          })}
        </div>
      </Panel>

      {/* Type cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Ticket Types
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginLeft: 8, fontWeight: 400 }}>
            {ticketTypes.length}
          </span>
        </div>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setShowModal(true)}>
          New ticket type
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {ticketTypes.map((tt) => {
          const entCount = tt.entitlements?.length ?? 0;
          return (
            <div key={tt.id} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <TypePill ticketType={tt} />
                {tt.isActive
                  ? <Badge color="var(--green)" bg="var(--green-soft)" dot>Active</Badge>
                  : <Badge color="var(--text-3)" bg="var(--surface-3)" dot>Inactive</Badge>
                }
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
                {money(tt.price)}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="layers" size={12} color="var(--text-3)" />
                  {entCount} zone{entCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}

        {/* New type card */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '2px dashed var(--border-2)',
            borderRadius: 'var(--r-lg)', padding: '20px', gap: 8,
            minHeight: 120, transition: 'border-color .14s, background .14s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--orange)';
            e.currentTarget.style.background = 'var(--orange-softer)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-2)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'var(--orange-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="plus" size={16} color="var(--orange)" stroke={2.2} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>New ticket type</div>
        </button>
      </div>

      {showModal && (
        <NewTypeModal
          zones={zones}
          eventId={eventId}
          onClose={() => setShowModal(false)}
          onCreated={handleTypeCreated}
        />
      )}
    </div>
  );
}
