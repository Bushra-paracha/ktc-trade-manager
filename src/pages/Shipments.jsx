import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ship, MapPin, Calendar, Loader2, AlertCircle } from 'lucide-react';
import Badge from '../components/Badge';
import { supabase } from '../lib/supabaseClient';

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('shipments')
        .select('*, orders(id, clients(company))')
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setShipments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Shipments</h1>
          <p>{shipments.length} shipments — booked, in transit, and delivered</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load shipments</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading shipments...</p>
        </div>
      ) : shipments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Ship />
            <h4>No shipments booked yet</h4>
            <p>Add a shipment from an order's detail page once it's ready to ship.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          {shipments.map((s) => (
            <div className="card" key={s.id}>
              <div className="card-header">
                <div>
                  <h3>{s.bl_number || 'No BL yet'}</h3>
                  <div className="card-header-sub">
                    <Link to={`/orders/${s.orders?.id}`} style={{ color: 'var(--color-primary)' }}>{s.orders?.id}</Link>
                  </div>
                </div>
                <Badge status={s.status} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{s.orders?.clients?.company || '—'}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Ship size={16} color="var(--color-ink-faint)" />
                <span className="cell-muted">{s.shipping_line || '—'} — {s.vessel_voyage || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MapPin size={16} color="var(--color-ink-faint)" />
                <span className="cell-muted">{s.pol || '—'} → {s.pod || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Calendar size={16} color="var(--color-ink-faint)" />
                <span className="cell-muted">
                  ETD {s.etd ? new Date(s.etd).toLocaleDateString() : '—'} · ETA {s.eta ? new Date(s.eta).toLocaleDateString() : '—'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                <span className="cell-muted">Container: {s.container_number || '—'}</span>
                <span className="cell-muted">Seal: {s.seal_number || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
