import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader2, ChevronDown, ChevronUp, Shield, Clock, Package, CreditCard, Award, AlertTriangle, Box } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';

const CATEGORIES = [
  'Response SLAs',
  'Sample Policy',
  'Shipment Process',
  'Payment Policy',
  'Quality Policy',
  'Dispute Resolution',
];

const CATEGORY_ICONS = {
  'Response SLAs': Clock,
  'Sample Policy': Box,
  'Shipment Process': Package,
  'Payment Policy': CreditCard,
  'Quality Policy': Award,
  'Dispute Resolution': AlertTriangle,
};

const CATEGORY_COLORS = {
  'Response SLAs':     { bg: '#E6F0F7', text: '#1A4D6E', border: '#1A4D6E' },
  'Sample Policy':     { bg: '#F7EDE6', text: '#6E3A1A', border: '#6E3A1A' },
  'Shipment Process':  { bg: '#E6F7ED', text: '#1A6E3A', border: '#1A6E3A' },
  'Payment Policy':    { bg: '#FDF6E3', text: '#C49A2B', border: '#C49A2B' },
  'Quality Policy':    { bg: '#EDE6F7', text: '#3A1A6E', border: '#3A1A6E' },
  'Dispute Resolution':{ bg: '#F7E6E6', text: '#6E1A1A', border: '#6E1A1A' },
};

const EMPTY_FORM = { category: 'Response SLAs', title: '', description: '', sort_order: 0, is_active: true };

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('company_policies')
      .select('*')
      .order('category')
      .order('sort_order');
    setPolicies(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const cat of CATEGORIES) {
      groups[cat] = policies.filter(p => p.category === cat && p.is_active);
    }
    return groups;
  }, [policies]);

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openNew() {
    setEditPolicy(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(policy) {
    setEditPolicy(policy);
    setForm({
      category: policy.category,
      title: policy.title,
      description: policy.description,
      sort_order: policy.sort_order,
      is_active: policy.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editPolicy) {
      await supabase.from('company_policies').update(payload).eq('id', editPolicy.id);
      setPolicies(prev => prev.map(p => p.id === editPolicy.id ? { ...p, ...payload } : p));
    } else {
      const { data } = await supabase.from('company_policies').insert([payload]).select().single();
      if (data) setPolicies(prev => [...prev, data]);
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    await supabase.from('company_policies').delete().eq('id', id);
    setPolicies(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Policies & SLAs</h1>
          <p>KTC's operating standards, response times, and legal terms</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Policy
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {CATEGORIES.map(cat => {
            const items = grouped[cat] || [];
            const Icon = CATEGORY_ICONS[cat] || Shield;
            const colors = CATEGORY_COLORS[cat];
            if (items.length === 0) return null;

            return (
              <div key={cat} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Category header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
                  background: colors.bg, borderBottom: `2px solid ${colors.border}`,
                }}>
                  <Icon size={16} color={colors.text} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: 11, color: colors.text, opacity: 0.7, marginLeft: 4 }}>
                    {items.length} {items.length === 1 ? 'policy' : 'policies'}
                  </span>
                </div>

                {/* Policy items */}
                <div>
                  {items.map((policy, idx) => {
                    const isExpanded = expandedIds.has(policy.id);
                    return (
                      <div key={policy.id} style={{
                        borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : undefined,
                        padding: '12px 18px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="cell-strong" style={{ fontSize: 13.5 }}>{policy.title}</span>
                            </div>
                            {isExpanded && (
                              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-ink-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {policy.description}
                              </p>
                            )}
                            <button
                              onClick={() => toggleExpand(policy.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-ink-faint)' }}
                            >
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {isExpanded ? 'Hide' : 'Show details'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="icon-btn" onClick={() => openEdit(policy)} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button className="icon-btn" onClick={() => handleDelete(policy.id, policy.title)} title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editPolicy ? 'Edit Policy' : 'Add Policy'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Category
            <select className="select-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Title *
            <input className="select-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New Inquiry Reply" autoFocus />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Description *
            <textarea className="select-input" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Full policy details..." />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
            Sort Order
            <input type="number" className="select-input" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()}>
              {saving ? 'Saving...' : editPolicy ? 'Save Changes' : 'Add Policy'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
