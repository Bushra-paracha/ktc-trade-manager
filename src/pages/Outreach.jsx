import { useState, useMemo } from 'react';
import { Mail, MousePointerClick, MessageSquareReply, AlertTriangle, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useClients } from '../hooks/useClients';
import { useEmailMessages, useEmailTemplates, renderTemplate, sendOutreachEmails } from '../hooks/useOutreach';

const SENDERS = ['exports@kassamtradingcompany.com', 'sales@kassamtradingcompany.com'];

export default function Outreach() {
  const { clients, loading: clientsLoading } = useClients();
  const { messages, loading: messagesLoading, error: messagesError, refetch } = useEmailMessages();
  const { templates, loading: templatesLoading } = useEmailTemplates();

  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState(SENDERS[0]);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  // Stats derived from real email_messages
  const totals = useMemo(() => {
    const sentStatuses = ['Sent', 'Delivered', 'Opened', 'Clicked', 'Replied'];
    const sent = messages.filter((m) => sentStatuses.includes(m.status)).length;
    const opened = messages.filter((m) => m.opened_at).length;
    const clicked = messages.filter((m) => m.clicked_at).length;
    const replied = messages.filter((m) => m.status === 'Replied').length;
    const bounced = messages.filter((m) => m.status === 'Bounced').length;
    return { sent, opened, clicked, replied, bounced, total: messages.length };
  }, [messages]);

  const openRate = totals.sent ? ((totals.opened / totals.sent) * 100).toFixed(1) : '0.0';
  const ctr = totals.sent ? ((totals.clicked / totals.sent) * 100).toFixed(1) : '0.0';
  const replyRate = totals.sent ? ((totals.replied / totals.sent) * 100).toFixed(1) : '0.0';
  const bounceRate = totals.sent ? ((totals.bounced / totals.sent) * 100).toFixed(1) : '0.0';

  function toggleClient(id) {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function applyTemplate(id) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body_html);
    }
  }

  const selectedClients = clients.filter((c) => selectedClientIds.includes(c.id) && c.email);

  async function handleSend() {
    if (selectedClients.length === 0 || !subject || !body) return;
    setSending(true);
    setSendResults(null);

    const results = await sendOutreachEmails({
      clients: selectedClients,
      subjectTemplate: subject,
      bodyTemplate: body,
      senderEmail,
    });

    setSending(false);
    setSendResults(results);
    refetch();
  }

  function closeCompose() {
    setComposeOpen(false);
    setSelectedClientIds([]);
    setTemplateId('');
    setSubject('');
    setBody('');
    setSendResults(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Outreach &amp; Email Campaigns</h1>
          <p>{totals.total} emails tracked · sent via Brevo</p>
        </div>
        <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
          <Send /> Compose Email
        </button>
      </div>

      {messagesError && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <strong style={{ color: 'var(--color-danger)' }}>Couldn't load email data</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>{messagesError}</p>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={Mail} label="Open Rate" value={`${openRate}%`} delta={`${totals.opened} opened`} deltaDirection="up" accent="#2C6E8F" />
        <StatCard icon={MousePointerClick} label="Click-Through Rate" value={`${ctr}%`} delta={`${totals.clicked} clicked`} deltaDirection="up" accent="#C49A2B" />
        <StatCard icon={MessageSquareReply} label="Reply Rate" value={`${replyRate}%`} delta={`${totals.replied} replied`} deltaDirection="up" accent="#1A4D2E" />
        <StatCard icon={AlertTriangle} label="Bounce Rate" value={`${bounceRate}%`} delta={`${totals.bounced} bounced`} deltaDirection="down" accent="#B5402E" />
      </div>

      {messagesLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading email history...</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>To</th>
                <th>Client</th>
                <th>Subject</th>
                <th>From</th>
                <th>Status</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="cell-strong">{m.to_email}</td>
                  <td>{m.clients?.company || '—'}</td>
                  <td style={{ minWidth: 220 }}>{m.subject}</td>
                  <td className="cell-muted">{m.sender_email}</td>
                  <td><Badge status={m.status} /></td>
                  <td>{m.open_count || 0}</td>
                  <td>{m.click_count || 0}</td>
                  <td className="cell-muted">{m.sent_at ? new Date(m.sent_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Mail />
                      <h4>No emails sent yet</h4>
                      <p>Click "Compose Email" to send your first outreach campaign.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={composeOpen} onClose={closeCompose} title="Compose Outreach Email">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sender */}
          <FormRow label="Send From">
            <select className="select-input" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)}>
              {SENDERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>

          {/* Template picker */}
          <FormRow label="Start from a template (optional)">
            <select className="select-input" value={templateId} onChange={(e) => applyTemplate(e.target.value)} disabled={templatesLoading}>
              <option value="">— Blank email —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>

          {/* Recipients */}
          <FormRow label={`Recipients (${selectedClients.length} selected)`}>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: 180, overflowY: 'auto' }}>
              {clientsLoading && <div style={{ padding: 12 }} className="cell-muted">Loading clients...</div>}
              {clients.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 13, cursor: c.email ? 'pointer' : 'not-allowed', opacity: c.email ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(c.id)}
                    onChange={() => toggleClient(c.id)}
                    disabled={!c.email}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="cell-strong">{c.company}</div>
                    <div className="cell-muted">{c.email || 'No email on file'}</div>
                  </div>
                  <Badge status={c.status} />
                </label>
              ))}
            </div>
          </FormRow>

          {/* Subject */}
          <FormRow label="Subject">
            <input className="select-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. KTC Premium Rice & Spices — Introduction for {{company}}" />
          </FormRow>

          {/* Body */}
          <FormRow label="Body (HTML supported)">
            <textarea className="select-input" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Dear {{contact}}, ..." />
          </FormRow>

          <div className="cell-muted" style={{ fontSize: 12 }}>
            Merge tags available: <code>{'{{company}}'}</code> <code>{'{{contact}}'}</code> <code>{'{{country}}'}</code> <code>{'{{city}}'}</code>
          </div>

          {/* Preview */}
          {selectedClients[0] && (subject || body) && (
            <div className="card" style={{ background: 'var(--color-surface-alt)' }}>
              <div className="card-header-sub" style={{ marginBottom: 6 }}>Preview for {selectedClients[0].company}</div>
              <div className="cell-strong" style={{ marginBottom: 6 }}>{renderTemplate(subject, selectedClients[0])}</div>
              <div className="cell-muted" dangerouslySetInnerHTML={{ __html: renderTemplate(body, selectedClients[0]) }} />
            </div>
          )}

          {/* Send results */}
          {sendResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sendResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  {r.success ? <CheckCircle2 size={15} color="var(--color-success)" /> : <XCircle size={15} color="var(--color-danger)" />}
                  <span>{r.client}{!r.success && r.error ? ` — ${r.error}` : ''}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={closeCompose}>Close</button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || selectedClients.length === 0 || !subject || !body}
            >
              {sending ? 'Sending...' : `Send to ${selectedClients.length || ''} client${selectedClients.length === 1 ? '' : 's'}`}
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
