// Supabase Edge Function: create-meet-event
// Runtime: Deno
//
// ATENÇÃO — ESTE CÓDIGO NUNCA FOI EXECUTADO.
// Depende de credenciais do Google Workspace que ainda não existem, então nada
// aqui foi verificado contra a API real. Trate como ponto de partida a validar,
// não como código em produção. O teste está descrito no fim deste arquivo.
//
// O que faz:
//   Cria (ou reagenda) o evento no Google Calendar da avaliação, com link do
//   Google Meet, e grava o link de volta em evaluations.meet_link.
//
// Modelo de autenticação: conta de serviço com delegação em todo o domínio.
//   Foi a escolha em vez de OAuth por refresh token porque não depende de
//   consentimento interativo nem de um token que expira ou é revogado quando a
//   pessoa que autorizou sai da empresa. A conta de serviço impersona um usuário
//   do Workspace (GOOGLE_CALENDAR_IMPERSONATE_EMAIL) — necessário porque conta
//   de serviço sozinha não consegue criar conferência do Meet.
//
// Modelo de segurança:
//   1. Exige JWT de usuário com app_metadata.role = 'admin'. Não é função
//      pública: criar eventos de calendário em nome da escola e disparar convite
//      por e-mail é ação que não pode ficar aberta ao anon.
//   2. Só o evaluation_id vem do cliente. Data, duração, convidados e título são
//      lidos do banco com service_role — o cliente não escolhe para quem o
//      convite vai.
//
// Segredos necessários (supabase secrets set):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL        client_email do JSON da conta de serviço
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  private_key do mesmo JSON (PEM PKCS#8)
//   GOOGLE_CALENDAR_IMPERSONATE_EMAIL   usuário do Workspace que será o dono
//   GOOGLE_CALENDAR_ID                  opcional, padrão 'primary'
//   GOOGLE_CALENDAR_TIMEZONE            opcional, padrão 'Asia/Tokyo'

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const SA_EMAIL     = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? ''
const SA_KEY       = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? ''
const IMPERSONATE  = Deno.env.get('GOOGLE_CALENDAR_IMPERSONATE_EMAIL') ?? ''
const CALENDAR_ID  = Deno.env.get('GOOGLE_CALENDAR_ID') ?? 'primary'
const TIMEZONE     = Deno.env.get('GOOGLE_CALENDAR_TIMEZONE') ?? 'Asia/Tokyo'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

// ── JWT da conta de serviço ───────────────────────────────────

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlText(text: string): string {
  return b64url(new TextEncoder().encode(text))
}

// A private_key vem do JSON com \n literais quando passa por variável de
// ambiente; sem desescapar, o PEM não decodifica.
function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const raw = atob(body)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss:   SA_EMAIL,
    sub:   IMPERSONATE,          // é isto que ativa a delegação no domínio
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const unsigned = `${b64urlText(JSON.stringify(header))}.${b64urlText(JSON.stringify(claims))}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(SA_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )

  const assertion = `${unsigned}.${b64url(new Uint8Array(sig))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    // O erro do Google aqui é quase sempre delegação não autorizada no Workspace
    // ou escopo ausente na configuração do client ID.
    throw new Error(`Falha ao obter token do Google: ${JSON.stringify(data)}`)
  }
  return data.access_token as string
}

// ── Handler ───────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    for (const [name, value] of Object.entries({
      GOOGLE_SERVICE_ACCOUNT_EMAIL:       SA_EMAIL,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: SA_KEY,
      GOOGLE_CALENDAR_IMPERSONATE_EMAIL:  IMPERSONATE,
    })) {
      if (!value) return json({ error: `Segredo ausente: ${name}` }, 500)
    }

    // ── 1. Só admin autenticado ──────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Autenticação obrigatória.' }, 401)
    }

    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) return json({ error: 'Sessão inválida.' }, 401)
    if (user.app_metadata?.role !== 'admin') {
      return json({ error: 'Apenas administradores podem gerar o convite.' }, 403)
    }

    // ── 2. Dados vêm do banco, não do cliente ────────────────────
    const { evaluationId } = await req.json().catch(() => ({ evaluationId: null }))
    if (typeof evaluationId !== 'string' || !evaluationId) {
      return json({ error: 'evaluationId é obrigatório.' }, 400)
    }

    const { data: ev, error: evErr } = await supabaseAdmin
      .from('evaluations')
      .select(`id, contact_key, scheduled_at, duration_minutes, calendar_event_id,
               specialist:teachers(name, email),
               lead:leads(name, email)`)
      .eq('id', evaluationId)
      .single()

    if (evErr || !ev)        return json({ error: 'Avaliação não encontrada.' }, 404)
    if (!ev.scheduled_at)    return json({ error: 'Defina a data e hora antes de gerar o convite.' }, 400)

    const specialist = Array.isArray(ev.specialist) ? ev.specialist[0] : ev.specialist
    const lead       = Array.isArray(ev.lead)       ? ev.lead[0]       : ev.lead

    const start = new Date(ev.scheduled_at)
    const end   = new Date(start.getTime() + (ev.duration_minutes ?? 60) * 60_000)

    const attendees = [
      lead?.email       ? { email: lead.email }       : null,
      specialist?.email ? { email: specialist.email } : null,
    ].filter(Boolean)

    const alunoNome = lead?.name ?? ev.contact_key

    const body = {
      summary:     `Avaliação Bridge — ${alunoNome}`,
      description: [
        'Avaliação de nivelamento agendada pelo Bridge.',
        specialist?.name ? `Especialista: ${specialist.name}` : null,
        lead?.email      ? `Contato: ${lead.email}`           : null,
      ].filter(Boolean).join('\n'),
      start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
      end:   { dateTime: end.toISOString(),   timeZone: TIMEZONE },
      attendees,
      conferenceData: {
        createRequest: {
          // requestId determinístico: reenviar a mesma avaliação reaproveita a
          // conferência em vez de criar uma sala nova a cada clique.
          requestId: `bridge-eval-${ev.id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    // ── 3. Cria ou reagenda no Calendar ──────────────────────────
    const token = await getAccessToken()
    const base  = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`

    // PATCH quando já existe evento: preserva a sala do Meet e atualiza a data,
    // em vez de deixar o convite antigo de pé no calendário dos convidados.
    const url = ev.calendar_event_id
      ? `${base}/${encodeURIComponent(ev.calendar_event_id)}?conferenceDataVersion=1&sendUpdates=all`
      : `${base}?conferenceDataVersion=1&sendUpdates=all`

    const gRes = await fetch(url, {
      method:  ev.calendar_event_id ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const event = await gRes.json()

    if (!gRes.ok) {
      throw new Error(`Calendar respondeu ${gRes.status}: ${JSON.stringify(event)}`)
    }

    const meetLink: string | null =
      event.hangoutLink ??
      event.conferenceData?.entryPoints?.find(
        (e: { entryPointType?: string; uri?: string }) => e.entryPointType === 'video',
      )?.uri ??
      null

    // ── 4. Grava de volta ────────────────────────────────────────
    const { error: upErr } = await supabaseAdmin
      .from('evaluations')
      .update({
        meet_link:         meetLink,
        calendar_event_id: event.id ?? ev.calendar_event_id,
        meet_generated_at: new Date().toISOString(),
      })
      .eq('id', ev.id)

    if (upErr) {
      // O evento existe no Google mas o banco não registrou. Devolver o link
      // permite salvar à mão, em vez de perder o convite já criado.
      return json({
        meetLink,
        eventId: event.id,
        warning: `Evento criado, mas não foi possível gravar no banco: ${upErr.message}`,
      }, 200)
    }

    return json({ meetLink, eventId: event.id, htmlLink: event.htmlLink })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno.'
    console.error('[create-meet-event]', message)
    return json({ error: message }, 500)
  }
})

// ── Como configurar e testar ──────────────────────────────────
//
// 1. Google Cloud Console, no projeto da escola:
//      - habilitar a Google Calendar API
//      - criar uma conta de serviço e gerar chave JSON
//      - anotar o "Unique ID" (client ID numérico) da conta de serviço
//
// 2. Admin do Google Workspace → Segurança → Controle de API →
//    Delegação em todo o domínio → adicionar:
//      Client ID: <o Unique ID do passo 1>
//      Escopo:    https://www.googleapis.com/auth/calendar.events
//    Sem este passo o token falha com "unauthorized_client".
//
// 3. Publicar os segredos:
//      supabase secrets set \
//        GOOGLE_SERVICE_ACCOUNT_EMAIL="...@....iam.gserviceaccount.com" \
//        GOOGLE_CALENDAR_IMPERSONATE_EMAIL="secretaria@suaescola.com"
//      supabase secrets set --env-file <arquivo com a private key>
//    A private_key tem quebras de linha; passar por --env-file evita que o
//    shell as destrua. O código desescapa \n, então as duas formas funcionam.
//
// 4. Deploy:
//      supabase functions deploy create-meet-event
//
// 5. Teste: no Bridge, abrir um lead, agendar uma avaliação com data e hora,
//    e clicar em "Gerar link do Meet". Conferir se o evento apareceu no
//    calendário de GOOGLE_CALENDAR_IMPERSONATE_EMAIL e se o convidado recebeu
//    o convite. Depois mudar a data e gerar de novo: deve ATUALIZAR o mesmo
//    evento, não criar um segundo.
