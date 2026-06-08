export default function Spinner({ size = 20, dark = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${dark ? 'rgba(24,24,27,0.15)' : 'rgba(255,255,255,0.3)'}`,
      borderTopColor: dark ? 'var(--text-2)' : '#fff',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
