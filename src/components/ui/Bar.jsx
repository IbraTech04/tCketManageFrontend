export default function Bar({ value, max, color = 'var(--orange)', track = 'var(--surface-3)', height = 7 }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div style={{ background: track, borderRadius: 999, height, overflow: 'hidden', width: '100%' }}>
      <div style={{
        width: pct + '%', height: '100%', background: color, borderRadius: 999,
        transition: 'width .5s cubic-bezier(.16,1,.3,1)',
      }} />
    </div>
  );
}
