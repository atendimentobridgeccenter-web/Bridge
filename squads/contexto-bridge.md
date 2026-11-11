# Contexto do Bridge — leitura obrigatória do dev-squad

> Única fonte de contexto válida para o dev-squad neste repositório.
> O `SYSTEM_OVERVIEW.md` descreve a versão de maio (plataforma de lançamentos) e está desatualizado: ainda vale para o stack, landing pages, forms e checkout, mas não cobre a parte de escola.

## O que é
O Bridge é o sistema de gestão do **Bridge Cultural Center**. Ele começou como plataforma de lançamentos (landing pages, quiz e checkout) e virou a operação inteira da escola: da captação do lead à sala de aula.

## Usuários e papéis
- **Admin**: equipe do Bridge. Usa tudo em `/admin`.
- **Professor**: usa o portal `/professor` (turmas, alunos, avaliações, notas).
- **Lead/visitante**: landing pages públicas (`/:slug`), formulário `/apply` e checkout.
- **Membro/aluno**: área de membros (`/my-products`, `/view/:product_slug`).
- O papel vem de `app_metadata.role` (`admin` | `professor`), gravável só pela service_role. A **autorização de verdade é a RLS no banco**; o front só escolhe a interface (`src/hooks/useRole.ts`).

## Módulos (rotas do admin)
leads e perfil do lead · pipeline/kanban de contatos (estágios em `src/lib/stageConfig.ts`) · contatos · pessoas · alunos e perfil do aluno · turmas · matrículas · financeiro · acessos · cupons · produtos (config + builder visual) · settings.
Portal do professor: home, turma, alunos.

## Stack (não trocar sem pedido explícito)
| Camada | Tecnologia |
|---|---|
| Front | React 18 + Vite + TypeScript, React Router v6, TanStack Query, Zustand |
| UI | Tailwind v3 + tokens em variáveis CSS (tema claro/escuro/sistema), Radix, Lucide, Framer Motion, DND Kit, React Flow, GrapesJS |
| Back | Supabase: Postgres + RLS, Auth, Storage |
| Funções | Supabase Edge Functions (Deno): `create-checkout-session`, `stripe-webhook`, `stripe-webhook-handler`, `sync-stripe-product`, `list-stripe-prices`, `provision-teacher-access`, `create-meet-event` |
| Pagamento | Stripe (preço validado no servidor, webhook idempotente) |
| Deploy | Vercel (front) + Supabase (back) |

## Regras de engenharia do projeto
1. **Migrations numeradas** em `supabase/migrations/NNN_nome.sql`, sempre a próxima em sequência. Nunca editar uma migration já aplicada: crie outra.
2. **Toda tabela nova nasce com RLS** e políticas para admin e professor. Nada de service_role no front.
3. **Segredos**: nunca no código, em comentário ou no comando aprovado do Claude Code. `.env`, `.mcp.json` e `.claude/` ficam fora do git.
4. **Strings vazias viram null** antes de gravar (`src/lib/emptyToNull.ts`). Já houve bug com coluna de data.
5. **Erros não podem falhar em silêncio**: toda mutation mostra o erro (sonner) e registra no console.
6. **Dados via hooks** em `src/hooks/useX.ts` (TanStack Query). Código novo vai por hook; algumas páginas antigas ainda chamam o Supabase direto e podem ser migradas aos poucos.
7. **Visual segue o design system do Bridge** (`docs/design-system/README.md`, aprovado em 10/11/2026): cores só por tokens (nada de hexadecimal), Noto Serif JP nos títulos, IBM Plex Sans JP na interface, componentes de `src/components/ui/` e logos de `public/brand/`. Testar nos temas claro e escuro.
8. Antes de entregar: `npm run typecheck`, `npm run lint` e `npm run build` limpos.
9. Commits em português, no padrão `feat:`/`fix:`/`refactor:`/`redesign:`.
10. Interface e textos em português (BR).

## Hierarquia
Everton (gerente) → **subgerente** (auditor e portão de qualidade) → dev-chief (triage e routing) → especialistas.
Toda entrega passa por `*auditar-entrega` do subgerente antes de deploy ou de chegar ao gerente. Achado crítico (dado de aluno, dinheiro, acesso indevido) é escalado ao gerente na hora. Ação irreversível em produção só com ok explícito do gerente.

## Routing do squad para este projeto
| Demanda | Agente |
|---|---|
| Auditoria, "posso subir?", status do sistema, prioridades | `subgerente` |
| Tela, componente, estado, hooks, React Query | `dan-abramov` |
| Lentidão, bundle, carregamento | `addy-osmani` |
| Schema, RLS, migrations, regras de negócio, refatoração | `uncle-bob` |
| Edge Functions, Stripe, webhooks, integrações | `sam-newman` |
| Deploy Vercel/Supabase, CI, release | `gene-kim` |
| Testes, acessibilidade, revisão de qualidade | `kent-dodds` |
| Infra pesada / mobile nativo | `kelsey-hightower`, `jake-wharton`, `chris-lattner`: **fora do escopo atual**, só se a demanda pedir |
