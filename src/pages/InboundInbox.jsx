import { useState, useEffect, useCallback } from 'react';
import { Mail, Loader2, CheckCircle2, UserPlus, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Badge from '../components/Badge';
import { useNavigate } from 'react-router-dom';

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
