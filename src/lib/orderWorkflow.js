export const ORDER_STAGES = [
  { label: 'Inquiry', aliases: ['Inquiry', 'Lead'], helper: 'Buyer request received' },
  { label: 'Quotation', aliases: ['Quotation', 'Quote Sent', 'Proforma Sent'], helper: 'Price and terms shared' },
  { label: 'Negotiation', aliases: ['Negotiation', 'Under Review'], helper: 'Terms being finalized' },
  { label: 'Confirmed', aliases: ['Confirmed'], helper: 'Order accepted' },
  { label: 'In Production', aliases: ['In Production', 'Production'], helper: 'Milling and packing' },
  { label: 'Ready to Ship', aliases: ['Ready to Ship', 'Ready'], helper: 'Documents and cargo ready' },
  { label: 'Shipped', aliases: ['Shipped', 'Departed', 'In Transit'], helper: 'Cargo on the way' },
  { label: 'Delivered', aliases: ['Delivered', 'Completed'], helper: 'Buyer received goods' },
];

export const ORDER_STATUS_OPTIONS = ORDER_STAGES.map((stage) => stage.label);

export function normalizeStatus(status = '') {
  const match = ORDER_STAGES.find((stage) =>
    stage.aliases.some((alias) => alias.toLowerCase() === String(status).toLowerCase())
  );
  return match?.label || status || 'Confirmed';
}

export function getStageIndex(status) {
  const normalized = normalizeStatus(status);
  const index = ORDER_STAGES.findIndex((stage) => stage.label === normalized);
  return index === -1 ? 3 : index;
}

export function getStageProgress(status) {
  const index = getStageIndex(status);
  return Math.round(((index + 1) / ORDER_STAGES.length) * 100);
}

export function getOrderUrgency(order) {
  if (!order?.shipment_deadline) return { label: 'No deadline', tone: 'neutral' };
  const deadline = new Date(order.shipment_deadline);
  const today = new Date();
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, tone: 'danger' };
  if (diffDays <= 7) return { label: `${diffDays}d left`, tone: 'warning' };
  return { label: `${diffDays}d left`, tone: 'success' };
}

export function getDocsProgress(docs = []) {
  const total = docs.length;
  const complete = docs.filter((doc) => ['Verified', 'Sent to Buyer', 'Uploaded'].includes(doc.status)).length;
  return {
    total,
    complete,
    percent: total ? Math.round((complete / total) * 100) : 0,
  };
}

export function summarizeOrderValue(orders = []) {
  return orders.reduce((sum, order) => sum + Number(order.total_value || 0), 0);
}
