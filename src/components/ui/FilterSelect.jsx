import Icon from './Icon';

export default function FilterSelect({ value, onChange, options, icon, placeholder }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {icon && (
        <span style={{ position: 'absolute', left: 10, color: 'var(--text-3)', pointerEvents: 'none', display: 'flex' }}>
          <Icon name={icon} size={14} />
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none', font: 'inherit', fontSize: 12.5, fontWeight: 500,
          color: 'var(--text)', background: 'var(--surface)',
          border: '1px solid var(--border-2)', borderRadius: 'var(--r)',
          height: 34, padding: icon ? '0 30px 0 30px' : '0 30px 0 12px', cursor: 'pointer',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 9, color: 'var(--text-3)', pointerEvents: 'none', display: 'flex' }}>
        <Icon name="chevdown" size={14} />
      </span>
    </div>
  );
}
