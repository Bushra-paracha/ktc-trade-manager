import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Trash2, Edit2, Search, Globe, Phone, Mail, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';

const COMMODITIES = ['Rice', 'Salt', 'Sugar', 'Pulses', 'Wheat', 'Spices', 'Oil', 'Other'];
const PAYMENT_OPTIONS = ['LC at sight', 'TT 30/70', 'TT 100% advance', 'Open Account', 'CAD'];
const STATUSES = ['Active', 'Prospect', 'Inactive'];

const STATUS_COLORS = {
  Active:   { bg: '#E6F7ED', text: '#1A6E3A' },
  Prospect: { bg: '#FDF6E3', text: '#C49A2B' },
  Inactive: { bg: '#F0F0F0', text: '#888888' },
};

const EMPTY_FORM = {
  company: '', contact_person: '', designation: '', email: '', phone: '', whatsapp: '',
  country: '', city: '', hub_ports: [], destination_markets: [], commodities: [],
  monthly_volume_containers: '', preferred_payment: 'LC at sight',
  certifications_required: [], notes: '', status: 'Prospect',
};

function TagInput({ label, value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  }
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
      {label}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', minHeight: 38 }}>
        {value.map(v => (
          <span key={v} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {v}
            <button onClick={() => onChange(value.filter(x => x !== v))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-ink-faint)', padding: 0 }}>×</button>
          </span>
        ))}
        <input
          style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', minWidth: 80, flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--color-ink-faint)' }}>Press Enter or comma to add</span>
    </label>
  );
}

export default function ReexportTraders() {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrader, setEditTrader] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchTraders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reexport_traders')
      .select('*')
      .order('status')
      .order('company');
    setTraders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTraders(); }, [fetchTraders]);

  const filtered = useMemo(() => traders.filter(t => {
    const matchSearch = !search ||
      t.company.toLowerCase().includes(search.toLowerCase()) ||
      (t.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.country || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchStatus;
  }), [traders, search, filterStatus]);

  function openNew() {
    setEditTrader(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditTrader(t);
    setForm({
      company: t.company, contact_person: t.contact_person || '',
      designation: t.designation || '', email: t.email || '',
      phone: t.phone || '', whatsapp: t.whatsapp || '',
      country: t.country || '', city: t.city || '',
      hub_ports: t.hub_ports || [], destination_markets: t.destination_markets || [],
      commodities: t.commodities || [], monthly_volume_containers: t.monthly_volume_containers || '',
      preferred_payment: t.preferred_payment || 'LC at sight',
      certifications_required: t.certifications_required || [],
      notes: t.notes || '', status: t.status || 'Prospect',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = { ...form, monthly_volume_containers: form.monthly_volume_containers ? Number(form.monthly_volume_containers) : null, updated_at: new Date().toISOString() };
    if (editTrader) {
      await supabase.from('reexport_traders').update(payload).eq('id', editTrader.id);
      setTraders(prev => prev.map(t => t.id === editTrader.id ? { ...t, ...payload } : t));
    } else {
      const { data } = await supabase.from('reexport_traders').insert([payload]).select().single();
      if (data) setTraders(prev => [...prev, data]);
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id, company) {
    if (!window.confirm(`Delete ${company}?`)) return;
    await supabase.from('reexport_traders').delete().eq('id', id);
    setTraders(prev => prev.filter(t => t.id !== id));
  }

  const counts = useMemo(() => ({
    total: traders.length,
    active: traders.filter(t => t.status === 'Active').length,
    prospect: traders.filter(t => t.status === 'Prospect').length,
    totalVolume: traders.reduce((sum, t) => sum + (t.monthly_volume_containers || 0), 0),
  }), [traders]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Re-export Traders</h1>
          <p>{counts.total} traders · {counts.active} active · {counts.totalVolume} containers/month potential</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Trader
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Traders</div>
          <div className="stat-card-value">{counts.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Active</div>
          <div className="stat-card-value" style={{ color: '#1A6E3A' }}>{counts.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Prospects</div>
          <div className="stat-card-value" style={{ color: '#C49A2B' }}>{counts.prospect}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Monthly Volume</div>
          <div className="stat-card-value">{counts.totalVolume} <span style={{ fontSize: 13, fontWeight: 400 }}>containers</span></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-faint)' }} />
          <input className="select-input" style={{ paddingLeft: 32 }} placeholder="Search traders..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-input" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Traders list */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Globe size={32} color="var(--color-ink-faint)" />
          <h4 style={{ marginTop: 12 }}>No re-export traders yet</h4>
          <p className="cell-muted">Add your first re-export trading company to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openNew}>
            <Plus size={14} /> Add Trader
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Procurement Contact</th>
                <th>Trade Route</th>
                <th>Commodities</th>
                <th>Vol/mo</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const isExpanded = expandedId === t.id;
                return (
                  <>
                    <tr key={t.id}>
                      <td>
                        <div className="cell-strong">{t.company}</div>
                        {t.city && t.country && <div className="cell-muted" style={{ fontSize: 11 }}>{t.city}, {t.country}</div>}
                      </td>
                      <td>
                        <div>{t.contact_person || '—'}</div>
                        {t.designation && <div className="cell-muted" style={{ fontSize: 11 }}>{t.designation}</div>}
                        {t.email && <a href={`mailto:${t.email}`} style={{ fontSize: 11, color: 'var(--color-accent)', display: 'block' }}>{t.email}</a>}
                        {t.whatsapp && <div className="cell-muted" style={{ fontSize: 11 }}>WA: {t.whatsapp}</div>}
                      </td>
                      <td>
                        {t.hub_ports?.length > 0 && t.destination_markets?.length > 0 ? (
                          <div style={{ fontSize: 12 }}>
                            <span style={{ fontWeight: 600 }}>{t.hub_ports.join(', ')}</span>
                            <ArrowRight size={11} style={{ margin: '0 4px', verticalAlign: 'middle' }} />
                            <span className="cell-muted">{t.destination_markets.join(', ')}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(t.commodities || []).map(c => (
                            <span key={c} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--color-surface-alt)', color: 'var(--color-ink-soft)', fontWeight: 600 }}>{c}</span>
                          ))}
                          {(!t.commodities || t.commodities.length === 0) && '—'}
                        </div>
                      </td>
                      <td className="cell-muted">{t.monthly_volume_containers ? `${t.monthly_volume_containers} x 20ft` : '—'}</td>
                      <td className="cell-muted" style={{ fontSize: 12 }}>{t.preferred_payment || '—'}</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                          background: STATUS_COLORS[t.status]?.bg,
                          color: STATUS_COLORS[t.status]?.text,
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {t.notes && (
                            <button className="icon-btn" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}
                          <button className="icon-btn" onClick={() => openEdit(t)}><Edit2 size={13} /></button>
                          <button className="icon-btn" onClick={() => handleDelete(t.id, t.company)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && t.notes && (
                      <tr key={`${t.id}-notes`}>
                        <td colSpan={8} style={{ background: 'var(--color-surface-alt)', padding: '10px 20px', fontSize: 13, color: 'var(--color-ink-soft)' }}>
                          {t.notes}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTrader ? 'Edit Re-export Trader' : 'Add Re-export Trader'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Company Name *', 'company', 'e.g. Gulf Trading FZCO'],
              ['Contact Person', 'contact_person', 'Procurement Manager name'],
              ['Designation', 'designation', 'e.g. Procurement Director'],
              ['Email', 'email', 'procurement@company.com'],
              ['Phone', 'phone', '+971 50 000 0000'],
              ['WhatsApp', 'whatsapp', '+971 50 000 0000'],
              ['Country', 'country', 'e.g. UAE'],
              ['City', 'city', 'e.g. Dubai'],
            ].map(([label, field, placeholder]) => (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
                {label}
                <input className="select-input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} />
              </label>
            ))}
          </div>

          <TagInput label="Hub Ports (re-export origin)" value={form.hub_ports} onChange={v => setForm(f => ({ ...f, hub_ports: v }))} placeholder="e.g. Jebel Ali..." />
          <TagInput label="Destination Markets" value={form.destination_markets} onChange={v => setForm(f => ({ ...f, destination_markets: v }))} placeholder="e.g. West Africa..." />
          <TagInput label="Certifications Required" value={form.certifications_required} onChange={v => setForm(f => ({ ...f, certifications_required: v }))} placeholder="e.g. Halal, Kosher..." />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Commodities Traded
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COMMODITIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    commodities: f.commodities.includes(c) ? f.commodities.filter(x => x !== c) : [...f.commodities, c]
                  }))}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 10, cursor: 'pointer',
                    background: form.commodities.includes(c) ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                    color: form.commodities.includes(c) ? 'white' : 'var(--color-ink-soft)',
                    border: 'none', fontWeight: 600,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
              Monthly Volume (containers)
              <input type="number" className="select-input" value={form.monthly_volume_containers} onChange={e => setForm(f => ({ ...f, monthly_volume_containers: e.target.value }))} placeholder="e.g. 10" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
              Preferred Payment
              <select className="select-input" value={form.preferred_payment} onChange={e => setForm(f => ({ ...f, preferred_payment: e.target.value }))}>
                {PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
              Status
              <select className="select-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Notes
            <textarea className="select-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Trade volumes, reliability, special requirements..." />
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.company.trim()}>
              {saving ? 'Saving...' : editTrader ? 'Save Changes' : 'Add Trader'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
