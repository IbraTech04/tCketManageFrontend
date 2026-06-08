import Button from './Button';

export default function DrawerHeader({ title, subtitle, onClose, right }) {
  return (
    <div style={{
      position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2,
      padding: '18px 22px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
      <Button variant="subtle" icon="x" onClick={onClose} />
    </div>
  );
}
