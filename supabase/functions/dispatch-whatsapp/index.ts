import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type NotificationJob = {
  id: string
  recipient: string
  template_name: string
  payload: Record<string, unknown>
  attempts: number
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Missing required secret: ${name}`)
  return value
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '')
}

function watiParameters(payload: Record<string, unknown>) {
  return Object.entries(payload).map(([name, value]) => ({
    name,
    value: String(value ?? ''),
  }))
}

Deno.serve(async (request) => {
  if (request.headers.get('authorization') !== `Bearer ${Deno.env.get('AUTOMATION_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let watiEndpoint: string
  let watiToken: string
  let watiChannelNumber: string
  try {
    watiEndpoint = requiredEnv('WATI_API_ENDPOINT').replace(/\/+$/, '')
    watiToken = requiredEnv('WATI_API_TOKEN')
    watiChannelNumber = normalizePhoneNumber(requiredEnv('WATI_CHANNEL_NUMBER'))
  } catch (configurationError) {
    return Response.json({ error: String(configurationError) }, { status: 503 })
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
  for (const job of (jobs ?? []) as NotificationJob[]) {
    const { data: claimedJob, error: claimError } = await supabase
      .from('notification_outbox')
      .update({
        status: 'processing',
        attempts: job.attempts + 1,
      })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (claimError || !claimedJob) continue

    try {
      const recipient = normalizePhoneNumber(job.recipient)
      if (!recipient) throw new Error('Notification recipient is not a valid phone number')

      const response = await fetch(
        `${watiEndpoint}/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(recipient)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${watiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_name: job.template_name,
            broadcast_name: `ktc_${job.template_name}`,
            channel_number: watiChannelNumber,
            parameters: watiParameters(job.payload ?? {}),
          }),
        },
      )
      const responseBody = await response.text()
      if (!response.ok) {
        throw new Error(`Wati ${response.status}: ${responseBody.slice(0, 500)}`)
      }
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
