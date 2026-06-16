import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileDown, Trash2, Loader2, AlertCircle, PackageCheck } from 'lucide-react';
import { formatUSD } from '../data/mockData';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import InquiryItemEditor from '../components/InquiryItemEditor';
import { SearchInput, SelectInput } from '../components/Toolbar';
import { useInquiries } from '../hooks/useInquiries';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { generateProformaInvoice } from '../lib/generateProformaInvoice';
import { calculateInquiryTotal, calculateLineItem, INCOTERMS, PAYMENT_TERMS, CERTIFICATIONS, INQUIRY_STATUSES } from '../lib/pricingEngine';

import { useAuth } from '../hooks/useAuth';

const EMPTY_ITEM = () => ({
  product_id: '',
  product_name: '',
  quantity_mt: 10,
  base_cost: 0,
  packaging_cost: 0,
  milling_cost: 15,
  export_duties: 5,
  freight_cost: 60,
  inspection_cost: 5,
  margin_percent: 10,
  cost_subtotal: 0,
  unit_price: 0,
  line_total: 0,
});

export default function Inquiries() {
  const navigate = useNavigate();
  const { isAdminOrDirector } = useAuth();
  const { inquiries, loading, error, createInquiry, updateInquiryStatus, deleteInquiry } = useInquiries();
  const { clients } = useClients();
  const { products } = useProducts();
  const { convertInquiryToOrder } = useOrders();
  const [converting, setConverting] = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [incoterm, setIncoterm] = useState('FOB');
  const [destinationPort, setDestinationPort] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('LC at Sight');
  const [certifications, setCertifications] = useState([]);
  const [quoteValidityDays, setQuoteValidityDays] = useState(7);
  const [items, setItems] = useState([EMPTY_ITEM()]);

  const filtered = inquiries.filter((i) => {
    const matchesSearch =
      (i.clients?.company || '').toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || i.status === status;
    return matchesSearch && matchesStatus;
  });

  const totalValue = inquiries.reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);

  function toggleCertification(cert) {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  function updateItem(idx, updated) {
    setItems((prev) => prev.map((it, i) => (i === idx ? updated : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, EMPTY_ITEM()]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setClientId('');
    setIncoterm('FOB');
    setDestinationPort('');
    setPaymentTerms('LC at Sight');
    setCertifications([]);
    setQuoteValidityDays(7);
    setItems([EMPTY_ITEM()]);
    setFormError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!clientId) {
      setFormError('Please select a client.');
      return;
    }
    const validItems = items.filter((it) => it.product_id && it.quantity_mt > 0);
    if (validItems.length === 0) {
      setFormError('Add at least one product with a quantity.');
      return;
    }

    setSaving(true);

    const { error } = await createInquiry(
      {
        client_id: clientId,
        incoterm,
        destination_port: destinationPort,
        payment_terms: paymentTerms,
        required_certifications: certifications,
        quote_validity_days: Number(quoteValidityDays),
        status: 'Pending Response',
      },
      validItems
    );

    setSaving(false);

    if (error) {
      setFormError(error);
      return;
    }

    resetForm();
    setModalOpen(false);
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete inquiry ${id}? This can't be undone.`)) return;
    await deleteInquiry(id);
  }

  async function handleStatusChange(id, newStatus) {
    await updateInquiryStatus(id, newStatus);
  }

  async function handleConvertToOrder(inquiry) {
    if (!window.confirm(`Convert ${inquiry.id} into a confirmed Order? This will create a new order with a document checklist.`)) return;
    setConverting(inquiry.id);
    const { data, error } = await convertInquiryToOrder(inquiry);
    setConverting(null);

    if (error) {
      alert(`Couldn't convert to order: ${error}`);
      return;
    }
    navigate(`/orders/${data.id}`);
  }

  const liveTotal = calculateInquiryTotal(items);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inquiries</h1>
          <p>{inquiries.length} inquiries · {formatUSD(totalValue)} total pipeline value</p>
        </div>
        {isAdminOrDirector ? (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus /> New Inquiry
          </button>
        ) : (
          <span className="cell-muted" style={{ fontSize: 12.5, fontStyle: 'italic' }}>Only Directors/Admins can create new pricing quotes</span>
        )}
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load inquiries</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by client or inquiry ID..." />
        <SelectInput value={status} onChange={setStatus} options={INQUIRY_STATUSES} label="All Statuses" />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading inquiries...</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Inquiry ID</th>
                <th>Client</th>
                <th>Products</th>
                <th>Incoterm</th>
                <th>Destination Port</th>
                <th>Payment Terms</th>
                <th>Value</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="cell-strong">{i.id}</td>
                  <td>{i.clients?.company || '—'}</td>
                  <td style={{ minWidth: 200 }}>
                    {(i.inquiry_items || []).map((it) => `${it.product_name} (${it.quantity_mt} MT)`).join(', ')}
                  </td>
                  <td>{i.incoterm}</td>
                  <td>{i.destination_port}</td>
                  <td>{i.payment_terms}</td>
                  <td className="cell-strong">{formatUSD(i.total_value)}</td>
                  <td>
                    <select
                      className="select-input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={i.status}
                      onChange={(e) => handleStatusChange(i.id, e.target.value)}
                    >
                      {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="cell-muted">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(i.status === 'Accepted' || i.status === 'In Negotiation') && (
                        <button
                          className="icon-btn"
                          aria-label="Convert to Order"
                          onClick={() => handleConvertToOrder(i)}
                          disabled={converting === i.id}
                          title="Convert to Order"
                        >
                          {converting === i.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <PackageCheck size={16} />}
                        </button>
                      )}
                      <button className="icon-btn" aria-label="Download Proforma Invoice" onClick={() => generateProformaInvoice(i)}>
                        <FileDown size={16} />
                      </button>
                      {isAdminOrDirector && (
                        <button className="icon-btn" aria-label="Delete inquiry" onClick={() => handleDelete(i.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state"><h4>No inquiries found</h4><p>Try adjusting your filters, or create a new inquiry.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="New Inquiry & Quotation">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormRow label="Client *">
            <select className="select-input" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Select client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </FormRow>

          <div className="grid grid-2">
            <FormRow label="Incoterm">
              <select className="select-input" value={incoterm} onChange={(e) => setIncoterm(e.target.value)}>
                {INCOTERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Destination Port">
              <input className="select-input" value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} placeholder="e.g. Jebel Ali, UAE" />
            </FormRow>
          </div>

          <div className="grid grid-2">
            <FormRow label="Payment Terms">
              <select className="select-input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Quote Validity (days)">
              <input type="number" min="1" className="select-input" value={quoteValidityDays} onChange={(e) => setQuoteValidityDays(e.target.value)} />
            </FormRow>
          </div>

          <FormRow label="Required Certifications">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CERTIFICATIONS.map((cert) => (
                <label key={cert} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', background: certifications.includes(cert) ? 'var(--color-primary-soft)' : 'var(--color-surface)' }}>
                  <input type="checkbox" checked={certifications.includes(cert)} onChange={() => toggleCertification(cert)} />
                  {cert}
                </label>
              ))}
            </div>
          </FormRow>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Products & Pricing Calculator</div>
            {items.map((item, idx) => (
              <InquiryItemEditor
                key={idx}
                item={item}
                products={products}
                onChange={(updated) => updateItem(idx, updated)}
                onRemove={() => removeItem(idx)}
              />
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
              <Plus /> Add Product
            </button>
          </div>

          <div className="card" style={{ background: 'var(--color-primary-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="cell-strong">Total Inquiry Value</span>
            <span className="stat-card-value" style={{ fontSize: 22 }}>{formatUSD(liveTotal)}</span>
          </div>

          {formError && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{formError}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Create Inquiry'}
            </button>
          </div>
        </form>
      </Modal>
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
