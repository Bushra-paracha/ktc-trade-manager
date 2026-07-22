import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileDown, Trash2, Loader2, AlertCircle, PackageCheck, Reply, Send, Edit2 } from 'lucide-react';
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
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// Safe formatUSD wrapper — guards against null/undefined values
const safeFormatUSD = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return 'USD —';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};
const MAILBOXES = ['exports@kassamtradingcompany.com', 'sales@kassamtradingcompany.com', 'info@kassamtradingcompany.com'];
const DEFAULT_SIGNATURE = `\n\nWarm regards,\n\nSultan Ali Paracha\nDirector, Kassam Trading Company\nKarachi, Pakistan\nTel: +92-21-2411786 | WhatsApp: +92-300-820-1074\nEmail: ktcmktg@gmail.com\nwww.kassamtradingcompany.com\nREAP Member #2-1-99-1195`;

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
  margin_percent: 0,
  cost_subtotal: 0,
  unit_price: 0,
  line_total: 0,
});

export default function Inquiries() {
  const navigate = useNavigate();
  const { isAdminOrDirector } = useAuth();
  const { inquiries, loading, error, createInquiry, updateInquiry, updateInquiryStatus, deleteInquiry } = useInquiries();
  const { clients } = useClients();
  const { products } = useProducts();
  const { convertInquiryToOrder } = useOrders();
  const [converting, setConverting] = useState(null);
  const [editInquiry, setEditInquiry] = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Reply state
  const [replyModal, setReplyModal] = useState(false);
  const [replyInquiry, setReplyInquiry] = useState(null);
  const [replyForm, setReplyForm] = useState({ from: 'exports@kassamtradingcompany.com', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  function openReply(inquiry) {
    const clientEmail = inquiry.clients?.email;
    const clientCompany = inquiry.clients?.company;
    setReplyInquiry({ ...inquiry, clientEmail, clientCompany });
    setReplyForm({
      from: 'exports@kassamtradingcompany.com',
      subject: `Re: Your Rice/Salt Inquiry ${inquiry.id} — Kassam Trading Company`,
      body: `Dear ${inquiry.clients?.contact || clientCompany || 'Sir/Madam'},\n\nThank you for your inquiry (Ref: ${inquiry.id}). Please find below our response:\n\n${DEFAULT_SIGNATURE}`,
    });
    setSendResult(null);
    setReplyModal(true);
  }

  async function handleSendReply() {
    if (!replyForm.body.trim() || !replyInquiry?.clientEmail) return;
    setSending(true);
    setSendResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const html = `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${replyForm.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;

      const { data: msgRow, error: insertErr } = await supabase
        .from('email_messages')
        .insert([{
          to_email: replyInquiry.clientEmail,
          to_name: replyInquiry.clientCompany || replyInquiry.clientEmail,
          subject: replyForm.subject,
          sender_email: replyForm.from,
          status: 'Pending',
          body_html: html,
        }])
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messageId: msgRow.id, html }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setSendResult({ success: true, message: `Reply sent to ${replyInquiry.clientEmail}` });
      await updateInquiryStatus(replyInquiry.id, 'In Negotiation');
      setTimeout(() => { setReplyModal(false); setSendResult(null); }, 2500);
    } catch (err) {
      setSendResult({ success: false, message: `Failed: ${err.message}` });
    }
    setSending(false);
  }

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

  function openEditInquiry(inquiry) {
    setEditInquiry(inquiry);
    setClientId(inquiry.client_id || '');
    setIncoterm(inquiry.incoterm || 'FOB');
    setDestinationPort(inquiry.destination_port || '');
    setPaymentTerms(inquiry.payment_terms || 'LC at Sight');
    setCertifications(inquiry.required_certifications || []);
    setQuoteValidityDays(inquiry.quote_validity_days || 30);
    setItems(inquiry.inquiry_items || []);
    setModalOpen(true);
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

    if (editInquiry) {
      const { error } = await updateInquiry(editInquiry.id, {
        client_id: clientId,
        incoterm,
        destination_port: destinationPort,
        payment_terms: paymentTerms,
        required_certifications: certifications,
        quote_validity_days: Number(quoteValidityDays),
      }, validItems);
      setSaving(false);
      if (error) { setFormError(error); return; }
    } else {
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
      if (error) { setFormError(error); return; }
    }

    resetForm();
    setEditInquiry(null);
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
          <p>{inquiries.length} inquiries · {safeFormatUSD(totalValue)} total pipeline value</p>
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
                  <td className="cell-strong">{safeFormatUSD(i.total_value)}</td>
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
                      {i.clients?.email && (
                        <button
                          className="icon-btn"
                          title="Reply to client"
                          onClick={() => openReply(i)}
                        >
                          <Reply size={16} />
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        title="Edit inquiry"
                        onClick={() => openEditInquiry(i)}
                      >
                        <Edit2 size={16} />
                      </button>
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); setEditInquiry(null); }} title={editInquiry ? `Edit Inquiry ${editInquiry.id}` : 'New Inquiry & Quotation'}>
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
            <span className="stat-card-value" style={{ fontSize: 22 }}>{safeFormatUSD(liveTotal)}</span>
          </div>

          {formError && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{formError}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editInquiry ? 'Save Changes' : 'Create Inquiry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reply Modal */}
      <Modal open={replyModal} onClose={() => setReplyModal(false)} title={`Reply to ${replyInquiry?.clientCompany || replyInquiry?.clientEmail}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sendResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: sendResult.success ? '#E6F7ED' : '#F7E6E6',
              color: sendResult.success ? '#1A6E3A' : '#6E1A1A',
              border: `1px solid ${sendResult.success ? '#1A6E3A' : '#6E1A1A'}`,
            }}>
              {sendResult.message}
            </div>
          )}

          <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
            <span style={{ fontWeight: 600 }}>To: </span>
            {replyInquiry?.clientCompany} &lt;{replyInquiry?.clientEmail}&gt;
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            From
            <select className="select-input" value={replyForm.from} onChange={e => setReplyForm(f => ({ ...f, from: e.target.value }))}>
              {MAILBOXES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Subject
            <input className="select-input" value={replyForm.subject} onChange={e => setReplyForm(f => ({ ...f, subject: e.target.value }))} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Message
            <textarea
              className="select-input"
              rows={14}
              value={replyForm.body}
              onChange={e => setReplyForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Type your response here..."
              style={{ fontFamily: 'inherit', fontSize: 13 }}
            />
          </label>

          <p style={{ fontSize: 11.5, color: 'var(--color-ink-faint)', margin: 0 }}>
            Sending this reply will automatically update the inquiry status to "In Negotiation".
          </p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setReplyModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSendReply}
              disabled={sending || !replyForm.body.trim() || !replyInquiry?.clientEmail}
            >
              {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Response'}
            </button>
          </div>
        </div>
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
