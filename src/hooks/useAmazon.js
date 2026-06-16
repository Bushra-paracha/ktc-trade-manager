import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAmazonListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('amazon_listings')
      .select('*, amazon_sales(*)')
      .order('created_at', { ascending: true });

    if (error) setError(error.message);
    else setListings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const addListing = useCallback(async (listingData) => {
    const { data, error } = await supabase
      .from('amazon_listings')
      .insert([listingData])
      .select()
      .single();

    if (error) return { error: error.message };
    await fetchListings();
    return { data };
  }, [fetchListings]);

  const updateListing = useCallback(async (id, updates) => {
    const { error } = await supabase
      .from('amazon_listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    await fetchListings();
    return { success: true };
  }, [fetchListings]);

  const deleteListing = useCallback(async (id) => {
    const { error } = await supabase.from('amazon_listings').delete().eq('id', id);
    if (error) return { error: error.message };
    setListings((prev) => prev.filter((l) => l.id !== id));
    return { success: true };
  }, []);

  // Logs a sales snapshot (e.g. "last 30 days: 86 units, $2,148 revenue")
  const logSales = useCallback(async (listingId, salesData) => {
    const { error } = await supabase
      .from('amazon_sales')
      .insert([{ listing_id: listingId, ...salesData }]);

    if (error) return { error: error.message };
    await fetchListings();
    return { success: true };
  }, [fetchListings]);

  return { listings, loading, error, refetch: fetchListings, addListing, updateListing, deleteListing, logSales };
}
