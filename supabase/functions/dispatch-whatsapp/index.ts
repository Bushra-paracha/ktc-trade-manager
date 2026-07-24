import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (request) => {
  if (request.headers.get('authorization') !== `Bearer ${Deno.env.get('AUTOMATION_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  await supabase.rpc('process_order_automation')
  const { data: jobs, error } = await supabase
    .from('notification_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('created_at')
    .limit(25)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  let sent = 0
  for (const job of jobs ?? []) {
    await supabase.from('notification_outbox').update({
      status: 'processing', attempts: job.attempts + 1,
    }).eq('id', job.id).eq('status', 'pending')

    try {
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: job.recipient,
            type: 'template',
            template: {
              name: job.template_name,
              language: { code: 'en_US' },
              components: [{
                type: 'body',
                parameters: Object.values(job.payload).map((value) => ({
                  type: 'text', text: String(value),
                })),
              }],
            },
          }),
        },
      )
      if (!response.ok) throw new Error(await response.text())
      await supabase.from('notification_outbox').update({
        status: 'sent', sent_at: new Date().toISOString(), last_error: null,
      }).eq('id', job.id)
      sent += 1
    } catch (sendError) {
      await supabase.from('notification_outbox').update({
        status: 'failed', last_error: String(sendError),
      }).eq('id', job.id)
    }
  }

  return Response.json({ processed: jobs?.length ?? 0, sent })
})
