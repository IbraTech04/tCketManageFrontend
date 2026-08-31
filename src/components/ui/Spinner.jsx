export default function Spinner({ size = 20, dark = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      // `dark` = spinning on a page surface rather than on a filled (orange or
      // red) button, where the ring stays white in both themes.
      border: `2px solid ${dark ? 'var(--spinner-track)' : 'rgba(255,255,255,0.3)'}`,
      borderTopColor: dark ? 'var(--text-2)' : '#fff',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
