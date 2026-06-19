import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const IMAP_HOST = Deno.env.get('IMAP_HOST');
const IMAP_PORT = Number(Deno.env.get('IMAP_PORT') || '993');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseMailboxes() {
  const raw = Deno.env.get('IMAP_MAILBOXES') || '';
  return raw.split(',').map(e => e.trim()).filter(Boolean).map(e => {
    const idx = e.indexOf(':');
    return { user: e.slice(0, idx), pass: e.slice(idx + 1) };
  }).filter(m => m.user && m.pass);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log('check-email-replies: starting');
  const mailboxes = parseMailboxes();
  console.log('Mailboxes:', mailboxes.map(m => m.user).join(', '));

  let ImapFlow;
  try {
    const mod = await import('npm:imapflow@1');
    ImapFlow = mod.ImapFlow;
    console.log('ImapFlow loaded OK');
  } catch (err) {
    console.error('ImapFlow import failed:', err.message);
    return new Response(
      JSON.stringify({ error: 'ImapFlow import failed', detail: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results = [];

  for (const mb of mailboxes) {
    console.log('Checking:', mb.user);
    const result = { mailbox: mb.user, checked: 0, newReplies: 0, newInbound: 0, errors: [] };

    let client;
    try {
      client = new ImapFlow({
        host: IMAP_HOST,
        port: IMAP_PORT,
        secure: true,
        auth: { user: mb.user, pass: mb.pass },
        logger: false,
        tls: { rejectUnauthorized: false },
      });

      await client.connect();
      console.log('Connected to:', mb.user);

      const { data: syncState } = await supabase
        .from('imap_sync_state')
        .select('*')
        .eq('mailbox', mb.user)
        .maybeSingle();

      const lock = await client.getMailboxLock('INBOX');
      let highestUid = syncState?.last_uid ? Number(syncState.last_uid) : 0;

      try {
        const criteria = syncState?.last_uid
          ? { uid: `${Number(syncState.last_uid) + 1}:*` }
          : { seen: false };

        for await (const msg of client.fetch(criteria, { envelope: true, source: true, uid: true })) {
          result.checked++;
          const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
          const fromName = msg.envelope?.from?.[0]?.name || null;
          const subject = msg.envelope?.subject || '';
          const uid = msg.uid;
          if (uid > highestUid) highestUid = uid;
          if (!from) continue;

          // Skip emails sent from our own mailboxes (avoid self-loops)
          const ourMailboxes = mailboxes.map(m => m.user.toLowerCase());
          if (ourMailboxes.includes(from)) continue;

          // Check if this UID was already processed for this mailbox
          const { data: existing } = await supabase
            .from('inbound_emails')
            .select('id')
            .eq('mailbox', mb.user)
            .eq('imap_uid', String(uid))
            .maybeSingle();
          if (existing) continue; // already logged, skip

          const raw = msg.source ? new TextDecoder().decode(msg.source) : '';
          const bodyText = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000);

          // Try to match to a previously sent campaign email
          const { data: candidates } = await supabase
            .from('email_messages')
            .select('id, status')
            .ilike('to_email', `%${from}%`)
            .order('sent_at', { ascending: false })
            .limit(1);

          if (candidates?.length) {
            // MATCHED — this is a reply to a campaign email
            const matched = candidates[0];
            const { error: insertErr } = await supabase.from('email_replies').insert([{
              message_id: matched.id,
              from_email: from,
              subject,
              body_text: bodyText,
              imap_uid: String(uid),
            }]);

            if (!insertErr) {
              result.newReplies++;
              await supabase.from('email_messages')
                .update({ status: 'Replied', replied_at: new Date().toISOString() })
                .eq('id', matched.id);

              // Also log to inbound_emails so it appears in the inbox too
              await supabase.from('inbound_emails').insert([{
                mailbox: mb.user,
                from_email: from,
                from_name: fromName,
                subject,
                body_text: bodyText,
                imap_uid: String(uid),
              }]);
            }
          } else {
            // UNMATCHED — unknown inbound, log to inbound_emails inbox

            // Try to find if this sender is already a client
            const { data: matchedClient } = await supabase
              .from('clients')
              .select('id')
              .ilike('email', `%${from}%`)
              .maybeSingle();

            await supabase.from('inbound_emails').insert([{
              mailbox: mb.user,
              from_email: from,
              from_name: fromName,
              subject,
              body_text: bodyText,
              imap_uid: String(uid),
              client_id: matchedClient?.id || null,
            }]);

            result.newInbound++;
          }
        }
      } finally {
        lock.release();
      }

      await supabase.from('imap_sync_state').upsert(
        { mailbox: mb.user, last_uid: String(highestUid), last_checked_at: new Date().toISOString() },
        { onConflict: 'mailbox' }
      );

      await client.logout();
      console.log(`Done ${mb.user}: checked=${result.checked} replies=${result.newReplies} inbound=${result.newInbound}`);

    } catch (err) {
      console.error('Error on', mb.user, ':', err.message);
      result.errors.push(err.message);
      try { await client?.logout(); } catch (_) {}
    }

    results.push(result);
  }

  return new Response(
    JSON.stringify({ results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
