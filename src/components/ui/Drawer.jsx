import Portal from './Portal';

export default function Drawer({ open, onClose, children, width = 440 }) {
  return (
    <Portal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(20,20,24,0.32)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .2s', zIndex: 40,
        }}
      />
      <div
        className="tm-scroll"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width, maxWidth: '100vw',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-pop)', zIndex: 41,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .26s cubic-bezier(.16,1,.3,1)',
          overflowY: 'auto',
        }}
      >
        {open && children}
      </div>
    </Portal>
  );
}
