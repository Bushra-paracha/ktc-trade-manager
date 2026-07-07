import { CheckCircle2, Globe2, Lightbulb, Search, ShieldCheck, Sparkles } from 'lucide-react';

const pages = [
  { title: 'Global Presence', status: 'Build next', description: 'Show export markets, buyer trust, Port Qasim mill location, UNGM supplier status, and product availability by region.' },
  { title: 'FAQ Section', status: 'High impact', description: 'Answer buyer questions about MOQ, samples, payment terms, inspection, SGS/BV, shipment timelines and packaging.' },
  { title: 'Vision / Mission', status: 'Brand trust', description: 'Explain KTC’s mission to supply reliable Pakistani rice, salt and sesame with transparent documentation and long-term buyer relationships.' },
  { title: 'Product Landing Pages', status: 'SEO growth', description: 'Dedicated pages for 1121 Sella Rice, IRRI-6 rice, 100% broken rice, Himalayan Pink Salt and sesame seeds.' },
];

const faq = [
  ['What is your minimum order quantity?', 'For export shipments, MOQ is usually one 20ft container depending on product and packaging.'],
  ['Do you arrange inspection?', 'Yes, KTC can support SGS, Bureau Veritas, phytosanitary and other buyer-required inspection documentation.'],
  ['Which port do you ship from?', 'KTC ships from Port Qasim / Karachi, Pakistan.'],
  ['Can you supply private label packaging?', 'Yes, private label and customized packaging can be discussed for rice, salt and retail packs.'],
];

export default function WebsiteGrowth() {
  return (
    <div className="page-stack">
      <div className="page-header sprint8-hero"><div><span className="eyebrow">Website growth</span><h1>KTC Website Improvement Plan</h1><p>Turn kassamtradingcompany.com into a stronger buyer acquisition channel.</p></div></div>
      <div className="kpi-grid four"><div className="kpi-card"><Search size={20} /><span>SEO score target</span><strong>95+</strong></div><div className="kpi-card"><Globe2 size={20} /><span>Market pages</span><strong>8</strong></div><div className="kpi-card"><ShieldCheck size={20} /><span>Trust pages</span><strong>3</strong></div><div className="kpi-card"><Sparkles size={20} /><span>Lead forms</span><strong>2</strong></div></div>
      <div className="template-grid">{pages.map((page) => <article className="card padded template-card" key={page.title}><div className="template-card-head"><div><CheckCircle2 size={18} /><strong>{page.title}</strong></div><span>{page.status}</span></div><p>{page.description}</p></article>)}</div>
      <section className="card padded quotation-preview"><div className="section-heading compact"><Lightbulb size={18} /><div><h2>Copy-ready FAQ content</h2><p>Add these to the website FAQ page.</p></div></div><pre>{faq.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}</pre></section>
      <section className="card padded quotation-preview"><div className="section-heading compact"><Sparkles size={18} /><div><h2>Vision / Mission draft</h2><p>Simple website copy for the new page.</p></div></div><pre>{`Vision\nTo become a trusted global supplier of Pakistani rice, Himalayan Pink Salt, and agricultural commodities by delivering consistent quality, reliable shipments, and long-term value to international buyers.\n\nMission\nKassam Trading Company connects global importers with quality Pakistani food commodities through transparent pricing, dependable documentation, and responsive export service from Karachi, Pakistan.`}</pre></section>
    </div>
  );
}
