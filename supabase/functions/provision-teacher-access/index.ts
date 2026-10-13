// Supabase Edge Function: provision-teacher-access
// Runtime: Deno
//
// Cria a conta de acesso ao portal de um professor e a vincula à ficha dele.
//
// POR QUE ISSO É UMA FUNÇÃO, E NÃO UMA TELA DE CADASTRO:
//   Definir app_metadata.role exige a service_role, que nunca pode ir para o
//   frontend. E auto-cadastro aberto seria um buraco: qualquer pessoa criaria
//   uma conta com role 'professor' e passaria a ver alunos. Quem concede acesso
//   é o administrador, de dentro do sistema. O professor apenas faz login.
//
// Modelo de segurança:
//   1. Exige JWT de usuário com app_metadata.role = 'admin'.
//   2. O papel concedido é fixo no código ('professor'). O cliente não escolhe
//      qual papel criar — do contrário um admin comprometido escalaria para
//      criar outros admins por aqui.
//   3. teacherId tem de existir em teachers. A função não cria professor, só
//      concede acesso a quem a secretaria já cadastrou.

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

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── 1. Só admin autenticado ──────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Autenticação obrigatória.' }, 401)
    }

    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: callerUser }, error: authErr } = await caller.auth.getUser()
    if (authErr || !callerUser) return json({ error: 'Sessão inválida.' }, 401)
    if (callerUser.app_metadata?.role !== 'admin') {
      return json({ error: 'Apenas administradores podem conceder acesso.' }, 403)
    }

    // ── 2. Entrada ───────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : ''
    const email     = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password  = typeof body.password === 'string' ? body.password : ''

    if (!teacherId) return json({ error: 'teacherId é obrigatório.' }, 400)
    if (!email || !email.includes('@')) return json({ error: 'Informe um e-mail válido.' }, 400)
    if (password && password.length < 8) {
      return json({ error: 'A senha precisa ter ao menos 8 caracteres.' }, 400)
    }

    // ── 3. O professor tem de existir ────────────────────────────
    const { data: teacher, error: tErr } = await admin
      .from('teachers')
      .select('id, name, auth_user_id')
      .eq('id', teacherId)
      .single()

    if (tErr || !teacher) return json({ error: 'Professor não encontrado.' }, 404)
    if (teacher.auth_user_id) {
      return json({ error: 'Este professor já tem acesso vinculado.' }, 409)
    }

    // ── 4. Reaproveita a conta se o e-mail já existir ────────────
    // Sem isso, dar acesso a alguém que já é usuário falharia com
    // "email already registered" e deixaria o admin sem saída pela interface.
    let userId: string | null = null
    let reused = false

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = list?.users?.find(u => u.email?.toLowerCase() === email)

    if (existing) {
      userId = existing.id
      reused = true
      // Garante o papel, mas nunca rebaixa um admin que por acaso use este e-mail.
      if (existing.app_metadata?.role !== 'admin') {
        const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
          app_metadata: { ...existing.app_metadata, role: 'professor' },
        })
        if (updErr) return json({ error: `Falha ao definir o papel: ${updErr.message}` }, 500)
      }
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: password || undefined,
        email_confirm: true,
        app_metadata: { role: 'professor' },
        user_metadata: { full_name: teacher.name },
      })
      if (createErr || !created?.user) {
        return json({ error: `Falha ao criar a conta: ${createErr?.message ?? 'erro desconhecido'}` }, 500)
      }
      userId = created.user.id
    }

    // ── 5. Vincula à ficha do professor ──────────────────────────
    const { error: linkErr } = await admin
      .from('teachers')
      .update({ auth_user_id: userId })
      .eq('id', teacherId)

    if (linkErr) {
      // A conta existe mas o vínculo falhou. Devolver o id permite colar à mão
      // no campo "ID da conta de acesso" em vez de perder a conta criada.
      return json({
        userId,
        warning: `Conta pronta, mas o vínculo falhou: ${linkErr.message}. ` +
                 `Cole este ID no campo "ID da conta de acesso": ${userId}`,
      }, 200)
    }

    return json({
      userId,
      email,
      reused,
      message: reused
        ? 'Conta existente vinculada e papel de professor aplicado.'
        : 'Conta criada e vinculada.',
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno.'
    console.error('[provision-teacher-access]', message)
    return json({ error: message }, 500)
  }
})

// ── Deploy ────────────────────────────────────────────────────
//   supabase functions deploy provision-teacher-access
//
// Não precisa de segredo novo: usa SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e
// SUPABASE_ANON_KEY, que o runtime já injeta.
