import Icon from './Icon';

export default function Tabs({ tabs, active, onChange, dark }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${dark ? '#2a2e37' : 'var(--border)'}` }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              font: 'inherit', fontSize: 13, fontWeight: 500, padding: '10px 13px',
              color: on ? (dark ? '#fff' : 'var(--text)') : (dark ? '#8b8f99' : 'var(--text-2)'),
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {t.icon && <Icon name={t.icon} size={15} />}
            {t.label}
            {t.count != null && (
              <span className="mono" style={{
                fontSize: 11, color: dark ? '#8b8f99' : 'var(--text-3)',
                background: dark ? '#22262e' : 'var(--surface-3)',
                borderRadius: 5, padding: '1px 6px',
              }}>{t.count}</span>
            )}
            {on && (
              <span style={{
                position: 'absolute', left: 8, right: 8, bottom: -1, height: 2,
                background: 'var(--orange)', borderRadius: 2,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
