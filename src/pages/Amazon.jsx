import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatUSD } from '../data/mockData';
import { useAmazonListings } from '../hooks/useAmazon';
import AmazonLaunchChecklist from '../components/products/AmazonLaunchChecklist';

const EMPTY_LISTING = {
  asin: '',
  sku: '',
  title: '',
  status: 'Active',
  price: '',
  stock: '',
  fulfillment_type: 'FBA',
  rating: '',
  review_count: '',
};

const EMPTY_SALES = {
  period_start: '',
  period_end: '',
  units_sold: '',
  revenue: '',
  ad_spend: '',
};

const STARTER_PACKS = [
  {
    sku: 'KTC-PINK-SALT-1LB',
    title: 'KTC Himalayan Pink Salt - Fine Grain - 1 lb',
    price: 8.99,
    market: 'USA / UK',
    keywords: 'Himalayan pink salt, fine grain salt, Khewra salt, natural seasoning',
  },
  {
    sku: 'KTC-PINK-SALT-2LB',
    title: 'KTC Himalayan Pink Salt - Fine Grain - 2 lb Family Pack',
    price: 14.99,
    market: 'USA / UK',
    keywords: 'bulk pink salt, cooking salt, refill pack, Pakistani Himalayan salt',
  },
  {
    sku: 'KTC-PINK-SALT-5LB',
    title: 'KTC Himalayan Pink Salt - 5 lb Bulk Kitchen Pack',
    price: 24.99,
    market: 'USA / UK',
    keywords: 'restaurant pink salt, bulk Himalayan salt, 5 lb salt bag',
  },
];

function copyText(text) {
  navigator.clipboard?.writeText(text);
}

export default function Amazon() {
  const { listings, loading, error, addListing, deleteListing, logSales } = useAmazonListings();

  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingForm, setListingForm] = useState(EMPTY_LISTING);
  const [savingListing, setSavingListing] = useState(false);

  const [salesModalOpen, setSalesModalOpen] = useState(null);
  const [salesForm, setSalesForm] = useState(EMPTY_SALES);
  const [savingSales, setSavingSales] = useState(false);

  const enriched = useMemo(() => {
    return listings.map((l) => {
      const sales = (l.amazon_sales || []).sort((a, b) => new Date(b.period_end) - new Date(a.period_end));
      const latest = sales[0];
      return {
        ...l,
        latestUnits: latest?.units_sold || 0,
        latestRevenue: latest?.revenue || 0,
        latestAdSpend: latest?.ad_spend || 0,
        acos: latest?.revenue > 0 ? (Number(latest?.ad_spend || 0) / Number(latest.revenue)) * 100 : null,
      };
    });
  }, [listings]);

  const totalUnits = enriched.reduce((sum, l) => sum + l.latestUnits, 0);
  const totalRevenue = enriched.reduce((sum, l) => sum + Number(l.latestRevenue), 0);
  const totalAdSpend = enriched.reduce((sum, l) => sum + Number(l.latestAdSpend), 0);
  const ratedListings = enriched.filter((l) => l.rating > 0);
  const avgRating = ratedListings.length
    ? (ratedListings.reduce((sum, l) => sum + Number(l.rating), 0) / ratedListings.length).toFixed(1)
    : '—';
  const lowStock = enriched.filter((l) => l.stock > 0 && l.stock < 20).length;
  const blendedAcos = totalRevenue > 0 ? ((totalAdSpend / totalRevenue) * 100).toFixed(1) : '—';

  function openNewListing(prefill = {}) {
    setListingForm({ ...EMPTY_LISTING, ...prefill });
    setListingModalOpen(true);
  }

  async function handleListingSubmit(e) {
    e.preventDefault();
    setSavingListing(true);
    const payload = {
      ...listingForm,
      price: Number(listingForm.price) || 0,
      stock: Number(listingForm.stock) || 0,
      rating: Number(listingForm.rating) || 0,
      review_count: Number(listingForm.review_count) || 0,
    };
    const { error } = await addListing(payload);
    setSavingListing(false);
    if (error) {
      alert(`Couldn't save listing: ${error}`);
      return;
    }
    setListingModalOpen(false);
  }

  async function handleDeleteListing(id, title) {
    if (!window.confirm(`Delete listing "${title}"? This can't be undone.`)) return;
    const { error } = await deleteListing(id);
    if (error) alert(`Couldn't delete listing: ${error}`);
  }

  async function handleSalesSubmit(e) {
    e.preventDefault();
    setSavingSales(true);
    const payload = {
      period_start: salesForm.period_start,
      period_end: salesForm.period_end,
      units_sold: Number(salesForm.units_sold) || 0,
      revenue: Number(salesForm.revenue) || 0,
      ad_spend: Number(salesForm.ad_spend) || 0,
    };
    const { error } = await logSales(salesModalOpen, payload);
    setSavingSales(false);
    if (error) {
      alert(`Couldn't log sales: ${error}`);
      return;
    }
    setSalesForm(EMPTY_SALES);
    setSalesModalOpen(null);
  }

  return (
    <div>
      <div className="elevated-header amazon-hero">
        <div>
          <span className="eyebrow">Retail channel</span>
          <h1>Amazon Salt Launch Center</h1>
          <p>Plan KTC Himalayan Pink Salt retail packs, monitor Seller Central numbers, and keep launch tasks in one place.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => window.open('https://sellercentral.amazon.com', '_blank', 'noopener,noreferrer')}>
            <ExternalLink /> Seller Central
          </button>
          <button className="btn btn-primary" onClick={() => openNewListing()}>
            <Plus /> Add Listing
          </button>
        </div>
      </div>

      {error && (
        <div className="danger-alert card">
          <AlertCircle size={18} />
          <div>
            <strong>Couldn't load Amazon listings</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={TrendingUp} label="Revenue" value={formatUSD(Math.round(totalRevenue))} delta={totalRevenue > 0 ? 'Latest sales snapshot' : 'No sales logged yet'} deltaDirection="up" accent="#1A4D2E" />
        <StatCard icon={Package} label="Units Sold" value={totalUnits} delta={`Across ${listings.length} listings`} deltaDirection="up" accent="#2C6E8F" />
        <StatCard icon={BarChart3} label="Blended ACOS" value={blendedAcos === '—' ? '—' : `${blendedAcos}%`} delta="From logged PPC spend" deltaDirection="up" accent="#C49A2B" />
        <StatCard icon={ShoppingCart} label="Low Stock" value={lowStock} delta={lowStock > 0 ? 'Reorder recommended' : 'All good'} deltaDirection={lowStock > 0 ? 'down' : 'up'} accent="#B5402E" />
      </div>

      <div className="amazon-layout-grid">
        <div>
          <div className="card starter-packs-card">
            <div className="card-header">
              <div>
                <h3>Starter Salt Pack SKUs</h3>
                <div className="card-header-sub">Use these to create draft listings before FBA shipment planning</div>
              </div>
            </div>
            <div className="starter-pack-grid">
              {STARTER_PACKS.map((pack) => (
                <div className="starter-pack" key={pack.sku}>
                  <div>
                    <strong>{pack.title}</strong>
                    <p>{pack.sku} · {pack.market}</p>
                  </div>
                  <div className="starter-price">${pack.price}</div>
                  <div className="keyword-line">{pack.keywords}</div>
                  <div className="starter-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => copyText(`${pack.title}\nSKU: ${pack.sku}\nKeywords: ${pack.keywords}`)}><Copy /> Copy</button>
                    <button className="btn btn-primary btn-sm" onClick={() => openNewListing({ title: pack.title, sku: pack.sku, price: pack.price, fulfillment_type: 'FBA' })}><Plus /> Add</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, marginTop: 20 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading listings...</p>
            </div>
          ) : (
            <div className="amazon-listings-grid">
              {enriched.map((listing) => (
                <div className="amazon-listing-card" key={listing.id}>
                  <div className="amazon-listing-head">
                    <div>
                      <h3>{listing.title}</h3>
                      <p>{listing.asin || 'ASIN pending'} · {listing.sku || 'SKU pending'}</p>
                    </div>
                    <Badge status={listing.status} />
                  </div>

                  <div className="listing-metrics">
                    <Metric label="Price" value={`$${Number(listing.price || 0).toFixed(2)}`} />
                    <Metric label="Stock" value={listing.stock ?? 0} tone={listing.stock < 20 ? 'warning' : ''} />
                    <Metric label="Units" value={listing.latestUnits || '—'} />
                    <Metric label="Revenue" value={listing.latestRevenue ? formatUSD(listing.latestRevenue) : '—'} />
                    <Metric label="ACOS" value={listing.acos ? `${listing.acos.toFixed(1)}%` : '—'} />
                    <Metric label="Rating" value={listing.rating > 0 ? `${listing.rating} ★` : '—'} />
                  </div>

                  <div className="listing-footer">
                    <span><Star size={14} /> {listing.review_count || 0} reviews · {listing.fulfillment_type}</span>
                    <div>
                      <button className="icon-btn" aria-label="Log sales" title="Log sales period" onClick={() => { setSalesForm(EMPTY_SALES); setSalesModalOpen(listing.id); }}><BarChart3 size={16} /></button>
                      <button className="icon-btn" aria-label="Delete listing" onClick={() => handleDeleteListing(listing.id, listing.title)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {enriched.length === 0 && (
                <div className="empty-state">
                  <ShoppingCart size={30} />
                  <h4>No Amazon listings yet</h4>
                  <p>Add your first 1 lb, 2 lb or 5 lb Himalayan Pink Salt listing to start tracking the retail channel.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="amazon-side-panel">
          <AmazonLaunchChecklist />
          <div className="card retail-copy-card">
            <div className="card-header">
              <div>
                <h3>Listing Copy Template</h3>
                <div className="card-header-sub">Reusable wording for draft Amazon content</div>
              </div>
            </div>
            <div className="copy-template-box">
              <strong>Premium Himalayan Pink Salt from Pakistan</strong>
              <p>Natural mineral salt sourced from the Khewra region, packed by Kassam Trading Company for everyday cooking, seasoning and pantry use.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => copyText('Premium Himalayan Pink Salt from Pakistan. Natural mineral salt sourced from the Khewra region, packed by Kassam Trading Company for everyday cooking, seasoning and pantry use.')}><Copy /> Copy description</button>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={listingModalOpen} onClose={() => setListingModalOpen(false)} title="Add Amazon Listing">
        <form onSubmit={handleListingSubmit} className="product-form">
          <FormRow label="Product Title *">
            <input className="select-input" required value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} placeholder="e.g. KTC Himalayan Pink Salt - 2 lb" />
          </FormRow>
          <div className="form-grid">
            <FormRow label="ASIN">
              <input className="select-input" value={listingForm.asin} onChange={(e) => setListingForm({ ...listingForm, asin: e.target.value })} placeholder="e.g. B0XXXXXXXX" />
            </FormRow>
            <FormRow label="SKU">
              <input className="select-input" value={listingForm.sku} onChange={(e) => setListingForm({ ...listingForm, sku: e.target.value })} />
            </FormRow>
          </div>
          <div className="form-grid">
            <FormRow label="Price (USD)">
              <input type="number" min="0" step="0.01" className="select-input" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} />
            </FormRow>
            <FormRow label="Stock">
              <input type="number" min="0" className="select-input" value={listingForm.stock} onChange={(e) => setListingForm({ ...listingForm, stock: e.target.value })} />
            </FormRow>
          </div>
          <div className="form-grid">
            <FormRow label="Status">
              <select className="select-input" value={listingForm.status} onChange={(e) => setListingForm({ ...listingForm, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Draft">Draft</option>
              </select>
            </FormRow>
            <FormRow label="Fulfillment">
              <select className="select-input" value={listingForm.fulfillment_type} onChange={(e) => setListingForm({ ...listingForm, fulfillment_type: e.target.value })}>
                <option value="FBA">FBA (Fulfilled by Amazon)</option>
                <option value="FBM">FBM (Fulfilled by Merchant)</option>
              </select>
            </FormRow>
          </div>
          <div className="form-grid">
            <FormRow label="Rating (0-5)">
              <input type="number" min="0" max="5" step="0.1" className="select-input" value={listingForm.rating} onChange={(e) => setListingForm({ ...listingForm, rating: e.target.value })} />
            </FormRow>
            <FormRow label="Review Count">
              <input type="number" min="0" className="select-input" value={listingForm.review_count} onChange={(e) => setListingForm({ ...listingForm, review_count: e.target.value })} />
            </FormRow>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setListingModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingListing}>{savingListing ? 'Saving...' : 'Add Listing'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!salesModalOpen} onClose={() => setSalesModalOpen(null)} title="Log Sales Period">
        <form onSubmit={handleSalesSubmit} className="product-form">
          <p className="cell-muted" style={{ marginTop: -4 }}>Enter numbers from Seller Central Business Reports for a date range.</p>
          <div className="form-grid">
            <FormRow label="Period Start">
              <input type="date" required className="select-input" value={salesForm.period_start} onChange={(e) => setSalesForm({ ...salesForm, period_start: e.target.value })} />
            </FormRow>
            <FormRow label="Period End">
              <input type="date" required className="select-input" value={salesForm.period_end} onChange={(e) => setSalesForm({ ...salesForm, period_end: e.target.value })} />
            </FormRow>
          </div>
          <FormRow label="Units Sold">
            <input type="number" min="0" className="select-input" value={salesForm.units_sold} onChange={(e) => setSalesForm({ ...salesForm, units_sold: e.target.value })} />
          </FormRow>
          <div className="form-grid">
            <FormRow label="Revenue (USD)">
              <input type="number" min="0" step="0.01" className="select-input" value={salesForm.revenue} onChange={(e) => setSalesForm({ ...salesForm, revenue: e.target.value })} />
            </FormRow>
            <FormRow label="Ad Spend / PPC (USD)">
              <input type="number" min="0" step="0.01" className="select-input" value={salesForm.ad_spend} onChange={(e) => setSalesForm({ ...salesForm, ad_spend: e.target.value })} />
            </FormRow>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSalesModalOpen(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingSales}>{savingSales ? 'Saving...' : 'Log Sales'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`listing-metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
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
