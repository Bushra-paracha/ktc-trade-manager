import { ShoppingCart, Star, TrendingUp, Package } from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { amazonListings, formatUSD } from '../data/mockData';

export default function Amazon() {
  const totalUnits = amazonListings.reduce((sum, l) => sum + l.units30d, 0);
  const totalRevenue = amazonListings.reduce((sum, l) => sum + l.units30d * l.price, 0);
  const avgRating = (amazonListings.reduce((sum, l) => sum + l.rating, 0) / amazonListings.length).toFixed(1);
  const lowStock = amazonListings.filter((l) => l.stock > 0 && l.stock < 20).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Amazon Marketplace</h1>
          <p>{amazonListings.length} listings · Synced via Amazon SP-API</p>
        </div>
        <button className="btn btn-primary">
          <ShoppingCart /> Manage Listings
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={TrendingUp} label="Revenue (Last 30 Days)" value={formatUSD(Math.round(totalRevenue))} delta="+12% vs prev." deltaDirection="up" accent="#1A4D2E" />
        <StatCard icon={Package} label="Units Sold (30 Days)" value={totalUnits} delta="Across 4 ASINs" deltaDirection="up" accent="#2C6E8F" />
        <StatCard icon={Star} label="Avg. Rating" value={avgRating} delta="846 total reviews" deltaDirection="up" accent="#C49A2B" />
        <StatCard icon={ShoppingCart} label="Low Stock Alerts" value={lowStock} delta="Reorder recommended" deltaDirection="down" accent="#B5402E" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>ASIN</th>
              <th>Status</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Units (30d)</th>
              <th>Rating</th>
              <th>Reviews</th>
            </tr>
          </thead>
          <tbody>
            {amazonListings.map((l) => (
              <tr key={l.asin}>
                <td className="cell-strong">{l.title}</td>
                <td className="cell-muted">{l.asin}</td>
                <td><Badge status={l.status} /></td>
                <td>${l.price.toFixed(2)}</td>
                <td>
                  <span style={{ color: l.stock < 20 && l.stock > 0 ? 'var(--color-warning)' : l.stock === 0 ? 'var(--color-danger)' : 'inherit', fontWeight: l.stock < 20 ? 700 : 400 }}>
                    {l.stock}
                  </span>
                </td>
                <td>{l.units30d}</td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} fill="var(--color-accent)" color="var(--color-accent)" /> {l.rating}
                  </span>
                </td>
                <td className="cell-muted">{l.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3>Export vs. Amazon Revenue</h3>
            <div className="card-header-sub">Channel contribution comparison</div>
          </div>
        </div>
        <div className="grid grid-2">
          <div style={{ padding: 16, background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)' }}>
            <div className="cell-muted">Direct Export Orders (YTD)</div>
            <div className="stat-card-value" style={{ marginTop: 6 }}>{formatUSD(909000)}</div>
          </div>
          <div style={{ padding: 16, background: 'var(--color-accent-soft)', borderRadius: 'var(--radius-md)' }}>
            <div className="cell-muted">Amazon Sales (30 Days, annualized)</div>
            <div className="stat-card-value" style={{ marginTop: 6 }}>{formatUSD(Math.round(totalRevenue * 12))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
