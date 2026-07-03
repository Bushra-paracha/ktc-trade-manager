import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight, Trash2, Loader2, AlertCircle, Upload, Download, FileSpreadsheet, UserX, CheckSquare, Square, RefreshCw, TrendingUp, ArrowUpDown, Edit2 } from 'lucide-react';
import Papa from 'papaparse';
import { formatUSD } from '../data/mockData';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { SearchInput, SelectInput } from '../components/Toolbar';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const STATUSES = ['New', 'Contacted', 'Engaged', 'Negotiating', 'Won', 'Lost', 'Dormant'];
const SOURCES = [
  'B2B Platform',
  'B2B Platform — Rice Importers List',
  'B2B Platform — Supermarkets/Retailers List',
  'B2B Platform — Amazon/Ecommerce Sellers List',
  'Trade Fair',
  'Referral',
  'Inbound Inquiry',
  'LinkedIn',
  'WhatsApp / Cold Outreach',
  'Other',
];

const EMPTY_FORM = {
  company: '',
  contact: '',
  title: '',
  country: '',
  city: '',
  email: '',
  phone: '',
  source: 'B2B Platform',
  products_interest: '',
  est_volume: '',
  status: 'New',
  score: 50,
  assigned_to: '',
  notes: '',
};

export default function Clients() {
  const { clients, loading, error, refetch, addClient, updateClient, deleteClient, bulkAddClients, bulkDeleteClients, bulkClearEmails } = useClients();
  const { isAdminOrDirector } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [segment, setSegment] = useState('');
  const [scoreTier, setScoreTier] = useState('');
  const [contactMethodFilter, setContactMethodFilter] = useState('');
  const [sortByScore, setSortByScore] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupSelected, setCleanupSelected] = useState([]);
  const [cleanupWorking, setCleanupWorking] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  const noEmailClients = useMemo(() =>
    clients.filter((c) => !c.email || !c.email.trim()),
  [clients]);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importDefaultSource, setImportDefaultSource] = useState('Other');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  const countries = [...new Set(clients.map((c) => c.country).filter(Boolean))];

  // Segment is derived from the source field. Anything tagged with
  // "B2B Platform — X List" is grouped under X; everything else falls
  // under "Other / Manual".
  function getSegment(c) {
    const src = c.source || '';
    if (src.includes('Rice Importers')) return 'Rice Importers/Distributors';
    if (src.includes('Supermarkets')) return 'Supermarkets/Retailers';
    if (src.includes('Amazon')) return 'Amazon/Ecommerce Sellers';
    return 'Other / Manually Added';
  }

  const segments = [...new Set(clients.map(getSegment))];

  function getScoreTier(score) {
    if (score >= 80) return 'Hot';
    if (score >= 60) return 'Warm';
    if (score >= 40) return 'Lukewarm';
    return 'Cold';
  }

  function scoreTierColor(tier) {
    if (tier === 'Hot') return '#B5402E';
    if (tier === 'Warm') return '#C49A2B';
    if (tier === 'Lukewarm') return '#2C6E8F';
    return '#888888';
  }

  async function handleRescore() {
    setRescoring(true);
    setRescoreResult(null);
    try {
      const { data, error } = await supabase.rpc('rescore_clients');
      if (error) throw new Error(error.message);
      setRescoreResult(`✅ ${data?.updated || 'All'} contacts rescored successfully.`);
      refetch();
    } catch (err) {
      setRescoreResult(`❌ Rescore failed: ${err.message}`);
    }
    setRescoring(false);
  }

  const filtered = useMemo(() => {
    let list = clients.filter((c) => {
      const matchesSearch =
        (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.contact || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !status || c.status === status;
      const matchesCountry = !country || c.country === country;
      const matchesSegment = !segment || getSegment(c) === segment;
      const matchesTier = !scoreTier || getScoreTier(c.score || 0) === scoreTier;
      const matchesContactMethod = !contactMethodFilter || c.contact_method === contactMethodFilter;
      return matchesSearch && matchesStatus && matchesCountry && matchesSegment && matchesTier && matchesContactMethod;
    });
    if (sortByScore) {
      list = [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    return list;
  }, [clients, search, status, country, segment, scoreTier, sortByScore, contactMethodFilter]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openEdit(client) {
    setEditClient(client);
    setForm({
      company: client.company || '',
      contact: client.contact || '',
      title: client.title || '',
      country: client.country || '',
      city: client.city || '',
      email: client.email || '',
      phone: client.phone || '',
      source: client.source || 'B2B Platform',
      products_interest: Array.isArray(client.products_interest) ? client.products_interest.join(', ') : (client.products_interest || ''),
      est_volume: client.est_volume || '',
      status: client.status || 'New',
      score: client.score || 0,
      assigned_to: client.assigned_to || '',
      notes: client.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      ...form,
      score: Number(form.score) || 0,
      products_interest: form.products_interest
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    };

    if (editClient) {
      const { error } = await updateClient(editClient.id, payload);
      setSaving(false);
      if (error) { setFormError(error); return; }
    } else {
      const { error } = await addClient({ ...payload, revenue: 0, orders: 0 });
      setSaving(false);
      if (error) { setFormError(error); return; }
    }

    setForm(EMPTY_FORM);
    setEditClient(null);
    setModalOpen(false);
  }

  async function handleDelete(id, company) {
    if (!window.confirm(`Delete lead "${company}"? This can't be undone.`)) return;
    await deleteClient(id);
  }

  function openImportModal() {
    setImportRows([]);
    setParseError(null);
    setImportResult(null);
    setImportDefaultSource('Other');
    setImportModalOpen(true);
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.errors?.length) {
          setParseError(`Some rows couldn't be parsed: ${results.errors[0].message}`);
        }
        // Normalize common column name variants to what bulkAddClients expects
        const normalized = results.data.map((row) => ({
          company: row.company || row.company_name || row.organization || '',
          contact: row.contact || row.contact_name || row.name || '',
          title: row.title || '',
          country: row.country || '',
          city: row.city || '',
          email: row.email || row.email_address || '',
          phone: row.phone || row.phone_number || '',
          source: row.source || '',
          products_interest: row.products_interest || row.product_interest || '',
          est_volume: row.est_volume || row.quantity || '',
          assigned_to: row.assigned_to || '',
          notes: row.notes || '',
        })).filter((row) => row.company || row.email); // discard fully empty rows

        setImportRows(normalized);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleConfirmImport() {
    if (importRows.length === 0) return;
    setImporting(true);

    const rowsWithSource = importRows.map((row) => ({
      ...row,
      source: row.source || importDefaultSource,
    }));

    const result = await bulkAddClients(rowsWithSource);
    setImporting(false);
    setImportResult(result);

    if (result.errorCount === 0) {
      setImportRows([]);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p>{clients.length} leads and buyers tracked across {countries.length} countries</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {noEmailClients.length > 0 && isAdminOrDirector && (
            <button className="btn btn-secondary" onClick={() => { setCleanupOpen(true); setCleanupSelected(noEmailClients.map(c => c.id)); setCleanupResult(null); }}>
              <UserX size={16} /> Clean Up ({noEmailClients.length})
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => {
            const headers = ['Company', 'Contact', 'Email', 'Phone', 'Country', 'City', 'Status', 'Score', 'Contact Method', 'Products Interest', 'Notes'];
            const rows = filtered.map(c => [
              c.company || '',
              c.contact || '',
              c.email || '',
              c.phone || '',
              c.country || '',
              c.city || '',
              c.status || '',
              c.score || '',
              c.contact_method || '',
              (c.products_interest || []).join('; '),
              (c.notes || '').replace(/,/g, ';')
            ]);
            const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ktc-clients-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={openImportModal}>
            <Upload /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus /> Add New Lead
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {segments.map((seg) => (
          <div
            key={seg}
            className="stat-card"
            style={{ cursor: 'pointer', border: segment === seg ? '2px solid var(--color-primary)' : undefined }}
            onClick={() => setSegment(segment === seg ? '' : seg)}
          >
            <div className="stat-card-label">{seg}</div>
            <div className="stat-card-value" style={{ fontSize: 22 }}>{clients.filter((c) => getSegment(c) === seg).length}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load clients from Supabase</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company or contact..." />
        <SelectInput value={segment} onChange={setSegment} options={segments} label="All Segments" />
        <SelectInput value={status} onChange={setStatus} options={STATUSES} label="All Statuses" />
        <SelectInput value={country} onChange={setCountry} options={countries} label="All Countries" />
        <select className="select-input" value={contactMethodFilter} onChange={(e) => setContactMethodFilter(e.target.value)}>
          <option value="">All Contact Types</option>
          <option value="Email">📧 Email Only</option>
          <option value="WhatsApp Only">📱 WhatsApp / Phone Only</option>
        </select>
        <select className="select-input" value={scoreTier} onChange={(e) => setScoreTier(e.target.value)}>
          <option value="">All Tiers</option>
          <option value="Hot">🔥 Hot (80-100)</option>
          <option value="Warm">🌤 Warm (60-79)</option>
          <option value="Lukewarm">🌊 Lukewarm (40-59)</option>
          <option value="Cold">❄️ Cold (0-39)</option>
        </select>
        <button
          className={`btn btn-secondary btn-sm`}
          onClick={() => setSortByScore(p => !p)}
          style={{ background: sortByScore ? 'var(--color-accent-soft)' : undefined }}
          title="Sort by lead score"
        >
          <ArrowUpDown size={14} /> {sortByScore ? 'Score ↓' : 'Sort by Score'}
        </button>
        {isAdminOrDirector && (
          <button className="btn btn-secondary btn-sm" onClick={handleRescore} disabled={rescoring} title="Recalculate all lead scores">
            {rescoring ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            Rescore
          </button>
        )}
      </div>
      {rescoreResult && (
        <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', marginBottom: 8, marginTop: -4 }}>
          {rescoreResult}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading clients from Supabase...</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Segment</th>
                <th>Status</th>
                <th>Last Contacted</th>
                <th>Lead Score</th>
                <th>Revenue</th>
                <th>Assigned To</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/clients/${c.id}`} className="cell-strong" style={{ color: 'var(--color-primary)' }}>
                      {c.company}
                    </Link>
                    <div className="cell-muted">{c.id}</div>
                  </td>
                  <td>
                    {c.contact}
                    <div className="cell-muted">{c.title}</div>
                  </td>
                  <td>{c.city ? `${c.city}, ` : ''}{c.country}</td>
                  <td>
                    <span className="badge badge-gray" style={{ fontSize: 10.5 }}>{getSegment(c)}</span>
                  </td>
                  <td><Badge status={c.status} /></td>
                  <td>
                    {c.last_contacted_at ? (
                      (() => {
                        const days = Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24));
                        const dueForFollowup = days >= 14;
                        return (
                          <span style={{ fontSize: 12.5, color: dueForFollowup ? 'var(--color-warning)' : 'var(--color-ink-soft)', fontWeight: dueForFollowup ? 700 : 400 }}>
                            {days === 0 ? 'Today' : `${days}d ago`}
                            {dueForFollowup && ' · Follow-up due'}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="cell-muted" style={{ fontSize: 12.5 }}>Never</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-track" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${c.score}%`, background: c.score >= 80 ? '#B5402E' : c.score >= 60 ? '#C49A2B' : c.score >= 40 ? 'var(--color-accent)' : 'var(--color-ink-faint)' }} />
                        </div>
                        <span className="cell-muted">{c.score}</span>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: scoreTierColor(getScoreTier(c.score || 0)) }}>
                        {getScoreTier(c.score || 0).toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="cell-strong">{c.revenue ? formatUSD(c.revenue) : '—'}</td>
                  <td>{c.assigned_to}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link to={`/clients/${c.id}`} className="icon-btn" aria-label="View client">
                        <ArrowUpRight size={16} />
                      </Link>
                      <button className="icon-btn" aria-label="Edit client" onClick={() => openEdit(c)}>
                        <Edit2 size={16} />
                      </button>
                      {isAdminOrDirector && (
                        <button className="icon-btn" aria-label="Delete client" onClick={() => handleDelete(c.id, c.company)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <h4>No clients found</h4>
                      <p>Try adjusting your search or filters, or add a new lead.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditClient(null); setForm(EMPTY_FORM); }} title={editClient ? `Edit — ${editClient.company}` : 'Add New Lead'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Company Name *">
            <input className="select-input" required value={form.company} onChange={(e) => updateForm('company', e.target.value)} />
          </FormRow>
          <div className="grid grid-2">
            <FormRow label="Contact Person">
              <input className="select-input" value={form.contact} onChange={(e) => updateForm('contact', e.target.value)} />
            </FormRow>
            <FormRow label="Title">
              <input className="select-input" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Country">
              <input className="select-input" value={form.country} onChange={(e) => updateForm('country', e.target.value)} />
            </FormRow>
            <FormRow label="City">
              <input className="select-input" value={form.city} onChange={(e) => updateForm('city', e.target.value)} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Email">
              <input type="email" className="select-input" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
            </FormRow>
            <FormRow label="Phone / WhatsApp">
              <input className="select-input" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
            </FormRow>
          </div>
          <FormRow label="Source">
            <select className="select-input" value={form.source} onChange={(e) => updateForm('source', e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>
          <FormRow label="Products of Interest (comma-separated)">
            <input className="select-input" placeholder="e.g. 1121 Kainaat Basmati Rice, Wheat" value={form.products_interest} onChange={(e) => updateForm('products_interest', e.target.value)} />
          </FormRow>
          <div className="grid grid-2">
            <FormRow label="Estimated Volume">
              <input className="select-input" placeholder="e.g. 100 MT / month" value={form.est_volume} onChange={(e) => updateForm('est_volume', e.target.value)} />
            </FormRow>
            <FormRow label="Status">
              <select className="select-input" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Lead Score (0-100)">
              <input type="number" min="0" max="100" className="select-input" value={form.score} onChange={(e) => updateForm('score', e.target.value)} />
            </FormRow>
            <FormRow label="Assigned To">
              <input className="select-input" value={form.assigned_to} onChange={(e) => updateForm('assigned_to', e.target.value)} />
            </FormRow>
          </div>
          <FormRow label="Notes">
            <textarea className="select-input" rows={3} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} />
          </FormRow>

          {formError && (
            <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editClient ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import Clients from CSV">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="cell-muted" style={{ margin: 0, fontSize: 13 }}>
            Upload a CSV file with your contacts. Expected columns (any case, spaces become underscores):
            <br />
            <code style={{ fontSize: 11.5 }}>company, contact, title, country, city, email, phone, source, products_interest, est_volume, notes</code>
            <br />
            Only <strong>company</strong> or <strong>email</strong> is required per row — everything else is optional.
          </p>

          <FormRow label="CSV File">
            <input type="file" accept=".csv" className="select-input" onChange={handleFileSelected} />
          </FormRow>

          <FormRow label="Default Source (used for rows without a Source column)">
            <select className="select-input" value={importDefaultSource} onChange={(e) => setImportDefaultSource(e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>

          {parseError && (
            <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{parseError}</div>
          )}

          {importRows.length > 0 && (
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>
                Preview ({importRows.length} row{importRows.length === 1 ? '' : 's'} ready to import)
              </div>
              <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Country</th>
                      <th>Email</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        <td className="cell-strong">{row.company || '—'}</td>
                        <td>{row.contact || '—'}</td>
                        <td>{row.country || '—'}</td>
                        <td className="cell-muted">{row.email || '—'}</td>
                        <td className="cell-muted">{row.source || importDefaultSource}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 50 && (
                <p className="cell-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Showing first 50 of {importRows.length} rows — all will be imported.
                </p>
              )}
            </div>
          )}

          {importResult && (
            <div style={{ color: importResult.errorCount > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: 13 }}>
              {importResult.successCount > 0 && `Successfully imported ${importResult.successCount} client${importResult.successCount === 1 ? '' : 's'}. `}
              {importResult.errorCount > 0 && `${importResult.errorCount} failed: ${importResult.errors.join(', ')}`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setImportModalOpen(false)}>Close</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
              disabled={importing || importRows.length === 0}
            >
              {importing ? 'Importing...' : `Import ${importRows.length || ''} Client${importRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Clean Up Contacts Modal */}
      <Modal open={cleanupOpen} onClose={() => setCleanupOpen(false)} title={`Clean Up Contacts (${noEmailClients.length} with no email)`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="cell-muted" style={{ margin: 0, fontSize: 13 }}>
            These contacts have no email address — they can't receive outreach. Select all or individual ones, then choose to <strong>Delete</strong> them entirely or just <strong>Mark Uncontactable</strong> (keeps the record, flags it so it won't appear in Compose Email).
          </p>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setCleanupSelected(noEmailClients.map(c => c.id))}>
              <CheckSquare size={14} /> Select All
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setCleanupSelected([])}>
              <Square size={14} /> Deselect All
            </button>
            <span className="cell-muted" style={{ fontSize: 12 }}>{cleanupSelected.length} selected</span>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: 300, overflowY: 'auto' }}>
            {noEmailClients.map((c) => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cleanupSelected.includes(c.id)}
                  onChange={() => setCleanupSelected(prev =>
                    prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                  )}
                />
                <div style={{ flex: 1 }}>
                  <div className="cell-strong">{c.company}</div>
                  <div className="cell-muted">{c.country || '—'} · {c.phone || 'No phone either'}</div>
                </div>
                <Badge status={c.status} />
              </label>
            ))}
          </div>

          {cleanupResult && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-alt)', fontSize: 13 }}>
              {cleanupResult}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setCleanupOpen(false)}>Close</button>
            <button
              className="btn btn-secondary"
              disabled={cleanupSelected.length === 0 || cleanupWorking}
              onClick={async () => {
                setCleanupWorking(true);
                const result = await bulkClearEmails(cleanupSelected);
                setCleanupWorking(false);
                setCleanupResult(result.error ? `Error: ${result.error}` : `Marked ${result.count} contacts as uncontactable (email cleared).`);
                setCleanupSelected([]);
              }}
            >
              {cleanupWorking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertCircle size={14} />}
              Mark Uncontactable
            </button>
            <button
              className="btn btn-danger"
              disabled={cleanupSelected.length === 0 || cleanupWorking}
              onClick={async () => {
                if (!window.confirm(`Permanently delete ${cleanupSelected.length} contact(s)? This cannot be undone.`)) return;
                setCleanupWorking(true);
                const result = await bulkDeleteClients(cleanupSelected);
                setCleanupWorking(false);
                setCleanupResult(result.error ? `Error: ${result.error}` : `Deleted ${result.count} contacts permanently.`);
                setCleanupSelected([]);
              }}
            >
              {cleanupWorking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
              Delete Selected
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
