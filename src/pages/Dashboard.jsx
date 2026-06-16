import { useAuth } from '../hooks/useAuth';
import { useClients } from '../hooks/useClients';
import { useOrders } from '../hooks/useOrders';
import { useInquiries } from '../hooks/useInquiries';
import { useAnalytics } from '../hooks/useAnalytics';
import { useEmailMessages } from '../hooks/useOutreach';
import { TrendingUp, Users, ClipboardList, Ship, ArrowUpRight, ArrowDownRight, Mail, FileQuestion, Package, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { formatUSD } from '../data/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { clients, loading: clientsLoading } = useClients();
  const { orders, loading: ordersLoading } = useOrders();
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { monthlyRevenue, pipelineByStage, loading: analyticsLoading } = useAnalytics();
  const { messages: emailMessages, loading: emailsLoading } = useEmailMessages();

  const firstName = (profile?.full_name || user?.email || 'there').split(' ')[0].split('@')[0];
  const todayStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const loading = clientsLoading || ordersLoading || inquiriesLoading || analyticsLoading || emailsLoading;

  const activeOrders = orders.filter((o) => !['Closed', 'Delivered'].includes(o.status)).length;
  const inTransit = orders.filter((o) => (o.shipments || []).some((s) => s.status === 'In Transit')).length;
  const totalRevenueYTD = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const last6moTarget = monthlyRevenue.reduce((sum, m) => sum + m.target, 0);
  const revenueDelta = last6moTarget ? Math.round(((totalRevenueYTD - last6moTarget) / last6moTarget) * 1000) / 10 : 0;

  const recentEmails = emailMessages.slice(0, 3);

  // Alerts: expiring quotes (within 3 days) and dormant leads (60+ days inactive)
  const now = new Date();
  const expiringInquiries = inquiries.filter((i) => {
    if (!['Pending Response', 'Quote Sent', 'In Negotiation'].includes(i.status)) return false;
    const created = new Date(i.created_at);
    const expiresAt = new Date(created);
    expiresAt.setDate(expiresAt.getDate() + (i.quote_validity_days || 7));
    const daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);
    return daysLeft >= 0 && daysLeft <= 3;
  });

  const dormantClients = clients.filter((c) => {
    if (!c.last_activity) return false;
    const days = (now - new Date(c.last_activity)) / (1000 * 60 * 60 * 24);
    return days >= 60;
  });

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good morning, {firstName}</h1>
          <p>Here's what's happening across KTC today — {todayStr}</p>
        </div>
        <Link to="/clients" className="btn btn-primary">
          <Users /> Add New Lead
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={Users} label="Leads in Pipeline" value={clients.length} delta={`${clients.filter((c) => c.status === 'New').length} new`} deltaDirection="up" accent="#2C6E8F" />
        <StatCard icon={ClipboardList} label="Active Orders" value={activeOrders} delta={`${orders.filter((o) => o.status === 'Ready to Ship').length} awaiting shipment`} deltaDirection="up" accent="#C49A2B" />
        <StatCard icon={Ship} label="Shipments In Transit" value={inTransit} delta="Live from orders" deltaDirection="up" accent="#1A4D2E" />
        <StatCard
          icon={TrendingUp}
          label="Revenue (6 mo)"
          value={formatUSD(totalRevenueYTD)}
          delta={last6moTarget ? `${revenueDelta > 0 ? '+' : ''}${revenueDelta}% vs avg` : 'No orders yet'}
          deltaDirection={revenueDelta >= 0 ? 'up' : 'down'}
          accent="#B5402E"
        />
      </div>

      <div className="split-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Revenue chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Revenue Trend</h3>
                <div className="card-header-sub">Monthly order value, USD</div>
              </div>
              <Badge status="badge-gray">Last 6 months</Badge>
            </div>
            {totalRevenueYTD > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1A4D2E" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1A4D2E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatUSD(v)} contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
                  <Area type="monotone" dataKey="target" stroke="#C49A2B" strokeDasharray="4 4" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="revenue" stroke="#1A4D2E" fill="url(#rev)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>No orders yet — revenue trend will appear once orders are created.</p>
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Sales Pipeline by Stage</h3>
                <div className="card-header-sub">Lead count per stage</div>
              </div>
              <Link to="/clients" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {pipelineByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineByStage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#97A199' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1A4D2E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p>No clients in the pipeline yet.</p>
              </div>
            )}
          </div>

          {/* Recent email activity */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Recent Activity</h3>
                <div className="card-header-sub">Latest outreach emails</div>
              </div>
              <Link to="/outreach" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {recentEmails.length === 0 && (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>No emails sent yet.</p>
              </div>
            )}
            {recentEmails.map((m) => (
              <div className="timeline-item" key={m.id}>
                <div className="timeline-icon" style={{ background: '#DFEEF5', color: '#2C6E8F' }}>
                  <Mail />
                </div>
                <div className="timeline-body" style={{ flex: 1 }}>
                  <strong>{m.clients?.company || m.to_email}</strong>
                  <p>{m.subject} — {m.status}</p>
                </div>
                <div className="timeline-time">{m.sent_at ? new Date(m.sent_at).toLocaleDateString() : '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick links */}
          <div className="card">
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/outreach" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Mail /> Send Outreach Campaign
              </Link>
              <Link to="/inquiries" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <FileQuestion /> Review Open Inquiries
              </Link>
              <Link to="/orders" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <ClipboardList /> Track Active Orders
              </Link>
              <Link to="/products" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Package /> Manage Product Catalog
              </Link>
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="card-header">
              <h3>Alerts</h3>
            </div>
            {expiringInquiries.length === 0 && dormantClients.length === 0 && (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>No alerts right now — all clear.</p>
              </div>
            )}
            {expiringInquiries.map((i) => (
              <div className="timeline-item" key={i.id}>
                <div className="timeline-icon" style={{ background: '#FBEED9', color: '#B5790A' }}>
                  <ArrowUpRight />
                </div>
                <div className="timeline-body">
                  <strong>Quote expiring soon</strong>
                  <p>{i.id} ({i.clients?.company || 'Unknown client'}) expires within 3 days</p>
                </div>
              </div>
            ))}
            {dormantClients.map((c) => (
              <div className="timeline-item" key={c.id}>
                <div className="timeline-icon" style={{ background: '#FAE3DD', color: '#B5402E' }}>
                  <ArrowDownRight />
                </div>
                <div className="timeline-body">
                  <strong>Lead going dormant</strong>
                  <p>{c.company} — no activity in 60+ days</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
