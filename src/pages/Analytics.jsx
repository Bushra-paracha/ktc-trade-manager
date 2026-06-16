import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatUSD } from '../data/mockData';
import { useAnalytics } from '../hooks/useAnalytics';

const COLORS = ['#1A4D2E', '#2D7A4F', '#C49A2B', '#2C6E8F', '#B5790A', '#97A199', '#B5402E'];

export default function Analytics() {
  const {
    monthlyRevenue,
    revenueByCountry,
    pipelineByStage,
    leadToInquiryRate,
    inquiryToOrderRate,
    avgSalesCycleDays,
    loading,
    error,
  } = useAnalytics();

  const countryData = revenueByCountry.filter((c) => c.value > 0);
  const hasRevenue = monthlyRevenue.some((m) => m.revenue > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics &amp; Reporting</h1>
          <p>Sales pipeline, revenue, and market performance — live from your data</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load analytics</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Crunching the numbers...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Revenue Trend</h3>
                  <div className="card-header-sub">Monthly order value vs. 6-month average</div>
                </div>
              </div>
              {hasRevenue ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(v) => formatUSD(v)} contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#1A4D2E" strokeWidth={2.5} dot={{ r: 3 }} name="Revenue" />
                    <Line type="monotone" dataKey="target" stroke="#C49A2B" strokeDasharray="4 4" strokeWidth={2} dot={false} name="6-mo avg" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No orders yet — revenue trend will appear once orders are created." />
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Revenue by Country</h3>
                  <div className="card-header-sub">Total order value contribution per market</div>
                </div>
              </div>
              {countryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={countryData} dataKey="value" nameKey="country" cx="50%" cy="50%" outerRadius={85} label={({ country, percent }) => `${country} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {countryData.map((entry, index) => (
                        <Cell key={entry.country} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatUSD(v)} contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No order revenue by country yet." />
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div>
                <h3>Pipeline by Stage</h3>
                <div className="card-header-sub">Number of leads and known revenue per CRM stage</div>
              </div>
            </div>
            {pipelineByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={pipelineByStage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1A4D2E" radius={[6, 6, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No clients in the pipeline yet." />
            )}
          </div>

          <div className="grid grid-3">
            <div className="stat-card">
              <div className="stat-card-label">Lead → Inquiry Conversion</div>
              <div className="stat-card-value">{leadToInquiryRate}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Inquiry → Order Conversion</div>
              <div className="stat-card-value">{inquiryToOrderRate}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Avg. Sales Cycle Length</div>
              <div className="stat-card-value">{avgSalesCycleDays > 0 ? `${avgSalesCycleDays} days` : '—'}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="empty-state" style={{ padding: '60px 20px' }}>
      <p>{label}</p>
    </div>
  );
}
