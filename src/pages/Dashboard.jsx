import { useAuth } from '../hooks/useAuth';
import { TrendingUp, Users, ClipboardList, Ship, ArrowUpRight, ArrowDownRight, Mail, FileQuestion, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { orders, shipments, tasks, pipelineByStage, emailThreads, formatUSD } from '../data/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { monthlyRevenue } from '../data/mockData';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const firstName = (profile?.full_name || user?.email || 'there').split(' ')[0].split('@')[0];
  const activeOrders = orders.filter((o) => !['Closed', 'Delivered'].includes(o.status)).length;
  const inTransit = shipments.filter((s) => s.status === 'In Transit').length;
  const totalRevenueYTD = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const todayStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

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
        <StatCard icon={Users} label="Leads in Pipeline" value="7" delta="+2 this week" deltaDirection="up" accent="#2C6E8F" />
        <StatCard icon={ClipboardList} label="Active Orders" value={activeOrders} delta="2 awaiting shipment" deltaDirection="up" accent="#C49A2B" />
        <StatCard icon={Ship} label="Shipments In Transit" value={inTransit} delta="On schedule" deltaDirection="up" accent="#1A4D2E" />
        <StatCard icon={TrendingUp} label="Revenue (YTD)" value={formatUSD(totalRevenueYTD)} delta="-9.6% vs target" deltaDirection="down" accent="#B5402E" />
      </div>

      <div className="split-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Revenue chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Revenue vs Target</h3>
                <div className="card-header-sub">Monthly export revenue, USD</div>
              </div>
              <Badge status="badge-gray">2026 YTD</Badge>
            </div>
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
          </div>

          {/* Pipeline */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Sales Pipeline by Stage</h3>
                <div className="card-header-sub">Lead count and value per stage</div>
              </div>
              <Link to="/clients" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineByStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#97A199' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
                <Bar dataKey="count" fill="#1A4D2E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent client activity */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Recent Activity</h3>
                <div className="card-header-sub">Latest email and client interactions</div>
              </div>
            </div>
            {emailThreads.slice(0, 3).map((t) => {
              const last = t.messages[t.messages.length - 1];
              return (
                <div className="timeline-item" key={t.id}>
                  <div className="timeline-icon" style={{ background: '#DFEEF5', color: '#2C6E8F' }}>
                    <Mail />
                  </div>
                  <div className="timeline-body" style={{ flex: 1 }}>
                    <strong>{t.client}</strong>
                    <p>{last.subject} — from {last.from}</p>
                  </div>
                  <div className="timeline-time">{last.date.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tasks */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Today's Tasks</h3>
                <div className="card-header-sub">{tasks.length} open tasks</div>
              </div>
            </div>
            {tasks.map((task) => (
              <div className="timeline-item" key={task.id}>
                <div className="timeline-icon" style={{
                  background: task.priority === 'High' ? '#FAE3DD' : task.priority === 'Medium' ? '#FBF1D8' : '#F1F0EB',
                  color: task.priority === 'High' ? '#B5402E' : task.priority === 'Medium' ? '#B5790A' : '#97A199',
                }}>
                  <AlertCircle />
                </div>
                <div className="timeline-body" style={{ flex: 1 }}>
                  <strong>{task.title}</strong>
                  <p>{task.client}</p>
                </div>
                <div className="timeline-time">{task.due}</div>
              </div>
            ))}
          </div>

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
            <div className="timeline-item">
              <div className="timeline-icon" style={{ background: '#FBEED9', color: '#B5790A' }}>
                <ArrowUpRight />
              </div>
              <div className="timeline-body">
                <strong>Quote expiring soon</strong>
                <p>INQ-2024-0095 (Mediterraneo) expires in 2 days</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-icon" style={{ background: '#FAE3DD', color: '#B5402E' }}>
                <ArrowDownRight />
              </div>
              <div className="timeline-body">
                <strong>Lead going dormant</strong>
                <p>Nordic Specialty Foods — no activity in 64 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
