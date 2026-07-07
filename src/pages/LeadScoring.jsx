import { useMemo, useState } from 'react';
import { ArrowUpRight, Flame, Globe2, Mail, Star, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClients } from '../hooks/useClients';

const HIGH_VALUE_MARKETS = ['China', 'Malaysia', 'Philippines', 'Ethiopia', 'Ghana', 'Iran', 'United States', 'United Kingdom'];
const PRODUCT_WEIGHTS = { '100% Broken': 25, 'IRRI-6': 20, '1121': 15, 'Salt': 15, 'Sesame': 15, 'Basmati': 12 };

function computeLeadScore(client) {
  let score = Number(client.score || 0);
  const products = Array.isArray(client.products_interest) ? client.products_interest.join(' ') : String(client.products_interest || '');
  const text = `${client.company || ''} ${client.country || ''} ${products} ${client.notes || ''}`.toLowerCase();
  if (client.email) score += 10;
  if (client.phone) score += 10;
  if (client.country && HIGH_VALUE_MARKETS.some((country) => country.toLowerCase() === String(client.country).toLowerCase())) score += 20;
  Object.entries(PRODUCT_WEIGHTS).forEach(([keyword, weight]) => { if (text.includes(keyword.toLowerCase())) score += weight; });
  if (/10,000|10000|monthly|bulk|container|mt\/month|feed|tender/i.test(text)) score += 25;
  if (/confirmed|negotiation|quote sent|interested/i.test(`${client.status || ''} ${client.notes || ''}`)) score += 15;
  return Math.min(100, Math.round(score));
}

function tier(score) {
  if (score >= 80) return { label: 'Hot', className: 'hot', action: 'Call / WhatsApp today' };
  if (score >= 60) return { label: 'Warm', className: 'warm', action: 'Send quotation follow-up' };
  if (score >= 40) return { label: 'Nurture', className: 'nurture', action: 'Send product intro' };
  return { label: 'Cold', className: 'cold', action: 'Verify contact details' };
}

export default function LeadScoring() {
  const { clients, loading } = useClients();
  const [market, setMarket] = useState('All');
  const [stage, setStage] = useState('All');

  const scored = useMemo(() => clients.map((client) => {
    const leadScore = computeLeadScore(client);
    return { ...client, leadScore, tier: tier(leadScore) };
  }).sort((a, b) => b.leadScore - a.leadScore), [clients]);

  const markets = ['All', ...new Set(scored.map((client) => client.country).filter(Boolean))].slice(0, 30);
  const stages = ['All', 'Hot', 'Warm', 'Nurture', 'Cold'];
  const filtered = scored.filter((client) => (market === 'All' || client.country === market) && (stage === 'All' || client.tier.label === stage));
  const hot = scored.filter((client) => client.tier.label === 'Hot').length;
  const avg = scored.length ? Math.round(scored.reduce((sum, client) => sum + client.leadScore, 0) / scored.length) : 0;

  return (
    <div className="page-stack">
      <div className="page-header sprint8-hero"><div><span className="eyebrow">Sales intelligence</span><h1>Buyer Lead Scoring</h1><p>Prioritize buyers most likely to convert based on market, product interest, volume signals and contact quality.</p></div></div>
      <div className="kpi-grid four"><div className="kpi-card"><Users size={20} /><span>Total buyers</span><strong>{clients.length}</strong></div><div className="kpi-card"><Flame size={20} /><span>Hot leads</span><strong>{hot}</strong></div><div className="kpi-card"><Target size={20} /><span>Average score</span><strong>{avg}</strong></div><div className="kpi-card"><Globe2 size={20} /><span>Priority markets</span><strong>{HIGH_VALUE_MARKETS.length}</strong></div></div>
      <section className="card padded template-controls"><label>Market<select value={market} onChange={(e) => setMarket(e.target.value)}>{markets.map((item) => <option key={item}>{item}</option>)}</select></label><label>Lead stage<select value={stage} onChange={(e) => setStage(e.target.value)}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label></section>
      <section className="card padded">
        <div className="section-heading compact"><Star size={18} /><div><h2>Priority buyer queue</h2><p>Start from the top and work down daily.</p></div></div>
        {loading ? <p>Loading buyers...</p> : <div className="lead-table">{filtered.map((client) => <Link to={`/clients/${client.id}`} className="lead-row" key={client.id}><div><strong>{client.company || client.contact || client.id}</strong><span>{client.country || 'Unknown market'} • {client.status || 'No status'}</span></div><div className="score-meter"><span style={{ width: `${client.leadScore}%` }} /></div><span className={`lead-badge ${client.tier.className}`}>{client.tier.label} {client.leadScore}</span><em>{client.tier.action}</em><ArrowUpRight size={16} /></Link>)}</div>}
      </section>
      <section className="card padded"><div className="section-heading compact"><Mail size={18} /><div><h2>Scoring logic</h2><p>Higher score means stronger contact data, target country, relevant product interest, bulk-volume keywords, and active buyer stage.</p></div></div></section>
    </div>
  );
}
