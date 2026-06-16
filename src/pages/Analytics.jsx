import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { monthlyRevenue, revenueByCountry, pipelineByStage, formatUSD } from '../data/mockData';

const COLORS = ['#1A4D2E', '#2D7A4F', '#C49A2B', '#2C6E8F', '#B5790A', '#97A199', '#B5402E'];

export default function Analytics() {
  const countryData = revenueByCountry.filter((c) => c.value > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics &amp; Reporting</h1>
          <p>Sales pipeline, revenue, and market performance</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Revenue Trend</h3>
              <div className="card-header-sub">Monthly export revenue vs. target</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => formatUSD(v)} contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#1A4D2E" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="target" stroke="#C49A2B" strokeDasharray="4 4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Revenue by Country</h3>
              <div className="card-header-sub">Total revenue contribution per market</div>
            </div>
          </div>
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
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3>Sales Pipeline Value by Stage</h3>
            <div className="card-header-sub">Number of leads and pipeline value (USD)</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pipelineByStage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E0D8" vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip formatter={(v) => formatUSD(v)} contentStyle={{ borderRadius: 10, border: '1px solid #E2E0D8', fontSize: 12 }} />
            <Bar dataKey="value" fill="#1A4D2E" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-3">
        <div className="stat-card">
          <div className="stat-card-label">Lead → Inquiry Conversion</div>
          <div className="stat-card-value">28.6%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Inquiry → Order Conversion</div>
          <div className="stat-card-value">35.7%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg. Sales Cycle Length</div>
          <div className="stat-card-value">18 days</div>
        </div>
      </div>
    </div>
  );
}
