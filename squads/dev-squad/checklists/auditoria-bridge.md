# Checklist de Auditoria do Bridge

Usado pelo `@dev-squad:subgerente` em `*auditar-sistema` e `*auditar-entrega`. Cada item marcado com falha vira achado com severidade, arquivo e linha.

## 1. Acesso e RLS (crítico)
- [ ] Toda tabela em `supabase/migrations/` tem `enable row level security`
- [ ] Políticas separadas para admin e professor; nenhuma `using (true)` em tabela com dado pessoal ou financeiro
- [ ] Professor só enxerga as próprias turmas/alunos
- [ ] Papel só via `app_metadata.role`; nada confia em `user_metadata` para autorizar
- [ ] Nenhum uso de `service_role` em `src/`
- [ ] Rotas `/admin` e `/professor` protegidas no front (UX), mas a regra real está na RLS

## 2. Segredos (crítico)
- [ ] `git grep -nE "sk_(live|test)_|whsec_|service_role|eyJhbGci"` sem resultados em código versionado
- [ ] `.env`, `.mcp.json` e `.claude/` no `.gitignore`
- [ ] Nenhum segredo em `.claude/settings*.json` (permissões aprovadas)

## 3. Dinheiro — Stripe e financeiro (crítico)
- [ ] `create-checkout-session` busca o preço no servidor, nunca aceita valor do cliente
- [ ] Webhook verifica assinatura (`constructEvent`) e é idempotente (tabela da migration 005)
- [ ] Só um handler de webhook ativo processa cada evento (`stripe-webhook` × `stripe-webhook-handler`: confirmar qual está ligado no Stripe)
- [ ] Cupons validados no servidor
- [ ] Matrícula/acesso liberado só após pagamento confirmado pelo webhook

## 4. Dados e migrations (alto)
- [ ] Numeração sequencial sem buracos nem duplicatas
- [ ] Nenhuma migration aplicada foi editada (`git log -p` nos arquivos antigos)
- [ ] Strings vazias passam por `emptyToNull` antes de gravar
- [ ] Chaves estrangeiras e `on delete` coerentes entre lead → contato → aluno → matrícula → turma

## 5. Qualidade do código (alto/médio)
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` limpos
- [ ] Toda mutation mostra erro (sonner) e loga no console
- [ ] Código novo busca dados por hook em `src/hooks/`
- [ ] Cores só por tokens; tela testada em tema claro e escuro
- [ ] Textos em PT-BR

## 6. Operação (médio)
- [ ] Edge Functions publicadas correspondem ao código do repo
- [ ] Variáveis de ambiente da Vercel e do Supabase completas
- [ ] Commits no padrão `feat:`/`fix:`/`refactor:`/`redesign:`

## Score
Começa em 10. Crítico: veredito BARRADO direto. Alto: −2 cada. Médio: −0,5 cada. Baixo: não desconta. Mínimo para aprovar: 7.0.
