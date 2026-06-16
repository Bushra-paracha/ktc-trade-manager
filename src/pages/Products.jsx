import { useState } from 'react';
import { Package, Loader2, AlertCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { SearchInput, SelectInput } from '../components/Toolbar';
import Modal from '../components/Modal';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = ['Basmati', 'Non-Basmati', 'Other'];

const EMPTY_FORM = {
  name: '',
  category: 'Basmati',
  hs_code: '',
  unit: 'USD/MT',
  stock_mt: '',
  base_cost: '',
  packaging_cost: '',
};

export default function Products() {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const { isAdminOrDirector } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || p.category === category;
    return matchesSearch && matchesCategory;
  });

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      category: p.category || 'Basmati',
      hs_code: p.hs_code || '',
      unit: p.unit || 'USD/MT',
      stock_mt: p.stock_mt ?? '',
      base_cost: p.base_cost ?? '',
      packaging_cost: p.packaging_cost ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      ...form,
      stock_mt: Number(form.stock_mt) || 0,
      base_cost: Number(form.base_cost) || 0,
      packaging_cost: Number(form.packaging_cost) || 0,
    };

    const { error } = editingId
      ? await updateProduct(editingId, payload)
      : await addProduct(payload);

    setSaving(false);

    if (error) {
      setFormError(error);
      return;
    }

    setModalOpen(false);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}" from the product catalog? Existing inquiries/orders referencing it will keep their data, but you won't be able to select it for new ones.`)) return;
    const { error } = await deleteProduct(id);
    if (error) alert(`Couldn't delete: ${error}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Product Catalog</h1>
          <p>{products.length} products · base costs used by the pricing engine in Inquiries</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus /> Add Product
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load products</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
        <SelectInput value={category} onChange={setCategory} options={categories} label="All Categories" />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading products...</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((p) => (
            <div className="card" key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="timeline-icon" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', width: 40, height: 40 }}>
                  <Package size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cell-strong">{p.name}</div>
                  <div className="cell-muted">{p.id} · {p.category}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn" aria-label="Edit product" onClick={() => openEdit(p)}>
                    <Pencil size={15} />
                  </button>
                  {isAdminOrDirector && (
                    <button className="icon-btn" aria-label="Delete product" onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailRow label="HS Code" value={p.hs_code || '—'} />
                <DetailRow label="Base Cost" value={`$${p.base_cost} / MT`} />
                <DetailRow label="Packaging Cost" value={`$${p.packaging_cost} / MT`} />
                <DetailRow label="Mill Stock Available" value={`${p.stock_mt} MT`} />
              </div>
              <div className="progress-track" style={{ marginTop: 10 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (p.stock_mt / 500) * 100)}%` }} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <h4>No products found</h4>
              <p>Try adjusting your search or filters, or add a new product.</p>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Product Name *">
            <input className="select-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1121 Kainaat Basmati Rice" />
          </FormRow>
          <div className="grid grid-2">
            <FormRow label="Category">
              <select className="select-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormRow>
            <FormRow label="HS Code">
              <input className="select-input" value={form.hs_code} onChange={(e) => setForm({ ...form, hs_code: e.target.value })} placeholder="e.g. 1006.30" />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Base Cost ($/MT)">
              <input type="number" min="0" step="0.01" className="select-input" value={form.base_cost} onChange={(e) => setForm({ ...form, base_cost: e.target.value })} />
            </FormRow>
            <FormRow label="Packaging Cost ($/MT)">
              <input type="number" min="0" step="0.01" className="select-input" value={form.packaging_cost} onChange={(e) => setForm({ ...form, packaging_cost: e.target.value })} />
            </FormRow>
          </div>
          <FormRow label="Mill Stock Available (MT)">
            <input type="number" min="0" className="select-input" value={form.stock_mt} onChange={(e) => setForm({ ...form, stock_mt: e.target.value })} />
          </FormRow>

          {formError && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{formError}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span className="cell-muted">{label}</span>
      <span className="cell-strong">{value}</span>
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
