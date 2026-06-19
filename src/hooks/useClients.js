import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Generates the next LEAD-YYYY-#### id based on existing rows
function generateNextId(existing) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((c) => c.id?.match(/^LEAD-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt(m[2], 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `LEAD-${year}-${String(next).padStart(4, '0')}`;
}

export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = useCallback(async (clientData) => {
    const id = generateNextId(clients);
    const { data, error } = await supabase
      .from('clients')
      .insert([{ id, ...clientData }])
      .select();

    if (error) {
      return { error: error.message };
    }
    setClients((prev) => [data[0], ...prev]);
    return { data: data[0] };
  }, [clients]);

  const updateClient = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      return { error: error.message };
    }
    setClients((prev) => prev.map((c) => (c.id === id ? data[0] : c)));
    return { data: data[0] };
  }, []);

  const deleteClient = useCallback(async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      return { error: error.message };
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  }, []);

  // Bulk-imports an array of client objects (e.g. parsed from a CSV).
  // Generates sequential IDs and inserts them all in one request.
  // Returns { successCount, errorCount, errors }.
  const bulkAddClients = useCallback(async (rows) => {
    const year = new Date().getFullYear();
    const existingNums = clients
      .map((c) => c.id?.match(/^LEAD-(\d{4})-(\d+)$/))
      .filter(Boolean)
      .map((m) => parseInt(m[2], 10));
    let nextNum = (existingNums.length ? Math.max(...existingNums) : 0) + 1;

    const toInsert = rows.map((row) => {
      const id = `LEAD-${year}-${String(nextNum).padStart(4, '0')}`;
      nextNum++;
      return {
        id,
        company: row.company || '',
        contact: row.contact || null,
        title: row.title || null,
        country: row.country || null,
        city: row.city || null,
        email: row.email || null,
        phone: row.phone || null,
        source: row.source || 'Other',
        products_interest: row.products_interest
          ? row.products_interest.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
        est_volume: row.est_volume || null,
        status: 'New',
        score: 50,
        assigned_to: row.assigned_to || null,
        notes: row.notes || null,
        revenue: 0,
        orders: 0,
      };
    });

    const { data, error } = await supabase.from('clients').insert(toInsert).select();

    if (error) {
      return { successCount: 0, errorCount: toInsert.length, errors: [error.message] };
    }

    await fetchClients();
    return { successCount: data.length, errorCount: 0, errors: [] };
  }, [clients, fetchClients]);

  // Bulk-delete multiple clients by ID array
  const bulkDeleteClients = useCallback(async (ids) => {
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (error) return { error: error.message };
    setClients((prev) => prev.filter((c) => !ids.includes(c.id)));
    return { success: true, count: ids.length };
  }, []);

  // Bulk-clear email addresses (keeps the contact record, just removes dead email)
  const bulkClearEmails = useCallback(async (ids) => {
    const { error } = await supabase.from('clients').update({ email: null }).in('id', ids);
    if (error) return { error: error.message };
    setClients((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, email: null } : c));
    return { success: true, count: ids.length };
  }, []);

  return { clients, loading, error, refetch: fetchClients, addClient, updateClient, deleteClient, bulkAddClients, bulkDeleteClients, bulkClearEmails };
}

export function useClient(id) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError(error.message);
        } else {
          setClient(data);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { client, loading, error };
}
