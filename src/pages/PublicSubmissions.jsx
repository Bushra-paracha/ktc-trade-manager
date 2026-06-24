import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, UserPlus, Trash2, Inbox, Reply, Send } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const MAILBOXES = ['exports@kassamtradingcompany.com', 'sales@kassamtradingcompany.com', 'info@kassamtradingcompany.com'];
const DEFAULT_SIGNATURE = `\n\nWarm regards,\n\nSultan Ali Paracha\nDirector, Kassam Trading Company\nKarachi, Pakistan\nTel: +92-21-2411786 | WhatsApp: +92-300-820-1074\nEmail: ktcmktg@gmail.com\nwww.kassamtradingcompany.com\nREAP Member #2-1-99-1195`;

const STATUSES = ['New', 'Reviewed', 'Converted to Client', 'Spam', 'Ignored'];

export default function PublicSubmissions() {
  const navigate = useNavigate();
  const { addClient } = useClients();
  const { isAdminOrDirector } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(null);
  const [replyModal, setReplyModal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyForm, setReplyForm] = useState({ from: 'exports@kassamtradingcompany.com', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  async function fetchSubmissions() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('public_inquiry_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) setError(error.message);
    else setSubmissions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function handleStatusChange(id, status) {
    await supabase.from('public_inquiry_submissions').update({ status }).eq('id', id);
    fetchSubmissions();
  }

  async function handleConvertToClient(submission) {
    setConverting(submission.id);

    const { data: newClient, error } = await addClient({
      company: submission.company_name || `${submission.full_name} (from website inquiry)`,
      contact: submission.full_name,
      country: submission.country,
      email: submission.email,
      phone: submission.phone,
      source: 'Inbound Inquiry — Website Form',
      products_interest: submission.product_interest ? [submission.product_interest] : [],
      est_volume: submission.quantity_estimate,
      status: 'New',
      score: 50,
      notes: submission.message,
    });

    if (error) {
      setConverting(null);
      alert(`Couldn't create client: ${error}`);
      return;
    }

    await supabase
      .from('public_inquiry_submissions')
      .update({ status: 'Converted to Client', linked_client_id: newClient.id })
      .eq('id', submission.id);

    setConverting(null);
    fetchSubmissions();
    navigate(`/clients/${newClient.id}`);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this submission permanently?')) return;
    await supabase.from('public_inquiry_submissions').delete().eq('id', id);
    fetchSubmissions();
  }

  function openReply(submission) {
    setReplyTo(submission);
    setReplyForm({
      from: 'exports@kassamtradingcompany.com',
      subject: `Re: Your Inquiry — Kassam Trading Company`,
      body: `Dear ${submission.full_name || submission.company_name},\n\nThank you for reaching out to Kassam Trading Company through our website. We have received your inquiry and are pleased to respond.\n${DEFAULT_SIGNATURE}`,
    });
    setSendResult(null);
    setReplyModal(true);
  }

  async function handleSendReply() {
    if (!replyForm.body.trim() || !replyTo?.email) return;
    setSending(true);
    setSendResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const html = `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${replyForm.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;

      const { data: msgRow, error: insertErr } = await supabase
        .from('email_messages')
        .insert([{
          to_email: replyTo.email,
          to_name: replyTo.full_name || replyTo.company_name,
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

      await supabase.from('public_inquiry_submissions')
        .update({ status: 'Reviewed' })
        .eq('id', replyTo.id);

      setSendResult({ success: true, message: `Reply sent to ${replyTo.email}` });
      fetchSubmissions();
      setTimeout(() => { setReplyModal(false); setSendResult(null); }, 2500);
    } catch (err) {
      setSendResult({ success: false, message: `Failed: ${err.message}` });
    }
    setSending(false);
  }

  const newCount = submissions.filter((s) => s.status === 'New').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Website Inquiry Inbox</h1>
          <p>{submissions.length} submissions, {newCount} need review</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, background: 'var(--color-primary-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Inbox size={18} color="var(--color-primary)" />
          <div style={{ fontSize: 13 }}>
            Public quote request form: <code style={{ background: 'var(--color-surface)', padding: '2px 8px', borderRadius: 4 }}>
              {window.location.origin}/quote
            </code> — share this link on your website and LinkedIn.
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load submissions</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading submissions...</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Product Interest</th>
                <th>Quantity</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td className="cell-strong">{s.full_name}</td>
                  <td>{s.company_name || '—'}</td>
                  <td className="cell-muted">{s.email}</td>
                  <td>{s.product_interest || '—'}</td>
                  <td>{s.quantity_estimate || '—'}</td>
                  <td className="cell-muted">{new Date(s.submitted_at).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="select-input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={s.status}
                      onChange={(e) => handleStatusChange(s.id, e.target.value)}
                    >
                      {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {s.email && (
                        <button
                          className="icon-btn"
                          title="Reply to this inquiry"
                          onClick={() => openReply(s)}
                        >
                          <Reply size={16} />
                        </button>
                      )}
                      {s.status !== 'Converted to Client' && (
                        <button
                          className="icon-btn"
                          aria-label="Convert to client"
                          title="Create CRM lead from this submission"
                          onClick={() => handleConvertToClient(s)}
                          disabled={converting === s.id}
                        >
                          {converting === s.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
                        </button>
                      )}
                      {isAdminOrDirector && (
                        <button className="icon-btn" aria-label="Delete submission" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Inbox />
                      <h4>No submissions yet</h4>
                      <p>Inquiries submitted through your public quote form will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Reply Modal */}
      <Modal open={replyModal} onClose={() => setReplyModal(false)} title={`Reply to ${replyTo?.full_name || replyTo?.email}`}>
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

          {/* Show their original inquiry for reference */}
          {replyTo?.message && (
            <div style={{ background: 'var(--color-surface-alt)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--color-ink-soft)', borderLeft: '3px solid var(--color-accent)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Their message:</div>
              {replyTo.message}
            </div>
          )}

          <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
            <span style={{ fontWeight: 600 }}>To: </span>
            {replyTo?.full_name} &lt;{replyTo?.email}&gt;
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

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setReplyModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSendReply}
              disabled={sending || !replyForm.body.trim()}
            >
              {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
