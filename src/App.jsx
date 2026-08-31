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
import ReconcilePayment from './pages/ReconcilePayment';

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
          {/* Reconciling is a two-sided comparison that needs the width, so it gets its own screen
              rather than expanding inside the list. */}
          <Route path="/payments/unmatched/:id" element={<ProtectedRoute><ReconcilePayment /></ProtectedRoute>} />
          <Route path="/buy" element={<ProtectedRoute><BuyTickets /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
        <AuthDisabledBanner />
      </BrowserRouter>
    </AppProvider>
  );
}
