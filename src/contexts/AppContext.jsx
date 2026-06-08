import { createContext, useContext, useState } from 'react';
import { setToken } from '../api/client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem('tm-token'));
  const [currentEvent, setCurrentEventState] = useState(() => {
    try {
      const s = localStorage.getItem('tm-current-event');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  function login(newToken) {
    setToken(newToken);
    setTokenState(newToken);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    localStorage.removeItem('tm-token');
  }

  function setCurrentEvent(event) {
    setCurrentEventState(event);
    if (event) localStorage.setItem('tm-current-event', JSON.stringify(event));
    else localStorage.removeItem('tm-current-event');
  }

  return (
    <AppContext.Provider value={{ token, login, logout, currentEvent, setCurrentEvent }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
