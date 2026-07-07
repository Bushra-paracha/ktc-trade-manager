import { formatUSD } from '../../data/mockData';

export default function MarketPerformance({ markets = [] }) {
  const max = Math.max(...markets.map((market) => market.revenue || market.buyers || 0), 1);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>Market Performance</h3>
          <div className="card-header-sub">Revenue, buyers, and orders by country</div>
        </div>
      </div>
      <div className="reports-performance-list">
        {markets.length > 0 ? markets.map((market) => {
          const width = Math.max(((market.revenue || market.buyers) / max) * 100, 8);
          return (
            <div className="reports-performance-row" key={market.country}>
              <div className="reports-performance-main">
                <strong>{market.country}</strong>
                <span>{market.buyers} buyers · {market.orders} orders</span>
              </div>
              <div className="reports-performance-track">
                <div style={{ width: `${width}%` }} />
              </div>
              <div className="reports-performance-value">{formatUSD(market.revenue || 0)}</div>
            </div>
          );
        }) : <div className="empty-state"><p>No market performance data yet.</p></div>}
      </div>
    </div>
  );
}
