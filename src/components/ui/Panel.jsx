import Icon from './Icon';

export default function Panel({ title, icon, right, children, noPad, style }) {
  return (
    <div className="card" style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        {icon && <Icon name={icon} size={16} color="var(--text-2)" />}
        <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{title}</span>
        {right}
      </div>
      <div style={{ padding: noPad ? 0 : 16 }}>{children}</div>
    </div>
  );
}
