import { useState, useMemo } from 'react';
import { ShoppingCart, Star, TrendingUp, Package, Plus, Trash2, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatUSD } from '../data/mockData';
import { useAmazonListings } from '../hooks/useAmazon';

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

export default function Amazon() {
  const { listings, loading, error, addListing, updateListing, deleteListing, logSales } = useAmazonListings();

  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingForm, setListingForm] = useState(EMPTY_LISTING);
  const [savingListing, setSavingListing] = useState(false);

  const [salesModalOpen, setSalesModalOpen] = useState(null); // holds listing id
  const [salesForm, setSalesForm] = useState(EMPTY_SALES);
  const [savingSales, setSavingSales] = useState(false);

  // Aggregate latest 30-day-ish stats per listing (most recent sales row), plus totals
  const enriched = useMemo(() => {
    return listings.map((l) => {
      const sales = (l.amazon_sales || []).sort((a, b) => new Date(b.period_end) - new Date(a.period_end));
      const latest = sales[0];
      return {
        ...l,
        latestUnits: latest?.units_sold || 0,
        latestRevenue: latest?.revenue || 0,
        latestAdSpend: latest?.ad_spend || 0,
      };
    });
  }, [listings]);

  const totalUnits = enriched.reduce((sum, l) => sum + l.latestUnits, 0);
  const totalRevenue = enriched.reduce((sum, l) => sum + Number(l.latestRevenue), 0);
  const ratedListings = enriched.filter((l) => l.rating > 0);
  const avgRating = ratedListings.length
    ? (ratedListings.reduce((sum, l) => sum + Number(l.rating), 0) / ratedListings.length).toFixed(1)
    : '—';
  const totalReviews = enriched.reduce((sum, l) => sum + (l.review_count || 0), 0);
  const lowStock = enriched.filter((l) => l.stock > 0 && l.stock < 20).length;

  function openNewListing() {
    setListingForm(EMPTY_LISTING);
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
    await deleteListing(id);
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
      <div className="page-header">
        <div>
          <h1>Amazon Marketplace</h1>
          <p>{listings.length} listings · manual entry now, SP-API sync planned</p>
        </div>
        <button className="btn btn-primary" onClick={openNewListing}>
          <Plus /> Add Listing
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Couldn't load Amazon listings</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={TrendingUp} label="Revenue (Latest Period)" value={formatUSD(Math.round(totalRevenue))} delta={totalRevenue > 0 ? 'From logged sales' : 'No sales logged yet'} deltaDirection="up" accent="#1A4D2E" />
        <StatCard icon={Package} label="Units Sold (Latest Period)" value={totalUnits} delta={`Across ${listings.length} listings`} deltaDirection="up" accent="#2C6E8F" />
        <StatCard icon={Star} label="Avg. Rating" value={avgRating} delta={`${totalReviews} total reviews`} deltaDirection="up" accent="#C49A2B" />
        <StatCard icon={ShoppingCart} label="Low Stock Alerts" value={lowStock} delta={lowStock > 0 ? 'Reorder recommended' : 'All good'} deltaDirection={lowStock > 0 ? 'down' : 'up'} accent="#B5402E" />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: 'var(--color-ink-soft)' }}>Loading listings...</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>ASIN / SKU</th>
                <th>Status</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Units (latest)</th>
                <th>Revenue (latest)</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((l) => (
                <tr key={l.id}>
                  <td className="cell-strong">{l.title}</td>
                  <td className="cell-muted">{l.asin}{l.sku ? ` / ${l.sku}` : ''}</td>
                  <td><Badge status={l.status} /></td>
                  <td>${Number(l.price).toFixed(2)}</td>
                  <td>
                    <span style={{ color: l.stock < 20 && l.stock > 0 ? 'var(--color-warning)' : l.stock === 0 ? 'var(--color-danger)' : 'inherit', fontWeight: l.stock < 20 ? 700 : 400 }}>
                      {l.stock}
                    </span>
                  </td>
                  <td>{l.latestUnits || '—'}</td>
                  <td>{l.latestRevenue ? formatUSD(l.latestRevenue) : '—'}</td>
                  <td>
                    {l.rating > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={13} fill="var(--color-accent)" color="var(--color-accent)" /> {l.rating}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" aria-label="Log sales" title="Log sales period" onClick={() => { setSalesForm(EMPTY_SALES); setSalesModalOpen(l.id); }}>
                        <BarChart3 size={16} />
                      </button>
                      <button className="icon-btn" aria-label="Delete listing" onClick={() => handleDeleteListing(l.id, l.title)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {enriched.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state"><h4>No listings yet</h4><p>Add your Amazon products to start tracking sales here.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3>Export vs. Amazon Revenue</h3>
            <div className="card-header-sub">Channel contribution comparison</div>
          </div>
        </div>
        <div className="empty-state">
          <p>This comparison will populate once both Orders and Amazon sales data are being tracked regularly.</p>
        </div>
      </div>

      {/* Add Listing Modal */}
      <Modal open={listingModalOpen} onClose={() => setListingModalOpen(false)} title="Add Amazon Listing">
        <form onSubmit={handleListingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Product Title *">
            <input className="select-input" required value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} placeholder="e.g. KTC Premium 1121 Basmati Rice - 5kg" />
          </FormRow>
          <div className="grid grid-2">
            <FormRow label="ASIN">
              <input className="select-input" value={listingForm.asin} onChange={(e) => setListingForm({ ...listingForm, asin: e.target.value })} placeholder="e.g. B0XXXXXXXX" />
            </FormRow>
            <FormRow label="SKU">
              <input className="select-input" value={listingForm.sku} onChange={(e) => setListingForm({ ...listingForm, sku: e.target.value })} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Price (USD)">
              <input type="number" min="0" step="0.01" className="select-input" value={listingForm.price} onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })} />
            </FormRow>
            <FormRow label="Stock">
              <input type="number" min="0" className="select-input" value={listingForm.stock} onChange={(e) => setListingForm({ ...listingForm, stock: e.target.value })} />
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Status">
              <select className="select-input" value={listingForm.status} onChange={(e) => setListingForm({ ...listingForm, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormRow>
            <FormRow label="Fulfillment">
              <select className="select-input" value={listingForm.fulfillment_type} onChange={(e) => setListingForm({ ...listingForm, fulfillment_type: e.target.value })}>
                <option value="FBA">FBA (Fulfilled by Amazon)</option>
                <option value="FBM">FBM (Fulfilled by Merchant)</option>
              </select>
            </FormRow>
          </div>
          <div className="grid grid-2">
            <FormRow label="Rating (0-5)">
              <input type="number" min="0" max="5" step="0.1" className="select-input" value={listingForm.rating} onChange={(e) => setListingForm({ ...listingForm, rating: e.target.value })} />
            </FormRow>
            <FormRow label="Review Count">
              <input type="number" min="0" className="select-input" value={listingForm.review_count} onChange={(e) => setListingForm({ ...listingForm, review_count: e.target.value })} />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setListingModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingListing}>
              {savingListing ? 'Saving...' : 'Add Listing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Sales Modal */}
      <Modal open={!!salesModalOpen} onClose={() => setSalesModalOpen(null)} title="Log Sales Period">
        <form onSubmit={handleSalesSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="cell-muted" style={{ marginTop: -4 }}>
            Enter numbers from your Amazon Seller Central Business Reports for a date range (e.g. last 30 days).
          </p>
          <div className="grid grid-2">
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
          <div className="grid grid-2">
            <FormRow label="Revenue (USD)">
              <input type="number" min="0" step="0.01" className="select-input" value={salesForm.revenue} onChange={(e) => setSalesForm({ ...salesForm, revenue: e.target.value })} />
            </FormRow>
            <FormRow label="Ad Spend / PPC (USD)">
              <input type="number" min="0" step="0.01" className="select-input" value={salesForm.ad_spend} onChange={(e) => setSalesForm({ ...salesForm, ad_spend: e.target.value })} />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSalesModalOpen(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingSales}>
              {savingSales ? 'Saving...' : 'Log Sales'}
            </button>
          </div>
        </form>
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
