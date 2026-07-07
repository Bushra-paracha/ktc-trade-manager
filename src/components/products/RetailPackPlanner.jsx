import { CheckCircle2, Clock, PackageOpen } from 'lucide-react';

const packPlans = [
  {
    size: '1 lb',
    sku: 'KTC-PINK-SALT-1LB',
    market: 'USA / UK',
    status: 'Ready for listing copy',
    checklist: ['Product title', 'Bullet points', 'Image brief', 'Carton dimensions'],
    progress: 70,
  },
  {
    size: '2 lb',
    sku: 'KTC-PINK-SALT-2LB',
    market: 'USA / UK',
    status: 'Needs packaging details',
    checklist: ['Nutrition panel', 'Barcode/GTIN', 'FBA case pack', 'COA upload'],
    progress: 45,
  },
  {
    size: '5 lb',
    sku: 'KTC-PINK-SALT-5LB',
    market: 'USA / UK',
    status: 'Bulk retail opportunity',
    checklist: ['Bag artwork', 'Master carton', 'Pallet quantity', 'Landed cost'],
    progress: 35,
  },
];

export default function RetailPackPlanner() {
  return (
    <div className="card retail-planner-card">
      <div className="card-header">
        <div>
          <h3>Himalayan Pink Salt Retail Pack Planner</h3>
          <div className="card-header-sub">1 lb, 2 lb and 5 lb SKUs for Amazon USA/UK</div>
        </div>
        <span className="planner-badge"><PackageOpen size={14} /> Amazon launch</span>
      </div>
      <div className="retail-pack-grid">
        {packPlans.map((pack) => (
          <div className="retail-pack-card" key={pack.sku}>
            <div className="retail-pack-head">
              <div>
                <strong>{pack.size}</strong>
                <p>{pack.sku}</p>
              </div>
              <span>{pack.market}</span>
            </div>
            <div className="progress-track retail-progress">
              <div className="progress-fill" style={{ width: `${pack.progress}%` }} />
            </div>
            <div className="pack-status"><Clock size={14} /> {pack.status}</div>
            <div className="pack-checklist">
              {pack.checklist.map((item, index) => (
                <div key={item} className={index < 2 ? 'done' : ''}>
                  <CheckCircle2 size={14} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
