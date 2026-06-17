// Supabase Edge Function: check-email-replies
//
// Connects to one or more KTC cPanel mailboxes via IMAP, looks for new
// messages in each, and matches them against previously sent outreach
// emails (by sender address). When a match is found, it logs the reply
// and marks the original email_messages row as "Replied".
//
// This function is designed to be called periodically (e.g. every
// 10-15 minutes) via a scheduled trigger (cron), or manually from the
// app's Outreach page with a "Check for replies" button.
//
// Required secrets (set via `supabase secrets set`):
//   IMAP_HOST        - e.g. mail.kassamtradingcompany.com (shared by all mailboxes)
//   IMAP_PORT        - e.g. 993
//   IMAP_MAILBOXES    - comma-separated list of "email:password" pairs, e.g.:
//                        exports@kassamtradingcompany.com:pass1,sales@kassamtradingcompany.com:pass2
//
// Uses the ImapFlow library (Deno-compatible via npm: specifier).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { ImapFlow } from 'npm:imapflow@1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const IMAP_HOST = Deno.env.get('IMAP_HOST');
const IMAP_PORT = Number(Deno.env.get('IMAP_PORT') || '993');

// Parse "user1:pass1,user2:pass2" into an array of { user, pass } objects
function parseMailboxes() {
  const raw = Deno.env.get('IMAP_MAILBOXES') || '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(':');
      return {
        user: entry.slice(0, idx),
        pass: entry.slice(idx + 1),
      };
    })
    .filter((m) => m.user && m.pass);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const mailboxes = parseMailboxes();

  if (mailboxes.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No mailboxes configured. Set IMAP_MAILBOXES secret.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const overallResults = [];

  for (const mailbox of mailboxes) {
    const results = await checkMailbox(supabase, mailbox.user, mailbox.pass);
    overallResults.push({ mailbox: mailbox.user, ...results });
  }

  return new Response(JSON.stringify({ results: overallResults }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function checkMailbox(supabase, IMAP_USER, IMAP_PASSWORD) {
  const results = { checked: 0, newReplies: 0, matched: 0, errors: [] };

  let client;
  try {
    client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: IMAP_USER, pass: IMAP_PASSWORD },
      logger: false,
    });

    await client.connect();

    // Get or create sync state for this mailbox
    const { data: syncState } = await supabase
      .from('imap_sync_state')
      .select('*')
      .eq('mailbox', IMAP_USER)
      .maybeSingle();

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for messages newer than the last processed UID,
      // or just unseen messages on first run.
      const searchCriteria = syncState?.last_uid
        ? { uid: `${Number(syncState.last_uid) + 1}:*` }
        : { seen: false };

      let highestUid = syncState?.last_uid ? Number(syncState.last_uid) : 0;

      for await (const message of client.fetch(searchCriteria, {
        envelope: true,
        source: true,
        uid: true,
      })) {
        results.checked++;

        const fromAddress = message.envelope?.from?.[0]?.address?.toLowerCase();
        const subject = message.envelope?.subject || '';
        const uid = message.uid;

        if (uid > highestUid) highestUid = uid;

        if (!fromAddress) continue;

        // Try to find a previously sent message to this same address
        // that hasn't already been marked as replied, most recent first.
        const { data: candidates } = await supabase
          .from('email_messages')
          .select('id, status')
          .ilike('to_email', fromAddress)
          .order('sent_at', { ascending: false })
          .limit(1);

        if (!candidates || candidates.length === 0) {
          continue; // No matching sent email — likely unrelated inbound mail
        }

        const matchedMessage = candidates[0];
        results.matched++;

        // Parse basic body text from the raw source (best-effort, simple approach)
        const rawSource = message.source ? new TextDecoder().decode(message.source) : '';
        const bodyText = extractPlainTextBody(rawSource);

        // Insert the reply record
        const { error: insertError } = await supabase.from('email_replies').insert([{
          message_id: matchedMessage.id,
          from_email: fromAddress,
          subject,
          body_text: bodyText.slice(0, 5000), // cap length for sanity
          imap_uid: String(uid),
        }]);

        if (!insertError) {
          results.newReplies++;
          // Mark the original message as Replied (highest priority status)
          await supabase
            .from('email_messages')
            .update({ status: 'Replied', replied_at: new Date().toISOString() })
            .eq('id', matchedMessage.id);
        }
      }

      // Update sync state with the highest UID we've now processed
      await supabase
        .from('imap_sync_state')
        .upsert(
          { mailbox: IMAP_USER, last_uid: String(highestUid), last_checked_at: new Date().toISOString() },
          { onConflict: 'mailbox' }
        );
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    results.errors.push(err.message);
    try { await client?.logout(); } catch (_) {}
  }

  return results;
}

// Very basic plain-text extraction: looks for a text/plain MIME part,
// falls back to stripping HTML tags from the raw source if not found.
function extractPlainTextBody(rawSource) {
  const plainMatch = rawSource.match(/Content-Type: text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\r?\n--)/i);
  if (plainMatch) {
    return plainMatch[1].trim();
  }
  // Fallback: strip HTML tags crudely
  const stripped = rawSource.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return stripped.slice(0, 2000).trim();
}
