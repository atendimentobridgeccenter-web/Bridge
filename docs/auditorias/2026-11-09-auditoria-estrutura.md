# Auditoria de estrutura — Bridge

**Data:** 09/11/2026 · **Commit auditado:** `905a4ee` · **Conduzida por:** dev-squad (Dev Chief + Uncle Bob, Sam Newman, Dan Abramov, Addy Osmani, Gene Kim, Kent C. Dodds)

Nada foi alterado no código. Este documento é o diagnóstico e o backlog proposto.

---

## Saúde do build (Gene Kim)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ passa |
| `npm run lint` | ✅ 0 erros, ⚠️ 14 avisos (`react-hooks/exhaustive-deps`) |
| `npm run build` | ✅ passa, ⚠️ chunk inicial de 542 kB (157 kB gzip) |
| Testes automatizados | ❌ nenhum (nem framework instalado) |

---

## Achados por gravidade

### 🔴 CRÍTICO 1 — Qualquer usuário logado pode virar admin
**Onde:** `supabase/migrations/006_fix_products_rls.sql` (função `set_admin_role`)
**Especialista:** Uncle Bob

A função `public.set_admin_role(target_user_id uuid)` é `SECURITY DEFINER`, grava `role: admin` em `auth.users` e **não confere quem está chamando**. Nenhuma migration revoga o `EXECUTE`, e no Supabase as funções do schema `public` nascem executáveis por `anon` e `authenticated`. Qualquer aluno ou professor com conta pode chamar `POST /rest/v1/rpc/set_admin_role` com o próprio ID e passar a ver e editar tudo. Se o cadastro aberto do Supabase Auth estiver ligado, qualquer pessoa da internet também pode.

**Conferir em produção (SQL Editor):**
```sql
select has_function_privilege('authenticated', 'public.set_admin_role(uuid)', 'execute') as authenticated,
       has_function_privilege('anon',          'public.set_admin_role(uuid)', 'execute') as anon;
select id, email, raw_app_meta_data->>'role' as role from auth.users where raw_app_meta_data->>'role' = 'admin';
```
**Correção:** migration `030` com `revoke execute ... from public, anon, authenticated` (ou `drop function`; promover admin passa a ser só pelo SQL Editor) e `set search_path = ''`. Revisar a lista de admins atual.

### 🔴 CRÍTICO 2 — Qualquer pessoa pode trocar o preço de um produto
**Onde:** `supabase/functions/sync-stripe-product/index.ts`
**Especialista:** Sam Newman

A função não exige login. Ela roda com a service_role, cria um produto e um preço no Stripe com o `amount` recebido e **sobrescreve `products.price_id_stripe`**. O `create-checkout-session` aceita esse preço como válido. Basta o ID de um produto publicado (que é público) e a anon key (que está no front) para fazer o curso passar a custar R$ 0,01. Também permite criar cupons de 100% no Stripe.

**Correção:** exigir JWT com `app_metadata.role = 'admin'`, como já fazem `provision-teacher-access` e `create-meet-event`. Depois, conferir no Stripe se há produtos ou preços criados fora do padrão.

### 🟠 ALTO 3 — Pagamento "confirmado" pelo navegador
**Onde:** migration `018_leads_anon_confirm.sql` (política `anon_complete_lead`) + `QuizzRunner.tsx` (~linha 1436)
**Especialistas:** Uncle Bob + Sam Newman

O front marca o lead como `confirmed` quando a URL volta com `?payment_done=1`, e a política deixa o `anon` dar UPDATE em `leads` com `USING (true)`, em qualquer coluna. Na migration `022`, a mudança de `payment_status` dispara a criação de aluno. A confirmação de pagamento tem que vir só do webhook do Stripe. Dependendo de como o Postgres aplica a RLS de SELECT nesse UPDATE, a chamada do front pode estar falhando em silêncio, ou pode estar abrindo a tabela. Nenhum dos dois casos é aceitável.

**Correção:** dropar `anon_complete_lead`, remover o update do front e mostrar "pagamento em processamento" até o webhook confirmar.

### 🟠 ALTO 4 — Lista de cupons exposta
**Onde:** `010_coupons_table.sql` (política `anyone_select_coupons`)

Qualquer visitante lê a tabela `coupons` inteira: todos os códigos, inclusive inativos e de desconto alto.
**Correção:** remover o SELECT público e criar uma RPC `validate_coupon(code)` que devolve só o desconto de um código válido.

### 🟠 ALTO 5 — Tabela legada `bridge_leads` aceita UPDATE de qualquer um
**Onde:** `001_launch_engine.sql` (política `anon updates own lead`, `USING (true)`); ainda usada por `FormRunner.tsx`, `Leads.tsx` e `LeadsKanbanPage.tsx`.
**Correção:** decidir se o fluxo `FormRunner`/`bridge_leads` ainda existe. Se não existe, desligar e arquivar. Se existe, restringir a política.

### 🟡 MÉDIO 6 — Dois webhooks do Stripe com responsabilidades divididas
`stripe-webhook-handler` cria o usuário e o `user_access`, e `stripe-webhook` confirma o lead. Os dois precisam estar cadastrados no Stripe, mas a tela de Checkout (`CheckoutTab.tsx`) só manda cadastrar o `-handler`. Se só ele estiver ativo, os leads nunca são confirmados pelo servidor. Além disso, só o `-handler` tem idempotência.
**Correção:** conferir no painel do Stripe e unificar num único webhook idempotente.

### 🟡 MÉDIO 7 — Funções `SECURITY DEFINER` sem `search_path`
`is_admin()` e `set_admin_role()` (migrations 003 e 006). Corrigir na mesma migration do Crítico 1.

### 🟡 MÉDIO 8 — Zero testes no fluxo de dinheiro (Kent C. Dodds)
Nenhum teste em checkout, cupom, webhook ou matrícula, que são justamente os pontos que mexem com dinheiro e acesso.
**Correção:** instalar Vitest + Testing Library e cobrir `pricingEngine`, a validação de preço do checkout e o webhook (com payload assinado de teste).

### 🔵 BAIXO 9 — Estrutura do front (Dan Abramov)
- Arquivos grandes demais: `QuizzRunner` (2.004 linhas), `FormBuilder` (1.743), `StudentsPage` (1.257), `TurmasPage` (1.178).
- 13 arquivos chamam o Supabase direto, fora de `src/hooks` (os que mais chamam: `SettingsPage`, `QuizzRunner`, `AdminLayout`, `AdminHome`).
- 14 avisos de dependência de hooks (AdminHome, Matrículas, Acessos, Turma do professor, FormCanvas) podem gerar dado velho ou recálculo a cada render.
- Código morto: `LeadsKanbanPage.tsx` (809 linhas, sem rota) e `builder/BuilderHeader.tsx`.

### 🔵 BAIXO 10 — Performance (Addy Osmani)
O chunk inicial de 542 kB carrega em todas as páginas, inclusive a landing e o `/apply` de quem chega pelo anúncio. Os layouts `AdminLayout` e `ProfessorLayout` são importados de forma estática.
**Correção:** carregar os layouts com lazy e separar o vendor em `manualChunks`. Também tirar o `/preview-quizz` da produção.

### 🔵 BAIXO 11 — Documentação
O `SYSTEM_OVERVIEW.md` é de maio e não cobre alunos, turmas, professores, notas e financeiro. Substituir por `squads/contexto-bridge.md` ou atualizar.

---

## Backlog proposto

| Sprint | Item | Dono no squad | Esforço |
|---|---|---|---|
| **0 — hoje** | Crítico 1: migration 030 (revoke + search_path) + revisar admins | Uncle Bob | 30 min |
| **0 — hoje** | Crítico 2: auth admin no `sync-stripe-product` + deploy + revisar Stripe | Sam Newman | 30 min |
| 1 | Alto 3: confirmação de pagamento só pelo webhook | Sam Newman + Dan Abramov | 2 h |
| 1 | Alto 4: RPC de validação de cupom | Uncle Bob | 1 h |
| 1 | Alto 5: desligar ou restringir `bridge_leads` | Uncle Bob | 1 h |
| 1 | Médio 6: unificar webhooks | Sam Newman + Gene Kim | 2–3 h |
| 2 | Médio 8: Vitest + testes do fluxo de dinheiro | Kent C. Dodds | 1 dia |
| 2 | Baixo 9: avisos de hooks + código morto | Dan Abramov | 2 h |
| 3 | Baixo 9: quebrar QuizzRunner/FormBuilder e mover chamadas para hooks | Dan Abramov + Uncle Bob | contínuo |
| 3 | Baixo 10: code-splitting | Addy Osmani | 2 h |
