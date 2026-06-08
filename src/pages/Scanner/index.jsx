import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../api/events';
import { scansApi, outcomeToDisplay } from '../../api/scans';
import { useApp } from '../../contexts/AppContext';
import Icon from '../../components/ui/Icon';
import Spinner from '../../components/ui/Spinner';
import QRReader from './QRReader';

// Scanner-specific dark palette — used as inline styles throughout
const D = {
  bg:       '#0c0d10',
  surface:  '#16181d',
  surface2: '#1c1f26',
  border:   '#2a2e37',
  text:     '#f4f4f5',
  text2:    '#a1a1aa',
  text3:    '#6b7280',
  green:    '#22c55e',
  red:      '#f43f5e',
  amber:    '#f59e0b',
  orange:   '#FF6A1A',
};

// Corner bracket dimensions
const BRACKET = 24;
const BRACKET_THICK = 3;

function CornerBrackets({ color }) {
  const sharedStyle = {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: color,
    borderStyle: 'solid',
    transition: 'border-color .3s',
  };
  return (
    <>
      {/* top-left */}
      <div style={{ ...sharedStyle, top: 12, left: 12, borderWidth: `${BRACKET_THICK}px 0 0 ${BRACKET_THICK}px`, borderRadius: '3px 0 0 0' }} />
      {/* top-right */}
      <div style={{ ...sharedStyle, top: 12, right: 12, borderWidth: `${BRACKET_THICK}px ${BRACKET_THICK}px 0 0`, borderRadius: '0 3px 0 0' }} />
      {/* bottom-left */}
      <div style={{ ...sharedStyle, bottom: 12, left: 12, borderWidth: `0 0 ${BRACKET_THICK}px ${BRACKET_THICK}px`, borderRadius: '0 0 0 3px' }} />
      {/* bottom-right */}
      <div style={{ ...sharedStyle, bottom: 12, right: 12, borderWidth: `0 ${BRACKET_THICK}px ${BRACKET_THICK}px 0`, borderRadius: '0 0 3px 0' }} />
    </>
  );
}

function outcomeIcon(outcome) {
  switch (outcome) {
    case 'SUCCESS':             return { icon: 'check',  bg: 'rgba(34,197,94,0.18)',  border: 'rgba(34,197,94,0.4)',  color: D.green };
    case 'ENTRY_LIMIT_REACHED': return { icon: 'alert',  bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)', color: D.amber };
    case 'NO_ZONE_ENTITLEMENT': return { icon: 'x',     bg: 'rgba(244,63,94,0.18)',  border: 'rgba(244,63,94,0.4)',  color: D.red };
    case 'INVALID_QR':          return { icon: 'x',     bg: 'rgba(244,63,94,0.18)',  border: 'rgba(244,63,94,0.4)',  color: D.red };
    default:                    return { icon: 'x',     bg: 'rgba(244,63,94,0.18)',  border: 'rgba(244,63,94,0.4)',  color: D.red };
  }
}

function bracketColor(scanResult) {
  if (!scanResult) return D.orange;
  switch (scanResult.outcome) {
    case 'SUCCESS':             return D.green;
    case 'ENTRY_LIMIT_REACHED': return D.amber;
    default:                    return D.red;
  }
}

function resultLabel(outcome) {
  switch (outcome) {
    case 'SUCCESS':             return 'Entry granted';
    case 'ENTRY_LIMIT_REACHED': return 'Limit reached';
    case 'NO_ZONE_ENTITLEMENT': return 'Access denied';
    case 'INVALID_QR':          return 'Invalid QR code';
    default:                    return 'Scan error';
  }
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'now';
  return `${Math.floor(diff / 60)}m ago`;
}

function recentIcon(outcome) {
  switch (outcome) {
    case 'SUCCESS':             return { icon: 'check', color: D.green };
    case 'ENTRY_LIMIT_REACHED': return { icon: 'alert', color: D.amber };
    default:                    return { icon: 'ban',   color: D.red };
  }
}

function RecentScansPanel({ scans, zones }) {
  const zoneMap = {};
  (zones || []).forEach((z) => { zoneMap[z.id] = z.name; });

  if (scans.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0', color: D.text3 }}>
        <Icon name="history" size={20} color={D.text3} />
        <span style={{ fontSize: 12.5 }}>No scans yet</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {scans.map((s, i) => {
        const ri = recentIcon(s.outcome);
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            background: i % 2 === 0 ? D.surface2 : 'transparent',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: ri.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={ri.icon} size={13} color={ri.color} stroke={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: D.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.attendeeName || s.ticketId || 'Unknown'}
              </div>
              <div style={{ fontSize: 11.5, color: D.text3, marginTop: 1 }}>
                {zoneMap[s.zoneId] || 'Zone'} · {timeAgo(s.ts)}
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: ri.color,
              background: ri.color + '18', borderRadius: 999,
              padding: '2px 8px', flexShrink: 0,
            }}>
              {outcomeToDisplay(s.outcome).label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ZoneSelector({ zones, selectedZoneId, onChange }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{
        position: 'absolute', left: 10, color: D.text3,
        pointerEvents: 'none', display: 'flex', zIndex: 1,
      }}>
        <Icon name="layers" size={14} color={D.text3} />
      </span>
      <select
        value={selectedZoneId}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          font: 'inherit', fontSize: 13, fontWeight: 500,
          color: D.text,
          background: D.surface2,
          border: `1px solid ${D.border}`,
          borderRadius: 8,
          height: 38,
          padding: '0 30px 0 32px',
          cursor: 'pointer',
          outline: 'none',
          width: '100%',
        }}
      >
        {zones.map((z) => (
          <option key={z.id} value={z.id}>{z.name}</option>
        ))}
      </select>
      <span style={{
        position: 'absolute', right: 9, color: D.text3,
        pointerEvents: 'none', display: 'flex',
      }}>
        <Icon name="chevdown" size={14} color={D.text3} />
      </span>
    </div>
  );
}

function ResultOverlay({ scanResult }) {
  if (!scanResult) return null;
  const { outcome } = scanResult;
  const di = outcomeIcon(outcome);
  const label = resultLabel(outcome);
  const attendeeName = scanResult.scanEvent?.ticketId || null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,13,16,0.82)',
      borderRadius: 'inherit',
      gap: 10,
      padding: 20,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: di.bg,
        border: `2px solid ${di.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'popIn .25s cubic-bezier(.16,1,.3,1) both',
      }}>
        <Icon name={di.icon} size={30} color={di.color} stroke={2.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: di.color, marginBottom: 4 }}>
          {label}
        </div>
        {attendeeName && (
          <div style={{ fontSize: 13, color: D.text2, fontFamily: 'var(--mono)', letterSpacing: '.01em' }}>
            {attendeeName}
          </div>
        )}
        {scanResult.message && (
          <div style={{ fontSize: 12.5, color: D.text3, marginTop: 4, maxWidth: 200 }}>
            {scanResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

// Main export
export default function Scanner() {
  const navigate = useNavigate();
  const { currentEvent, setCurrentEvent } = useApp();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Events / zones
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(currentEvent || null);
  const [selectedZoneId, setSelectedZoneId] = useState('');

  // Scanning state
  const [scanning, setScanning] = useState(false);
  const [paused, setPaused] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  // Load events
  useEffect(() => {
    let cancelled = false;
    eventsApi.list(0, 50)
      .then((data) => {
        if (cancelled) return;
        const list = data?.content ?? [];
        setEvents(list);
        if (!selectedEvent && list.length > 0) {
          setSelectedEvent(list[0]);
          setCurrentEvent(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setEventsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Auto-select first zone when event changes
  useEffect(() => {
    if (selectedEvent?.zones?.length > 0) {
      setSelectedZoneId(String(selectedEvent.zones[0].id));
    } else {
      setSelectedZoneId('');
    }
    // Reset scan state on event change
    setScanResult(null);
    setScanning(false);
    setPaused(true);
  }, [selectedEvent]);

  const zones = selectedEvent?.zones ?? [];

  function handleStartScan() {
    setScanResult(null);
    setScanning(true);
    setPaused(false);
  }

  function handleScanNext() {
    setScanResult(null);
    setPaused(false);
  }

  async function handleQrDetected(qrPayload) {
    if (processing) return;
    setPaused(true);
    setProcessing(true);
    try {
      const result = await scansApi.scanQr(qrPayload, selectedZoneId);
      setScanResult(result);
      const entry = {
        outcome: result.outcome,
        attendeeName: result.scanEvent?.ticketId || null,
        ticketId: result.scanEvent?.ticketId || null,
        zoneId: selectedZoneId,
        ts: Date.now(),
      };
      setRecentScans((prev) => [entry, ...prev].slice(0, 8));
    } catch (err) {
      setScanResult({ outcome: 'INVALID_QR', message: err.message || 'Scan failed', scanEvent: null });
      const entry = {
        outcome: 'INVALID_QR', attendeeName: null, ticketId: null,
        zoneId: selectedZoneId, ts: Date.now(),
      };
      setRecentScans((prev) => [entry, ...prev].slice(0, 8));
    } finally {
      setProcessing(false);
    }
  }

  // ── No event / no zones guard ──────────────────────────────
  const noEvent = !eventsLoading && (!selectedEvent || zones.length === 0);

  if (eventsLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: D.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12,
      }}>
        <Spinner size={22} />
        <span style={{ color: D.text2, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (noEvent) {
    return (
      <div style={{
        minHeight: '100vh', background: D.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: 24,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(255,106,26,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="ticket" size={26} color={D.orange} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: D.text, marginBottom: 6 }}>
            No event selected
          </div>
          <div style={{ fontSize: 13.5, color: D.text2, maxWidth: 260, lineHeight: 1.55 }}>
            {events.length === 0
              ? 'Create an event with at least one zone to start scanning.'
              : 'The selected event has no zones. Add zones to enable gate scanning.'}
          </div>
        </div>
        <button
          onClick={() => navigate('/events')}
          style={{
            background: D.orange, color: '#fff', border: 'none',
            borderRadius: 8, padding: '0 20px', height: 40,
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <Icon name="arrowleft" size={15} color="#fff" />
          Go to events
        </button>
      </div>
    );
  }

  // ── SHARED sub-components ──────────────────────────────────

  const viewfinderHeight = isMobile ? '52vw' : 320;
  const bColor = bracketColor(scanResult);

  const Viewfinder = (
    <div style={{
      position: 'relative',
      width: '100%',
      height: viewfinderHeight,
      background: '#000',
      borderRadius: 12,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {scanning
        ? <QRReader onScan={handleQrDetected} paused={paused} />
        : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, background: D.surface,
          }}>
            <Icon name="camera" size={32} color={D.text3} />
            <span style={{ color: D.text3, fontSize: 13 }}>Camera will start when you tap scan</span>
          </div>
        )
      }
      <CornerBrackets color={bColor} />
      {processing && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(12,13,16,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'inherit',
        }}>
          <Spinner size={36} />
        </div>
      )}
      {scanResult && !processing && (
        <ResultOverlay scanResult={scanResult} />
      )}
    </div>
  );

  const ScanButton = (
    <button
      onClick={scanResult ? handleScanNext : handleStartScan}
      disabled={processing}
      style={{
        width: '100%', height: 48,
        background: scanResult ? D.surface2 : D.orange,
        border: `1px solid ${scanResult ? D.border : D.orange}`,
        borderRadius: 10, cursor: processing ? 'not-allowed' : 'pointer',
        color: scanResult ? D.text2 : '#fff',
        fontSize: 14.5, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background .15s',
        opacity: processing ? 0.6 : 1,
        animation: !scanning && !scanResult ? 'pulse-ring 2.5s ease-out infinite' : 'none',
      }}
    >
      {processing
        ? <><Spinner size={18} /><span>Processing...</span></>
        : scanResult
          ? <><Icon name="refresh" size={16} color={D.text2} /><span>Scan next</span></>
          : <><Icon name="scan" size={18} color="#fff" /><span>{scanning ? 'Scanning...' : 'Tap to scan'}</span></>
      }
    </button>
  );

  // ── EVENT SELECTOR (top of both layouts) ──────────────────
  const EventSelector = events.length > 1 ? (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{
        position: 'absolute', left: 10, color: D.text3,
        pointerEvents: 'none', display: 'flex', zIndex: 1,
      }}>
        <Icon name="calendar" size={14} color={D.text3} />
      </span>
      <select
        value={selectedEvent?.id ?? ''}
        onChange={(e) => {
          const ev = events.find((x) => String(x.id) === e.target.value);
          if (ev) { setSelectedEvent(ev); setCurrentEvent(ev); }
        }}
        style={{
          appearance: 'none', font: 'inherit', fontSize: 13, fontWeight: 600,
          color: D.text, background: D.surface2,
          border: `1px solid ${D.border}`, borderRadius: 8,
          height: 36, padding: '0 28px 0 32px', cursor: 'pointer', outline: 'none',
          maxWidth: isMobile ? 180 : 260,
        }}
      >
        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
      </select>
      <span style={{
        position: 'absolute', right: 9, color: D.text3,
        pointerEvents: 'none', display: 'flex',
      }}>
        <Icon name="chevdown" size={14} color={D.text3} />
      </span>
    </div>
  ) : null;

  // ── MOBILE LAYOUT ────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh', background: D.bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--sans)',
      }}>
        {/* Status bar header */}
        <div style={{
          background: D.surface,
          borderBottom: `1px solid ${D.border}`,
          padding: '0 16px',
          height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: D.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(255,106,26,0.35)',
            }}>
              <Icon name="ticket" size={16} color="#fff" stroke={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: D.text, letterSpacing: '-0.01em' }}>
                Gate Scanner
              </div>
              <div style={{ fontSize: 11, color: D.text3, lineHeight: 1 }}>
                {selectedEvent?.name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Online indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: D.green,
                boxShadow: `0 0 0 2px ${D.green}33`,
              }} />
              <span style={{ fontSize: 11, color: D.text3 }}>Online</span>
            </div>
            <button
              onClick={() => navigate('/events')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: D.text3, display: 'flex', padding: 4, borderRadius: 6,
              }}
            >
              <Icon name="x" size={18} color={D.text3} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 24px' }}>
          {/* Selectors row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {EventSelector}
            <div style={{ flex: 1, minWidth: 140 }}>
              <ZoneSelector zones={zones} selectedZoneId={selectedZoneId} onChange={setSelectedZoneId} />
            </div>
          </div>

          {/* Viewfinder */}
          {Viewfinder}

          {/* Scan button */}
          <div style={{ marginTop: 12 }}>
            {ScanButton}
          </div>

          {/* Recent scans */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: D.text3,
              textTransform: 'uppercase', letterSpacing: '.06em',
              marginBottom: 10,
            }}>
              Recent scans
            </div>
            <div style={{
              background: D.surface,
              borderRadius: 10,
              border: `1px solid ${D.border}`,
              overflow: 'hidden',
            }}>
              <RecentScansPanel scans={recentScans} zones={zones} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: D.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sans)',
    }}>
      {/* Top bar */}
      <div style={{
        background: D.surface,
        borderBottom: `1px solid ${D.border}`,
        padding: '0 28px',
        height: 54,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: D.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,106,26,0.35)',
            }}>
              <Icon name="ticket" size={17} color="#fff" stroke={2.2} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: D.text }}>
              t<span style={{ color: D.orange }}>C</span>ketManage
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: D.border }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: D.text2 }}>Gate Scanner</span>
          {selectedEvent && (
            <>
              <div style={{ width: 1, height: 20, background: D.border }} />
              <span style={{ fontSize: 13, color: D.text3 }}>{selectedEvent.name}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: D.green,
              boxShadow: `0 0 0 2px ${D.green}33`,
            }} />
            <span style={{ fontSize: 12, color: D.text3 }}>Online</span>
          </div>
          <button
            onClick={() => navigate('/events')}
            style={{
              background: D.surface2, border: `1px solid ${D.border}`,
              borderRadius: 7, padding: '0 12px', height: 32,
              cursor: 'pointer', color: D.text2, fontSize: 12.5, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon name="arrowleft" size={13} color={D.text2} />
            Events
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 24px 40px' }}>
        <div style={{
          width: '100%', maxWidth: 820,
          background: D.surface,
          border: `1px solid ${D.border}`,
          borderRadius: 16,
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {/* ─── Left: camera + controls ─── */}
          <div style={{
            flex: '0 0 360px',
            borderRight: `1px solid ${D.border}`,
            padding: 20,
            display: 'flex', flexDirection: 'column', gap: 14,
            background: D.surface,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: D.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Gate / Zone
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.length > 1 && EventSelector}
                <ZoneSelector zones={zones} selectedZoneId={selectedZoneId} onChange={setSelectedZoneId} />
              </div>
            </div>

            {Viewfinder}

            {ScanButton}
          </div>

          {/* ─── Right: result + recent scans ─── */}
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20, background: D.bg }}>
            {/* Result panel */}
            <div style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
              borderRadius: 12,
              padding: '24px 20px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12,
              minHeight: 160,
              justifyContent: 'center',
            }}>
              {!scanResult && !processing && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(255,106,26,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}>
                    <Icon name="qr" size={22} color={D.orange} />
                  </div>
                  <div style={{ fontSize: 14, color: D.text2, fontWeight: 500 }}>
                    Awaiting scan
                  </div>
                  <div style={{ fontSize: 12, color: D.text3, marginTop: 4 }}>
                    Result will appear here
                  </div>
                </div>
              )}

              {processing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Spinner size={30} />
                  <div style={{ fontSize: 13, color: D.text3 }}>Validating ticket...</div>
                </div>
              )}

              {scanResult && !processing && (() => {
                const { outcome } = scanResult;
                const di = outcomeIcon(outcome);
                const label = resultLabel(outcome);
                const attendeeName = scanResult.scanEvent?.ticketId;
                return (
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: di.bg, border: `2px solid ${di.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                      animation: 'popIn .25s cubic-bezier(.16,1,.3,1) both',
                    }}>
                      <Icon name={di.icon} size={26} color={di.color} stroke={2.5} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: di.color, marginBottom: 5 }}>
                      {label}
                    </div>
                    {attendeeName && (
                      <div style={{ fontSize: 12.5, color: D.text2, fontFamily: 'var(--mono)', letterSpacing: '.01em', marginBottom: 4 }}>
                        {attendeeName}
                      </div>
                    )}
                    {scanResult.message && (
                      <div style={{ fontSize: 12, color: D.text3, maxWidth: 220, margin: '0 auto', lineHeight: 1.5 }}>
                        {scanResult.message}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Recent scans */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: D.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                Recent scans
              </div>
              <div style={{
                background: D.surface,
                borderRadius: 10,
                border: `1px solid ${D.border}`,
                overflow: 'hidden',
              }}>
                <RecentScansPanel scans={recentScans} zones={zones} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
