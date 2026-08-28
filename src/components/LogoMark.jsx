/**
 * The tCketManage ticket mark, inlined from `tCketManage Logo.svg` at the repo
 * root. Inline (rather than an <img>) so callers can recolour it — the brand
 * orange by default, `currentColor` or a translucent tint for silhouettes.
 */
export default function LogoMark({ size = 26, color = 'var(--orange)', style, ...rest }) {
  return (
    <svg
      viewBox="0 0 1080 1080"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={41}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...rest}
    >
      <path d="M227.18,723.26c-26.66-17.25-62.21-17.62-89.75,1.81l-79.02-112c-6.87-9.74-4.52-23.33,5.21-30.2l184.42-130.12" />
      <path d="M307.95,410.5L740.97,104.99c9.74-6.87,23.33-4.52,30.2,5.21l79.02,112c-36.16,25.51-44.79,75.5-19.28,111.66,25.51,36.16,75.5,44.79,111.66,19.28l79.02,112c6.87,9.74,4.52,23.33-5.21,30.2" />
      <path d="M398.69,501.24h604.99c11.92,0,21.67,9.75,21.67,21.67v137.07c-44.25,0-80.12,35.87-80.12,80.12s35.87,80.12,80.12,80.12c0,0,0,137.07,0,137.07,0,11.92-9.75,21.67-21.67,21.67h-127.27" />
      <path d="M774.25,978.95H174.72c-11.92,0-21.67-9.75-21.67-21.67,0,0,0-137.07,0-137.07,44.25,0,80.12-35.87,80.12-80.12s-35.87-80.12-80.12-80.12v-137.07c0-11.92,9.75-21.67,21.67-21.67h121.81" />
    </svg>
  );
}
