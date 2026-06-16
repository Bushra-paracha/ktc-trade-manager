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

  return { clients, loading, error, refetch: fetchClients, addClient, updateClient, deleteClient };
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
