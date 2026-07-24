import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Tag,
  TrendingUp,
} from 'lucide-react';
import Badge from '../components/Badge';
import { documents, emailThreads, formatUSD, orders } from '../data/mockData';
import BuyerProfileTimeline from '../components/buyers/BuyerProfileTimeline';
import LeadScoreBadge from '../components/buyers/LeadScoreBadge';
import { useClient } from '../hooks/useClients';
import { useInquiries } from '../hooks/useInquiries';

function productsText(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value || 'Products not set';
}

function safeDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(value);
}

function buildEmailDraft(client) {
  const products = productsText(client.products_interest);
  return `Dear ${client.contact || 'Team'},\n\nThank you for your interest in Kassam Trading Company. We can offer direct mill pricing for ${products}. Please share your required quantity, destination port and preferred packing so we can prepare a formal quotation.\n\nBest regards,\nKassam Trading Company`;
}

function buildWhatsAppDraft(client) {
  return `Hello ${client.contact || ''}, this is Kassam Trading Company from Karachi, Pakistan. We are following up regarding ${productsText(client.products_interest)}. Please share your required quantity and destination port so we can quote FOB/CNF pricing.`;
}

export default function ClientProfile() {
  const { id } = useParams();
  const { client, loading, error } = useClient(id);
  const { inquiries } = useInquiries();
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState('');

  const related = useMemo(() => {
    if (!client) return { threads: [], clientOrders: [], clientInquiries: [], clientDocs: [] };
    return {
      threads: emailThreads.filter((thread) => thread.clientId === client.id),
      clientOrders: orders.filter((order) => order.clientId === client.id),
      clientInquiries: inquiries.filter((inquiry) => inquiry.client_id === client.id),
      clientDocs: documents.filter((doc) => doc.client === client.company),
    };
  }, [client, inquiries]);

  if (loading) {
    return (
      <div className="card dashboard-loading">
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Loading buyer profile...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="empty-state">
        <h4>Buyer not found</h4>
        <p><Link to="/clients">Back to Buyers</Link></p>
      </div>
    );
  }

  const { threads, clientOrders, clientInquiries, clientDocs } = related;
  const emailDraft = buildEmailDraft(client);
  const whatsAppDraft = buildWhatsAppDraft(client);

  function handleCopy(label, value) {
    copyText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  }

  const tabs = [
    ['overview', 'Overview'],
    ['timeline', 'Timeline'],
    ['inquiries', `Inquiries${clientInquiries.length ? ` (${clientInquiries.length})` : ''}`],
    ['orders', `Orders${clientOrders.length ? ` (${clientOrders.length})` : ''}`],
    ['documents', `Documents${clientDocs.length ? ` (${clientDocs.length})` : ''}`],
    ['emails', `Emails${threads.length ? ` (${threads.length})` : ''}`],
  ];

  return (
    <div className="buyer-profile-page">
      <Link to="/clients" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft /> Back to Buyers
      </Link>

      <section className="buyer-profile-hero">
        <div className="buyer-profile-main">
          <div className="buyer-profile-avatar">{(client.company || 'B').slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="dashboard-eyebrow"><TrendingUp size={16} /> Buyer Profile</div>
            <h1>{client.company}</h1>
            <p>{client.country || 'Unknown country'} · {client.source || 'Unknown source'} · Added {safeDate(client.created_at)}</p>
            <div className="buyer-profile-badges">
              <Badge status={client.status || 'New'} />
              <LeadScoreBadge score={client.score} />
              <span className="buyer-segment-pill">{productsText(client.products_interest)}</span>
            </div>
          </div>
        </div>
        <div className="buyer-profile-actions">
          <a className="btn btn-secondary" href={client.email ? `mailto:${client.email}` : undefined} aria-disabled={!client.email}><Mail /> Email</a>
          <a className="btn btn-secondary" href={client.phone ? `https://wa.me/${String(client.phone).replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!client.phone}><MessageCircle /> WhatsApp</a>
          <Link className="btn btn-primary" to="/inquiries"><Send /> New Quote</Link>
        </div>
      </section>

      <div className="buyer-profile-metrics">
        <Metric label="Lead Score" value={`${client.score || 0}/100`} note="Priority for follow-up" />
        <Metric label="Revenue" value={formatUSD(client.revenue || 0)} note="Confirmed CRM revenue" />
        <Metric label="Orders" value={client.orders || clientOrders.length || 0} note="Orders linked to buyer" />
        <Metric label="Est. Volume" value={client.est_volume || '—'} note="Expected monthly demand" />
      </div>

      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} type="button">
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="buyer-profile-layout">
          <main className="buyer-profile-stack">
            <div className="card">
              <div className="card-header"><h3>Contact Details</h3></div>
              <div className="buyer-detail-grid">
                <Detail icon={Mail} label="Email" value={client.email || 'No email saved'} onCopy={() => handleCopy('email', client.email)} />
                <Detail icon={Phone} label="Phone / WhatsApp" value={client.phone || 'No phone saved'} onCopy={() => handleCopy('phone', client.phone)} />
                <Detail icon={MapPin} label="Location" value={[client.city, client.country].filter(Boolean).join(', ') || 'Location not saved'} />
                <Detail icon={Tag} label="Products" value={productsText(client.products_interest)} />
              </div>
              {copied && <div className="buyer-inline-note">Copied {copied} to clipboard.</div>}
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Buyer Notes</h3>
                  <div className="card-header-sub">Use this to understand context before sending a message.</div>
                </div>
              </div>
              <p className="buyer-profile-notes">{client.notes || 'No internal notes yet. Add notes from the buyer list edit form.'}</p>
            </div>
          </main>

          <aside className="buyer-profile-stack">
            <div className="card buyer-next-card">
              <div className="card-header"><h3>Next Best Actions</h3></div>
              <div className="buyer-action-list">
                <NextAction title="Send price follow-up" note="Confirm quantity, packing and destination port." />
                <NextAction title="Prepare quote" note={`Use current products: ${productsText(client.products_interest)}`} />
                <NextAction title="Update lead score" note="Increase score if the buyer replies or requests a PI." />
              </div>
            </div>

            <div className="card buyer-next-card">
              <div className="card-header"><h3>Quick Message Drafts</h3></div>
              <button className="buyer-draft" onClick={() => handleCopy('email draft', emailDraft)}><Mail size={16} /> Copy email follow-up</button>
              <button className="buyer-draft" onClick={() => handleCopy('WhatsApp draft', whatsAppDraft)}><MessageCircle size={16} /> Copy WhatsApp follow-up</button>
            </div>
          </aside>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="card">
          <div className="card-header"><h3>Buyer Timeline</h3></div>
          <BuyerProfileTimeline client={client} inquiries={clientInquiries} orders={clientOrders} emails={threads} />
        </div>
      )}

      {tab === 'inquiries' && (
        <TableState count={clientInquiries.length} emptyTitle="No inquiries yet" emptyText="Price requests and public quote submissions will appear here.">
          <table>
            <thead><tr><th>Inquiry</th><th>Products</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {clientInquiries.map((inq) => (
                <tr key={inq.id}>
                  <td className="cell-strong">{inq.id}</td>
                  <td>{(inq.inquiry_items || []).map((item) => item.product_name).join(', ') || '—'}</td>
                  <td>{formatUSD(inq.total_value || 0)}</td>
                  <td><Badge status={inq.status || 'Open'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      )}

      {tab === 'orders' && (
        <TableState count={clientOrders.length} emptyTitle="No orders yet" emptyText="Confirmed orders for this buyer will appear here.">
          <table>
            <thead><tr><th>Order</th><th>Products</th><th>Value</th><th>Incoterm</th><th>Status</th><th>Deadline</th></tr></thead>
            <tbody>
              {clientOrders.map((order) => (
                <tr key={order.id}>
                  <td><Link to={`/orders/${order.id}`} className="cell-strong" style={{ color: 'var(--color-primary)' }}>{order.id}</Link></td>
                  <td>{Array.isArray(order.products) ? order.products.join(', ') : '—'}</td>
                  <td>{formatUSD(order.value || 0)}</td>
                  <td>{order.incoterm || '—'}</td>
                  <td><Badge status={order.status || 'Open'} /></td>
                  <td>{order.deadline || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      )}

      {tab === 'documents' && (
        <TableState count={clientDocs.length} emptyTitle="No documents yet" emptyText="PI, invoice, SGS and shipping documents will appear here.">
          <table>
            <thead><tr><th>Document</th><th>Type</th><th>Linked To</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {clientDocs.map((doc) => (
                <tr key={doc.id}>
                  <td className="cell-strong">{doc.name}</td>
                  <td>{doc.type}</td>
                  <td>{doc.linkedTo}</td>
                  <td>{doc.date}</td>
                  <td><Badge status={doc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      )}

      {tab === 'emails' && (
        <div className="buyer-profile-stack">
          {threads.length === 0 && <div className="card"><div className="empty-state"><Mail /><h4>No email history yet</h4><p>Outreach emails sent to this buyer will appear here.</p></div></div>}
          {threads.map((thread) => (
            <div className="card" key={thread.id}>
              <div className="card-header"><h3>{thread.subject}</h3><div className="card-header-sub">{thread.messages?.length || 0} messages</div></div>
              <div className="buyer-email-thread">
                {(thread.messages || []).map((message, index) => (
                  <div className="buyer-email-message" key={index}>
                    <div><strong>{message.from} → {message.to}</strong><span>{message.date}</span></div>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, note }) {
  return (
    <div className="buyer-profile-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

function Detail({ icon: Icon, label, value, onCopy }) {
  return (
    <div className="buyer-detail-item">
      <div className="buyer-detail-icon"><Icon size={17} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {onCopy && <button type="button" onClick={onCopy} title="Copy"><Copy size={15} /></button>}
    </div>
  );
}

function NextAction({ title, note }) {
  return (
    <div className="buyer-action-item">
      <div className="buyer-action-icon"><CheckCircle2 size={17} /></div>
      <div><strong>{title}</strong><span>{note}</span></div>
    </div>
  );
}

function TableState({ children, count, emptyTitle, emptyText }) {
  if (!count) {
    return <div className="card"><div className="empty-state"><FileText /><h4>{emptyTitle}</h4><p>{emptyText}</p></div></div>;
  }
  return <div className="table-wrap">{children}</div>;
}
