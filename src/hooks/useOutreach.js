import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ---------- Templates ----------
export function useEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) setError(error.message);
    else setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refetch: fetchTemplates };
}

// ---------- Campaigns + Messages ----------
export function useEmailMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingReplies, setCheckingReplies] = useState(false);
  const [checkError, setCheckError] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('email_messages')
      .select('*, clients(company, country), email_replies(*)')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Calls the check-email-replies Edge Function, which connects to the
  // KTC mailboxes via IMAP and matches new replies to sent messages.
  const checkForReplies = useCallback(async () => {
    setCheckingReplies(true);
    setCheckError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-email-replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckError(data.error || 'Failed to check replies');
      } else {
        await fetchMessages();
      }
      setCheckingReplies(false);
      return data;
    } catch (err) {
      setCheckError(err.message);
      setCheckingReplies(false);
      return { error: err.message };
    }
  }, [fetchMessages]);

  return { messages, loading, error, refetch: fetchMessages, checkForReplies, checkingReplies, checkError };
}

// Calls the sync-brevo-templates Edge Function to pull in any templates
// created directly in Brevo's own template editor.
export async function syncTemplatesFromBrevo() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-brevo-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || 'Failed to sync templates' };
  }
  return { data };
}
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
        body_html: html,
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

// Retries a single failed/bounced message by re-calling the send function
// against the SAME email_messages row, reusing its stored body_html so the
// original content (with merge tags already applied) is sent again exactly as before.
export async function retryMessage(message) {
  if (!message.body_html) {
    return { success: false, error: 'No stored email content to retry (this message was sent before retry support was added).' };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Reset status to Pending before retrying, so it's clear a retry is in-flight
    await supabase.from('email_messages').update({ status: 'Pending', bounce_reason: null }).eq('id', message.id);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messageId: message.id, html: message.body_html }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Retry failed' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Retries every currently Failed message in one go, returning a summary.
export async function retryAllFailed(failedMessages) {
  const results = [];
  for (const msg of failedMessages) {
    const result = await retryMessage(msg);
    results.push({ id: msg.id, company: msg.clients?.company || msg.to_email, ...result });
  }
  return results;
}
