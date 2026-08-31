import LogoMark from './LogoMark';

/**
 * Brand lockup: the ticket mark plus the wordmark. Pass `showWordmark={false}`
 * for the mark on its own.
 */
export default function Logo({
  size = 26,
  showWordmark = true,
  wordmarkSize,
  wordmarkWeight = 600,
  color,
  markColor = 'var(--orange)',
  gap = 9,
}) {
  return (
    <div
      role="img"
      aria-label="tCketManage"
      style={{ display: 'flex', alignItems: 'center', gap }}
    >
      <LogoMark size={size} color={markColor} />
      {showWordmark && (
        <span style={{
          fontSize: wordmarkSize ?? Math.round(size * 0.6 * 10) / 10,
          fontWeight: wordmarkWeight,
          letterSpacing: '-0.02em',
          color,
          whiteSpace: 'nowrap',
        }}>
          t<span style={{ color: markColor }}>C</span>ketManage
        </span>
      )}
    </div>
  );
}
