import { Trash2 } from 'lucide-react';
import { calculateLineItem } from '../lib/pricingEngine';

export default function InquiryItemEditor({ item, products, onChange, onRemove }) {
  function updateField(field, value) {
    const updated = { ...item, [field]: value };

    // If product changed, prefill product name
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated.product_name = product.name;
        // Only prefill costs if they exist on the product, otherwise keep current values
        if (product.base_cost != null) updated.base_cost = product.base_cost;
        if (product.packaging_cost != null) updated.packaging_cost = product.packaging_cost;
      }
    }

    // Recalculate pricing
    const calc = calculateLineItem({
      baseCost: updated.base_cost,
      packagingCost: updated.packaging_cost,
      millingCost: updated.milling_cost,
      exportDuties: updated.export_duties,
      freightCost: updated.freight_cost,
      inspectionCost: updated.inspection_cost,
      marginPercent: updated.margin_percent,
      quantityMt: updated.quantity_mt,
    });

    onChange({ ...updated, cost_subtotal: calc.costSubtotal, unit_price: calc.unitPrice, line_total: calc.lineTotal });
  }

  return (
    <div className="card" style={{ background: 'var(--color-surface-alt)', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Product">
            <select className="select-input" value={item.product_id || ''} onChange={(e) => updateField('product_id', e.target.value)}>
              <option value="">— Select product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remove line item" style={{ marginTop: 20 }}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 10 }}>
        <Field label="Quantity (MT)">
          <input type="number" min="0" className="select-input" value={item.quantity_mt} onChange={(e) => updateField('quantity_mt', Number(e.target.value))} />
        </Field>
        <Field label="Base Cost ($/MT)">
          <input type="number" min="0" className="select-input" value={item.base_cost} onChange={(e) => updateField('base_cost', Number(e.target.value))} />
        </Field>
        <Field label="Packaging ($/MT)">
          <input type="number" min="0" className="select-input" value={item.packaging_cost} onChange={(e) => updateField('packaging_cost', Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 10 }}>
        <Field label="Milling ($/MT)">
          <input type="number" min="0" className="select-input" value={item.milling_cost} onChange={(e) => updateField('milling_cost', Number(e.target.value))} />
        </Field>
        <Field label="Export Duties ($/MT)">
          <input type="number" min="0" className="select-input" value={item.export_duties} onChange={(e) => updateField('export_duties', Number(e.target.value))} />
        </Field>
        <Field label="Freight ($/MT)">
          <input type="number" min="0" className="select-input" value={item.freight_cost} onChange={(e) => updateField('freight_cost', Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 10 }}>
        <Field label="Inspection / Cert. ($/MT)">
          <input type="number" min="0" className="select-input" value={item.inspection_cost} onChange={(e) => updateField('inspection_cost', Number(e.target.value))} />
        </Field>
        <Field label="KTC Margin (%)">
          <input type="number" min="0" step="0.5" className="select-input" value={item.margin_percent} onChange={(e) => updateField('margin_percent', Number(e.target.value))} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 13 }}>
        <span className="cell-muted">Cost subtotal: ${item.cost_subtotal?.toFixed(2)} / MT</span>
        <span className="cell-strong">Unit price: ${item.unit_price?.toFixed(2)} / MT</span>
        <span className="cell-strong" style={{ color: 'var(--color-primary)' }}>Line total: ${item.line_total?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
