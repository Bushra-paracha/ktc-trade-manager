import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ---------- Templates ----------
export function useEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setTemplates(data || []);
        setLoading(false);
      });
  }, []);

  return { templates, loading, error };
}

// ---------- Campaigns + Messages ----------
export function useEmailMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('email_messages')
      .select('*, clients(company, country)')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages };
}

// Replaces {{company}}, {{contact}} etc in a template string with client data
export function renderTemplate(str, client) {
  if (!str) return '';
  return str
    .replace(/\{\{company\}\}/g, client.company || '')
    .replace(/\{\{contact\}\}/g, client.contact || 'Sir/Madam')
    .replace(/\{\{country\}\}/g, client.country || '')
    .replace(/\{\{city\}\}/g, client.city || '');
}

// Creates one email_messages row per selected client, then calls the
// send-campaign-email Edge Function for each one.
export async function sendOutreachEmails({ clients, subjectTemplate, bodyTemplate, senderEmail, campaignId = null }) {
  const results = [];

  for (const client of clients) {
    const subject = renderTemplate(subjectTemplate, client);
    const html = renderTemplate(bodyTemplate, client);

    // 1. Insert the message row as "Pending"
    const { data: inserted, error: insertError } = await supabase
      .from('email_messages')
      .insert([{
        campaign_id: campaignId,
        client_id: client.id,
        to_email: client.email,
        to_name: client.contact,
        subject,
        sender_email: senderEmail,
        status: 'Pending',
      }])
      .select()
      .single();

    if (insertError || !inserted) {
      results.push({ client: client.company, success: false, error: insertError?.message || 'Insert failed' });
      continue;
    }

    // 2. Call the Edge Function to actually send via Brevo
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId: inserted.id, html }),
      });

      const data = await res.json();

      if (!res.ok) {
        results.push({ client: client.company, success: false, error: data.error || 'Send failed' });
      } else {
        results.push({ client: client.company, success: true });
      }
    } catch (err) {
      results.push({ client: client.company, success: false, error: err.message });
    }
  }

  return results;
}
