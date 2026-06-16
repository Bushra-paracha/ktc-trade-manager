// Supabase Edge Function: brevo-webhook
//
// Receives webhook events from Brevo (delivered, opened, click, hard_bounce,
// soft_bounce, etc.) and updates the corresponding row in email_messages.
//
// Set this function's URL as the webhook endpoint in Brevo:
// Brevo Dashboard -> Settings -> Webhooks -> Add a webhook
// URL: https://<your-project-ref>.supabase.co/functions/v1/brevo-webhook
// Events to enable: Delivered, Opened, Click, Hard bounce, Soft bounce, Spam

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maps Brevo event names to email_messages columns/status values
const EVENT_MAP = {
  delivered: { status: 'Delivered', timestampField: 'delivered_at' },
  opened: { status: 'Opened', timestampField: 'opened_at', countField: 'open_count' },
  click: { status: 'Clicked', timestampField: 'clicked_at', countField: 'click_count' },
  hard_bounce: { status: 'Bounced', timestampField: 'bounced_at' },
  soft_bounce: { status: 'Bounced', timestampField: 'bounced_at' },
  blocked: { status: 'Bounced', timestampField: 'bounced_at' },
  spam: { status: 'Bounced', timestampField: 'bounced_at' },
};

// Status priority — don't downgrade a "better" status to a "worse" one
// e.g. if already Clicked, a later "delivered" event shouldn't revert it to Delivered
const STATUS_RANK = {
  Pending: 0,
  Sent: 1,
  Delivered: 2,
  Opened: 3,
  Clicked: 4,
  Replied: 5,
  Bounced: 6,
  Failed: 6,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Brevo sends either a single event object or an array, depending on config
    const events = Array.isArray(payload) ? payload : [payload];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results = [];

    for (const event of events) {
      const brevoMessageId = event['message-id'] || event.messageId || event['X-Mailin-custom'];
      const eventType = event.event; // e.g. "delivered", "opened", "click", "hard_bounce"

      if (!brevoMessageId || !eventType) {
        results.push({ skipped: true, reason: 'missing message-id or event', event });
        continue;
      }

      const mapping = EVENT_MAP[eventType];
      if (!mapping) {
        results.push({ skipped: true, reason: `unhandled event type: ${eventType}` });
        continue;
      }

      // Find the matching message row
      const { data: existing, error: findError } = await supabase
        .from('email_messages')
        .select('id, status, open_count, click_count')
        .eq('brevo_message_id', brevoMessageId)
        .maybeSingle();

      if (findError || !existing) {
        results.push({ skipped: true, reason: 'no matching message found', brevoMessageId });
        continue;
      }

      const update = {};

      // Only update status if the new status is "higher rank" (more advanced in funnel)
      const currentRank = STATUS_RANK[existing.status] ?? 0;
      const newRank = STATUS_RANK[mapping.status] ?? 0;
      if (newRank >= currentRank) {
        update.status = mapping.status;
      }

      if (mapping.timestampField) {
        update[mapping.timestampField] = new Date().toISOString();
      }

      if (mapping.countField) {
        update[mapping.countField] = (existing[mapping.countField] || 0) + 1;
      }

      const { error: updateError } = await supabase
        .from('email_messages')
        .update(update)
        .eq('id', existing.id);

      results.push({ updated: !updateError, messageId: existing.id, eventType, error: updateError?.message });
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
