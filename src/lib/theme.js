import { useSyncExternalStore } from 'react';

// Theme preference: 'system' follows the OS, 'light'/'dark' pin it by stamping
// data-theme on <html> (see the token blocks in index.css). The stored value is
// also read by an inline script in index.html before first paint — keep this
// key and the accepted values in sync with it.
const KEY = 'tm-theme';
const MODES = ['system', 'light', 'dark'];

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : 'system';
  } catch {
    // Storage is unavailable (private mode, blocked cookies) — no preference.
    return 'system';
  }
}

let theme = read();
const listeners = new Set();

function apply(mode) {
  const el = document.documentElement;
  if (mode === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', mode);
}

export function setTheme(mode) {
  if (!MODES.includes(mode) || mode === theme) return;
  theme = mode;
  apply(mode);
  try {
    localStorage.setItem(KEY, mode);
  } catch { /* preference just won't survive a reload */ }
  listeners.forEach((fn) => fn());
}

export function cycleTheme() {
  setTheme(MODES[(MODES.indexOf(theme) + 1) % MODES.length]);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTheme() {
  return useSyncExternalStore(subscribe, () => theme, () => 'system');
}
