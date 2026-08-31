/**
 * Character-level alignment between what a buyer typed and an order's reference code.
 *
 * The run being compared (`excerpt`) comes from the backend, not from here. It is the exact run the
 * matcher scored, so the characters this marks are the characters that produced the number beside
 * them. Re-deriving the run in the browser would be a second source of truth: on a memo where two
 * runs tie, the highlight could land on one while the score came from the other, and a highlight
 * that contradicts its own score is worse than no highlight at all.
 *
 * Alignment is positional, which is honest for the case that dominates — a mistyped character, where
 * both sides are the same length. When the excerpt is shorter or longer (a dropped or doubled
 * character), the trailing positions simply have nothing to compare against and are marked as such
 * rather than being shifted to manufacture a prettier alignment.
 */
export function alignCode(excerpt, referenceCode) {
  const typed = normalize(excerpt);
  const actual = normalize(referenceCode);
  if (!typed || !actual) return null;

  const width = Math.max(typed.length, actual.length);
  const typedChars = [];
  const actualChars = [];

  for (let i = 0; i < width; i++) {
    const t = typed[i];
    const a = actual[i];
    // Only a position present on both sides can agree; a position present on one is "missing",
    // which reads differently to an operator than "wrong" and should not be coloured the same.
    const state = t === undefined || a === undefined ? 'missing' : (t === a ? 'same' : 'differs');
    if (t !== undefined) typedChars.push({ char: t, state });
    if (a !== undefined) actualChars.push({ char: a, state });
  }

  return {
    typed: typedChars,
    actual: actualChars,
    differing: typedChars.filter((c) => c.state !== 'same').length,
  };
}

/** Uppercase, letters and digits only — the form the matcher compares in. */
function normalize(value) {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** How near a candidate is, in words an operator can act on rather than a number to defer to. */
export function distanceLabel(distance) {
  if (distance === 0) return 'Code matches exactly';
  if (distance === 1) return '1 character differs';
  return `${distance} characters differ`;
}
