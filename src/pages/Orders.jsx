import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Trash2, Plus } from 'lucide-react';
import { formatUSD } from '../data/mockData';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { useClients } from '../hooks/useClients';
import Modal from '../components/Modal';

const COLUMNS = ['Confirmed', 'In Production', 'Ready to Ship', 'Shipped', 'Delivered'];

export default function Orders() {
  const { orders, loading, error, deleteOrder, createOrder } = useOrders();
  const { clients } = useClients();
  const { isAdminOrDirector } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', status: 'Confirmed', incoterm: 'FOB', payment_method: 'LC' });
  const [saving, setSaving] = useState(false);

  async function handleDelete(id, company) {
    const confirmed = window.confirm(
      `Delete order ${id} for ${company || 'this client'}?\n\nThis will permanently remove the order, its line items, shipment records, and document checklist. This cannot be undone.`
    );
    if (!confirmed) return;
    const { error } = await deleteOrder(id);
    if (error) alert(`Couldn't delete order: ${error}`);
  }

  async function handleCreate() {
    if (!form.client_id) return alert('Please select a client');
    setSaving(true);
    const { error } = await createOrder(form);
    setSaving(false);
    if (error) alert(`Couldn't create order: ${error}`);
    else { setModalOpen(false); setForm({ client_id: '', status: 'Confirmed', incoterm: 'FOB', payment_method: 'LC' }); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} orders · convert inquiries or create directly</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Order
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load orders</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading orders...</p>
        </div>
      ) : (
        <>
          <div className="kanban">
            {COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col);
              return (
                <div className="kanban-col" key={col}>
                  <div className="kanban-col-header">
                    <span className="kanban-col-title">{col}</span>
                    <span className="kanban-count">{colOrders.length}</span>
                  </div>
                  {colOrders.map((o) => (
                    <Link to={`/orders/${o.id}`} className="kanban-card" key={o.id} style={{ color: 'inherit' }}>
                      <div className="kanban-card-title">{o.id}</div>
                      <div className="cell-muted">{o.clients?.company || '—'}</div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${o.production_progress || 0}%` }} />
                      </div>
                      <div className="kanban-card-meta">
                        <span>{formatUSD(o.total_value)}</span>
                        <span>{o.shipment_deadline ? `Due ${new Date(o.shipment_deadline).toLocaleDateString()}` : 'No deadline set'}</span>
                      </div>
                    </Link>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="cell-muted" style={{ textAlign: 'center', padding: '20px 0' }}>No orders</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="section-label">All Orders ({orders.length})</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Client</th>
                    <th>Products</th>
                    <th>Value</th>
                    <th>Incoterm</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    {isAdminOrDirector && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.id}`} className="cell-strong" style={{ color: 'var(--color-primary)' }}>{o.id}</Link>
                      </td>
                      <td>{o.clients?.company || '—'}</td>
                      <td style={{ minWidth: 180 }}>{(o.order_items || []).map((it) => `${it.product_name} (${it.quantity_mt} MT)`).join(', ')}</td>
                      <td className="cell-strong">{formatUSD(o.total_value)}</td>
                      <td>{o.incoterm}</td>
                      <td className="cell-muted">{o.shipment_deadline ? new Date(o.shipment_deadline).toLocaleDateString() : '—'}</td>
                      <td>{o.status}</td>
                      {isAdminOrDirector && (
                        <td>
                          <button className="icon-btn" aria-label="Delete order" onClick={() => handleDelete(o.id, o.clients?.company)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={isAdminOrDirector ? 8 : 7}><div className="empty-state"><h4>No orders yet</h4><p>Convert an accepted inquiry into an order to get started.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Order">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Client *
            <select className="select-input" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">— Select a client —</option>
              {clients.filter(c => c.email).map(c => <option key={c.id} value={c.id}>{c.company || c.email}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Status
            <select className="select-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Incoterm
            <select className="select-input" value={form.incoterm} onChange={e => setForm(f => ({ ...f, incoterm: e.target.value }))}>
              {['FOB', 'CIF', 'CFR', 'EXW', 'DDP'].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Payment Method
            <select className="select-input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              {['LC', 'TT', 'DA', 'DP'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.client_id}>
              {saving ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
