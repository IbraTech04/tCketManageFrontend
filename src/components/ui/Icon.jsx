const PATHS = {
  calendar:  ['rect:3,4,18,18,2', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  ticket:    ['M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z','M13 5v2','M13 17v2','M13 11v2'],
  users:     ['M16 3.13a4 4 0 0 1 0 7.75','M22 21v-2a4 4 0 0 0-3-3.87','circle:9,7,4','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'],
  user:      ['circle:12,8,4','M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1'],
  scan:      ['M3 7V5a2 2 0 0 1 2-2h2','M17 3h2a2 2 0 0 1 2 2v2','M21 17v2a2 2 0 0 1-2 2h-2','M7 21H5a2 2 0 0 1-2-2v-2','M7 12h10'],
  qr:        ['rect:3,3,7,7,1','rect:14,3,7,7,1','rect:3,14,7,7,1','M14 14h3v3','M21 14v.01','M14 21h7','M21 17v4'],
  chart:     ['M3 3v18h18','M18 17V9','M13 17V6','M8 17v-4'],
  trending:  ['M22 7 13.5 15.5 8.5 10.5 2 17','M16 7h6v6'],
  settings:  ['M21 4H14','M10 4H3','M21 12H12','M8 12H3','M21 20H16','M12 20H3','circle:12,4,2','circle:6,12,2','circle:14,20,2'],
  search:    ['circle:11,11,8','M21 21l-4.3-4.3'],
  plus:      ['M5 12h14','M12 5v14'],
  minus:     ['M5 12h14'],
  chevdown:  ['m6 9 6 6 6-6'],
  chevright: ['m9 6 6 6-6 6'],
  chevleft:  ['m15 6-6 6 6 6'],
  arrowright:['M5 12h14','m12 5 7 7-7 7'],
  arrowleft: ['M19 12H5','m12 19-7-7 7-7'],
  check:     ['M20 6 9 17l-5-5'],
  x:         ['M18 6 6 18','M6 6l12 12'],
  pin:       ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z','circle:12,10,3'],
  card:      ['rect:2,5,20,14,2','M2 10h20'],
  mail:      ['rect:2,4,20,16,2','m2 7 10 6 10-6'],
  download:  ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
  upload:    ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M17 8l-5-5-5 5','M12 3v12'],
  filter:    ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  more:      ['circle:12,12,1','circle:19,12,1','circle:5,12,1'],
  infinity:  ['M6 16a4 4 0 1 1 4-4 4 4 0 1 1-4 4Z','M18 16a4 4 0 1 0-4-4 4 4 0 1 0 4 4Z','M10 12h4'],
  clock:     ['circle:12,12,10','M12 6v6l4 2'],
  shield:    ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'],
  copy:      ['rect:9,9,13,13,2','M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  logout:    ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'],
  bell:      ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9','M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  dollar:    ['M12 1v22','M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  camera:    ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z','circle:12,13,3'],
  layers:    ['M12 2 2 7l10 5 10-5-10-5Z','m2 17 10 5 10-5','m2 12 10 5 10-5'],
  grid:      ['rect:3,3,7,7,1','rect:14,3,7,7,1','rect:14,14,7,7,1','rect:3,14,7,7,1'],
  home:      ['M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z'],
  refresh:   ['M3 12a9 9 0 0 1 15-6.7L21 8','M21 3v5h-5','M21 12a9 9 0 0 1-15 6.7L3 16','M3 21v-5h5'],
  ban:       ['circle:12,12,10','m4.9 4.9 14.2 14.2'],
  info:      ['circle:12,12,10','M12 16v-4','M12 8h.01'],
  alert:     ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0-3.4 0Z','M12 9v4','M12 17h.01'],
  history:   ['M3 12a9 9 0 1 0 3-6.7L3 8','M3 3v5h5','M12 7v5l4 2'],
  external:  ['M15 3h6v6','M10 14 21 3','M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  sparkle:   ['M12 3l1.9 5.6L19.5 10 13.9 11.9 12 17.5 10.1 11.9 4.5 10l5.6-1.4L12 3z'],
  monitor:   ['rect:2,3,20,14,2','M8 21h8','M12 17v4'],
  smartphone:['rect:5,2,14,20,2','M12 18h.01'],
  lock:      ['rect:3,11,18,11,2','M7 11V7a5 5 0 0 1 10 0v4'],
  trash:     ['M3 6h18','M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2','M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
  edit:      ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z'],
  zap:       ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  building:  ['rect:4,2,16,20,2','M9 22v-4h6v4','M9 6h.01','M15 6h.01','M9 10h.01','M15 10h.01','M9 14h.01','M15 14h.01'],
};

export default function Icon({ name, size = 18, stroke = 2, color = 'currentColor', fill = 'none', style }) {
  const parts = PATHS[name] || [];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true"
    >
      {parts.map((p, i) => {
        if (p.startsWith('rect:')) {
          const [x, y, w, h, r] = p.slice(5).split(',').map(Number);
          return <rect key={i} x={x} y={y} width={w} height={h} rx={r || 0} />;
        }
        if (p.startsWith('circle:')) {
          const [cx, cy, rr] = p.slice(7).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r={rr} />;
        }
        return <path key={i} d={p} />;
      })}
    </svg>
  );
}
