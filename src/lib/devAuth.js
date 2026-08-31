// Development-only auth bypass.
//
// The standalone tcketmanage-app does not enforce authentication — it exists to
// exercise core's endpoints without standing up LensBridge's auth stack. Pointed
// at it, this console would otherwise be unusable: every route sits behind
// ProtectedRoute, which bounces you to a /signin backed by an /api/auth endpoint
// that isn't there.
//
// Turn it on with VITE_DISABLE_AUTH=true in .env.local (see .env.example).
//
// SAFETY: the `import.meta.env.DEV` conjunct is not belt-and-braces, it is the
// whole guarantee. Vite statically replaces both operands at build time, so in a
// production build this expression becomes `false && ...` and the bypass is dead
// code the bundler drops — setting VITE_DISABLE_AUTH=true in a prod build cannot
// ship an auth-less console. Never rewrite this to read the env var alone.
export const AUTH_DISABLED =
  import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH === 'true';

/**
 * Stand-in for the signed-in user while auth is bypassed.
 *
 * Nothing renders these fields today — AppContext's consumers only read
 * `isAuthenticated` — but the shape matches AuthService.toUserInfo so that a
 * component which later reaches for `user.email` or `user.roles` gets something
 * of the right type rather than a crash. The roles are the two the dashboard's
 * admin actions correspond to server-side, so bypassed mode doesn't accidentally
 * hide the very buttons you are trying to test.
 */
export const DEV_USER = Object.freeze({
  id: 'dev-bypass',
  email: 'dev@localhost',
  firstName: 'Auth',
  lastName: 'Bypassed',
  verified: true,
  roles: ['ROLE_ADMIN', 'ROLE_EVENT_MANAGER'],
  permissions: [],
});

// One loud line in the console at startup. A silent auth bypass is how you end up
// debugging a "working" build that only works on your machine.
if (AUTH_DISABLED) {
  console.warn(
    '%c[tCketManage] AUTH DISABLED',
    'background:#b45309;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
    '\nVITE_DISABLE_AUTH=true — requests go out unauthenticated and every route is open.'
      + '\nDevelopment builds only; this cannot be enabled in a production build.'
  );
}
