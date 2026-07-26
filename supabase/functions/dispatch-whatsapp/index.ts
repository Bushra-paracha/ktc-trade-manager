import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REQUIRED_TEMPLATES = ['order_status_update', 'repeat_order_reminder'] as const

type NotificationJob = {
  id: string
  recipient: string
  template_name: string
  payload: Record<string, unknown>
  attempts: number
  scheduled_for: string
  status: 'pending' | 'failed'
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

async function watiRequest(
  endpoint: string,
  token: string,
  path: string,
  init: RequestInit = {},
) {
  return fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

async function checkWatiTemplates(
  endpoint: string,
  token: string,
  channelNumber: string,
) {
  const response = await watiRequest(
    endpoint,
    token,
    `/api/v1/getMessageTemplates?pageSize=100&pageNumber=1&channelPhoneNumber=${encodeURIComponent(channelNumber)}`,
  )
  const responseBody = await response.text()
  if (!response.ok) {
    throw new Error(`Wati template check ${response.status}: ${responseBody.slice(0, 500)}`)
  }

  const normalizedBody = responseBody.toLowerCase()
  const templates = REQUIRED_TEMPLATES.map((name) => ({
    name,
    present: normalizedBody.includes(name),
  }))

  return {
    connected: true,
    templates,
    ready: templates.every(({ present }) => present),
  }
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

  const url = new URL(request.url)
  if (url.searchParams.get('mode') === 'health') {
    try {
      return Response.json(await checkWatiTemplates(watiEndpoint, watiToken, watiChannelNumber))
    } catch (healthError) {
      return Response.json({ connected: false, error: String(healthError) }, { status: 502 })
    }
  }

  const templateHealth = await checkWatiTemplates(watiEndpoint, watiToken, watiChannelNumber)
  if (!templateHealth.ready) {
    return Response.json({
      error: 'Required Wati templates are missing',
      templates: templateHealth.templates,
    }, { status: 503 })
  }

  const { error: automationError } = await supabase.rpc('process_order_automation')
  if (automationError) {
    return Response.json({ error: automationError.message }, { status: 500 })
  }

  const { data: jobs, error } = await supabase
    .from('notification_outbox')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 3)
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
      .eq('status', job.status)
      .select('id')
      .maybeSingle()

    if (claimError || !claimedJob) continue

    try {
      const recipient = normalizePhoneNumber(job.recipient)
      if (!recipient) throw new Error('Notification recipient is not a valid phone number')

      const response = await watiRequest(
        watiEndpoint,
        watiToken,
        `/api/v1/sendTemplateMessage?whatsappNumber=${encodeURIComponent(recipient)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            template_name: job.template_name,
            broadcast_name: `ktc_${job.template_name}_${job.id}`,
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
      const retryable = job.attempts + 1 < 3
      await supabase.from('notification_outbox').update({
        status: 'failed',
        scheduled_for: retryable
          ? new Date(Date.now() + (job.attempts + 1) * 15 * 60 * 1000).toISOString()
          : job.scheduled_for,
        last_error: String(sendError),
      }).eq('id', job.id)
    }
  }

  return Response.json({ processed: jobs?.length ?? 0, sent })
})
