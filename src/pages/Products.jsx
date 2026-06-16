import { useState } from 'react';
import { Package, Loader2, AlertCircle } from 'lucide-react';
import { SearchInput, SelectInput } from '../components/Toolbar';
import { useProducts } from '../hooks/useProducts';

export default function Products() {
  const { products, loading, error } = useProducts();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Product Catalog</h1>
          <p>{products.length} products · base costs used by the pricing engine in Inquiries</p>
        </div>
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
                <div>
                  <div className="cell-strong">{p.name}</div>
                  <div className="cell-muted">{p.id} · {p.category}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailRow label="HS Code" value={p.hs_code} />
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
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}
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
