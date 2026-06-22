import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import SignIn from './pages/SignIn';
import EventList from './pages/EventList';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import BuyTickets from './pages/BuyTickets';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:eventId/*" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/buy" element={<BuyTickets />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
