// Supabase Edge Function: send-campaign-email
//
// Sends a single email via Brevo's transactional email API,
// then records the result in the email_messages table.
//
// Expects a POST body:
// {
//   "messageId": "<uuid of row in email_messages>"
// }
//
// The row must already exist in email_messages with status 'Pending',
// containing: to_email, to_name, subject, sender_email, and the
// rendered HTML body (passed separately as "html" in the request).

import { createClient } from 'npm:@supabase/supabase-js@2';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messageId, html } = await req.json();

    if (!messageId || !html) {
      return new Response(
        JSON.stringify({ error: 'messageId and html are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the message row
    const { data: message, error: fetchError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return new Response(
        JSON.stringify({ error: 'Message not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Confirm the stored From address is an active sender in Brevo.
    // Never trust a sender address supplied through the browser/database alone.
    const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': BREVO_API_KEY, 'Accept': 'application/json' },
    });
    const sendersData = await sendersRes.json().catch(() => ({}));
    const senderAllowed = sendersRes.ok && (sendersData.senders || []).some(
      (sender) => sender.active !== false && sender.email?.toLowerCase() === message.sender_email?.toLowerCase()
    );
    if (!senderAllowed) {
      await supabase.from('email_messages').update({ status: 'Failed' }).eq('id', messageId);
      return new Response(
        JSON.stringify({ error: 'Sender is not active or verified in Brevo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Send via Brevo
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: message.sender_email, name: 'Kassam Trading Company' },
        to: [{ email: message.to_email, name: message.to_name || undefined }],
        subject: message.subject,
        htmlContent: html,
        tags: ['ktc-trade-manager', message.campaign_id ? `campaign-${message.campaign_id}` : 'manual'],
      }),
    });

    const brevoData = await brevoRes.json().catch(async (parseErr) => {
      const rawText = await brevoRes.clone().text().catch(() => '<unreadable>');
      console.error('Failed to parse Brevo response as JSON:', parseErr.message, 'Raw response:', rawText);
      return { parseError: parseErr.message, rawText };
    });

    if (!brevoRes.ok) {
      console.error('Brevo API error:', brevoRes.status, JSON.stringify(brevoData));

      // Mark as failed
      await supabase
        .from('email_messages')
        .update({ status: 'Failed' })
        .eq('id', messageId);

      return new Response(
        JSON.stringify({ error: 'Brevo send failed', details: brevoData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update message row with Brevo message ID and Sent status
    const brevoMessageId = brevoData.messageId || null;

    const { error: updateError } = await supabase
      .from('email_messages')
      .update({
        status: 'Sent',
        sent_at: new Date().toISOString(),
        brevo_message_id: brevoMessageId,
      })
      .eq('id', messageId);

    if (updateError) {
      return new Response(
        JSON.stringify({ warning: 'Email sent but failed to update record', details: updateError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, brevoMessageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
