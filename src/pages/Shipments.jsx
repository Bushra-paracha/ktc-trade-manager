import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Loader2, MapPin, Search, Ship, Truck } from 'lucide-react';
import Badge from '../components/Badge';
import { supabase } from '../lib/supabaseClient';

const SHIPMENT_STATUSES = ['All', 'Booked', 'Stuffed', 'Departed', 'In Transit', 'Arrived', 'Customs Cleared', 'Delivered'];

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('shipments')
        .select('*, orders(id, status, total_value, clients(company, country))')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setShipments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const searchable = [
        shipment.orders?.id,
        shipment.orders?.clients?.company,
        shipment.orders?.clients?.country,
        shipment.status,
        shipment.shipping_line,
        shipment.vessel_voyage,
        shipment.container_number,
        shipment.bl_number,
        shipment.pol,
        shipment.pod,
      ].filter(Boolean).join(' ').toLowerCase();
      return (!text || searchable.includes(text)) && (statusFilter === 'All' || shipment.status === statusFilter);
    });
  }, [shipments, query, statusFilter]);

  const inTransit = shipments.filter((s) => ['Departed', 'In Transit', 'Arrived'].includes(s.status)).length;
  const delivered = shipments.filter((s) => s.status === 'Delivered').length;
  const upcoming = shipments.filter((s) => s.etd && new Date(s.etd) >= new Date()).length;

  return (
    <div className="shipments-workspace">
      <div className="page-header elevated-header">
        <div>
          <span className="eyebrow">Logistics</span>
          <h1>Shipments</h1>
          <p>Track containers, vessel details, ETD/ETA and buyer delivery status.</p>
        </div>
      </div>

      <div className="order-health-grid">
        <ShipmentMetric icon={Ship} label="Total Shipments" value={shipments.length} helper="All booked containers" />
        <ShipmentMetric icon={Truck} label="In Transit" value={inTransit} helper="Departed or moving" />
        <ShipmentMetric icon={CalendarDays} label="Upcoming ETD" value={upcoming} helper="Scheduled departures" />
        <ShipmentMetric icon={MapPin} label="Delivered" value={delivered} helper="Completed shipments" />
      </div>

      {error && <div className="card danger-alert"><AlertCircle size={18} /><div><strong>Couldn't load shipments</strong><p>{error}</p></div></div>}

      <div className="card order-control-card">
        <div className="orders-toolbar">
          <div className="search-box wide-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, buyer, country, container, BL or vessel..." /></div>
          <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /><h4>Loading shipments...</h4></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Ship /><h4>No shipments found</h4><p>Add shipment details from an order page once cargo is ready.</p></div>
        ) : (
          <div className="shipment-board">
            {filtered.map((shipment) => (
              <div className="shipment-card" key={shipment.id}>
                <div className="shipment-card-header">
                  <div>
                    <Link to={`/orders/${shipment.orders?.id}`} className="order-title-link">{shipment.orders?.id || 'Order'}</Link>
                    <p>{shipment.orders?.clients?.company || 'Unknown buyer'} · {shipment.orders?.clients?.country || '—'}</p>
                  </div>
                  <Badge status={shipment.status} />
                </div>

                <div className="shipment-route">
                  <div><span>POL</span><strong>{shipment.pol || 'Port Qasim'}</strong></div>
                  <div className="route-line"><Ship size={16} /></div>
                  <div><span>POD</span><strong>{shipment.pod || '—'}</strong></div>
                </div>

                <div className="shipment-facts compact-facts">
                  <div><span>Line</span><strong>{shipment.shipping_line || '—'}</strong></div>
                  <div><span>Vessel</span><strong>{shipment.vessel_voyage || '—'}</strong></div>
                  <div><span>Container</span><strong>{shipment.container_number || '—'}</strong></div>
                  <div><span>BL No.</span><strong>{shipment.bl_number || '—'}</strong></div>
                  <div><span>ETD</span><strong>{shipment.etd ? new Date(shipment.etd).toLocaleDateString() : '—'}</strong></div>
                  <div><span>ETA</span><strong>{shipment.eta ? new Date(shipment.eta).toLocaleDateString() : '—'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShipmentMetric({ icon: Icon, label, value, helper }) {
  return <div className="trade-stat-card"><Icon size={18} /><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>;
}
