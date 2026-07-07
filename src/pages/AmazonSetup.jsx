import { CheckCircle2, PackageCheck, ShoppingCart, ShieldCheck, Truck, UploadCloud } from 'lucide-react';

const steps = [
  { icon: ShieldCheck, title: 'Seller account documents', items: ['Business registration / owner ID', 'Bank account and charge method', 'Tax interview for USA / UK', 'Brand name and contact information'] },
  { icon: PackageCheck, title: 'Product compliance', items: ['Food-grade packaging specs', 'Nutrition facts / label review', 'Country of origin: Pakistan', 'Allergen / ingredient statement: Himalayan Pink Salt'] },
  { icon: UploadCloud, title: 'Listing setup', items: ['Create 1 lb, 2 lb, 5 lb parent/child variation', 'Upload product photos', 'Write title, bullets and description', 'Add search terms and backend keywords'] },
  { icon: Truck, title: 'Fulfillment plan', items: ['Choose FBA vs FBM', 'Calculate landed cost', 'Prepare cartons / case pack', 'Create shipping plan to Amazon warehouse'] },
];

const skus = [
  ['KTC-HPS-FINE-1LB-US', '1 lb Fine Himalayan Pink Salt', 'USA', 'Retail pack'],
  ['KTC-HPS-FINE-2LB-US', '2 lb Fine Himalayan Pink Salt', 'USA', 'Retail pack'],
  ['KTC-HPS-FINE-5LB-US', '5 lb Fine Himalayan Pink Salt', 'USA', 'Value pack'],
  ['KTC-HPS-FINE-1LB-UK', '1 lb Fine Himalayan Pink Salt', 'UK', 'Retail pack'],
  ['KTC-HPS-FINE-2LB-UK', '2 lb Fine Himalayan Pink Salt', 'UK', 'Retail pack'],
  ['KTC-HPS-FINE-5LB-UK', '5 lb Fine Himalayan Pink Salt', 'UK', 'Value pack'],
];

export default function AmazonSetup() {
  return (
    <div className="page-stack">
      <div className="page-header sprint8-hero"><div><span className="eyebrow">Amazon launch workflow</span><h1>Himalayan Pink Salt Amazon Setup</h1><p>Step-by-step launch board for USA and UK retail packs.</p></div></div>
      <div className="template-grid">{steps.map((step) => { const Icon = step.icon; return <article className="card padded template-card" key={step.title}><div className="template-card-head"><div><Icon size={18} /><strong>{step.title}</strong></div><span>Required</span></div><ul className="check-list">{step.items.map((item) => <li key={item}><CheckCircle2 size={15} /> {item}</li>)}</ul></article>; })}</div>
      <section className="card padded"><div className="section-heading compact"><ShoppingCart size={18} /><div><h2>Starter SKU plan</h2><p>Use these as internal SKU names before final Amazon listing approval.</p></div></div><div className="lead-table">{skus.map(([sku, name, market, pack]) => <div className="lead-row" key={sku}><div><strong>{sku}</strong><span>{name}</span></div><span className="lead-badge warm">{market}</span><em>{pack}</em></div>)}</div></section>
      <section className="card padded quotation-preview"><div className="section-heading compact"><PackageCheck size={18} /><div><h2>Listing copy starter</h2><p>Use this as a base, then adjust after keyword research and compliance review.</p></div></div><pre>{`Title: Himalayan Pink Salt from Pakistan - Fine Grain, Natural Mineral Salt, 1 lb\n\nBullets:\n• Naturally sourced Himalayan Pink Salt from Pakistan\n• Fine grain texture suitable for everyday cooking and seasoning\n• Packed for freshness in retail-ready food-grade packaging\n• No artificial colors or additives\n• Supplied by Kassam Trading Company, Karachi, Pakistan`}</pre></section>
    </div>
  );
}
