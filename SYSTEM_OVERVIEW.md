# Bridge — Documentação de Arquitetura do Sistema

> Documento para onboarding de IA assistente (Gemini, GPT, etc.)
> Descreve a estrutura completa do app: stack, schema, rotas, componentes e fluxos.

---

## 1. Visão Geral

**Bridge** é uma plataforma no-code/low-code para lançamentos digitais. Permite ao administrador:

1. Criar **Landing Pages** com editor visual por blocos (Hero, Features, CTA)
2. Criar **Forms/Quizzes** multi-etapa com lógica condicional e precificação dinâmica
3. Configurar **Checkout** via Stripe (preço validado server-side)
4. Gerenciar uma **Área de Membros** com módulos e aulas

O app tem três contextos de usuário:
- **Admin** — cria e configura produtos, landing pages, formulários
- **Lead/Visitante** — preenche formulários públicos, vai para checkout
- **Membro** — acessa conteúdo dos produtos após compra

---

## 2. Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS v3 + `cn()` (clsx + tailwind-merge) |
| Animações | Framer Motion v11 |
| Drag-and-drop | DND Kit (core + sortable) |
| Roteamento | React Router v6 (lazy + Suspense) |
| Backend/DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/senha + magic link) |
| Edge Functions | Supabase Functions (Deno runtime) |
| Pagamentos | Stripe (Checkout Sessions + Webhooks) |
| Deploy | Vercel (frontend) + Supabase (backend) |
| Ícones | Lucide React |

---

## 3. Estrutura de Diretórios

```
Bridge/
├── src/
│   ├── App.tsx                          # Router raiz com todas as rotas
│   ├── main.tsx                         # Entry point React
│   ├── index.css                        # Estilos globais Tailwind
│   │
│   ├── lib/
│   │   ├── types.ts                     # Todas as interfaces TypeScript do sistema
│   │   ├── supabase.ts                  # Client Supabase (com fallback seguro)
│   │   ├── cn.ts                        # Utilitário de classes CSS
│   │   └── pricingEngine.ts             # Lógica de precificação dinâmica
│   │
│   ├── pages/
│   │   ├── Login.tsx                    # Login + recuperação de senha (3 telas)
│   │   ├── ResetPassword.tsx            # Tela de redefinição de senha
│   │   ├── LandingPage.tsx              # Renderizador público de landing pages
│   │   ├── Apply.tsx                    # Entrada pública do formulário/quiz
│   │   ├── Success.tsx                  # Página de sucesso pós-checkout
│   │   ├── MyProducts.tsx               # Área de membros: lista de produtos
│   │   ├── ProductViewer.tsx            # Área de membros: visualizador de produto
│   │   ├── PreviewQuizz.tsx             # Preview de desenvolvimento do quiz
│   │   └── admin/
│   │       ├── AdminHome.tsx            # Dashboard com métricas
│   │       ├── Products.tsx             # CRUD de produtos
│   │       ├── ProductConfigPage.tsx    # Configuração do produto (meta, preço, form)
│   │       ├── ProductBuilder.tsx       # Editor visual do produto (tabs: checkout/landing/form/estrutura)
│   │       ├── Leads.tsx                # Tabela de leads
│   │       ├── LeadsKanbanPage.tsx      # Kanban de leads por estágio
│   │       └── SettingsPage.tsx         # Configurações do admin
│   │
│   ├── components/
│   │   ├── StripePricePicker.tsx        # Picker de preços Stripe via Edge Function
│   │   ├── form-builder/
│   │   │   ├── FormBuilder.tsx          # Editor visual de formulários (node-based)
│   │   │   └── QuizzRunner.tsx          # Runner de quiz público (Typeform-style)
│   │   └── layout/
│   │       ├── AdminLayout.tsx          # Shell admin com sidebar + guard de auth
│   │       └── Sidebar.tsx              # Sidebar de navegação admin
│   │
│   ├── builder/                         # Subcomponentes do editor de landing page
│   │   ├── BlockCanvas.tsx              # Canvas drag-and-drop para blocos
│   │   ├── BlockPalette.tsx             # Paleta de tipos de bloco disponíveis
│   │   ├── BuilderHeader.tsx            # Toolbar do builder (salvar, publicar)
│   │   ├── PropertiesPanel.tsx          # Painel de propriedades do bloco selecionado
│   │   └── tabs/
│   │       ├── CheckoutTab.tsx          # Aba: configuração de checkout (Stripe)
│   │       ├── LandingPageTab.tsx       # Aba: editor de landing page
│   │       └── StructureTab.tsx         # Aba: módulos/aulas do produto
│   │
│   ├── blocks/                          # Blocos renderizáveis da landing page
│   │   ├── HeroBlock.tsx                # Bloco Hero (título, subtítulo, CTA, fundo)
│   │   ├── FeaturesBlock.tsx            # Bloco de features com ícones
│   │   ├── CallToActionBlock.tsx        # Bloco CTA (título, botão)
│   │   └── index.ts                     # Re-exporta todos os blocos
│   │
│   ├── form/                            # Componentes do runner de formulário público
│   │   ├── FormRunner.tsx               # Orquestrador: progressão de steps + pricing
│   │   ├── FormStepView.tsx             # Renderiza uma pergunta (text/email/select/etc)
│   │   └── OrderSummary.tsx             # Resumo do pedido com preço calculado
│   │
│   └── members/                         # Componentes da área de membros
│       ├── ModuleSidebar.tsx            # Sidebar de módulos e aulas
│       └── LessonView.tsx               # Renderiza uma aula (vídeo/texto/download)
│
├── supabase/
│   ├── functions/
│   │   ├── create-bridge-checkout/      # Checkout para bridge_forms (legacy)
│   │   ├── create-checkout-session/     # Checkout para products (atual)
│   │   ├── list-stripe-prices/          # Lista preços ativos do Stripe
│   │   └── stripe-webhook-handler/      # Processa webhook do Stripe
│   └── migrations/
│       ├── 001_launch_engine.sql        # Schema: landing_pages + bridge_leads
│       ├── 002_bridge_forms.sql         # Schema: bridge_forms + alterações leads
│       └── 003_product_engine.sql       # Schema: products + product_structure + user_access
│
├── .env                                 # Variáveis locais (nunca commitado)
├── .env.example                         # Template de variáveis de ambiente
├── vercel.json                          # Config Vercel (rewrites para SPA)
└── package.json
```

---

## 4. Rotas do App

```
/ ──────────────────────── redirect → /admin

── AUTH ────────────────────────────────────
/login                     Login + forgot password + confirmação de e-mail enviado
/reset-password            Redefinição de senha (via link do Supabase)

── ADMIN (requer sessão autenticada) ────────
/admin                     Dashboard (AdminHome)
/admin/leads               Kanban de leads (LeadsKanbanPage)
/admin/products            Lista de produtos (Products)
/admin/products/:id        Config do produto (ProductConfigPage)
/admin/products/:id/edit   Editor visual completo (ProductBuilder)
/admin/settings            Configurações (SettingsPage)

── PÚBLICO ─────────────────────────────────
/apply                     Formulário de lead público (Apply → FormRunner)
/obrigado                  Página de sucesso pós-checkout (Success)
/:slug                     Landing page dinâmica por slug (LandingPageRenderer)
                           ⚠ deve ser a última rota (catch-all)

── ÁREA DE MEMBROS ──────────────────────────
/my-products               Lista de produtos comprados (MyProducts)
/view/:product_slug        Visualizador de produto + aulas (ProductViewer)

── DEV ─────────────────────────────────────
/preview-quizz             Preview do QuizzRunner (desenvolvimento)
```

---

## 5. Banco de Dados (Supabase PostgreSQL)

### Tabelas

#### `landing_pages`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | Identificador único |
| slug | text UNIQUE | URL pública da página |
| title | text | Nome da landing page |
| published | boolean | Visível publicamente? |
| blocks_config | jsonb | Configuração dos blocos (tipo LegacyBlocksConfig ou GrapesJSConfig) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `bridge_forms`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| name | text | Nome do formulário |
| slug | text UNIQUE | Identificador de URL |
| schema | jsonb | FormSchema completo (steps, pricing_rules, price_ids) |
| active | boolean | Formulário ativo? |

#### `bridge_leads`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| email | text | E-mail do lead |
| form_id | uuid FK → bridge_forms | Qual formulário preencheu |
| landing_page_slug | text | Slug da landing page de origem |
| answers | jsonb | Respostas por field name `{ campo: valor }` |
| current_step | int | Step atual no formulário |
| completed | boolean | Completou o formulário? |
| stripe_session_id | text | Session ID do Stripe |

#### `products`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| name | text | Nome do produto |
| slug | text UNIQUE | Slug público |
| description | text | Descrição longa |
| status | text | `draft` / `published` / `archived` |
| price_id_stripe | text | Price ID padrão do Stripe |
| thumbnail_url | text | URL da imagem (Supabase Storage `products` bucket) |
| landing_page_config | jsonb | Config dos blocos da landing page do produto |
| form_logic_config | jsonb | Config do quiz (nodes FormNode[] ou FormSchema legacy) |
| checkout_config | jsonb | Config extra de checkout (trial, upsell, etc.) |

#### `product_structure` (módulos)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| product_id | uuid FK → products | |
| title | text | Nome do módulo |
| description | text | Descrição |
| content_json | jsonb | `{ lessons: Lesson[] }` |
| order_index | int | Ordem de exibição |

#### `user_access` (compras)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| product_id | uuid FK → products | |
| purchased_at | timestamptz | |
| stripe_session_id | text | |
| UNIQUE | (user_id, product_id) | Uma compra por usuário por produto |

### Funções SQL

| Função | Descrição |
|--------|-----------|
| `is_admin()` | Retorna `true` se `auth.jwt()->'app_metadata'->>'role' = 'admin'` |
| `set_admin_role(uuid)` | Faz MERGE de `{"role":"admin"}` em `raw_app_meta_data` do usuário |

### RLS (Row Level Security)

- **products**: leitura pública de produtos `published`; admin vê tudo e pode escrever
- **product_structure**: leitura apenas para usuários com `user_access` (compra validada) ou admin
- **user_access**: usuário vê apenas suas próprias linhas; escrita exclusiva via service role (webhook)
- **bridge_leads**: admin vê todos; anon pode inserir (criação de lead)
- **bridge_forms**: leitura pública de forms `active`

---

## 6. Edge Functions (Deno)

### `list-stripe-prices`
**Rota:** `supabase.functions.invoke('list-stripe-prices')`
**Auth:** anon key (admin autenticado no frontend)
**Função:** Busca até 100 preços ativos no Stripe com `expand: ['data.product']` para trazer o nome do produto. Retorna array `StripePrice[]` ordenado por nome do produto → valor crescente.

```typescript
// Resposta
{ prices: StripePrice[] }

interface StripePrice {
  priceId:     string
  productName: string
  productId:   string
  nickname:    string | null
  amount:      number        // centavos
  currency:    string        // ex: "BRL"
  type:        'one_time' | 'recurring'
  interval:    string | null // 'month' | 'year' | null
  livemode:    boolean
}
```

### `create-checkout-session`
**Rota:** chamada pelo frontend quando usuário confirma pedido
**Auth:** anon key
**Segurança:** Valida que todos os `price_ids` enviados estão na whitelist do produto (`product.price_id_stripe` + `form_logic_config` option prices). Rejeita com 403 qualquer price_id não autorizado.
**Função:** Cria Stripe Checkout Session, persiste `stripe_session_id` no lead.

### `create-bridge-checkout`
**Rota:** chamada pelo FormRunner (fluxo bridge_forms legado)
**Auth:** anon key
**Função:** Similar ao `create-checkout-session` mas para o schema `bridge_forms`. Valida `price_ids` contra `schema.allowed_price_ids`.

### `stripe-webhook-handler`
**Rota:** endpoint registrado no Stripe Dashboard para `checkout.session.completed`
**Auth:** verifica `Stripe-Signature` header — rejeita webhooks sem assinatura válida
**Função:**
1. Parseia evento `checkout.session.completed`
2. Extrai `customer_email` e `metadata.product_id`
3. Cria ou encontra usuário no Supabase Auth
4. Insere registro em `user_access` via service role key
5. Gera magic link de acesso e loga (para envio futuro por e-mail)

---

## 7. Tipos TypeScript Principais (`src/lib/types.ts`)

### Blocos de Landing Page
```typescript
type BlockType = 'HeroBlock' | 'FeaturesBlock' | 'CallToActionBlock'

interface PageBlock { id: string; type: BlockType; order: number; props: BlockProps }
interface LegacyBlocksConfig { blocks: PageBlock[] }
interface GrapesJSConfig { type: 'grapesjs'; html: string; css: string }
type BlocksConfig = LegacyBlocksConfig | GrapesJSConfig
```

### Formulário / Quiz
```typescript
type QuestionType = 'text' | 'email' | 'select' | 'multiselect' | 'textarea'

interface FormStep {
  id: string; question: string; type: QuestionType; field: string
  placeholder?: string; required?: boolean
  options?: FormOption[]   // para select/multiselect
  nextStep?: string        // ID do próximo step (logic jump)
}

interface FormOption { value: string; label: string; nextStep: string }
```

### Engine de Precificação
```typescript
interface PricingRule {
  id: string; label: string
  condition: { step_id: string; operator: 'eq'|'neq'|'includes'|'gt'|'lt'; value: string }
  action:    { type: 'replace'|'add'; price_id: string; label: string; amount: number }
}

interface FormSchema {
  steps: FormStep[]
  default_price_id: string; default_label: string; default_amount: number
  allowed_price_ids: string[]
  pricing_rules: PricingRule[]
  success_url?: string; cancel_url?: string
}
```

### Produto
```typescript
type ProductStatus = 'draft' | 'published' | 'archived'

interface Product {
  id: string; name: string; slug: string; description: string
  status: ProductStatus
  price_id_stripe: string | null
  thumbnail_url: string | null
  landing_page_config: BlocksConfig
  form_logic_config: FormSchema | Record<string, never>
  checkout_config: CheckoutConfig | Record<string, never>
}
```

### Estrutura de Conteúdo (Membros)
```typescript
interface Lesson {
  id: string; title: string; type: 'video'|'text'|'download'
  video_url?: string; text_content?: string; file_url?: string
  duration_min?: number; order: number; free_preview?: boolean
}

interface ProductModule {
  id: string; product_id: string; title: string
  content_json: { lessons: Lesson[] }
  order_index: number
}
```

---

## 8. Variáveis de Ambiente

### Frontend (Vite — prefixo `VITE_`)
| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anon do Supabase |

### Edge Functions (Deno — sem prefixo)
| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (nunca exposta ao frontend) |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook para validar assinatura |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (usado apenas no webhook handler) |

---

## 9. Fluxos Principais

### Fluxo de Compra (Happy Path)
```
Visitante acessa /:slug (Landing Page)
  → Clica em CTA → /apply (FormRunner)
  → Preenche steps do formulário (FormStepView)
  → Pricing engine calcula preço dinamicamente
  → Visualiza OrderSummary e confirma
  → Frontend chama create-checkout-session (Edge Function)
  → Edge Function valida price_ids e cria Stripe Session
  → Visitante vai para Stripe Checkout
  → Stripe dispara webhook checkout.session.completed
  → stripe-webhook-handler cria usuário Supabase + insere user_access
  → Visitante recebe magic link para /my-products
```

### Fluxo Admin: Criar Produto
```
Admin loga em /login
  → AdminLayout verifica sessão (redireciona para /login se não autenticada)
  → /admin/products → clica "Novo Produto" → cria registro draft
  → /admin/products/:id (ProductConfigPage) → configura nome, slug, descrição
  → /admin/products/:id/edit (ProductBuilder) com 4 abas:
      Checkout: seleciona Price ID via StripePricePicker
      Landing Page: editor visual de blocos (drag-drop)
      Formulário: FormBuilder node-based com logic jumps
      Estrutura: adiciona módulos e aulas
  → Clica "Publicar" → status muda para published
  → Landing page acessível em /:slug
```

### Fluxo de Reset de Senha
```
/login → "Esqueceu a senha?" → tela forgot
  → inputa e-mail → supabase.auth.resetPasswordForEmail()
  → redirectTo: window.location.origin + '/reset-password'
  → Supabase envia e-mail com link
  → Link abre /reset-password → evento PASSWORD_RECOVERY disparado
  → Usuário digita nova senha → supabase.auth.updateUser()
  → Redireciona para /admin
```

---

## 10. Padrões de Código Recorrentes

### Auto-save com debounce (ProductBuilder)
```typescript
const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
const initDone = useRef(false)

// Após carregar dados: setTimeout(() => { initDone.current = true }, 100)

useEffect(() => {
  if (!initDone.current || !id) return
  if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
  autoSaveTimer.current = setTimeout(async () => {
    await supabase.from('products').update({ ... }).eq('id', id)
    setSaved(true)
  }, 1200)
  return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
}, [watchedState])
```

### Guard de autenticação (AdminLayout)
```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) navigate('/login', { replace: true })
    else setReady(true)
  })
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
    if (!session) navigate('/login', { replace: true })
  })
  return () => subscription.unsubscribe()
}, [navigate])
```

### Validação de preços server-side (Edge Function)
```typescript
// NUNCA confiar em price_ids do frontend — sempre validar no servidor
const allowed = new Set([product.price_id_stripe, ...optionPriceIds])
for (const id of requestedPriceIds) {
  if (!allowed.has(id)) return json({ error: 'price_id not allowed' }, 403)
}
```

---

## 11. Dependências Principais

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^9.0.0",
  "@supabase/supabase-js": "^2.49.4",
  "framer-motion": "^11.15.0",
  "grapesjs": "^0.22.16",
  "lucide-react": "^0.475.0",
  "react": "^18.3.1",
  "react-router-dom": "^6.28.2",
  "tailwind-merge": "^2.6.0",
  "uuid": "^11.0.5"
}
```

---

## 12. Constraints de Segurança (não negociáveis)

1. `.env` nunca é commitado no git
2. `SUPABASE_SERVICE_ROLE_KEY` apenas em Edge Functions (nunca no frontend)
3. `STRIPE_SECRET_KEY` apenas em Edge Functions
4. Validação de `price_ids` sempre no servidor — nunca confiar no frontend
5. `product_structure` protegido por RLS — só acessível para membros com `user_access`
6. Webhook Stripe sempre valida `Stripe-Signature` antes de processar
7. `isSupabaseConfigured` exposto para dar mensagem clara quando vars faltam no deploy
