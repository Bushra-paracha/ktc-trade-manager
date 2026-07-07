import { useMemo, useState } from 'react';
import { Calculator, Copy, Download, FileText, Printer, Send, Sparkles } from 'lucide-react';
import { useClients } from '../hooks/useClients';

const PRODUCTS = [
  { name: '1121 Sella Rice', price: 1350, unit: 'MT', packaging: '25kg / 50kg PP bags' },
  { name: '1121/1509 Rice', price: 1320, unit: 'MT', packaging: '25kg / 50kg PP bags' },
  { name: 'PK-386 White/Sella Rice', price: 900, unit: 'MT', packaging: '25kg / 50kg PP bags' },
  { name: 'C-9 Sella Rice', price: 720, unit: 'MT', packaging: '25kg / 50kg PP bags' },
  { name: 'IRRI-6 Long Grain White Rice', price: 430, unit: 'MT', packaging: '25kg / 50kg PP bags' },
  { name: 'IRRI-6 100% Broken Rice', price: 335, unit: 'MT', packaging: '25kg / 50kg PP bags' },
  { name: 'Refined White Salt - Non Iodized', price: 40, unit: 'MT', packaging: '25kg / 50kg bags' },
  { name: 'Refined White Salt - Iodized', price: 46, unit: 'MT', packaging: '25kg / 50kg bags' },
  { name: 'Himalayan Pink Salt Retail Packs', price: 180, unit: 'MT', packaging: '1lb / 2lb / 5lb retail packs' },
  { name: 'Natural White Hulled Sesame Seeds', price: 1650, unit: 'MT', packaging: '25kg PP bags' },
];

const initialForm = {
  buyerId: '',
  buyerName: '',
  country: '',
  product: 'IRRI-6 100% Broken Rice',
  quantity: 56,
  unitPrice: 335,
  incoterm: 'FOB',
  loadingPort: 'Port Qasim, Karachi, Pakistan',
  destinationPort: 'Port Klang, Malaysia',
  packaging: '25kg / 50kg PP bags',
  paymentTerms: '30% advance TT, 70% before shipment / LC at sight',
  shipmentTime: '15–21 days after payment confirmation',
  validity: '7 days',
  notes: 'Price is subject to final confirmation, inspection requirements, and vessel/container availability.',
};

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function todayId() {
  const now = new Date();
  return `KTC-QTN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function QuotationGenerator() {
  const { clients } = useClients();
  const [form, setForm] = useState(initialForm);

  const selectedProduct = PRODUCTS.find((item) => item.name === form.product) || PRODUCTS[0];
  const subtotal = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  const quoteId = todayId();

  const selectedBuyer = useMemo(() => clients.find((client) => client.id === form.buyerId), [clients, form.buyerId]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleBuyerChange(id) {
    const buyer = clients.find((client) => client.id === id);
    setForm((current) => ({
      ...current,
      buyerId: id,
      buyerName: buyer?.company || buyer?.contact || current.buyerName,
      country: buyer?.country || current.country,
    }));
  }

  function handleProductChange(name) {
    const product = PRODUCTS.find((item) => item.name === name);
    setForm((current) => ({
      ...current,
      product: name,
      unitPrice: product?.price || current.unitPrice,
      packaging: product?.packaging || current.packaging,
    }));
  }

  const quotationText = `KASSAM TRADING COMPANY (KTC)\nProforma Quotation: ${quoteId}\n\nBuyer: ${form.buyerName || 'Buyer Company'}\nCountry: ${form.country || selectedBuyer?.country || '—'}\n\nProduct: ${form.product}\nOrigin: Pakistan\nQuantity: ${form.quantity} MT\nUnit Price: ${money(form.unitPrice)} / MT ${form.incoterm}\nTotal Value: ${money(subtotal)}\nLoading Port: ${form.loadingPort}\nDestination Port: ${form.destinationPort}\nPackaging: ${form.packaging}\nPayment Terms: ${form.paymentTerms}\nShipment Time: ${form.shipmentTime}\nValidity: ${form.validity}\n\nNotes: ${form.notes}\n\nContact: ktcmktg@gmail.com | WhatsApp: +92-300-820-1074\nWebsite: kassamtradingcompany.com`;

  const whatsappText = `Dear ${form.buyerName || 'Sir/Madam'},\n\nThank you for your inquiry. We can offer ${form.quantity} MT ${form.product} at ${money(form.unitPrice)}/MT ${form.incoterm} ${form.loadingPort}. Total value: ${money(subtotal)}. Packaging: ${form.packaging}. Shipment: ${form.shipmentTime}.\n\nRegards,\nKassam Trading Company`;

  return (
    <div className="page-stack">
      <div className="page-header sprint8-hero">
        <div>
          <span className="eyebrow">Sales document generator</span>
          <h1>Quotation & Proforma Invoice Generator</h1>
          <p>Create export quotations for rice, salt, and sesame buyers in minutes.</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => window.print()}><Printer size={16} /> Print</button>
          <button className="btn btn-primary" onClick={() => copyToClipboard(quotationText)}><Copy size={16} /> Copy Quote</button>
        </div>
      </div>

      <div className="mega-grid two">
        <section className="card padded">
          <div className="section-heading compact"><Calculator size={18} /><div><h2>Build quotation</h2><p>Enter buyer, product, quantity and shipping terms.</p></div></div>
          <div className="form-grid two-cols">
            <label>Buyer from CRM<select value={form.buyerId} onChange={(e) => handleBuyerChange(e.target.value)}><option value="">Manual / select buyer</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company || client.contact} — {client.country}</option>)}</select></label>
            <label>Buyer name<input value={form.buyerName} onChange={(e) => update('buyerName', e.target.value)} placeholder="Zenline Consolidated Malaysia" /></label>
            <label>Country<input value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="Malaysia" /></label>
            <label>Product<select value={form.product} onChange={(e) => handleProductChange(e.target.value)}>{PRODUCTS.map((product) => <option key={product.name}>{product.name}</option>)}</select></label>
            <label>Quantity MT<input type="number" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></label>
            <label>Unit price USD/MT<input type="number" value={form.unitPrice} onChange={(e) => update('unitPrice', e.target.value)} /></label>
            <label>Incoterm<select value={form.incoterm} onChange={(e) => update('incoterm', e.target.value)}><option>FOB</option><option>CNF</option><option>CIF</option><option>EXW</option></select></label>
            <label>Destination port<input value={form.destinationPort} onChange={(e) => update('destinationPort', e.target.value)} /></label>
            <label>Packaging<input value={form.packaging} onChange={(e) => update('packaging', e.target.value)} /></label>
            <label>Payment terms<input value={form.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} /></label>
            <label>Shipment time<input value={form.shipmentTime} onChange={(e) => update('shipmentTime', e.target.value)} /></label>
            <label>Validity<input value={form.validity} onChange={(e) => update('validity', e.target.value)} /></label>
          </div>
          <label className="full-field">Notes<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} /></label>
        </section>

        <aside className="card padded quote-summary-card">
          <div className="section-heading compact"><Sparkles size={18} /><div><h2>Live calculation</h2><p>Quotation value updates automatically.</p></div></div>
          <div className="quote-total-box"><span>Total quoted value</span><strong>{money(subtotal)}</strong><small>{form.quantity} MT × {money(form.unitPrice)} / MT</small></div>
          <div className="mini-list">
            <div><span>Product</span><strong>{selectedProduct.name}</strong></div>
            <div><span>Terms</span><strong>{form.incoterm}</strong></div>
            <div><span>Port</span><strong>{form.loadingPort}</strong></div>
            <div><span>Packaging</span><strong>{form.packaging}</strong></div>
          </div>
          <div className="button-stack">
            <button className="btn btn-primary" onClick={() => copyToClipboard(whatsappText)}><Send size={16} /> Copy WhatsApp follow-up</button>
            <button className="btn" onClick={() => downloadText(`${quoteId}.txt`, quotationText)}><Download size={16} /> Download TXT</button>
          </div>
        </aside>
      </div>

      <section className="card padded quotation-preview">
        <div className="section-heading compact"><FileText size={18} /><div><h2>Quotation preview</h2><p>Copy this into email, WhatsApp, or a PDF template.</p></div></div>
        <pre>{quotationText}</pre>
      </section>
    </div>
  );
}
