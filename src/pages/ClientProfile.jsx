import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Tag, TrendingUp, Send, Paperclip, Check, CheckCheck, Loader2 } from 'lucide-react';
import { emailThreads, orders, documents, formatUSD } from '../data/mockData';
import { useInquiries } from '../hooks/useInquiries';
import { useClient } from '../hooks/useClients';
import Badge from '../components/Badge';

export default function ClientProfile() {
  const { id } = useParams();
  const { client, loading, error } = useClient(id);
  const { inquiries } = useInquiries();
  const [tab, setTab] = useState('overview');

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading client...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="empty-state">
        <h4>Client not found</h4>
        <p><Link to="/clients">Back to Clients</Link></p>
      </div>
    );
  }

  // NOTE: Email threads, orders, and documents still come from mock data
  // until those tables are migrated to Supabase. They're matched by company name
  // and client id for now.
  const threads = emailThreads.filter((t) => t.clientId === client.id);
  const clientOrders = orders.filter((o) => o.clientId === client.id);
  const clientInquiries = inquiries.filter((i) => i.client_id === client.id);
  const clientDocs = documents.filter((d) => d.client === client.company);

  return (
    <div>
      <Link to="/clients" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft /> Back to Clients
      </Link>

      <div className="page-header">
        <div>
          <h1>{client.company}</h1>
          <p>{client.id} · Source: {client.source} · Assigned to {client.assigned_to}</p>
        </div>
        <Badge status={client.status} />
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Lead Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div className="stat-card-value" style={{ margin: 0 }}>{client.score}/100</div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: client.score >= 80 ? '#FDE8E6' : client.score >= 60 ? '#FDF6E3' : client.score >= 40 ? '#E6F0F7' : '#F0F0F0',
              color: client.score >= 80 ? '#B5402E' : client.score >= 60 ? '#C49A2B' : client.score >= 40 ? '#2C6E8F' : '#888888',
            }}>
              {client.score >= 80 ? '🔥 HOT' : client.score >= 60 ? '🌤 WARM' : client.score >= 40 ? '🌊 LUKEWARM' : '❄️ COLD'}
            </span>
          </div>
          <div className="progress-track" style={{ width: '100%', marginTop: 8 }}>
            <div className="progress-fill" style={{
              width: `${client.score}%`,
              background: client.score >= 80 ? '#B5402E' : client.score >= 60 ? '#C49A2B' : client.score >= 40 ? 'var(--color-accent)' : 'var(--color-ink-faint)'
            }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Revenue</div>
          <div className="stat-card-value">{formatUSD(client.revenue || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Orders Placed</div>
          <div className="stat-card-value">{client.orders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Est. Monthly Volume</div>
          <div className="stat-card-value" style={{ fontSize: 18 }}>{client.est_volume}</div>
        </div>
      </div>

      <div className="tabs">
        {['overview', 'emails', 'orders', 'documents'].map((t) => (
          <div key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)} role="button">
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'emails' && threads.length > 0 ? ` (${threads.length})` : ''}
            {t === 'orders' && clientOrders.length > 0 ? ` (${clientOrders.length})` : ''}
            {t === 'documents' && clientDocs.length > 0 ? ` (${clientDocs.length})` : ''}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="split-layout">
          <div className="card">
            <div className="card-header"><h3>Contact Information</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row icon={Mail} label="Email" value={client.email} />
              <Row icon={Phone} label="Phone / WhatsApp" value={client.phone} />
              <Row icon={MapPin} label="Location" value={`${client.city}, ${client.country}`} />
              <Row icon={Tag} label="Products of Interest" value={(client.products_interest || []).join(', ')} />
              <Row icon={TrendingUp} label="Last Activity" value={client.last_activity ? new Date(client.last_activity).toLocaleString() : '—'} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Open Inquiries</h3></div>
            {clientInquiries.length === 0 && (
              <div className="empty-state">
                <h4>No open inquiries</h4>
                <p>This client has no active price requests.</p>
              </div>
            )}
            {clientInquiries.map((inq) => (
              <div className="timeline-item" key={inq.id}>
                <div className="timeline-body" style={{ flex: 1 }}>
                  <strong>{inq.id}</strong>
                  <p>{(inq.inquiry_items || []).map((it) => it.product_name).join(', ')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge status={inq.status} />
                  <div className="cell-muted" style={{ marginTop: 4 }}>{formatUSD(inq.total_value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'emails' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {threads.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <Mail />
                <h4>No email history yet</h4>
                <p>Outreach emails sent to this client will appear here.</p>
              </div>
            </div>
          )}
          {threads.map((thread) => (
            <div className="card" key={thread.id}>
              <div className="card-header">
                <div>
                  <h3>{thread.subject}</h3>
                  <div className="card-header-sub">{thread.messages.length} messages</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {thread.messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 12,
                      background: m.from === 'KTC' ? 'var(--color-primary-soft)' : 'var(--color-surface-alt)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <strong style={{ fontSize: 13 }}>{m.from} → {m.to}</strong>
                      <span className="cell-muted">{m.date}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 2px' }}>{m.subject}</div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{m.body}</p>
                    {m.from === 'KTC' && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <span className="cell-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {m.opened ? <CheckCheck size={13} color="var(--color-success)" /> : <Check size={13} />}
                          {m.opened ? 'Opened' : 'Sent'}
                        </span>
                        {m.clicked && (
                          <span className="cell-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Paperclip size={13} /> Link clicked
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <input
                  className="select-input"
                  style={{ flex: 1 }}
                  placeholder="Write a reply..."
                  disabled
                />
                <button className="btn btn-primary btn-sm" disabled>
                  <Send /> Send
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Products</th>
                <th>Value</th>
                <th>Incoterm</th>
                <th>Status</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {clientOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/orders/${o.id}`} className="cell-strong" style={{ color: 'var(--color-primary)' }}>{o.id}</Link>
                  </td>
                  <td>{o.products.join(', ')}</td>
                  <td className="cell-strong">{formatUSD(o.value)}</td>
                  <td>{o.incoterm}</td>
                  <td><Badge status={o.status} /></td>
                  <td>{o.deadline}</td>
                </tr>
              ))}
              {clientOrders.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><h4>No orders yet</h4><p>Orders placed by this client will appear here.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Linked To</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clientDocs.map((d) => (
                <tr key={d.id}>
                  <td className="cell-strong">{d.name}</td>
                  <td>{d.type}</td>
                  <td>{d.linkedTo}</td>
                  <td>{d.date}</td>
                  <td><Badge status={d.status} /></td>
                </tr>
              ))}
              {clientDocs.length === 0 && (
                <tr><td colSpan={5}><div className="empty-state"><h4>No documents yet</h4><p>Generated and uploaded documents will appear here.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className="timeline-icon" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-ink-soft)' }}>
        <Icon />
      </div>
      <div>
        <div className="cell-muted">{label}</div>
        <div className="cell-strong">{value}</div>
      </div>
    </div>
  );
}
