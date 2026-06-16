import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, UserPlus, Trash2, Inbox } from 'lucide-react';
import Badge from '../components/Badge';
import { supabase } from '../lib/supabaseClient';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';

const STATUSES = ['New', 'Reviewed', 'Converted to Client', 'Spam', 'Ignored'];

export default function PublicSubmissions() {
  const navigate = useNavigate();
  const { addClient } = useClients();
  const { isAdminOrDirector } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(null);

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
    </div>
  );
}
