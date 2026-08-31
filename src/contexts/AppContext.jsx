import { createContext, useContext, useEffect, useReducer, useState, useCallback } from 'react';
import AuthService from '../services/AuthService';
import { AUTH_DISABLED, DEV_USER } from '../lib/devAuth';

const AppContext = createContext(null);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, isAuthenticated: true, user: action.payload, isLoading: false, error: null };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null, isLoading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, isAuthenticated: false, user: null, isLoading: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export function AppProvider({ children }) {
  // With the dev bypass on, start settled and authenticated rather than loading:
  // there is no session to restore and no auth endpoint to ask.
  const [auth, dispatch] = useReducer(authReducer, AUTH_DISABLED ? {
    isAuthenticated: true,
    user: DEV_USER,
    isLoading: false,
    error: null,
  } : {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  });

  const [currentEvent, setCurrentEventState] = useState(() => {
    try {
      const s = localStorage.getItem('tm-current-event');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const handleAuthChange = useCallback(() => {
    const user = AuthService.getCurrentUser();
    const shouldBeAuthenticated = !!(user && AuthService.isLoggedIn());
    if (shouldBeAuthenticated) dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    else dispatch({ type: 'LOGOUT' });
  }, []);

  // Restore/validate the session once on app start.
  useEffect(() => {
    if (AUTH_DISABLED) return; // nothing to restore, and no /api/auth to ask
    let cancelled = false;
    (async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await AuthService.initializeAuth();
      if (cancelled) return;
      if (result.success) dispatch({ type: 'LOGIN_SUCCESS', payload: result.user });
      else dispatch({ type: 'LOGOUT' });
    })();
    return () => { cancelled = true; };
  }, []);

  // Picks up token/user changes from other tabs, and from client.js clearing
  // auth after a failed refresh. Skipped under the dev bypass: with no tokens in
  // localStorage these listeners would fire LOGOUT and undo the stub session.
  useEffect(() => {
    if (AUTH_DISABLED) return;
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [handleAuthChange]);

  async function login(email, password) {
    if (AUTH_DISABLED) return { success: true, user: DEV_USER };
    dispatch({ type: 'SET_LOADING', payload: true });
    const result = await AuthService.login(email, password);
    if (result.success) dispatch({ type: 'LOGIN_SUCCESS', payload: result.user });
    else dispatch({ type: 'AUTH_ERROR', payload: result.error });
    return result;
  }

  async function logout() {
    // Inert under the bypass. Dispatching LOGOUT would flip isAuthenticated while
    // ProtectedRoute kept letting you through — a sign-out button that visibly does
    // nothing. Better to say why than to half-do it.
    if (AUTH_DISABLED) {
      console.warn('[tCketManage] Sign-out ignored: auth is disabled (VITE_DISABLE_AUTH=true).');
      return;
    }
    await AuthService.logout();
    dispatch({ type: 'LOGOUT' });
  }

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  function setCurrentEvent(event) {
    setCurrentEventState(event);
    if (event) localStorage.setItem('tm-current-event', JSON.stringify(event));
    else localStorage.removeItem('tm-current-event');
  }

  return (
    <AppContext.Provider value={{
      ...auth,
      login,
      logout,
      clearError,
      currentEvent,
      setCurrentEvent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
