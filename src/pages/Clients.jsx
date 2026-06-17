import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight, Trash2, Loader2, AlertCircle, Upload, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { formatUSD } from '../data/mockData';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { SearchInput, SelectInput } from '../components/Toolbar';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../hooks/useAuth';

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
  const { clients, loading, error, addClient, deleteClient, bulkAddClients } = useClients();
  const { isAdminOrDirector } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [segment, setSegment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

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

  const filtered = clients.filter((c) => {
    const matchesSearch =
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || c.status === status;
    const matchesCountry = !country || c.country === country;
    const matchesSegment = !segment || getSegment(c) === segment;
    return matchesSearch && matchesStatus && matchesCountry && matchesSegment;
  });

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      revenue: 0,
      orders: 0,
    };

    const { error } = await addClient(payload);
    setSaving(false);

    if (error) {
      setFormError(error);
      return;
    }

    setForm(EMPTY_FORM);
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
      </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-track" style={{ width: 50 }}>
                        <div className="progress-fill" style={{ width: `${c.score}%`, background: c.score > 70 ? 'var(--color-success)' : c.score > 50 ? 'var(--color-accent)' : 'var(--color-ink-faint)' }} />
                      </div>
                      <span className="cell-muted">{c.score}</span>
                    </div>
                  </td>
                  <td className="cell-strong">{c.revenue ? formatUSD(c.revenue) : '—'}</td>
                  <td>{c.assigned_to}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link to={`/clients/${c.id}`} className="icon-btn" aria-label="View client">
                        <ArrowUpRight size={16} />
                      </Link>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Lead">
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
              {saving ? 'Saving...' : 'Add Lead'}
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
