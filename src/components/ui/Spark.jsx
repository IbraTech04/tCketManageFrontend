export default function Spark({ data, w = 96, h = 30, color = 'var(--orange)' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
    return [x, y];
  });
  const dStr = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = dStr + ` L${w} ${h} L0 ${h} Z`;
  const gid = 'sg' + Math.round(data.reduce((a, b) => a + b, 0));
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={dStr} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
