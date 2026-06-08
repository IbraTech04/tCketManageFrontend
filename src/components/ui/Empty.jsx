import Icon from './Icon';

export default function Empty({ icon = 'info', title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: 'var(--surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={22} color="var(--text-3)" />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
