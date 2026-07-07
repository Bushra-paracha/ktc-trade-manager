import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Loader2, AlertCircle, Download, FileText } from 'lucide-react';
import { formatUSD } from '../data/mockData';
import { useAnalytics } from '../hooks/useAnalytics';
import ReportMetricCards from '../components/reports/ReportMetricCards';
import ConversionFunnel from '../components/reports/ConversionFunnel';
import ExecutiveSummaryPanel from '../components/reports/ExecutiveSummaryPanel';
import MarketPerformance from '../components/reports/MarketPerformance';
import ProductPerformance from '../components/reports/ProductPerformance';

const COLORS = ['#166534', '#0F766E', '#D4A72C', '#2C6E8F', '#B5790A', '#97A199', '#B5402E'];

function exportReportCsv({ topMarkets = [], pipelineByStage = [], productInterest = [] }) {
  const rows = [
    ['Section', 'Name', 'Metric 1', 'Metric 2', 'Metric 3'],
    ...topMarkets.map((market) => ['Market', market.country, market.buyers, market.orders, market.revenue]),
    ...pipelineByStage.map((stage) => ['Pipeline', stage.stage, stage.count, stage.value, stage.avgScore]),
    ...productInterest.map((product) => ['Product Interest', product.product, product.buyers, product.avgScore, '']),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ktc-executive-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const analytics = useAnalytics();
  const {
    monthlyRevenue,
    revenueByCountry,
    pipelineByStage,
    orderWorkflow,
    leadToInquiryRate,
    inquiryToOrderRate,
    avgSalesCycleDays,
    topMarkets,
    topProducts,
    productInterest,
    priorityMarkets,
    reportHighlights,
    loading,
    error,
  } = analytics;

  const countryData = revenueByCountry.filter((country) => country.value > 0).slice(0, 7);
  const hasRevenue = monthlyRevenue.some((month) => month.revenue > 0);
  const hasWorkflow = orderWorkflow.length > 0;

  return (
    <div className="reports-page">
      <div className="reports-hero">
        <div>
          <div className="reports-kicker"><FileText size={15} /> Reports Command Center</div>
          <h1>Analytics &amp; Reporting</h1>
          <p>Track KTC's buyer pipeline, export revenue, product demand, and priority markets from one executive view.</p>
        </div>
        <button className="btn btn-primary" onClick={() => exportReportCsv({ topMarkets, pipelineByStage, productInterest })}>
          <Download size={16} /> Export Report CSV
        </button>
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
        <div className="card dashboard-loading">
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Building the executive report...</p>
        </div>
      ) : (
        <>
          <ReportMetricCards metrics={analytics} />

          <div className="reports-main-layout">
            <div className="reports-main-stack">
              <div className="grid grid-2">
                <div className="card reports-chart-card">
                  <div className="card-header">
                    <div>
                      <h3>Revenue Trend</h3>
                      <div className="card-header-sub">Monthly confirmed order value vs. rolling average</div>
                    </div>
                  </div>
                  {hasRevenue ? (
                    <ResponsiveContainer width="100%" height={270}>
                      <LineChart data={monthlyRevenue} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E3E8E5" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                        <Tooltip formatter={(value) => formatUSD(value)} contentStyle={{ borderRadius: 12, border: '1px solid #E3E8E5', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="revenue" stroke="#166534" strokeWidth={3} dot={{ r: 4 }} name="Revenue" />
                        <Line type="monotone" dataKey="target" stroke="#D4A72C" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Avg." />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="No confirmed orders yet — revenue trend will appear once orders are created." />
                  )}
                </div>

                <div className="card reports-chart-card">
                  <div className="card-header">
                    <div>
                      <h3>Revenue by Country</h3>
                      <div className="card-header-sub">Market contribution from confirmed orders</div>
                    </div>
                  </div>
                  {countryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={270}>
                      <PieChart>
                        <Pie data={countryData} dataKey="value" nameKey="country" cx="50%" cy="50%" innerRadius={54} outerRadius={90} paddingAngle={3} label={({ country, percent }) => `${country} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                          {countryData.map((entry, index) => (
                            <Cell key={entry.country} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatUSD(value)} contentStyle={{ borderRadius: 12, border: '1px solid #E3E8E5', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="No revenue by country yet." />
                  )}
                </div>
              </div>

              <div className="card reports-chart-card">
                <div className="card-header">
                  <div>
                    <h3>Buyer Pipeline by Stage</h3>
                    <div className="card-header-sub">Counts, estimated value, and average buyer score</div>
                  </div>
                </div>
                {pipelineByStage.length > 0 ? (
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={pipelineByStage} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E8E5" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E3E8E5', fontSize: 12 }} formatter={(value, name) => name === 'Estimated value' ? formatUSD(value) : value} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#166534" radius={[8, 8, 0, 0]} name="Buyers" />
                      <Bar dataKey="avgScore" fill="#D4A72C" radius={[8, 8, 0, 0]} name="Avg score" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No buyer pipeline data yet." />
                )}
              </div>

              {hasWorkflow && (
                <div className="card reports-chart-card">
                  <div className="card-header">
                    <div>
                      <h3>Order Workflow</h3>
                      <div className="card-header-sub">Export orders by operational stage</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={orderWorkflow} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E8E5" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#97A199' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E3E8E5', fontSize: 12 }} formatter={(value, name) => name === 'Value' ? formatUSD(value) : value} />
                      <Bar dataKey="count" fill="#0F766E" radius={[8, 8, 0, 0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <ConversionFunnel leadToInquiryRate={leadToInquiryRate} inquiryToOrderRate={inquiryToOrderRate} avgSalesCycleDays={avgSalesCycleDays} />
              <MarketPerformance markets={topMarkets} />
              <ProductPerformance topProducts={topProducts} productInterest={productInterest} />
            </div>

            <ExecutiveSummaryPanel highlights={reportHighlights} priorityMarkets={priorityMarkets} />
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="empty-state" style={{ padding: '72px 20px' }}>
      <p>{label}</p>
    </div>
  );
}
