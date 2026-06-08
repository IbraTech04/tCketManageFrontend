import logoUrl from '../assets/logo.svg';

export default function Logo({ size = 26 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img
        src={logoUrl}
        alt="tCketManage"
        width={size}
        height={size}
        style={{ display: 'block', flexShrink: 0 }}
      />
      <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.02em' }}>
        t<span style={{ color: 'var(--orange)' }}>C</span>ketManage
      </span>
    </div>
  );
}
