import { ClipboardList, Lightbulb, Target } from 'lucide-react';

export default function ExecutiveSummaryPanel({ highlights = [], priorityMarkets = [] }) {
  return (
    <div className="reports-side-stack">
      <div className="card reports-summary-card">
        <div className="reports-side-heading">
          <Lightbulb size={18} />
          <div>
            <h3>Executive Summary</h3>
            <p>Plain-English insights from the CRM</p>
          </div>
        </div>
        <div className="reports-highlight-list">
          {highlights.map((item) => (
            <div className="reports-highlight" key={item}>{item}</div>
          ))}
        </div>
      </div>

      <div className="card reports-summary-card">
        <div className="reports-side-heading">
          <Target size={18} />
          <div>
            <h3>Priority Markets</h3>
            <p>Where KTC should focus follow-ups</p>
          </div>
        </div>
        <div className="reports-market-list">
          {priorityMarkets.length > 0 ? priorityMarkets.map((market, index) => (
            <div className="reports-market-row" key={market.country}>
              <div className="reports-rank">{index + 1}</div>
              <div>
                <strong>{market.country}</strong>
                <span>{market.buyers} buyers · {market.orders} orders</span>
              </div>
            </div>
          )) : <p className="reports-empty-copy">Add buyers/orders to see ranked markets.</p>}
        </div>
      </div>

      <div className="card reports-summary-card reports-action-card">
        <div className="reports-side-heading">
          <ClipboardList size={18} />
          <div>
            <h3>Recommended Actions</h3>
            <p>Use this report during weekly reviews</p>
          </div>
        </div>
        <ul>
          <li>Follow up all negotiating buyers within 48 hours.</li>
          <li>Prioritize markets with active inquiries and no confirmed order.</li>
          <li>Use product-interest data to decide which catalog items to promote next.</li>
        </ul>
      </div>
    </div>
  );
}
