export default function Badge({ children, color = 'var(--text-2)', bg = 'var(--surface-3)', dot, style }) {
  return (
    <span className="badge" style={{ color, background: bg, ...style }}>
      {dot && <span className="dot" style={{ background: color }} />}
      {children}
    </span>
  );
}
