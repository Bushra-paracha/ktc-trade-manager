import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Copy, FileText, Loader2, PackageCheck, Plus, Ship, Trash2 } from 'lucide-react';
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
import { generateProformaInvoice } from '../lib/generateProformaInvoice';
import { supabase } from '../lib/supabaseClient';
import { ORDER_STATUS_OPTIONS, getDocsProgress, getStageProgress, normalizeStatus } from '../lib/orderWorkflow';

const TABS = ['overview', 'production', 'shipment', 'documents', 'payments', 'activity'];
const SHIPMENT_STATUSES = ['Booked', 'Stuffed', 'Departed', 'In Transit', 'Arrived', 'Customs Cleared', 'Delivered'];
const EMPTY_SHIPMENT = { container_number: '', seal_number: '', shipping_line: '', vessel_voyage: '', pol: '', pod: '', etd: '', eta: '', bl_number: '', status: 'Booked' };
const EMPTY_PAYMENT = { payment_type: 'Advance', amount: '', currency: 'USD', status: 'Due', bank_reference: '', payment_date: '', notes: '' };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.includes(requestedTab) ? requestedTab : 'overview';
  const { order, loading, error, refetch } = useOrder(id);
  const { deleteOrder, updateOrderProgress } = useOrders();
  const { createShipment, updateShipment } = useShipmentActions();
  const { updateDocumentStatus } = useDocumentActions();
  const { uploadDocument, getSignedUrl, removeDocument } = useDocumentUpload();
  const { user, isAdminOrDirector } = useAuth();
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState('');
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState(EMPTY_SHIPMENT);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [productionProgress, setProductionProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const pendingDocIdRef = useRef(null);

  useEffect(() => { setProductionProgress(Number(order?.production_progress) || 0); }, [order?.production_progress]);

  const fetchRelated = useCallback(async () => {
    setRelatedLoading(true);
    setRelatedError('');
    const [paymentResult, activityResult] = await Promise.all([
      supabase.from('order_payments').select('*').eq('order_id', id).order('created_at', { ascending: false }),
      supabase.from('order_activity').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    ]);
    setPayments(paymentResult.data || []);
    setActivity(activityResult.data || []);
    setRelatedError(paymentResult.error?.message || activityResult.error?.message || '');
    setRelatedLoading(false);
  }, [id]);

  useEffect(() => { fetchRelated(); }, [fetchRelated]);

  if (loading) return <div className="card loading-card"><Loader2 className="spin" size={28} /><p>Loading order...</p></div>;
  if (error || !order) return <div className="empty-state"><h4>Order not found</h4><p><Link to="/orders">Back to Orders</Link></p></div>;

  const shipment = (order.shipments || [])[0];
  const docs = order.order_documents || [];
  const docsProgress = getDocsProgress(docs);
  const stageProgress = getStageProgress(order.status);
  const received = payments.filter((p) => ['Received', 'Reconciled'].includes(p.status)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const due = Math.max(Number(order.total_value || 0) - received, 0);

  async function updateStatus(status) {
    setMessage('');
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (updateError) return setMessage(updateError.message);
    await Promise.all([refetch(), fetchRelated()]);
    setMessage('Order status updated.');
  }

  async function createTrackingLink() {
    setMessage('');
    const { data, error: tokenError } = await supabase.rpc('rotate_buyer_tracking_token', { p_order_id: order.id });
    if (tokenError) return setMessage(tokenError.message);
    await navigator.clipboard.writeText(`${window.location.origin}/track/${data}`);
    setMessage('Secure buyer link copied. The previous link is now invalid.');
    fetchRelated();
  }

  async function saveProduction() {
    setSaving(true);
    const result = await updateOrderProgress(order.id, productionProgress);
    setSaving(false);
    setMessage(result.error || 'Production progress saved.');
    if (!result.error) refetch();
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...paymentForm, order_id: order.id, amount: Number(paymentForm.amount), payment_date: paymentForm.payment_date || null };
    const { error: insertError } = await supabase.from('order_payments').insert(payload);
    setSaving(false);
    if (insertError) return setMessage(insertError.message);
    setPaymentModalOpen(false);
    setPaymentForm(EMPTY_PAYMENT);
    setMessage('Payment recorded.');
    fetchRelated();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    const docId = pendingDocIdRef.current;
    if (!file || !docId) return;
    setUploadingDocId(docId);
    const result = await uploadDocument(docId, order.id, file, user?.email);
    setUploadingDocId(null);
    e.target.value = '';
    setMessage(result.error || 'Document uploaded.');
    if (!result.error) refetch();
  }

  async function handleViewDocument(path) {
    const { url, error: signedError } = await getSignedUrl(path);
    if (signedError) return setMessage(`Couldn't open file: ${signedError}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleShipmentSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const result = shipment?.id ? await updateShipment(shipment.id, shipmentForm) : await createShipment(order.id, shipmentForm);
    setSaving(false);
    if (result.error) return setMessage(result.error);
    setShipmentModalOpen(false);
    setShipmentForm(EMPTY_SHIPMENT);
    setMessage('Shipment details saved.');
    refetch();
  }

  function openShipmentForm() {
    setShipmentForm(shipment ? { ...EMPTY_SHIPMENT, ...shipment } : EMPTY_SHIPMENT);
    setShipmentModalOpen(true);
  }

  async function handleDeleteOrder() {
    if (!window.confirm(`Delete ${order.id}? This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteOrder(order.id);
    setDeleting(false);
    if (result.error) return setMessage(result.error);
    navigate('/orders');
  }

  const invoiceOrder = { ...order, destination_port: order.pod_port, payment_terms: order.payment_method, inquiry_items: order.order_items };

  return (
    <div className="order-detail-workspace">
      <Link to="/orders" className="btn btn-ghost btn-sm back-link"><ArrowLeft size={16} /> Orders</Link>
      <div className="order-detail-hero card">
        <div><span className="eyebrow">Export Order</span><h1>{order.id}</h1><p>{order.clients?.company || 'Unknown buyer'} · {order.clients?.country || 'Country pending'}</p></div>
        <div className="hero-actions">
          <Badge status={order.status} />
          <select aria-label="Order status" className="select-input" value={normalizeStatus(order.status)} onChange={(e) => updateStatus(e.target.value)}>
            {ORDER_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
          {isAdminOrDirector && <button className="btn btn-secondary btn-sm" onClick={createTrackingLink}><Copy size={14} /> Buyer link</button>}
        </div>
      </div>
      {message && <div className="alert alert-info" role="status">{message}</div>}

      <div className="order-tabs" role="tablist" aria-label="Order sections">
        {TABS.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setSearchParams(tab === 'overview' ? {} : { tab })} key={tab}>{tab}</button>)}
      </div>

      {activeTab === 'overview' && <>
        <div className="order-health-grid">
          <Stat icon={FileText} label="Contract value" value={formatUSD(order.total_value)} helper={`${order.incoterm || 'FOB'} · ${order.payment_method || 'LC'}`} />
          <Stat icon={PackageCheck} label="Workflow" value={`${stageProgress}%`} helper={normalizeStatus(order.status)} />
          <Stat icon={CalendarDays} label="Deadline" value={order.shipment_deadline ? new Date(order.shipment_deadline).toLocaleDateString() : '—'} helper={order.pod_port || 'POD pending'} />
          <Stat icon={Ship} label="Documents" value={`${docsProgress.complete}/${docsProgress.total || 0}`} helper={`${docsProgress.percent}% complete`} />
        </div>
        <div className="card stage-card"><div className="card-header"><div><h3>Order timeline</h3><p>Seven internal milestones from confirmation to closure.</p></div></div><StageTracker status={order.status} /></div>
        <div className="order-detail-grid">
          <div className="card"><div className="card-header"><h3>Commercial details</h3></div><div className="detail-grid">
            <DetailRow label="Buyer" value={order.clients?.company || '—'} /><DetailRow label="Country" value={order.clients?.country || '—'} />
            <DetailRow label="Products" value={(order.order_items || []).map((item) => `${item.product_name} (${item.quantity_mt} MT)`).join(', ') || 'No products'} />
            <DetailRow label="Port of loading" value={order.pol_port || 'Port Qasim'} /><DetailRow label="Port of discharge" value={order.pod_port || '—'} />
            <DetailRow label="Payment method" value={order.payment_method || '—'} />
          </div>{order.special_instructions && <div className="order-note"><strong>Instructions</strong><p>{order.special_instructions}</p></div>}</div>
          <OrderActionPanel order={order} onGeneratePI={() => generateProformaInvoice(invoiceOrder)} onDocuments={() => setSearchParams({ tab: 'documents' })} onShipment={() => setSearchParams({ tab: 'shipment' })} />
        </div>
      </>}

      {activeTab === 'production' && <div className="card focused-tab-card"><div className="card-header"><div><h3>Production progress</h3><p>Use the slider for a quick phone-friendly update.</p></div><strong className="progress-number">{productionProgress}%</strong></div>
        <input className="production-slider" type="range" min="0" max="100" step="5" value={productionProgress} onChange={(e) => setProductionProgress(Number(e.target.value))} />
        <div className="progress-track large-progress"><div className="progress-fill" style={{ width: `${productionProgress}%` }} /></div>
        <button className="btn btn-primary mobile-full-button" onClick={saveProduction} disabled={saving}>{saving ? 'Saving…' : 'Save progress'}</button>
      </div>}

      {activeTab === 'shipment' && <div className="focused-tab-grid"><ShipmentSummaryCard shipment={shipment} onAddShipment={openShipmentForm} onStatusChange={async (status) => { await updateShipment(shipment.id, { status }); if (status === 'Delivered') await updateStatus('Delivered & Closed'); refetch(); }} statusOptions={SHIPMENT_STATUSES} />
        {shipment && <button className="btn btn-secondary mobile-full-button" onClick={openShipmentForm}>Edit shipment details</button>}</div>}

      {activeTab === 'documents' && <><DocumentChecklistCard docs={docs} onStatusChange={async (docId, status) => { await updateDocumentStatus(docId, status); refetch(); }} onUpload={(docId) => { pendingDocIdRef.current = docId; fileInputRef.current?.click(); }} onView={handleViewDocument} onRemove={async (docId, path) => { if (!window.confirm('Remove this uploaded file?')) return; const result = await removeDocument(docId, path); setMessage(result.error || 'Document removed.'); refetch(); }} uploadingDocId={uploadingDocId} /><input type="file" ref={fileInputRef} hidden onChange={handleFileSelected} /></>}

      {activeTab === 'payments' && <div className="card focused-tab-card">
        <div className="card-header"><div><h3>Payments</h3><p>Track advance, balance, bank reference, and reconciliation.</p></div><button className="btn btn-primary btn-sm" onClick={() => setPaymentModalOpen(true)}><Plus size={15} /> Add payment</button></div>
        <div className="payment-totals"><div><span>Order value</span><strong>{formatUSD(order.total_value)}</strong></div><div><span>Received</span><strong>{formatUSD(received)}</strong></div><div><span>Balance due</span><strong>{formatUSD(due)}</strong></div></div>
        {relatedLoading ? <div className="loading-inline"><Loader2 className="spin" /> Loading…</div> : relatedError ? <div className="alert alert-danger">{relatedError}</div> : payments.length === 0 ? <div className="empty-state compact-empty"><p>No payment entries yet.</p></div> : <div className="payment-list">{payments.map((payment) => <div className="payment-list-row" key={payment.id}><div><strong>{payment.payment_type} payment</strong><span>{payment.bank_reference || 'No bank reference'} · {payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date pending'}</span></div><div><strong>{formatUSD(payment.amount)}</strong><span className={`payment-state state-${payment.status?.toLowerCase()}`}>{payment.status}</span></div></div>)}</div>}
      </div>}

      {activeTab === 'activity' && <div className="card focused-tab-card"><div className="card-header"><div><h3>Activity history</h3><p>Database-backed audit trail for important order events.</p></div></div>
        {relatedLoading ? <div className="loading-inline"><Loader2 className="spin" /> Loading…</div> : relatedError ? <div className="alert alert-danger">{relatedError}</div> : activity.length === 0 ? <div className="empty-state compact-empty"><p>No activity recorded yet.</p></div> : <div className="activity-timeline">{activity.map((event) => <div className="activity-event" key={event.id}><span className="activity-dot" /><div><strong>{activityLabel(event)}</strong><p>{event.from_value && `${event.from_value} → `}{event.to_value || ''}</p><small>{new Date(event.created_at).toLocaleString()}</small></div></div>)}</div>}
      </div>}

      {isAdminOrDirector && activeTab === 'overview' && <div className="danger-zone"><button className="btn btn-ghost btn-sm danger-text" onClick={handleDeleteOrder} disabled={deleting}>{deleting ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />} Delete order</button></div>}

      <Modal open={shipmentModalOpen} onClose={() => setShipmentModalOpen(false)} title={shipment ? 'Edit Shipment Details' : 'Add Shipment Details'}>
        <form onSubmit={handleShipmentSubmit} className="shipment-form"><div className="form-grid">{[['shipping_line', 'Shipping Line'], ['vessel_voyage', 'Vessel / Voyage'], ['container_number', 'Container Number'], ['seal_number', 'Seal Number'], ['bl_number', 'Bill of Lading Number'], ['pol', 'Port of Loading'], ['pod', 'Port of Discharge']].map(([key, label]) => <label className="field-label" key={key}>{label}<input className="text-input" value={shipmentForm[key] || ''} onChange={(e) => setShipmentForm({ ...shipmentForm, [key]: e.target.value })} /></label>)}<label className="field-label">ETD<input className="text-input" type="date" value={shipmentForm.etd || ''} onChange={(e) => setShipmentForm({ ...shipmentForm, etd: e.target.value })} /></label><label className="field-label">ETA<input className="text-input" type="date" value={shipmentForm.eta || ''} onChange={(e) => setShipmentForm({ ...shipmentForm, eta: e.target.value })} /></label><label className="field-label">Status<select className="select-input" value={shipmentForm.status} onChange={(e) => setShipmentForm({ ...shipmentForm, status: e.target.value })}>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setShipmentModalOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save shipment'}</button></div></form>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Payment">
        <form onSubmit={handlePaymentSubmit} className="shipment-form"><div className="form-grid"><label className="field-label">Payment type<select className="select-input" value={paymentForm.payment_type} onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}>{['Advance', 'Balance', 'Other'].map((type) => <option key={type}>{type}</option>)}</select></label><label className="field-label">Amount (USD)<input required min="0" step="0.01" className="text-input" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></label><label className="field-label">Status<select className="select-input" value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}>{['Due', 'Received', 'Reconciled', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}</select></label><label className="field-label">Payment date<input className="text-input" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></label><label className="field-label">Bank reference<input className="text-input" value={paymentForm.bank_reference} onChange={(e) => setPaymentForm({ ...paymentForm, bank_reference: e.target.value })} /></label><label className="field-label">Notes<input className="text-input" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></label></div><div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setPaymentModalOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</button></div></form>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }) { return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>; }
function Stat({ icon: Icon, label, value, helper }) { return <div className="trade-stat-card"><Icon size={18} /><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></div>; }
function activityLabel(event) { return ({ order_created: 'Order created', inquiry_converted: 'Inquiry converted', status_changed: 'Status changed', tracking_link_rotated: 'Buyer link rotated' })[event.event_type] || event.event_type.replaceAll('_', ' '); }
