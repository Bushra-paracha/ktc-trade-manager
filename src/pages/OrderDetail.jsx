import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Ship, Upload, Download, X, FileText, Trash2 } from 'lucide-react';
import { formatUSD } from '../data/mockData';
import { useOrder, useShipmentActions, useDocumentActions, useOrders } from '../hooks/useOrders';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { ORDER_STATUSES } from '../lib/pricingEngine';

const DOC_STATUSES = ['Pending', 'In Progress', 'Uploaded', 'Verified', 'Sent to Buyer'];
const SHIPMENT_STATUSES = ['Booked', 'Stuffed', 'Departed', 'In Transit', 'Arrived', 'Customs Cleared', 'Delivered'];

const EMPTY_SHIPMENT = {
  container_number: '',
  seal_number: '',
  shipping_line: '',
  vessel_voyage: '',
  pol: '',
  pod: '',
  etd: '',
  eta: '',
  bl_number: '',
  status: 'Booked',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { order, loading, error, refetch } = useOrder(id);
  const { createShipment, updateShipment } = useShipmentActions();
  const { updateDocumentStatus } = useDocumentActions();
  const { uploadDocument, getSignedUrl, removeDocument } = useDocumentUpload();
  const { deleteOrder } = useOrders();
  const { user } = useAuth();

  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [savingShipment, setSavingShipment] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const pendingDocIdRef = useRef(null);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="empty-state">
        <h4>Order not found</h4>
        <p><Link to="/orders">Back to Orders</Link></p>
      </div>
    );
  }

  const shipment = (order.shipments || [])[0];
  const docs = order.order_documents || [];
  const docsComplete = docs.filter((d) => ['Verified', 'Sent to Buyer'].includes(d.status)).length;

  async function handleDocStatusChange(docId, status) {
    await updateDocumentStatus(docId, status);
    refetch();
  }

  function triggerUpload(docId) {
    setUploadError(null);
    pendingDocIdRef.current = docId;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    const docId = pendingDocIdRef.current;
    if (!file || !docId) return;

    setUploadingDocId(docId);
    setUploadError(null);
    const { error } = await uploadDocument(docId, order.id, file, user?.email);
    setUploadingDocId(null);
    e.target.value = '';

    if (error) {
      setUploadError(error);
      return;
    }
    refetch();
  }

  async function handleViewDocument(path) {
    const { url, error } = await getSignedUrl(path);
    if (error) {
      alert(`Couldn't open file: ${error}`);
      return;
    }
    window.open(url, '_blank');
  }

  async function handleRemoveDocument(docId, path) {
    if (!window.confirm('Remove this uploaded file? The checklist item will reset to Pending.')) return;
    await removeDocument(docId, path);
    refetch();
  }

  async function handleShipmentSubmit(e) {
    e.preventDefault();
    setSavingShipment(true);
    const { error } = await createShipment(order.id, shipmentForm);
    setSavingShipment(false);
    if (error) {
      alert(`Couldn't save shipment: ${error}`);
      return;
    }
    setShipmentModalOpen(false);
    setShipmentForm(EMPTY_SHIPMENT);
    refetch();
  }

  async function handleOrderStatusChange(newStatus) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    refetch();
  }

  async function handleDeleteOrder() {
    const confirmed = window.confirm(
      `Delete order ${order.id} for ${order.clients?.company || 'this client'}?\n\nThis will permanently remove the order, its line items, shipment records, and document checklist. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await deleteOrder(order.id);
    setDeleting(false);

    if (error) {
      alert(`Couldn't delete order: ${error}`);
      return;
    }
    navigate('/orders');
  }

  async function handleShipmentStatusChange(newStatus) {
    await updateShipment(shipment.id, { status: newStatus });
    refetch();
  }

  return (
    <div>
      <Link to="/orders" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft /> Back to Orders
      </Link>

      <div className="page-header">
        <div>
          <h1>{order.id}</h1>
          <p>{order.clients?.company || '—'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge status={order.status} />
          <button className="btn btn-secondary btn-sm" onClick={handleDeleteOrder} disabled={deleting} style={{ color: 'var(--color-danger)' }}>
            {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
            Delete Order
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Contract Value</div>
          <div className="stat-card-value">{formatUSD(order.total_value)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Payment Method</div>
          <div className="stat-card-value" style={{ fontSize: 16 }}>{order.payment_method || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Incoterm</div>
          <div className="stat-card-value" style={{ fontSize: 16 }}>{order.incoterm}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Document Checklist</div>
          <div className="stat-card-value" style={{ fontSize: 16 }}>{docsComplete} / {docs.length} complete</div>
        </div>
      </div>

      <div className="split-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3>Order Details</h3>
              <select className="select-input" style={{ fontSize: 12 }} value={order.status} onChange={(e) => handleOrderStatusChange(e.target.value)}>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DetailRow label="Products" value={(order.order_items || []).map((it) => `${it.product_name} (${it.quantity_mt} MT)`).join(', ') || '—'} />
              <DetailRow label="Port of Loading" value={order.pol_port || '—'} />
              <DetailRow label="Port of Discharge" value={order.pod_port || '—'} />
              <DetailRow label="Shipment Deadline" value={order.shipment_deadline ? new Date(order.shipment_deadline).toLocaleDateString() : '—'} />
              <DetailRow label="Production Progress" value={`${order.production_progress || 0}%`} />
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${order.production_progress || 0}%` }} />
              </div>
            </div>
          </div>

          {shipment ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Shipment Tracking</h3>
                  <div className="card-header-sub">{shipment.id.slice(0, 8)}</div>
                </div>
                <select className="select-input" style={{ fontSize: 12 }} value={shipment.status} onChange={(e) => handleShipmentStatusChange(e.target.value)}>
                  {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-2">
                <DetailRow label="Container No." value={shipment.container_number || '—'} />
                <DetailRow label="Seal No." value={shipment.seal_number || '—'} />
                <DetailRow label="Shipping Line" value={shipment.shipping_line || '—'} />
                <DetailRow label="Vessel / Voyage" value={shipment.vessel_voyage || '—'} />
                <DetailRow label="ETD" value={shipment.etd ? new Date(shipment.etd).toLocaleDateString() : '—'} />
                <DetailRow label="ETA" value={shipment.eta ? new Date(shipment.eta).toLocaleDateString() : '—'} />
                <DetailRow label="BL Number" value={shipment.bl_number || '—'} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <Ship />
                <h4>No shipment booked yet</h4>
                <p>Add container, vessel, and tracking details once shipment is booked.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShipmentModalOpen(true)}>
                  <Plus /> Add Shipment
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Pre-Shipment Document Checklist</h3>
              <div className="card-header-sub">{docsComplete} of {docs.length} verified/sent</div>
            </div>
          </div>
          {uploadError && (
            <div style={{ color: 'var(--color-danger)', fontSize: 12.5, marginBottom: 10 }}>{uploadError}</div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            style={{ display: 'none' }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          {docs.map((doc) => (
            <div className="timeline-item" key={doc.id}>
              <div className="timeline-body" style={{ flex: 1 }}>
                <strong>{doc.document_type}</strong>
                <p>{doc.responsible_party}</p>
                {doc.file_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <FileText size={13} color="var(--color-ink-faint)" />
                    <span className="cell-muted" style={{ fontSize: 11.5 }}>{doc.file_name}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {doc.file_path ? (
                  <>
                    <button className="icon-btn" aria-label="View document" title="View / download" onClick={() => handleViewDocument(doc.file_path)}>
                      <Download size={14} />
                    </button>
                    <button className="icon-btn" aria-label="Remove document" title="Remove file" onClick={() => handleRemoveDocument(doc.id, doc.file_path)}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    className="icon-btn"
                    aria-label="Upload document"
                    title="Upload file"
                    onClick={() => triggerUpload(doc.id)}
                    disabled={uploadingDocId === doc.id}
                  >
                    {uploadingDocId === doc.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                  </button>
                )}
                <select
                  className="select-input"
                  style={{ fontSize: 11.5, padding: '4px 8px' }}
                  value={doc.status}
                  onChange={(e) => handleDocStatusChange(doc.id, e.target.value)}
                >
                  {DOC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
          {docs.length === 0 && (
            <div className="empty-state">
              <h4>No checklist found</h4>
              <p>This order may have been created before document tracking was added.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={shipmentModalOpen} onClose={() => setShipmentModalOpen(false)} title="Add Shipment">
        <form onSubmit={handleShipmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid grid-2">
            <FormRow label="Container Number">
              <input className="select-input" value={shipmentForm.container_number} onChange={(e) => setShipmentForm({ ...shipmentForm, container_number: e.target.value })} />
            </FormRow>
            <FormRow label="Seal Number">
              <input className="select-input" value={shipmentForm.seal_number} onChange={(e) => setShipmentForm({ ...shipmentForm, seal_number: e.target.value })} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Shipping Line">
              <input className="select-input" placeholder="e.g. MSC, CMA CGM" value={shipmentForm.shipping_line} onChange={(e) => setShipmentForm({ ...shipmentForm, shipping_line: e.target.value })} />
            </FormRow>
            <FormRow label="Vessel / Voyage">
              <input className="select-input" placeholder="e.g. MSC ANNA / V.FE123A" value={shipmentForm.vessel_voyage} onChange={(e) => setShipmentForm({ ...shipmentForm, vessel_voyage: e.target.value })} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Port of Loading">
              <input className="select-input" value={shipmentForm.pol} onChange={(e) => setShipmentForm({ ...shipmentForm, pol: e.target.value })} />
            </FormRow>
            <FormRow label="Port of Discharge">
              <input className="select-input" value={shipmentForm.pod} onChange={(e) => setShipmentForm({ ...shipmentForm, pod: e.target.value })} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="ETD (Departure)">
              <input type="date" className="select-input" value={shipmentForm.etd} onChange={(e) => setShipmentForm({ ...shipmentForm, etd: e.target.value })} />
            </FormRow>
            <FormRow label="ETA (Arrival)">
              <input type="date" className="select-input" value={shipmentForm.eta} onChange={(e) => setShipmentForm({ ...shipmentForm, eta: e.target.value })} />
            </FormRow>
          </div>
          <FormRow label="BL Number">
            <input className="select-input" value={shipmentForm.bl_number} onChange={(e) => setShipmentForm({ ...shipmentForm, bl_number: e.target.value })} />
          </FormRow>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShipmentModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingShipment}>
              {savingShipment ? 'Saving...' : 'Add Shipment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span className="cell-muted">{label}</span>
      <span className="cell-strong" style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
