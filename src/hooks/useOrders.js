import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

function generateNextOrderId(existing) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((o) => o.id?.match(/^ORD-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt(m[2], 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `ORD-${year}-${String(next).padStart(4, '0')}`;
}

// ---------- List of orders ----------
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(company, country), order_items(*), shipments(*)')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Converts an accepted inquiry into a new order, copying client/items/value,
  // and auto-creates the standard document checklist for it.
  const convertInquiryToOrder = useCallback(async (inquiry) => {
    const id = generateNextOrderId(orders);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        id,
        inquiry_id: inquiry.id,
        client_id: inquiry.client_id,
        incoterm: inquiry.incoterm,
        payment_method: inquiry.payment_terms,
        pod_port: inquiry.destination_port,
        total_value: inquiry.total_value,
        status: 'Confirmed',
        production_progress: 0,
      }])
      .select()
      .single();

    if (orderError) {
      return { error: orderError.message };
    }

    // Copy line items
    const items = (inquiry.inquiry_items || []).map((it) => ({
      order_id: id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity_mt: it.quantity_mt,
      unit_price: it.unit_price,
      line_total: it.line_total,
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(items);
      if (itemsError) {
        return { error: `Order created, but items failed to copy: ${itemsError.message}` };
      }
    }

    // Auto-create document checklist from templates
    const { data: templates } = await supabase
      .from('document_checklist_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (templates && templates.length > 0) {
      const docs = templates.map((t) => ({
        order_id: id,
        document_type: t.document_type,
        responsible_party: t.responsible_party,
        status: 'Pending',
      }));
      await supabase.from('order_documents').insert(docs);
    }

    // Mark the inquiry as Accepted
    await supabase.from('inquiries').update({ status: 'Accepted' }).eq('id', inquiry.id);

    await fetchOrders();
    return { data: order };
  }, [orders, fetchOrders]);

  const updateOrderStatus = useCallback(async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) return { error: error.message };
    await fetchOrders();
    return { success: true };
  }, [fetchOrders]);

  const updateOrderProgress = useCallback(async (id, production_progress) => {
    const { error } = await supabase.from('orders').update({ production_progress }).eq('id', id);
    if (error) return { error: error.message };
    await fetchOrders();
    return { success: true };
  }, [fetchOrders]);

  // Deletes an order. Related order_items, shipments, and order_documents
  // are removed automatically via "on delete cascade" foreign keys.
  const deleteOrder = useCallback(async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return { error: error.message };
    setOrders((prev) => prev.filter((o) => o.id !== id));
    return { success: true };
  }, []);

  const createOrder = useCallback(async ({ client_id, status = 'Confirmed', incoterm = 'FOB', payment_method = 'LC', notes = '' }) => {
    const id = generateNextOrderId(orders);
    const { data, error } = await supabase
      .from('orders')
      .insert([{ id, client_id, status, incoterm, payment_method, notes, total_value: 0, production_progress: 0 }])
      .select()
      .single();
    if (error) return { error: error.message };
    await fetchOrders();
    return { data };
  }, [orders, fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders, convertInquiryToOrder, createOrder, updateOrderStatus, updateOrderProgress, deleteOrder };
}

// ---------- Single order with full detail ----------
export function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(*), order_items(*), shipments(*), order_documents(*)')
      .eq('id', id)
      .single();

    if (error) setError(error.message);
    else setOrder(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}

// ---------- Shipment CRUD ----------
export function useShipmentActions() {
  const createShipment = useCallback(async (orderId, shipmentData) => {
    const { data, error } = await supabase
      .from('shipments')
      .insert([{ order_id: orderId, ...shipmentData }])
      .select()
      .single();
    return { data, error: error?.message };
  }, []);

  const updateShipment = useCallback(async (shipmentId, updates) => {
    const { data, error } = await supabase
      .from('shipments')
      .update(updates)
      .eq('id', shipmentId)
      .select()
      .single();
    return { data, error: error?.message };
  }, []);

  return { createShipment, updateShipment };
}

// ---------- Document checklist actions ----------
export function useDocumentActions() {
  const updateDocumentStatus = useCallback(async (docId, status) => {
    const { error } = await supabase
      .from('order_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', docId);
    return { error: error?.message };
  }, []);

  return { updateDocumentStatus };
}
