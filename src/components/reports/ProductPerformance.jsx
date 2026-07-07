import { formatUSD } from '../../data/mockData';

export default function ProductPerformance({ topProducts = [], productInterest = [] }) {
  return (
    <div className="grid grid-2 reports-product-grid">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Products by Confirmed Revenue</h3>
            <div className="card-header-sub">Based on order items</div>
          </div>
        </div>
        <div className="reports-table-list">
          {topProducts.length > 0 ? topProducts.map((item) => (
            <div className="reports-table-row" key={item.product}>
              <div>
                <strong>{item.product}</strong>
                <span>{item.quantity ? `${item.quantity.toLocaleString()} MT` : `${item.orders} order lines`}</span>
              </div>
              <b>{formatUSD(item.revenue || 0)}</b>
            </div>
          )) : <div className="empty-state"><p>Product revenue will appear after order items are added.</p></div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Product Demand Signals</h3>
            <div className="card-header-sub">Based on buyer product interests</div>
          </div>
        </div>
        <div className="reports-table-list">
          {productInterest.length > 0 ? productInterest.map((item) => (
            <div className="reports-table-row" key={item.product}>
              <div>
                <strong>{item.product}</strong>
                <span>{item.buyers} interested buyers</span>
              </div>
              <b>{item.avgScore}/100</b>
            </div>
          )) : <div className="empty-state"><p>Product demand will appear after buyer interests are added.</p></div>}
        </div>
      </div>
    </div>
  );
}
