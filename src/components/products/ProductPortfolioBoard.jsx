import { ArrowRight, Package, ShoppingCart, Wheat } from 'lucide-react';

const portfolio = [
  {
    title: 'Rice Export Range',
    subtitle: 'Bulk container business',
    icon: Wheat,
    products: ['1121 Sella Rice', '1121/1509 Rice', 'PK-386 White/Sella', 'C-9 Sella', 'IRRI-6 White Rice', 'IRRI-6 100% Broken Rice'],
    action: 'Use for FOB quotes, PI generation, and buyer follow-up.',
  },
  {
    title: 'Salt Retail Range',
    subtitle: 'Amazon USA/UK launch focus',
    icon: ShoppingCart,
    products: ['Himalayan Pink Salt 1 lb', 'Himalayan Pink Salt 2 lb', 'Himalayan Pink Salt 5 lb', 'Refined White Salt - Iodized', 'Refined White Salt - Non-Iodized'],
    action: 'Prepare labels, compliance docs, carton specs, and FBA plan.',
  },
  {
    title: 'Sesame Seeds',
    subtitle: 'New buyer development',
    icon: Package,
    products: ['Natural White Hulled Sesame Seeds', 'Bulk export bags', 'Private label option'],
    action: 'Build importer list and add buyer-specific samples workflow.',
  },
];

export default function ProductPortfolioBoard() {
  return (
    <div className="portfolio-board">
      {portfolio.map((group) => {
        const Icon = group.icon;
        return (
          <div className="portfolio-card" key={group.title}>
            <div className="portfolio-card-head">
              <div className="portfolio-icon"><Icon size={20} /></div>
              <div>
                <h3>{group.title}</h3>
                <p>{group.subtitle}</p>
              </div>
            </div>
            <div className="portfolio-list">
              {group.products.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="portfolio-action">
              <span>{group.action}</span>
              <ArrowRight size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
