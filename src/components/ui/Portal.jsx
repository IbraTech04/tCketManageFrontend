import { createPortal } from 'react-dom';

/**
 * Renders children into document.body, escaping any ancestor that establishes a
 * containing block (e.g. a transform animation), so position:fixed overlays are
 * always positioned relative to the viewport.
 */
export default function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
