import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../api/events';
import { useApp } from '../contexts/AppContext';
import Logo from '../components/Logo';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import EventWizard from '../components/EventWizard';

function formatEventDate(isoString) {
  if (!isoString) return 'Date TBD';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleDateString('en-CA', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
}

function EventCard({ event, onClick }) {
  const zoneCount = event.zones?.length ?? 0;
  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '20px',
        gap: 14,
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow .14s, border-color .14s, transform .1s',
        textAlign: 'left',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow)';
        e.currentTarget.style.borderColor = 'var(--border-2)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Icon strip */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'var(--orange-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name="ticket" size={20} color="var(--orange)" stroke={2} />
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text)' }}>
          {event.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 12.5 }}>
          <Icon name="calendar" size={13} color="var(--text-3)" />
          <span>{formatEventDate(event.time)}</span>
        </div>

        {event.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 12.5 }}>
            <Icon name="pin" size={13} color="var(--text-3)" />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
            }}>
              {event.location}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid var(--border)', paddingTop: 13, marginTop: 2,
      }}>
        <Badge color="var(--orange)" bg="var(--orange-soft)">
          <Icon name="layers" size={11} />
          {zoneCount} {zoneCount === 1 ? 'zone' : 'zones'}
        </Badge>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--orange)', fontSize: 12.5, fontWeight: 500 }}>
          Open <Icon name="chevright" size={13} color="var(--orange)" />
        </span>
      </div>
    </button>
  );
}

function CreateCard({ onClick }) {
  function handleClick() {
    onClick();
  }
  return (
    <button
      onClick={handleClick}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: '2px dashed var(--border-2)',
        borderRadius: 'var(--r-lg)',
        padding: '20px',
        gap: 10,
        minHeight: 160,
        transition: 'border-color .14s, background .14s',
        width: '100%',
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
        width: 40, height: 40, borderRadius: 10,
        background: 'var(--orange-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="plus" size={20} color="var(--orange)" stroke={2.2} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          Create new event
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Set up a new ticketed event
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: '60px 24px',
      color: 'var(--text-3)', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="calendar" size={26} color="var(--text-3)" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
          No events yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 260 }}>
          Create your first event to get started with ticketing and gate management.
        </div>
      </div>
    </div>
  );
}

export default function EventList() {
  const navigate = useNavigate();
  const { setCurrentEvent } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    eventsApi.list(0, 50)
      .then((data) => {
        if (cancelled) return;
        setEvents(data?.content ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load events');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function handleSelectEvent(event) {
    setCurrentEvent(event);
    navigate(`/events/${event.id}/overview`);
  }

  function handleWizardDone(event) {
    setShowWizard(false);
    handleSelectEvent(event);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Topbar */}
      <header style={{
        height: 56,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Logo size={26} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="ghost"
            icon="scan"
            onClick={() => navigate('/scanner')}
          >
            Gate Scanner
          </Button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 48px' }}>
        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 28, gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              margin: '0 0 5px', fontSize: 22, fontWeight: 700,
              letterSpacing: '-0.025em', color: 'var(--text)',
            }}>
              Your events
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)' }}>
              Select an event to open its dashboard, or create a new one.
            </p>
          </div>
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setShowWizard(true)}
          >
            New event
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '80px 24px', gap: 12, color: 'var(--text-3)',
          }}>
            <Spinner size={22} dark />
            <span style={{ fontSize: 13.5 }}>Loading events...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            background: 'var(--red-soft)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 'var(--r-lg)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--red)', fontSize: 13.5,
          }}>
            <Icon name="alert" size={16} color="var(--red)" />
            {error}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {events.map((ev) => (
              <div key={ev.id} className="fade-in">
                <EventCard event={ev} onClick={() => handleSelectEvent(ev)} />
              </div>
            ))}
            {events.length === 0 && <EmptyState />}
            <div className="fade-in">
              <CreateCard onClick={() => setShowWizard(true)} />
            </div>
          </div>
        )}

        {/* Count */}
        {!loading && !error && events.length > 0 && (
          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-3)' }}>
            {events.length} {events.length === 1 ? 'event' : 'events'} found
          </p>
        )}
      </main>

      {showWizard && (
        <EventWizard
          onClose={() => setShowWizard(false)}
          onDone={handleWizardDone}
        />
      )}
    </div>
  );
}
