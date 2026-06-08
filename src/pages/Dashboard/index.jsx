import { Routes, Route, Navigate, NavLink, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { eventsApi } from '../../api/events';
import Logo from '../../components/Logo';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EventWizard from '../../components/EventWizard';
import Overview from './Overview';
import Attendees from './Attendees';
import TicketTypes from './TicketTypes';
import Orders from './Orders';
import Scanning from './Scanning';

const NAV = [
  { to: 'overview',      icon: 'home',    label: 'Overview',     mobileLabel: 'Overview' },
  { to: 'attendees',     icon: 'users',   label: 'Attendees',    mobileLabel: 'Attendees' },
  { to: 'ticket-types',  icon: 'ticket',  label: 'Ticket Types', mobileLabel: 'Types' },
  { to: 'orders',        icon: 'card',    label: 'Orders',       mobileLabel: 'Orders' },
  { to: 'scanning',      icon: 'scan',    label: 'Scanning',     mobileLabel: 'Scanning' },
];

const sidebarW = 216;

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function Dashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { currentEvent, setCurrentEvent, logout } = useApp();
  const [loading, setLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    if (!currentEvent && eventId) {
      setLoading(true);
      eventsApi.get(eventId)
        .then((ev) => { setCurrentEvent(ev); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  function handleLogout() {
    if (logout) logout();
    navigate('/signin');
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar — desktop only */}
      {!isMobile && (
        <aside style={{
          width: sidebarW,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}>
          {/* Logo */}
          <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border)' }}>
            <Logo size={24} />
          </div>

          {/* Event selector */}
          <div style={{ padding: '10px 10px 6px' }}>
            <button
              onClick={() => navigate('/events')}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 8px',
                borderRadius: 'var(--r)',
                background: 'var(--surface-3)',
                border: '1px solid var(--border)',
                transition: 'background .12s, border-color .12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: 'var(--orange-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name="ticket" size={14} color="var(--orange)" stroke={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {loading ? (
                  <Spinner size={14} dark />
                ) : (
                  <>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {currentEvent?.name || 'Select event'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>Switch event</div>
                  </>
                )}
              </div>
              <Icon name="chevdown" size={13} color="var(--text-3)" />
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
            {NAV.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '7px 10px',
                  borderRadius: 'var(--r)',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--orange)' : 'var(--text-2)',
                  background: isActive ? 'var(--orange-soft)' : 'transparent',
                  marginBottom: 2,
                  transition: 'background .1s, color .1s',
                })}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.background = 'var(--surface-3)';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = '';
                  }
                }}
              >
                <Icon name={icon} size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Bottom user section */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px', borderRadius: 'var(--r)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name="shield" size={14} color="var(--text-2)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Admin</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Administrator</div>
              </div>
              <button
                title="Sign out"
                onClick={handleLogout}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 7,
                  color: 'var(--text-3)', transition: 'background .1s, color .1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--red-soft)';
                  e.currentTarget.style.color = 'var(--red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.color = 'var(--text-3)';
                }}
              >
                <Icon name="logout" size={15} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: 54,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 22px',
          flexShrink: 0,
          gap: 8,
        }}>
          {isMobile ? (
            <>
              <button
                onClick={() => navigate('/events')}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <Logo size={20} />
              </button>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {currentEvent?.name || 'Dashboard'}
                </div>
                {currentEvent?.location && (
                  <div style={{
                    fontSize: 11, color: 'var(--text-3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {currentEvent.location}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button
                  onClick={() => navigate('/events')}
                  title="Switch event"
                  style={{
                    all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 'var(--r)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-2)', background: 'var(--surface-3)',
                  }}
                >
                  <Icon name="chevdown" size={16} />
                </button>
                <button
                  onClick={() => navigate('/scanner')}
                  title="Gate Scanner"
                  style={{
                    all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 'var(--r)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-2)', background: 'var(--surface-3)',
                  }}
                >
                  <Icon name="scan" size={16} />
                </button>
                <button
                  onClick={() => setWizardOpen(true)}
                  title="New event"
                  style={{
                    all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 'var(--r)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', background: 'var(--orange)',
                  }}
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)' }}>
                  {currentEvent?.name || 'Dashboard'}
                </div>
                {currentEvent?.location && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <Icon name="pin" size={11} color="var(--text-3)" />
                    {currentEvent.location}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="ghost" icon="scan" onClick={() => navigate('/scanner')}>
                  Gate Scanner
                </Button>
                <Button variant="primary" icon="plus" onClick={() => setWizardOpen(true)}>
                  New event
                </Button>
              </div>
            </>
          )}
        </header>

        {/* Page content */}
        <main
          className={`tm-scroll${isMobile ? ' db-main-scroll-mobile' : ''}`}
          style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}
        >
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="attendees" element={<Attendees />} />
            <Route path="ticket-types" element={<TicketTypes />} />
            <Route path="orders" element={<Orders />} />
            <Route path="scanning" element={<Scanning />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <nav className="db-bottom-nav" style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 20,
          height: 62,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
          boxShadow: '0 -1px 8px rgba(24,24,27,0.06)',
        }}>
          {NAV.map(({ to, icon, mobileLabel }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: 500,
                color: isActive ? 'var(--orange)' : 'var(--text-3)',
                padding: '6px 2px',
                transition: 'color .1s',
              })}
            >
              <Icon name={icon} size={19} />
              <span style={{ whiteSpace: 'nowrap' }}>{mobileLabel}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Event Wizard Modal */}
      {wizardOpen && (
        <EventWizard
          onClose={() => setWizardOpen(false)}
          onDone={(ev) => {
            setCurrentEvent(ev);
            setWizardOpen(false);
            navigate(`/events/${ev.id}/overview`);
          }}
        />
      )}
    </div>
  );
}
