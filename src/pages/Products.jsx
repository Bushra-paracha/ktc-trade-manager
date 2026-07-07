import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Download,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { SearchInput, SelectInput } from '../components/Toolbar';
import Modal from '../components/Modal';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';
import ProductSummaryCards from '../components/products/ProductSummaryCards';
import ProductPortfolioBoard from '../components/products/ProductPortfolioBoard';
import RetailPackPlanner from '../components/products/RetailPackPlanner';

const CATEGORIES = ['Basmati', 'Non-Basmati', 'Salt', 'Sesame', 'Other'];

const CURRENT_FOB_PRICES = {
  '1121 Sella Rice': 1350,
  'IRRI-6 White Rice': 430,
  '100% Broken Rice': 335,
  'PK-386 Rice': 900,
  'Refined White Salt': 40,
  'Refined White Salt - Iodized': 46,
};

const EMPTY_FORM = {
  name: '',
  category: 'Basmati',
  hs_code: '',
  unit: 'USD/MT',
  stock_mt: '',
  base_cost: '',
  packaging_cost: '',
};

function inferCategory(product) {
  const text = `${product.name || ''} ${product.category || ''}`.toLowerCase();
  if (text.includes('salt') || text.includes('khewra') || text.includes('himalayan')) return 'Salt';
  if (text.includes('sesame')) return 'Sesame';
  if (text.includes('irri') || text.includes('broken') || text.includes('non')) return 'Non-Basmati';
  if (text.includes('1121') || text.includes('1509') || text.includes('386') || text.includes('basmati') || text.includes('sella')) return 'Basmati';
  return product.category || 'Other';
}

function lookupFobPrice(product) {
  const name = product.name || '';
  if (/1121.*sella/i.test(name)) return 1350;
  if (/irri-?6.*white/i.test(name)) return 430;
  if (/100%.*broken|broken rice/i.test(name)) return 335;
  if (/pk-?386/i.test(name)) return 900;
  if (/iod/i.test(name) && /salt/i.test(name)) return 46;
  if (/white salt|refined.*salt/i.test(name)) return 40;
  const match = Object.entries(CURRENT_FOB_PRICES).find(([key]) => name.toLowerCase().includes(key.toLowerCase()));
  return match?.[1] || null;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `$${Number(value).toLocaleString('en-US')}`;
}

export default function Products() {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const { isAdminOrDirector } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState('catalog');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const enrichedProducts = useMemo(() => {
    return products.map((product) => {
      const smartCategory = inferCategory(product);
      const fobPrice = lookupFobPrice(product);
      const baseCost = Number(product.base_cost) || 0;
      const margin = fobPrice && baseCost ? fobPrice - baseCost : null;
      return { ...product, smartCategory, fobPrice, margin };
    });
  }, [products]);

  const categories = [...new Set(enrichedProducts.map((p) => p.smartCategory).filter(Boolean))];

  const filtered = enrichedProducts.filter((p) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || `${p.name} ${p.category} ${p.hs_code}`.toLowerCase().includes(query);
    const matchesCategory = !category || p.smartCategory === category;
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
      category: p.category || p.smartCategory || 'Basmati',
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

  function exportCatalog() {
    const rows = filtered.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.smartCategory,
      hs_code: p.hs_code || '',
      stock_mt: p.stock_mt || 0,
      base_cost_usd_mt: p.base_cost || 0,
      packaging_cost_usd_mt: p.packaging_cost || 0,
      current_fob_usd_mt: p.fobPrice || '',
      estimated_margin_usd_mt: p.margin || '',
    }));
    const headers = Object.keys(rows[0] || { id: '', name: '', category: '' });
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ktc-product-catalog.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="elevated-header product-hero">
        <div>
          <span className="eyebrow">Product command center</span>
          <h1>Products & Retail Pack Planning</h1>
          <p>Manage export SKUs, FOB reference prices, mill stock, and Amazon-ready Himalayan Pink Salt packs from one place.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportCatalog} disabled={filtered.length === 0}>
            <Download /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus /> Add Product
          </button>
        </div>
      </div>

      <ProductSummaryCards products={enrichedProducts} />

      {error && (
        <div className="danger-alert card">
          <AlertCircle size={18} />
          <div>
            <strong>Couldn't load products</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="product-layout-grid">
        <div>
          <div className="product-tabs">
            <button className={viewMode === 'catalog' ? 'active' : ''} onClick={() => setViewMode('catalog')}>Catalog</button>
            <button className={viewMode === 'portfolio' ? 'active' : ''} onClick={() => setViewMode('portfolio')}>Portfolio</button>
            <button className={viewMode === 'retail' ? 'active' : ''} onClick={() => setViewMode('retail')}>Amazon Packs</button>
          </div>

          {viewMode === 'catalog' && (
            <>
              <div className="toolbar product-toolbar">
                <SearchInput value={search} onChange={setSearch} placeholder="Search products, HS code, category..." />
                <SelectInput value={category} onChange={setCategory} options={categories} label="All Categories" />
              </div>

              {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading products...</p>
                </div>
              ) : (
                <div className="product-card-grid">
                  {filtered.map((p) => (
                    <div className="catalog-product-card" key={p.id}>
                      <div className="catalog-card-top">
                        <div className="product-avatar"><Package size={18} /></div>
                        <div>
                          <h3>{p.name}</h3>
                          <p>{p.id} · {p.smartCategory}</p>
                        </div>
                        <div className="catalog-actions">
                          <button className="icon-btn" aria-label="Edit product" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                          {isAdminOrDirector && (
                            <button className="icon-btn" aria-label="Delete product" onClick={() => handleDelete(p.id, p.name)}><Trash2 size={15} /></button>
                          )}
                        </div>
                      </div>

                      <div className="product-facts-grid">
                        <Fact label="HS Code" value={p.hs_code || '—'} />
                        <Fact label="Stock" value={`${Number(p.stock_mt || 0).toLocaleString('en-US')} MT`} />
                        <Fact label="Base Cost" value={`${formatMoney(p.base_cost)} / MT`} />
                        <Fact label="Packaging" value={`${formatMoney(p.packaging_cost)} / MT`} />
                        <Fact label="FOB Reference" value={p.fobPrice ? `${formatMoney(p.fobPrice)} / MT` : 'Add quote'} />
                        <Fact label="Est. Spread" value={p.margin ? `${formatMoney(p.margin)} / MT` : '—'} tone={p.margin > 0 ? 'positive' : ''} />
                      </div>

                      <div className="stock-meter-row">
                        <span>Mill stock</span>
                        <strong>{Math.min(100, Math.round((Number(p.stock_mt || 0) / 9000) * 100))}% of monthly capacity</strong>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.min(100, (Number(p.stock_mt || 0) / 9000) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                      <Search size={28} />
                      <h4>No products found</h4>
                      <p>Try adjusting your search or filters, or add a new product.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {viewMode === 'portfolio' && <ProductPortfolioBoard />}
          {viewMode === 'retail' && <RetailPackPlanner />}
        </div>

        <aside className="product-side-panel">
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Current FOB Reference</h3>
                <div className="card-header-sub">Manual price board from KTC current pricing</div>
              </div>
            </div>
            <div className="price-board">
              {Object.entries(CURRENT_FOB_PRICES).map(([name, price]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>${price.toLocaleString('en-US')}/MT</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3>Next Product Actions</h3>
                <div className="card-header-sub">High-impact steps for this week</div>
              </div>
            </div>
            <div className="action-list compact">
              <div><ArrowUpRight size={15} /> Finalize Amazon salt pack labels</div>
              <div><ArrowUpRight size={15} /> Add sesame seed HS code and specs</div>
              <div><ArrowUpRight size={15} /> Attach COA and product photos</div>
              <div><ArrowUpRight size={15} /> Update FOB prices after market check</div>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="product-form">
          <FormRow label="Product Name *">
            <input className="select-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Himalayan Pink Salt 2 lb Retail Pack" />
          </FormRow>
          <div className="form-grid">
            <FormRow label="Category">
              <select className="select-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormRow>
            <FormRow label="HS Code">
              <input className="select-input" value={form.hs_code} onChange={(e) => setForm({ ...form, hs_code: e.target.value })} placeholder="e.g. 1006.30" />
            </FormRow>
          </div>
          <div className="form-grid">
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

          {formError && <div className="danger-text" style={{ fontSize: 13 }}>{formError}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Fact({ label, value, tone }) {
  return (
    <div className="product-fact">
      <span>{label}</span>
      <strong className={tone === 'positive' ? 'positive-text' : ''}>{value}</strong>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <label className="field-label">
      {label}
      {children}
    </label>
  );
}
