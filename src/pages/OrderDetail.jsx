import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, FileText, Loader2, PackageCheck, Ship, Trash2 } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import DocumentChecklistCard from '../components/orders/DocumentChecklistCard';
import OrderActionPanel from '../components/orders/OrderActionPanel';
import ShipmentSummaryCard from '../components/orders/ShipmentSummaryCard';
import StageTracker from '../components/orders/StageTracker';
import { formatUSD } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { useDocumentActions, useOrder, useOrders, useShipmentActions } from '../hooks/useOrders';
import { supabase } from '../lib/supabaseClient';
import { ORDER_STATUS_OPTIONS, getDocsProgress, getStageProgress } from '../lib/orderWorkflow';

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
  const { deleteOrder } = useOrders();
  const { createShipment, updateShipment } = useShipmentActions();
  const { updateDocumentStatus } = useDocumentActions();
  const { uploadDocument, getSignedUrl, removeDocument } = useDocumentUpload();
  const { user, isAdminOrDirector } = useAuth();

  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [savingShipment, setSavingShipment] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const pendingDocIdRef = useRef(null);

  if (loading) return <div className="card loading-card"><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading order...</p></div>;

  if (error || !order) {
    return <div className="empty-state"><h4>Order not found</h4><p><Link to="/orders">Back to Orders</Link></p></div>;
  }

  const shipment = (order.shipments || [])[0];
  const docs = order.order_documents || [];
  const docsProgress = getDocsProgress(docs);
  const stageProgress = getStageProgress(order.status);

  async function handleOrderStatusChange(status) {
    await supabase.from('orders').update({ status }).eq('id', order.id);
    refetch();
  }

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
    const { error } = await uploadDocument(docId, order.id, file, user?.email);
    setUploadingDocId(null);
    e.target.value = '';
    if (error) return setUploadError(error);
    refetch();
  }

  async function handleViewDocument(path) {
    const { url, error } = await getSignedUrl(path);
    if (error) return alert(`Couldn't open file: ${error}`);
    window.open(url, '_blank');
  }

  async function handleRemoveDocument(docId, path) {
    if (!window.confirm('Remove this uploaded file?')) return;
    await removeDocument(docId, path);
    refetch();
  }

  async function handleShipmentSubmit(e) {
    e.preventDefault();
    setSavingShipment(true);
    const { error } = await createShipment(order.id, shipmentForm);
    setSavingShipment(false);
    if (error) return alert(`Couldn't save shipment: ${error}`);
    setShipmentModalOpen(false);
    setShipmentForm(EMPTY_SHIPMENT);
    refetch();
  }

  async function handleShipmentStatusChange(status) {
    if (!shipment?.id) return;
    await updateShipment(shipment.id, { status });
    if (status === 'Delivered') await supabase.from('orders').update({ status: 'Delivered' }).eq('id', order.id);
    refetch();
  }

  async function handleDeleteOrder() {
    if (!window.confirm(`Delete ${order.id} for ${order.clients?.company || 'this buyer'}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await deleteOrder(order.id);
    setDeleting(false);
    if (error) return alert(`Couldn't delete order: ${error}`);
    navigate('/orders');
  }

  return (
    <div className="order-detail-workspace">
      <Link to="/orders" className="btn btn-ghost btn-sm back-link"><ArrowLeft size={16} /> Back to Orders</Link>

      <div className="order-detail-hero card">
        <div>
          <span className="eyebrow">Export Order</span>
          <h1>{order.id}</h1>
          <p>{order.clients?.company || 'Unknown buyer'} · {order.clients?.country || 'Country pending'}</p>
        </div>
        <div className="hero-actions">
          <Badge status={order.status} />
          <select className="select-input" value={order.status || 'Confirmed'} onChange={(e) => handleOrderStatusChange(e.target.value)}>
            {ORDER_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
          {isAdminOrDirector && <button className="btn btn-secondary btn-sm danger-text" onClick={handleDeleteOrder} disabled={deleting}>{deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />} Delete</button>}
        </div>
      </div>

      <div className="order-health-grid">
        <div className="trade-stat-card"><FileText size={18} /><div><span>Contract Value</span><strong>{formatUSD(order.total_value)}</strong><small>{order.incoterm || 'FOB'} · {order.payment_method || 'LC'}</small></div></div>
        <div className="trade-stat-card"><PackageCheck size={18} /><div><span>Workflow Progress</span><strong>{stageProgress}%</strong><small>{order.status || 'Confirmed'}</small></div></div>
        <div className="trade-stat-card"><CalendarDays size={18} /><div><span>Shipment Deadline</span><strong>{order.shipment_deadline ? new Date(order.shipment_deadline).toLocaleDateString() : '—'}</strong><small>{order.pod_port || 'POD pending'}</small></div></div>
        <div className="trade-stat-card"><Ship size={18} /><div><span>Documents</span><strong>{docsProgress.complete}/{docsProgress.total || 0}</strong><small>{docsProgress.percent}% completed</small></div></div>
      </div>

      <div className="card stage-card">
        <div className="card-header"><div><h3>Order Timeline</h3><p>Follow the order from buyer inquiry to delivery.</p></div></div>
        <StageTracker status={order.status} />
      </div>

      <div className="order-detail-grid">
        <div className="order-main-column">
          <div className="card">
            <div className="card-header"><h3>Commercial Details</h3></div>
            <div className="detail-grid">
              <DetailRow label="Buyer" value={order.clients?.company || '—'} />
              <DetailRow label="Country" value={order.clients?.country || '—'} />
              <DetailRow label="Products" value={(order.order_items || []).map((it) => `${it.product_name} (${it.quantity_mt} MT)`).join(', ') || 'No products added yet'} />
              <DetailRow label="Port of Loading" value={order.pol_port || 'Port Qasim'} />
              <DetailRow label="Port of Discharge" value={order.pod_port || '—'} />
              <DetailRow label="Payment Method" value={order.payment_method || '—'} />
              <DetailRow label="Production Progress" value={`${order.production_progress || 0}%`} />
            </div>
            <div className="progress-track large-progress"><div className="progress-fill" style={{ width: `${order.production_progress || 0}%` }} /></div>
            {order.special_instructions && <div className="order-note"><strong>Instructions</strong><p>{order.special_instructions}</p></div>}
          </div>

          <DocumentChecklistCard docs={docs} onStatusChange={handleDocStatusChange} onUpload={triggerUpload} onView={handleViewDocument} onRemove={handleRemoveDocument} uploadingDocId={uploadingDocId} />
          {uploadError && <div className="card danger-alert"><strong>Upload failed:</strong> {uploadError}</div>}
        </div>

        <div className="order-side-column">
          <OrderActionPanel order={order} />
          <ShipmentSummaryCard shipment={shipment} onAddShipment={() => setShipmentModalOpen(true)} onStatusChange={handleShipmentStatusChange} statusOptions={SHIPMENT_STATUSES} />
        </div>
      </div>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelected} />

      <Modal open={shipmentModalOpen} onClose={() => setShipmentModalOpen(false)} title="Add Shipment Details">
        <form onSubmit={handleShipmentSubmit} className="shipment-form">
          <div className="form-grid">
            {[
              ['shipping_line', 'Shipping Line'],
              ['vessel_voyage', 'Vessel / Voyage'],
              ['container_number', 'Container Number'],
              ['seal_number', 'Seal Number'],
              ['bl_number', 'Bill of Lading Number'],
              ['pol', 'Port of Loading'],
              ['pod', 'Port of Discharge'],
            ].map(([key, label]) => (
              <label className="field-label" key={key}>{label}<input className="text-input" value={shipmentForm[key]} onChange={(e) => setShipmentForm({ ...shipmentForm, [key]: e.target.value })} /></label>
            ))}
            <label className="field-label">ETD<input className="text-input" type="date" value={shipmentForm.etd} onChange={(e) => setShipmentForm({ ...shipmentForm, etd: e.target.value })} /></label>
            <label className="field-label">ETA<input className="text-input" type="date" value={shipmentForm.eta} onChange={(e) => setShipmentForm({ ...shipmentForm, eta: e.target.value })} /></label>
            <label className="field-label">Status<select className="select-input" value={shipmentForm.status} onChange={(e) => setShipmentForm({ ...shipmentForm, status: e.target.value })}>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
          <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setShipmentModalOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={savingShipment}>{savingShipment ? 'Saving...' : 'Save Shipment'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}
