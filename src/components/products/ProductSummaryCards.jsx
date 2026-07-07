import { Boxes, DollarSign, PackageCheck, ShoppingCart } from 'lucide-react';

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(Number(value) || 0));
}

export default function ProductSummaryCards({ products = [] }) {
  const totalStock = products.reduce((sum, product) => sum + (Number(product.stock_mt) || 0), 0);
  const pricedProducts = products.filter((product) => Number(product.base_cost) > 0);
  const avgCost = pricedProducts.length
    ? pricedProducts.reduce((sum, product) => sum + Number(product.base_cost), 0) / pricedProducts.length
    : 0;
  const saltProducts = products.filter((product) => /salt|himalayan|khewra/i.test(`${product.name} ${product.category}`)).length;

  const cards = [
    {
      label: 'Active Products',
      value: products.length,
      detail: 'Rice, salt, sesame and other export SKUs',
      icon: Boxes,
      tone: 'green',
    },
    {
      label: 'Mill Stock',
      value: `${formatNumber(totalStock)} MT`,
      detail: 'Available inventory recorded in catalog',
      icon: PackageCheck,
      tone: 'blue',
    },
    {
      label: 'Average Base Cost',
      value: avgCost ? `$${formatNumber(avgCost)}/MT` : '—',
      detail: 'Used by quotation and pricing workflow',
      icon: DollarSign,
      tone: 'gold',
    },
    {
      label: 'Amazon Candidates',
      value: saltProducts || 3,
      detail: 'Retail pack opportunities for USA and UK',
      icon: ShoppingCart,
      tone: 'red',
    },
  ];

  return (
    <div className="product-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div className={`product-summary-card tone-${card.tone}`} key={card.label}>
            <div className="summary-card-topline">
              <span>{card.label}</span>
              <div className="summary-card-icon"><Icon size={18} /></div>
            </div>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
