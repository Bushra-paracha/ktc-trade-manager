import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  MousePointerClick,
  Plus,
  RefreshCw,
  Reply,
  Send,
  Settings,
  XCircle,
} from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useClients } from '../hooks/useClients';
import {
  addEmailDomain,
  addEmailSender,
  createEmailTemplate,
  renderTemplate,
  sendOutreachEmails,
  syncTemplatesFromBrevo,
  useEmailSenders,
  useEmailMessages,
  useEmailTemplates,
  verifyEmailDomain,
} from '../hooks/useOutreach';

function FormRow({ label, children }) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontSize: 12.5,
        color: 'var(--color-ink-soft)',
        fontWeight: 600,
      }}
    >
      {label}
      {children}
    </label>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="card padded">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="cell-muted" style={{ fontSize: 12, marginBottom: 5 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
        </div>
        <Icon size={22} color="var(--color-accent)" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function Outreach() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients, loading: clientsLoading } = useClients();
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    refetch,
    checkForReplies,
    checkingReplies,
    checkError,
    checkResult,
  } = useEmailMessages();
  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useEmailTemplates();
  const {
    senders,
    domains,
    loading: sendersLoading,
    error: sendersError,
    refetch: refetchSenders,
  } = useEmailSenders();

  const [composeOpen, setComposeOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sendersOpen, setSendersOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [templateDraft, setTemplateDraft] = useState({ name: '', subject: '', body: '' });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [managementMessage, setManagementMessage] = useState('');
  const [domainDraft, setDomainDraft] = useState('');
  const [senderDraft, setSenderDraft] = useState({ name: 'Kassam Trading Company', email: '' });
  const [managingSender, setManagingSender] = useState(false);

  useEffect(() => {
    if (!senderEmail && senders.length) setSenderEmail(senders[0].email);
  }, [senderEmail, senders]);

  useEffect(() => {
    if (searchParams.get('compose') !== '1') return;

    const clientId = searchParams.get('client');
    if (clientId) setSelectedClientIds([clientId]);
    setComposeOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const selectedClients = useMemo(
    () => clients.filter((client) => selectedClientIds.includes(client.id) && client.email),
    [clients, selectedClientIds],
  );

  const filteredClients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      [client.company, client.contact, client.country, client.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [clients, recipientSearch]);

  const totals = useMemo(() => {
    const sentStatuses = ['Sent', 'Delivered', 'Opened', 'Clicked', 'Replied'];
    const sent = messages.filter((message) => sentStatuses.includes(message.status)).length;
    const opened = messages.filter((message) => message.opened_at).length;
    const clicked = messages.filter((message) => message.clicked_at).length;
    const replied = messages.filter((message) => message.status === 'Replied').length;
    return {
      total: messages.length,
      sent,
      opened,
      clicked,
      replied,
      bounced: messages.filter((message) => message.status === 'Bounced').length,
    };
  }, [messages]);

  function toggleClient(id) {
    setSelectedClientIds((current) =>
      current.includes(id) ? current.filter((clientId) => clientId !== id) : [...current, id],
    );
  }

  function applyTemplate(id) {
    setTemplateId(id);
    const template = templates.find((item) => item.id === id);
    setSubject(template?.subject || '');
    setBody(template?.body_html || '');
  }

  function closeCompose() {
    setComposeOpen(false);
    setSelectedClientIds([]);
    setRecipientSearch('');
    setTemplateId('');
    setSubject('');
    setBody('');
    setSendResults(null);
  }

  async function handleSyncTemplates() {
    setSyncing(true);
    setSyncMessage('');
    const { data, error } = await syncTemplatesFromBrevo();
    setSyncing(false);
    if (error) {
      setSyncMessage(error);
      return;
    }
    setSyncMessage(`Synced ${data.created || 0} new and ${data.updated || 0} updated templates.`);
    await refetchTemplates();
  }

  async function handleSend() {
    if (!selectedClients.length || !subject.trim() || !body.trim()) return;

    const recipientLabel = selectedClients.length === 1
      ? `${selectedClients[0].company || selectedClients[0].email} (${selectedClients[0].email})`
      : `${selectedClients.length} selected buyers`;
    if (!window.confirm(`Send this email through Brevo to ${recipientLabel}?`)) return;

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
    await refetch();
  }

  async function handleCreateTemplate() {
    if (!templateDraft.name.trim() || !templateDraft.subject.trim() || !templateDraft.body.trim()) return;
    setTemplateSaving(true);
    const { data, error } = await createEmailTemplate({
      name: templateDraft.name,
      subject: templateDraft.subject,
      bodyHtml: templateDraft.body,
    });
    setTemplateSaving(false);
    if (error) {
      setManagementMessage(error);
      return;
    }
    await refetchTemplates();
    setTemplateId(data.id);
    setSubject(data.subject);
    setBody(data.body_html);
    setTemplateDraft({ name: '', subject: '', body: '' });
    setTemplateOpen(false);
    setManagementMessage('Email template saved and selected.');
  }

  async function runSenderAction(action) {
    setManagingSender(true);
    setManagementMessage('');
    try {
      const data = action === 'domain'
        ? await addEmailDomain(domainDraft)
        : action === 'sender'
          ? await addEmailSender(senderDraft)
          : await verifyEmailDomain(action);
      setManagementMessage(data.message || 'Brevo settings updated.');
      if (action === 'domain') setDomainDraft('');
      if (action === 'sender') setSenderDraft({ name: 'Kassam Trading Company', email: '' });
      await refetchSenders();
    } catch (err) {
      setManagementMessage(err.message);
    }
    setManagingSender(false);
  }

  const openRate = totals.sent ? `${((totals.opened / totals.sent) * 100).toFixed(1)}%` : '0.0%';
  const replyRate = totals.sent ? `${((totals.replied / totals.sent) * 100).toFixed(1)}%` : '0.0%';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Email Outreach</h1>
          <p>Compose buyer emails and track Brevo delivery, opens, bounces, and replies.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setTemplateOpen(true)}>
            <Plus size={16} /> Add template
          </button>
          <button className="btn btn-secondary" onClick={() => setSendersOpen(true)}>
            <Settings size={16} /> Senders & domains
          </button>
          <button className="btn btn-secondary" onClick={handleSyncTemplates} disabled={syncing}>
            {syncing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            Sync templates
          </button>
          <button className="btn btn-secondary" onClick={checkForReplies} disabled={checkingReplies}>
            {checkingReplies ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Reply size={16} />}
            Check replies
          </button>
          <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
            <Send size={16} /> Compose Email
          </button>
        </div>
      </div>

      {(messagesError || templatesError || sendersError || checkError) && (
        <div className="card padded" style={{ color: 'var(--color-danger)', marginBottom: 16 }}>
          <AlertTriangle size={17} /> {messagesError || templatesError || sendersError || checkError}
        </div>
      )}
      {(syncMessage || managementMessage || checkResult) && (
        <div className="card padded" style={{ marginBottom: 16 }}>
          {syncMessage || managementMessage || `Reply check complete: ${checkResult.newReplies || 0} new replies found.`}
        </div>
      )}

      <div className="stats-grid">
        <MetricCard label="Tracked" value={totals.total} icon={Mail} />
        <MetricCard label="Sent" value={totals.sent} icon={Send} />
        <MetricCard label="Open rate" value={openRate} icon={MousePointerClick} />
        <MetricCard label="Reply rate" value={replyRate} icon={Reply} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Email history</h3>
            <p>{totals.bounced} bounced · {totals.clicked} clicked</p>
          </div>
        </div>
        {messagesLoading ? (
          <div className="empty-state"><Loader2 style={{ animation: 'spin 1s linear infinite' }} /><p>Loading email history…</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Status</th>
                  <th>Opens</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <div className="cell-strong">{message.clients?.company || message.to_email}</div>
                      <div className="cell-muted">{message.to_email}</div>
                    </td>
                    <td>{message.subject}</td>
                    <td className="cell-muted">{message.sender_email}</td>
                    <td><Badge status={message.status} /></td>
                    <td>{message.open_count || 0}</td>
                    <td className="cell-muted">
                      {message.sent_at ? new Date(message.sent_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {!messages.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state"><Mail /><h4>No outreach emails yet</h4><p>Compose an email to begin.</p></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={composeOpen} onClose={closeCompose} title="Compose Outreach Email">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormRow label="Send from">
            <select
              className="select-input"
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value)}
              disabled={sendersLoading || !senders.length}
            >
              {!senders.length && <option value="">No verified Brevo senders available</option>}
              {senders.map((sender) => (
                <option key={sender.id || sender.email} value={sender.email}>
                  {sender.name ? `${sender.name} — ` : ''}{sender.email}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Template">
            <select
              className="select-input"
              value={templateId}
              onChange={(event) => applyTemplate(event.target.value)}
              disabled={templatesLoading}
            >
              <option value="">Blank email</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </FormRow>

          <FormRow label={`Recipients (${selectedClients.length} selected)`}>
            <input
              className="select-input"
              value={recipientSearch}
              onChange={(event) => setRecipientSearch(event.target.value)}
              placeholder="Search company, contact, country, or email"
            />
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, maxHeight: 220, overflowY: 'auto' }}>
              {clientsLoading && <div className="cell-muted" style={{ padding: 12 }}>Loading buyers…</div>}
              {filteredClients.map((client) => (
                <label
                  key={client.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '9px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    opacity: client.email ? 1 : 0.5,
                    cursor: client.email ? 'pointer' : 'not-allowed',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(client.id)}
                    onChange={() => toggleClient(client.id)}
                    disabled={!client.email}
                  />
                  <span>
                    <span className="cell-strong">{client.company || client.contact || 'Unnamed buyer'}</span>
                    <span className="cell-muted" style={{ display: 'block' }}>{client.email || 'No email saved'}</span>
                  </span>
                </label>
              ))}
            </div>
          </FormRow>

          <FormRow label="Subject">
            <input
              className="select-input"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject line"
            />
          </FormRow>
          <FormRow label="Body (HTML supported)">
            <textarea
              className="select-input"
              rows={9}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Dear {{contact}}, …"
            />
          </FormRow>
          <div className="cell-muted" style={{ fontSize: 12 }}>
            Merge tags: <code>{'{{company}}'}</code> <code>{'{{contact}}'}</code> <code>{'{{country}}'}</code> <code>{'{{city}}'}</code>
          </div>

          {selectedClients[0] && (subject || body) && (
            <div className="card padded" style={{ background: 'var(--color-surface-alt)' }}>
              <strong>{renderTemplate(subject, selectedClients[0])}</strong>
              <div
                className="cell-muted"
                style={{ marginTop: 8 }}
                dangerouslySetInnerHTML={{ __html: renderTemplate(body, selectedClients[0]) }}
              />
            </div>
          )}

          {sendResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sendResults.map((result) => (
                <div key={`${result.client}-${result.success}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {result.success
                    ? <CheckCircle2 size={16} color="var(--color-success)" />
                    : <XCircle size={16} color="var(--color-danger)" />}
                  <span>{result.client}{result.error ? ` — ${result.error}` : ''}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" onClick={closeCompose}>Close</button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !senderEmail || !selectedClients.length || !subject.trim() || !body.trim()}
            >
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              {sending ? 'Sending…' : `Send to ${selectedClients.length || 0}`}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title="Add Email Template">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormRow label="Template name">
            <input
              className="select-input"
              value={templateDraft.name}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: New buyer introduction"
            />
          </FormRow>
          <FormRow label="Subject">
            <input
              className="select-input"
              value={templateDraft.subject}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Export inquiry for {{company}}"
            />
          </FormRow>
          <FormRow label="Body (HTML supported)">
            <textarea
              className="select-input"
              rows={10}
              value={templateDraft.body}
              onChange={(event) => setTemplateDraft((current) => ({ ...current, body: event.target.value }))}
              placeholder="Dear {{contact}}, …"
            />
          </FormRow>
          <div className="cell-muted" style={{ fontSize: 12 }}>
            Available merge tags: <code>{'{{company}}'}</code> <code>{'{{contact}}'}</code> <code>{'{{country}}'}</code> <code>{'{{city}}'}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setTemplateOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreateTemplate}
              disabled={templateSaving || !templateDraft.name.trim() || !templateDraft.subject.trim() || !templateDraft.body.trim()}
            >
              {templateSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
              Save template
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={sendersOpen} onClose={() => setSendersOpen(false)} title="Senders & Domains">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h4 style={{ marginBottom: 8 }}>Active sender addresses</h4>
            {senders.map((sender) => (
              <div key={sender.id || sender.email} className="card padded" style={{ marginBottom: 8 }}>
                <strong>{sender.name || 'Kassam Trading Company'}</strong>
                <div className="cell-muted">{sender.email}</div>
              </div>
            ))}
            {!senders.length && <div className="cell-muted">No active Brevo sender addresses found.</div>}
          </div>

          <div>
            <h4 style={{ marginBottom: 8 }}>Add sender address</h4>
            <div className="grid-2">
              <FormRow label="Display name">
                <input
                  className="select-input"
                  value={senderDraft.name}
                  onChange={(event) => setSenderDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </FormRow>
              <FormRow label="Email address">
                <input
                  className="select-input"
                  type="email"
                  value={senderDraft.email}
                  onChange={(event) => setSenderDraft((current) => ({ ...current, email: event.target.value }))}
                  placeholder="sales@yourdomain.com"
                />
              </FormRow>
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 10 }}
              onClick={() => runSenderAction('sender')}
              disabled={managingSender || !senderDraft.email.includes('@')}
            >
              <Plus size={16} /> Add sender
            </button>
          </div>

          <div>
            <h4 style={{ marginBottom: 8 }}>Sender domains</h4>
            {domains.map((domain) => {
              const domainName = domain.domain_name || domain.domain || domain.name;
              const ready = domain.authenticated || domain.verified;
              const dnsRecords = Object.values(domain.dns_records || {}).filter(Boolean);
              return (
                <div key={domain.id || domainName} className="card padded" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{domainName}</strong>
                      <div className="cell-muted">{ready ? 'Authenticated and ready' : 'DNS authentication required'}</div>
                    </div>
                    {!ready && (
                      <button className="btn btn-secondary" onClick={() => runSenderAction(domainName)} disabled={managingSender}>
                        <RefreshCw size={16} /> Check DNS
                      </button>
                    )}
                  </div>
                  {!ready && dnsRecords.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dnsRecords.map((record) => (
                        <div key={`${record.host_name}-${record.type}`} style={{ fontSize: 12 }}>
                          <strong>{record.type} · {record.host_name}</strong>
                          <code style={{ display: 'block', marginTop: 3, overflowWrap: 'anywhere' }}>{record.value}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="select-input"
                value={domainDraft}
                onChange={(event) => setDomainDraft(event.target.value)}
                placeholder="yourdomain.com"
              />
              <button
                className="btn btn-secondary"
                onClick={() => runSenderAction('domain')}
                disabled={managingSender || !domainDraft.includes('.')}
              >
                <Plus size={16} /> Add domain
              </button>
            </div>
            <p className="cell-muted" style={{ fontSize: 12, marginTop: 8 }}>
              After adding a domain, copy the DNS records shown by Brevo into your domain provider, then use Check DNS.
              Only authenticated domains should be used for outreach.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
