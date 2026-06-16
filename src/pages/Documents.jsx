import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Loader2, AlertCircle, X } from 'lucide-react';
import Badge from '../components/Badge';
import { SearchInput, SelectInput } from '../components/Toolbar';
import { supabase } from '../lib/supabaseClient';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const { getSignedUrl, removeDocument } = useDocumentUpload();

  async function fetchDocs() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('order_documents')
      .select('*, orders(id, clients(company))')
      .order('updated_at', { ascending: false });

    if (error) setError(error.message);
    else setDocs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDocs();
  }, []);

  const uploadedDocs = docs.filter((d) => d.file_path);
  const types = [...new Set(uploadedDocs.map((d) => d.document_type))];

  const filtered = uploadedDocs.filter((d) => {
    const company = d.orders?.clients?.company || '';
    const matchesSearch =
      (d.file_name || '').toLowerCase().includes(search.toLowerCase()) ||
      company.toLowerCase().includes(search.toLowerCase());
    const matchesType = !type || d.document_type === type;
    return matchesSearch && matchesType;
  });

  async function handleView(path) {
    const { url, error } = await getSignedUrl(path);
    if (error) {
      alert(`Couldn't open file: ${error}`);
      return;
    }
    window.open(url, '_blank');
  }

  async function handleRemove(docId, path) {
    if (!window.confirm('Remove this uploaded file? It will be cleared from the checklist too.')) return;
    await removeDocument(docId, path);
    fetchDocs();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Document Library</h1>
          <p>{uploadedDocs.length} uploaded documents across all orders</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load documents</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by file name or client..." />
        <SelectInput value={type} onChange={setType} options={types} label="All Types" />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading documents...</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Client</th>
                <th>Linked Order</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="timeline-icon" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        <FileText />
                      </div>
                      <span className="cell-strong">{d.file_name}</span>
                    </div>
                  </td>
                  <td>{d.document_type}</td>
                  <td>{d.orders?.clients?.company || '—'}</td>
                  <td>
                    <Link to={`/orders/${d.orders?.id}`} style={{ color: 'var(--color-primary)' }}>{d.orders?.id}</Link>
                  </td>
                  <td className="cell-muted">{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '—'}</td>
                  <td><Badge status={d.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" aria-label="Download" onClick={() => handleView(d.file_path)}>
                        <Download size={16} />
                      </button>
                      <button className="icon-btn" aria-label="Remove" onClick={() => handleRemove(d.id, d.file_path)}>
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <h4>No documents uploaded yet</h4>
                      <p>Upload files from an order's document checklist — they'll show up here.</p>
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
