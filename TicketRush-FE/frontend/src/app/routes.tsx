import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useApp } from './store/AppContext';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ProfilePage from './pages/ProfilePage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import QueuePage from './pages/QueuePage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminCreateEventPage from './pages/admin/AdminCreateEventPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';

const NO_NAVBAR_PATHS = ['/login', '/register', '/admin'];
const NO_FOOTER_PATHS = ['/login', '/register', '/admin', '/queue', '/checkout', '/events/', '/tickets'];

function Root() {
  const location = useLocation();
  const { user } = useApp();
  const showNavbar = !NO_NAVBAR_PATHS.some(p => location.pathname.startsWith(p));
  const showFooter = showNavbar && !NO_FOOTER_PATHS.some(p => location.pathname.startsWith(p));

  if (user?.role === 'admin' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {showNavbar && <Navbar />}
      <Outlet />
      {showFooter && <Footer />}
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: 'events', Component: EventsPage },
      { path: 'events/:id', Component: EventDetailPage },
      { path: 'events/:id/seats', Component: SeatSelectionPage },
      { path: 'queue/:id', Component: QueuePage },
      { path: 'checkout', Component: CheckoutPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'tickets', Component: MyTicketsPage },
      { path: 'login', Component: LoginPage },
      { path: 'register', Component: RegisterPage },
      {
        path: 'admin',
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboardPage },
          { path: 'events', Component: AdminEventsPage },
          { path: 'events/new', Component: AdminCreateEventPage },
          { path: 'events/:id/edit', Component: AdminCreateEventPage },
          { path: 'orders', Component: AdminOrdersPage },
        ],
      },
    ],
  },
]);
