import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Trash2, Plus, Edit2, X, Upload, FileText } from 'lucide-react';
import { formatUSD } from '../data/mockData';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { useClients } from '../hooks/useClients';
import Modal from '../components/Modal';

const COLUMNS = ['Confirmed', 'In Production', 'Ready to Ship', 'Shipped', 'Delivered'];

const DOCUMENT_TYPES = [
  'Proforma Invoice',
  'Sales Contract',
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading',
  'Certificate of Origin',
  'Phytosanitary Certificate',
  'Fumigation Certificate',
  'SGS Inspection Report',
  'LC (Letter of Credit)',
  'Other',
];

export default function Orders() {
  const { orders, loading, error, deleteOrder, createOrder, updateOrder } = useOrders();
  const { clients } = useClients();
  const { isAdminOrDirector } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [docModal, setDocModal] = useState(false);
  const [docOrder, setDocOrder] = useState(null);
  const [form, setForm] = useState({ client_id: '', status: 'Confirmed', incoterm: 'FOB', payment_method: 'LC' });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [docForm, setDocForm] = useState({ doc_type: 'Proforma Invoice', doc_name: '', doc_url: '', doc_notes: '' });
  const [docSaving, setDocSaving] = useState(false);
  const [documents, setDocuments] = useState({});

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

  function openEdit(o) {
    setEditOrder(o);
    setEditForm({
      status: o.status || 'Confirmed',
      incoterm: o.incoterm || 'FOB',
      payment_method: o.payment_method || 'LC',
      pol_port: o.pol_port || '',
      pod_port: o.pod_port || '',
      total_value: o.total_value || '',
      shipment_deadline: o.shipment_deadline ? o.shipment_deadline.slice(0, 10) : '',
      special_instructions: o.special_instructions || '',
      production_progress: o.production_progress || 0,
    });
    setEditModal(true);
  }

  async function handleEdit() {
    setSaving(true);
    const { error } = await updateOrder(editOrder.id, editForm);
    setSaving(false);
    if (error) alert(`Couldn't update order: ${error}`);
    else setEditModal(false);
  }

  function openDocModal(o) {
    setDocOrder(o);
    setDocForm({ doc_type: 'Proforma Invoice', doc_name: '', doc_url: '', doc_notes: '' });
    setDocModal(true);
  }

  function handleAddDocument() {
    if (!docForm.doc_name) return alert('Please enter a document name');
    setDocSaving(true);
    const key = docOrder.id;
    const existing = documents[key] || [];
    setDocuments(prev => ({
      ...prev,
      [key]: [...existing, { ...docForm, added_at: new Date().toISOString() }]
    }));
    setDocSaving(false);
    setDocForm({ doc_type: 'Proforma Invoice', doc_name: '', doc_url: '', doc_notes: '' });
    alert(`Document "${docForm.doc_name}" added to order ${docOrder.id}`);
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
                    <th>Docs</th>
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
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => openDocModal(o)}
                          title="Add document"
                        >
                          <FileText size={13} />
                          {(documents[o.id] || []).length > 0 ? `${(documents[o.id] || []).length} doc${(documents[o.id] || []).length > 1 ? 's' : ''}` : 'Add doc'}
                        </button>
                      </td>
                      {isAdminOrDirector && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="icon-btn" aria-label="Edit order" onClick={() => openEdit(o)} title="Edit order">
                              <Edit2 size={16} />
                            </button>
                            <button className="icon-btn" aria-label="Delete order" onClick={() => handleDelete(o.id, o.clients?.company)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={isAdminOrDirector ? 9 : 8}><div className="empty-state"><h4>No orders yet</h4><p>Convert an accepted inquiry into an order to get started.</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* New Order Modal */}
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

      {/* Edit Order Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Edit Order — ${editOrder?.id}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Status
            <select className="select-input" value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              {COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Incoterm
            <select className="select-input" value={editForm.incoterm || ''} onChange={e => setEditForm(f => ({ ...f, incoterm: e.target.value }))}>
              {['FOB', 'CIF', 'CFR', 'EXW', 'DDP'].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Payment Method
            <select className="select-input" value={editForm.payment_method || ''} onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))}>
              {['LC', 'TT', 'DA', 'DP'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Port of Loading
            <input className="text-input" value={editForm.pol_port || ''} onChange={e => setEditForm(f => ({ ...f, pol_port: e.target.value }))} placeholder="e.g. Port Qasim, Karachi" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Port of Discharge
            <input className="text-input" value={editForm.pod_port || ''} onChange={e => setEditForm(f => ({ ...f, pod_port: e.target.value }))} placeholder="e.g. Port Klang, Malaysia" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Total Value (USD)
            <input className="text-input" type="number" value={editForm.total_value || ''} onChange={e => setEditForm(f => ({ ...f, total_value: e.target.value }))} placeholder="e.g. 18088" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Shipment Deadline
            <input className="text-input" type="date" value={editForm.shipment_deadline || ''} onChange={e => setEditForm(f => ({ ...f, shipment_deadline: e.target.value }))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Production Progress (%)
            <input className="text-input" type="number" min="0" max="100" value={editForm.production_progress || 0} onChange={e => setEditForm(f => ({ ...f, production_progress: e.target.value }))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Special Instructions
            <textarea className="text-input" rows={3} value={editForm.special_instructions || ''} onChange={e => setEditForm(f => ({ ...f, special_instructions: e.target.value }))} placeholder="e.g. Phytosanitary certificate required. No health certificate." style={{ resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Document Modal */}
      <Modal open={docModal} onClose={() => setDocModal(false)} title={`Documents — ${docOrder?.id}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Existing documents */}
          {(documents[docOrder?.id] || []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Added Documents</div>
              {(documents[docOrder?.id] || []).map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--color-border)' }}>
                  <FileText size={14} color="var(--color-primary)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.doc_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-ink-soft)' }}>{doc.doc_type} {doc.doc_notes ? `· ${doc.doc_notes}` : ''}</div>
                  </div>
                  {doc.doc_url && (
                    <a href={doc.doc_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--color-primary)' }}>View</a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new document */}
          <div className="section-label">Add New Document</div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Document Type
            <select className="select-input" value={docForm.doc_type} onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value }))}>
              {DOCUMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Document Name *
            <input className="text-input" value={docForm.doc_name} onChange={e => setDocForm(f => ({ ...f, doc_name: e.target.value }))} placeholder="e.g. Proforma Invoice KTC/EXP/001" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Document URL (optional)
            <input className="text-input" value={docForm.doc_url} onChange={e => setDocForm(f => ({ ...f, doc_url: e.target.value }))} placeholder="https://drive.google.com/..." />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Notes (optional)
            <input className="text-input" value={docForm.doc_notes} onChange={e => setDocForm(f => ({ ...f, doc_notes: e.target.value }))} placeholder="e.g. Signed and stamped" />
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setDocModal(false)}>Close</button>
            <button className="btn btn-primary" onClick={handleAddDocument} disabled={docSaving || !docForm.doc_name}>
              <Upload size={14} /> {docSaving ? 'Adding...' : 'Add Document'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
