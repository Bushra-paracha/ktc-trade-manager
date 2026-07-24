import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';

const Login = lazy(() => import('./pages/Login'));
const PublicInquiry = lazy(() => import('./pages/PublicInquiry'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Documents = lazy(() => import('./pages/Documents'));
const Payments = lazy(() => import('./pages/Payments'));
const Outreach = lazy(() => import('./pages/Outreach'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Loader2 size={28} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public route, no login required. Anyone with this link
            (from the website or LinkedIn) can submit an inquiry. */}
        <Route path="/quote" element={<PublicInquiry />} />
        <Route path="/track/:token" element={<OrderTracking />} />

        {/* Everything else requires login */}
        <Route
          path="/*"
          element={
            loading ? (
              <PageLoader />
            ) : !user ? (
              <Login />
            ) : (
              <div className="app-shell">
                <Sidebar />
                <div className="app-main">
                  <Topbar />
                  <div className="page-content">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/clients/:id" element={<ClientProfile />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/orders/:id" element={<OrderDetail />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/payments" element={<Payments />} />
                      <Route path="/outreach" element={<Outreach />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/shipments" element={<Navigate to="/orders" replace />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </div>
                <BottomNav />
              </div>
            )
          }
        />
      </Routes>
    </Suspense>
  );
}
