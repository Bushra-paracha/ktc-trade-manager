import { useState, useEffect, useCallback } from 'react';
import { Mail, Loader2, CheckCircle2, UserPlus, ExternalLink, Reply, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const MAILBOXES = ['exports@kassamtradingcompany.com', 'sales@kassamtradingcompany.com', 'info@kassamtradingcompany.com'];

const DEFAULT_SIGNATURE = `\n\nWarm regards,\n\nSultan Ali Paracha\nDirector, Kassam Trading Company\nKarachi, Pakistan\nTel: +92-21-2411786 | WhatsApp: +92-300-820-1074\nEmail: ktcmktg@gmail.com\nwww.kassamtradingcompany.com\nREAP Member #2-1-99-1195`;

export default function InboundInbox() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [replyModal, setReplyModal] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyForm, setReplyForm] = useState({ from: 'exports@kassamtradingcompany.com', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const navigate = useNavigate();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inbound_emails')
      .select('*, clients(company, status)')
      .order('received_at', { ascending: false })
      .limit(100);
    setEmails(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  async function markRead(id) {
    await supabase.from('inbound_emails').update({ is_read: true }).eq('id', id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
  }

  async function convertToClient(email) {
    const { data, error } = await supabase.from('clients').insert([{
      email: email.from_email,
      contact: email.from_name || '',
      company: email.from_name || email.from_email.split('@')[0],
      source: `Inbound email via ${email.mailbox}`,
      status: 'New',
      notes: `First contact: "${email.subject}" received ${new Date(email.received_at).toLocaleDateString()}`,
    }]).select().single();

    if (!error && data) {
      await supabase.from('inbound_emails').update({ client_id: data.id }).eq('id', email.id);
      navigate(`/clients/${data.id}`);
    }
  }

  function openReply(email) {
    setReplyTo(email);
    setReplyForm({
      from: email.mailbox || 'exports@kassamtradingcompany.com',
      subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`,
      body: DEFAULT_SIGNATURE,
    });
    setSendResult(null);
    setReplyModal(true);
  }

  async function handleSendReply() {
    if (!replyForm.body.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Create email_messages row first
      const { data: msgRow, error: insertErr } = await supabase
        .from('email_messages')
        .insert([{
          to_email: replyTo.from_email,
          to_name: replyTo.from_name || replyTo.from_email,
          subject: replyForm.subject,
          sender_email: replyForm.from,
          status: 'Pending',
          body_html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${replyForm.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`,
        }])
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // 2. Send via Edge Function
      const html = `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;">${replyForm.body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
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

      setSendResult({ success: true, message: `Reply sent to ${replyTo.from_email}` });
      await supabase.from('inbound_emails').update({ is_read: true }).eq('id', replyTo.id);
      setTimeout(() => { setReplyModal(false); setSendResult(null); fetchEmails(); }, 2000);
    } catch (err) {
      setSendResult({ success: false, message: `Failed: ${err.message}` });
    }
    setSending(false);
  }

  const unread = emails.filter(e => !e.is_read).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inbound Inbox</h1>
          <p>{unread} unread · {emails.length} total incoming emails</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchEmails} disabled={loading}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading inbox...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Mail size={32} color="var(--color-ink-faint)" />
          <h4 style={{ marginTop: 12 }}>No inbound emails yet</h4>
          <p className="cell-muted">Click "Check for Replies" on the Outreach page to scan your mailboxes.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>From</th>
                <th>Subject</th>
                <th>Mailbox</th>
                <th>Client Match</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <>
                  <tr
                    key={email.id}
                    style={{ cursor: 'pointer', background: !email.is_read ? 'var(--color-accent-soft)' : undefined, fontWeight: !email.is_read ? 600 : 400 }}
                    onClick={() => { setExpandedId(expandedId === email.id ? null : email.id); if (!email.is_read) markRead(email.id); }}
                  >
                    <td style={{ width: 8 }}>
                      {!email.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />}
                    </td>
                    <td>
                      <div className="cell-strong">{email.from_name || email.from_email}</div>
                      <div className="cell-muted" style={{ fontSize: 11 }}>{email.from_email}</div>
                    </td>
                    <td style={{ minWidth: 220 }}>{email.subject || '(no subject)'}</td>
                    <td className="cell-muted" style={{ fontSize: 12 }}>{email.mailbox}</td>
                    <td>
                      {email.clients ? (
                        <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                          ✓ {email.clients.company}
                        </span>
                      ) : (
                        <span className="cell-muted" style={{ fontSize: 12 }}>Unknown sender</span>
                      )}
                    </td>
                    <td className="cell-muted">{new Date(email.received_at).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="icon-btn" title="Reply to this email"
                          onClick={(e) => { e.stopPropagation(); openReply(email); }}>
                          <Reply size={14} />
                        </button>
                        {email.clients ? (
                          <button className="icon-btn" title="View client profile"
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${email.client_id}`); }}>
                            <ExternalLink size={14} />
                          </button>
                        ) : (
                          <button className="icon-btn" title="Add as new client"
                            onClick={(e) => { e.stopPropagation(); convertToClient(email); }}>
                            <UserPlus size={14} />
                          </button>
                        )}
                        {!email.is_read && (
                          <button className="icon-btn" title="Mark as read"
                            onClick={(e) => { e.stopPropagation(); markRead(email.id); }}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === email.id && (
                    <tr key={`${email.id}-body`}>
                      <td colSpan={7} style={{ background: 'var(--color-surface-alt)', padding: '14px 20px' }}>
                        <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--color-ink)' }}>
                          {email.body_text || '(no body content)'}
                        </p>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 12 }}
                          onClick={() => openReply(email)}
                        >
                          <Reply size={13} /> Reply to this email
                        </button>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reply Modal */}
      <Modal open={replyModal} onClose={() => setReplyModal(false)} title={`Reply to ${replyTo?.from_name || replyTo?.from_email}`}>
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

          <div style={{ display: 'flex', gap: 6, fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
            <span style={{ fontWeight: 600, minWidth: 40 }}>To:</span>
            <span>{replyTo?.from_name ? `${replyTo.from_name} <${replyTo.from_email}>` : replyTo?.from_email}</span>
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
              rows={12}
              value={replyForm.body}
              onChange={e => setReplyForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Type your reply here..."
              style={{ fontFamily: 'inherit', fontSize: 13 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setReplyModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSendReply} disabled={sending || !replyForm.body.trim()}>
              {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function InboundInbox() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inbound_emails')
      .select('*, clients(company, status)')
      .order('received_at', { ascending: false })
      .limit(100);
    setEmails(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  async function markRead(id) {
    await supabase.from('inbound_emails').update({ is_read: true }).eq('id', id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
  }

  async function convertToClient(email) {
    const { data, error } = await supabase.from('clients').insert([{
      email: email.from_email,
      contact: email.from_name || '',
      company: email.from_name || email.from_email.split('@')[0],
      source: `Inbound email via ${email.mailbox}`,
      status: 'New',
      notes: `First contact: "${email.subject}" received ${new Date(email.received_at).toLocaleDateString()}`,
    }]).select().single();

    if (!error && data) {
      await supabase.from('inbound_emails').update({ client_id: data.id }).eq('id', email.id);
      navigate(`/clients/${data.id}`);
    }
  }

  const unread = emails.filter(e => !e.is_read).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inbound Inbox</h1>
          <p>{unread} unread · {emails.length} total incoming emails</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchEmails} disabled={loading}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading inbox...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Mail size={32} color="var(--color-ink-faint)" />
          <h4 style={{ marginTop: 12 }}>No inbound emails yet</h4>
          <p className="cell-muted">Click "Check for Replies" on the Outreach page to scan your mailboxes.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>From</th>
                <th>Subject</th>
                <th>Mailbox</th>
                <th>Client Match</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <>
                  <tr
                    key={email.id}
                    style={{ cursor: 'pointer', background: !email.is_read ? 'var(--color-accent-soft)' : undefined, fontWeight: !email.is_read ? 600 : 400 }}
                    onClick={() => { setExpandedId(expandedId === email.id ? null : email.id); if (!email.is_read) markRead(email.id); }}
                  >
                    <td style={{ width: 8 }}>
                      {!email.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />}
                    </td>
                    <td>
                      <div className="cell-strong">{email.from_name || email.from_email}</div>
                      <div className="cell-muted" style={{ fontSize: 11 }}>{email.from_email}</div>
                    </td>
                    <td style={{ minWidth: 220 }}>{email.subject || '(no subject)'}</td>
                    <td className="cell-muted" style={{ fontSize: 12 }}>{email.mailbox}</td>
                    <td>
                      {email.clients ? (
                        <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                          ✓ {email.clients.company}
                        </span>
                      ) : (
                        <span className="cell-muted" style={{ fontSize: 12 }}>Unknown sender</span>
                      )}
                    </td>
                    <td className="cell-muted">{new Date(email.received_at).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {email.clients ? (
                          <button className="icon-btn" title="View client profile"
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${email.client_id}`); }}>
                            <ExternalLink size={14} />
                          </button>
                        ) : (
                          <button className="icon-btn" title="Add as new client"
                            onClick={(e) => { e.stopPropagation(); convertToClient(email); }}>
                            <UserPlus size={14} />
                          </button>
                        )}
                        {!email.is_read && (
                          <button className="icon-btn" title="Mark as read"
                            onClick={(e) => { e.stopPropagation(); markRead(email.id); }}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === email.id && (
                    <tr key={`${email.id}-body`}>
                      <td colSpan={7} style={{ background: 'var(--color-surface-alt)', padding: '14px 20px' }}>
                        <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--color-ink)' }}>
                          {email.body_text || '(no body content)'}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
