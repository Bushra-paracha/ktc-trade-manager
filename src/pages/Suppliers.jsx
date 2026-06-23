import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Trash2, Edit2, Search, Building2, Phone, Mail, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';

const SUPPLIER_TYPES = [
  'Shipping Line',
  'Freight Forwarder/Broker',
  'Packaging Supplier',
  'Inspection Agency',
  'Customs Agent',
  'Raw Material Supplier',
  'Other',
];

const TYPE_COLORS = {
  'Shipping Line':          { bg: '#E6F0F7', text: '#1A4D6E' },
  'Freight Forwarder/Broker': { bg: '#FDF6E3', text: '#C49A2B' },
  'Packaging Supplier':     { bg: '#E6F7ED', text: '#1A6E3A' },
  'Inspection Agency':      { bg: '#F7E6F0', text: '#6E1A4D' },
  'Customs Agent':          { bg: '#F7EDE6', text: '#6E3A1A' },
  'Raw Material Supplier':  { bg: '#EDE6F7', text: '#3A1A6E' },
  'Other':                  { bg: '#F0F0F0', text: '#555555' },
};

const EMPTY_FORM = {
  company: '', supplier_type: 'Shipping Line', contact_person: '',
  email: '', phone: '', country: '', city: '', website: '', notes: '', is_active: true,
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .order('supplier_type')
      .order('company');
    setSuppliers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = !search ||
        s.company.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.country || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || s.supplier_type === filterType;
      return matchSearch && matchType;
    });
  }, [suppliers, search, filterType]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const s of filtered) {
      if (!groups[s.supplier_type]) groups[s.supplier_type] = [];
      groups[s.supplier_type].push(s);
    }
    return groups;
  }, [filtered]);

  function openNew() {
    setEditSupplier(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(supplier) {
    setEditSupplier(supplier);
    setForm({
      company: supplier.company,
      supplier_type: supplier.supplier_type,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      country: supplier.country || '',
      city: supplier.city || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editSupplier) {
      await supabase.from('suppliers').update(payload).eq('id', editSupplier.id);
      setSuppliers(prev => prev.map(s => s.id === editSupplier.id ? { ...s, ...payload } : s));
    } else {
      const { data } = await supabase.from('suppliers').insert([payload]).select().single();
      if (data) setSuppliers(prev => [...prev, data]);
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id, company) {
    if (!window.confirm(`Delete ${company}? This cannot be undone.`)) return;
    await supabase.from('suppliers').delete().eq('id', id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }

  const counts = useMemo(() => {
    const result = {};
    for (const type of SUPPLIER_TYPES) {
      result[type] = suppliers.filter(s => s.supplier_type === type).length;
    }
    return result;
  }, [suppliers]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p>{suppliers.length} suppliers across {Object.keys(grouped).length} categories</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {/* Category summary cards */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {SUPPLIER_TYPES.slice(0, 4).map(type => (
          <div
            key={type}
            className="stat-card"
            style={{ cursor: 'pointer', border: filterType === type ? '2px solid var(--color-accent)' : undefined }}
            onClick={() => setFilterType(filterType === type ? '' : type)}
          >
            <div className="stat-card-label">{type}</div>
            <div className="stat-card-value">{counts[type] || 0}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {SUPPLIER_TYPES.slice(4).map(type => (
          <div
            key={type}
            className="stat-card"
            style={{ cursor: 'pointer', border: filterType === type ? '2px solid var(--color-accent)' : undefined }}
            onClick={() => setFilterType(filterType === type ? '' : type)}
          >
            <div className="stat-card-label">{type}</div>
            <div className="stat-card-value">{counts[type] || 0}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-faint)' }} />
          <input
            className="select-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select-input" style={{ maxWidth: 220 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {filterType && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFilterType('')}>Clear filter</button>
        )}
      </div>

      {/* Supplier list grouped by type */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Building2 size={32} color="var(--color-ink-faint)" />
          <h4 style={{ marginTop: 12 }}>No suppliers yet</h4>
          <p className="cell-muted">Click "Add Supplier" to add your first supplier.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                  background: TYPE_COLORS[type]?.bg, color: TYPE_COLORS[type]?.text,
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>
                  {type}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>{items.length}</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Country</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(s => {
                      const isExpanded = expandedId === s.id;
                      return (
                        <>
                          <tr key={s.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {s.notes && (
                                  <button className="icon-btn" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                )}
                                <span className="cell-strong">{s.company}</span>
                              </div>
                              {s.city && <div className="cell-muted" style={{ fontSize: 11 }}>{s.city}</div>}
                            </td>
                            <td>{s.contact_person || '—'}</td>
                            <td>
                              {s.email ? (
                                <a href={`mailto:${s.email}`} style={{ color: 'var(--color-accent)', fontSize: 13 }}>{s.email}</a>
                              ) : '—'}
                            </td>
                            <td className="cell-muted">{s.phone || '—'}</td>
                            <td className="cell-muted">{s.country || '—'}</td>
                            <td>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                background: s.is_active ? '#E6F7ED' : '#F0F0F0',
                                color: s.is_active ? '#1A6E3A' : '#888',
                              }}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {s.website && (
                                  <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                                    target="_blank" rel="noopener noreferrer" className="icon-btn" title="Visit website">
                                    <Globe size={14} />
                                  </a>
                                )}
                                <button className="icon-btn" onClick={() => openEdit(s)} title="Edit">
                                  <Edit2 size={14} />
                                </button>
                                <button className="icon-btn" onClick={() => handleDelete(s.id, s.company)} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && s.notes && (
                            <tr key={`${s.id}-notes`}>
                              <td colSpan={7} style={{ background: 'var(--color-surface-alt)', padding: '10px 20px', fontSize: 13, color: 'var(--color-ink-soft)' }}>
                                {s.notes}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editSupplier ? 'Edit Supplier' : 'Add Supplier'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormRow label="Company Name *">
              <input className="select-input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Maersk Line" autoFocus />
            </FormRow>
            <FormRow label="Supplier Type *">
              <select className="select-input" value={form.supplier_type} onChange={e => setForm(f => ({ ...f, supplier_type: e.target.value }))}>
                {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Contact Person">
              <input className="select-input" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Name" />
            </FormRow>
            <FormRow label="Email">
              <input className="select-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" />
            </FormRow>
            <FormRow label="Phone">
              <input className="select-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
            </FormRow>
            <FormRow label="Website">
              <input className="select-input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.company.com" />
            </FormRow>
            <FormRow label="Country">
              <input className="select-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Pakistan" />
            </FormRow>
            <FormRow label="City">
              <input className="select-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Karachi" />
            </FormRow>
          </div>
          <FormRow label="Notes">
            <textarea className="select-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Rates, preferred routes, reliability notes..." />
          </FormRow>
          <FormRow label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active supplier
            </label>
          </FormRow>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.company.trim()}>
              {saving ? 'Saving...' : editSupplier ? 'Save Changes' : 'Add Supplier'}
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
