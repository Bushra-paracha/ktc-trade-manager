import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import Outreach from './pages/Outreach';
import Inquiries from './pages/Inquiries';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Shipments from './pages/Shipments';
import Documents from './pages/Documents';
import Products from './pages/Products';
import Amazon from './pages/Amazon';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/inquiries" element={<Inquiries />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/products" element={<Products />} />
            <Route path="/amazon" element={<Amazon />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
