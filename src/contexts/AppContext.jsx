import { createContext, useContext, useEffect, useReducer, useState, useCallback } from 'react';
import AuthService from '../services/AuthService';

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
  const [auth, dispatch] = useReducer(authReducer, {
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
  // auth after a failed refresh.
  useEffect(() => {
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [handleAuthChange]);

  async function login(email, password) {
    dispatch({ type: 'SET_LOADING', payload: true });
    const result = await AuthService.login(email, password);
    if (result.success) dispatch({ type: 'LOGIN_SUCCESS', payload: result.user });
    else dispatch({ type: 'AUTH_ERROR', payload: result.error });
    return result;
  }

  async function logout() {
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
