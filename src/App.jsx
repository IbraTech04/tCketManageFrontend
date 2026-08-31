import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import AuthDisabledBanner from './components/AuthDisabledBanner';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import EventList from './pages/EventList';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import BuyTickets from './pages/BuyTickets';
import UnmatchedPayments from './pages/UnmatchedPayments';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/events" element={<ProtectedRoute><EventList /></ProtectedRoute>} />
          <Route path="/events/:eventId/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          {/* Not under /events/:eventId — an unmatched payment has no order, so no event. */}
          <Route path="/payments/unmatched" element={<ProtectedRoute><UnmatchedPayments /></ProtectedRoute>} />
          <Route path="/buy" element={<ProtectedRoute><BuyTickets /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
        <AuthDisabledBanner />
      </BrowserRouter>
    </AppProvider>
  );
}
