import { DollarSign, Globe2, PackageCheck, UsersRound } from 'lucide-react';
import { formatUSD } from '../../data/mockData';

const cards = [
  { key: 'totalRevenue', label: 'Confirmed revenue', icon: DollarSign, tone: 'green' },
  { key: 'totalBuyers', label: 'Buyer records', icon: UsersRound, tone: 'blue' },
  { key: 'totalOrders', label: 'Orders logged', icon: PackageCheck, tone: 'gold' },
  { key: 'activeCountries', label: 'Countries covered', icon: Globe2, tone: 'gray' },
];

export default function ReportMetricCards({ metrics }) {
  const values = {
    totalRevenue: formatUSD(metrics.totalRevenue || 0),
    totalBuyers: metrics.totalBuyers || 0,
    totalOrders: metrics.totalOrders || 0,
    activeCountries: metrics.activeCountries || 0,
  };

  const subtitles = {
    totalRevenue: `${formatUSD(metrics.averageOrderValue || 0)} average order value`,
    totalBuyers: `${metrics.activeBuyers || 0} active buyers`,
    totalOrders: `${metrics.totalInquiries || 0} inquiries in CRM`,
    activeCountries: 'Global buyer network',
  };

  return (
    <div className="reports-metric-grid">
      {cards.map(({ key, label, icon: Icon, tone }) => (
        <div className={`reports-metric-card reports-tone-${tone}`} key={key}>
          <div className="reports-metric-icon"><Icon size={18} /></div>
          <div>
            <div className="reports-metric-label">{label}</div>
            <div className="reports-metric-value">{values[key]}</div>
            <div className="reports-metric-subtitle">{subtitles[key]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
