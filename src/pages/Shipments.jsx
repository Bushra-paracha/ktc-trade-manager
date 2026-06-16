import { Link } from 'react-router-dom';
import { Ship, MapPin, Calendar } from 'lucide-react';
import { shipments } from '../data/mockData';
import Badge from '../components/Badge';

export default function Shipments() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Shipments</h1>
          <p>{shipments.length} shipments — booked, in transit, and delivered</p>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {shipments.map((s) => (
          <div className="card" key={s.id}>
            <div className="card-header">
              <div>
                <h3>{s.id}</h3>
                <div className="card-header-sub">
                  <Link to={`/orders/${s.orderId}`} style={{ color: 'var(--color-primary)' }}>{s.orderId}</Link>
                </div>
              </div>
              <Badge status={s.status} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{s.client}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Ship size={16} color="var(--color-ink-faint)" />
              <span className="cell-muted">{s.shippingLine} — {s.vessel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MapPin size={16} color="var(--color-ink-faint)" />
              <span className="cell-muted">{s.pol} → {s.pod}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Calendar size={16} color="var(--color-ink-faint)" />
              <span className="cell-muted">ETD {s.etd} · ETA {s.eta}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <span className="cell-muted">Container: {s.container}</span>
              <span className="cell-muted">BL: {s.blNumber}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
