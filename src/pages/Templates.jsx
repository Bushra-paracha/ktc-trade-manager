import { useMemo, useState } from 'react';
import { Copy, Mail, MessageCircle, Search, Sparkles } from 'lucide-react';

const templates = [
  {
    type: 'Email',
    title: 'First buyer introduction',
    market: 'General',
    body: `Dear {{buyer}},\n\nWe are Kassam Trading Company (KTC), a REAP-registered rice miller, processor and exporter based in Karachi, Pakistan. We supply premium Pakistani rice, Himalayan Pink Salt, and sesame seeds for importers, wholesalers, distributors and foodservice buyers.\n\nOur current export range includes 1121 Sella Rice, IRRI-6 Long Grain White Rice, IRRI-6 100% Broken Rice, PK-386 Rice, Refined White Salt, Himalayan Pink Salt, and Natural White Hulled Sesame Seeds.\n\nPlease let us know your required product, quantity, packaging, and destination port so we can share a competitive quotation.\n\nBest regards,\nKassam Trading Company\nktcmktg@gmail.com\nWhatsApp: +92-300-820-1074`,
  },
  {
    type: 'Email',
    title: 'Broken rice bulk offer',
    market: 'China / Feed / Industrial',
    body: `Dear {{buyer}},\n\nWe can offer IRRI-6 100% Broken Rice from Pakistan for bulk monthly supply. Our current FOB Port Qasim indication is USD 335/MT, subject to final confirmation at the time of order.\n\nKTC operates two mills in Port Qasim Industrial Zone with monthly capacity of approximately 9,000 MT. We can support inspection, documentation, and containerized shipments.\n\nPlease share your monthly requirement, destination port, preferred payment terms, and required specifications.\n\nRegards,\nKassam Trading Company`,
  },
  {
    type: 'WhatsApp',
    title: 'Quick follow-up after quotation',
    market: 'General',
    body: `Dear {{buyer}}, this is a follow-up from Kassam Trading Company regarding the quotation we shared. Please let us know if the price, packaging, or shipment terms need adjustment. We are ready to support your next import requirement from Pakistan.`,
  },
  {
    type: 'WhatsApp',
    title: 'Sample / retail salt follow-up',
    market: 'USA / UK Amazon',
    body: `Dear {{buyer}}, KTC can supply Himalayan Pink Salt from Pakistan in bulk and retail packs including 1 lb, 2 lb, and 5 lb. Please share your target packaging, labeling, and destination market so we can prepare a retail-ready quotation.`,
  },
  {
    type: 'Email',
    title: 'Malaysia order follow-up',
    market: 'Malaysia',
    body: `Dear {{buyer}},\n\nThank you for your interest in Pakistani rice. KTC can supply IRRI-6 rice, broken rice, basmati rice, salt and sesame seeds from Karachi, Pakistan.\n\nFor Malaysia shipments, please confirm product grade, quantity, packaging and destination port. We can prepare FOB/CNF pricing and shipment timeline accordingly.\n\nBest regards,\nKassam Trading Company`,
  },
  {
    type: 'Email',
    title: 'UN / institutional supplier intro',
    market: 'UNGM / NGO / Tender',
    body: `Dear Procurement Team,\n\nKassam Trading Company is a Pakistan-based rice miller and exporter registered on UNGM as supplier #495113 and Level 2 with WFP. We are interested in supporting food supply requirements involving rice, salt and related commodities.\n\nPlease let us know how we can register for upcoming tenders or supplier opportunities.\n\nRegards,\nKassam Trading Company`,
  },
];

function copy(text) { navigator.clipboard?.writeText(text); }

export default function Templates() {
  const [query, setQuery] = useState('');
  const [buyer, setBuyer] = useState('Buyer Team');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => templates.filter((template) => {
    const matchesType = filter === 'All' || template.type === filter;
    const matchesSearch = !query || `${template.title} ${template.market} ${template.body}`.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesSearch;
  }), [query, filter]);

  return (
    <div className="page-stack">
      <div className="page-header sprint8-hero"><div><span className="eyebrow">Outreach library</span><h1>Email & WhatsApp Templates</h1><p>Copy-ready messages for rice, salt, sesame, UNGM and Amazon retail leads.</p></div></div>
      <section className="card padded template-controls">
        <label><Search size={16} /> Search templates<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="rice, salt, Malaysia, UNGM..." /></label>
        <label>Buyer merge name<input value={buyer} onChange={(e) => setBuyer(e.target.value)} /></label>
        <div className="pill-row"><button className={filter === 'All' ? 'active' : ''} onClick={() => setFilter('All')}>All</button><button className={filter === 'Email' ? 'active' : ''} onClick={() => setFilter('Email')}>Email</button><button className={filter === 'WhatsApp' ? 'active' : ''} onClick={() => setFilter('WhatsApp')}>WhatsApp</button></div>
      </section>
      <div className="template-grid">
        {filtered.map((template) => {
          const Icon = template.type === 'Email' ? Mail : MessageCircle;
          const body = template.body.replaceAll('{{buyer}}', buyer || 'Buyer Team');
          return <article className="card padded template-card" key={template.title}><div className="template-card-head"><div><Icon size={18} /><strong>{template.title}</strong></div><span>{template.market}</span></div><pre>{body}</pre><button className="btn btn-primary" onClick={() => copy(body)}><Copy size={16} /> Copy {template.type}</button></article>;
        })}
      </div>
      <section className="card padded"><div className="section-heading compact"><Sparkles size={18} /><div><h2>Best practice</h2><p>Use WhatsApp for warm follow-ups and email for formal quotation / document trails. Keep price validity short because export rates can move quickly.</p></div></div></section>
    </div>
  );
}
