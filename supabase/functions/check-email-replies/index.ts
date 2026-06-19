import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('check-email-replies: function started');
  console.log('IMAP_HOST:', Deno.env.get('IMAP_HOST'));
  console.log('IMAP_PORT:', Deno.env.get('IMAP_PORT'));

  const raw = Deno.env.get('IMAP_MAILBOXES') || '';
  const mailboxUsers = raw.split(',').map(e => e.split(':')[0].trim()).filter(Boolean);
  console.log('Mailbox users found:', mailboxUsers.join(', '));

  try {
    console.log('Attempting to import imapflow...');
    const { ImapFlow } = await import('npm:imapflow@1');
    console.log('ImapFlow imported OK:', typeof ImapFlow);
  } catch (err) {
    console.error('ImapFlow import FAILED:', err.message);
    return new Response(
      JSON.stringify({ error: 'ImapFlow import failed', detail: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ status: 'Import test passed', mailboxes: mailboxUsers }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
