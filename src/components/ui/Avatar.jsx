const COLORS = ['#FF6A1A', '#7c5cff', '#0ea5e9', '#16a34a', '#ec4899', '#d97706'];

export default function Avatar({ name = '?', size = 30 }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const c = COLORS[h % COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: c + '22', color: c,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, letterSpacing: '.02em',
    }}>
      {initials}
    </div>
  );
}
