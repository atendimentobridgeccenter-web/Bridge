# Quadro da operação

> Mantido pelo Cérebro (abre e conclui) e pelo Subgerente (status de auditoria e revisão).
> Origem do backlog atual: `docs/auditorias/2026-11-09-auditoria-estrutura.md`.

## Em andamento

| OS | Título | Prioridade | Status | Operador |
|---|---|---|---|---|
| [OS-003](os/OS-003.md) | Um webhook só, e ele confirma o lead | 🟠 Alta | NO AR — falta conferência do Stripe | OP-02 |
| [OS-008](os/OS-008.md) | Trancar a tabela legada `bridge_leads` | 🟠 Alta | NO AR — falta conferência do Stripe | OP-02 |
| [OS-014](os/OS-014.md) | Checkout reaproveita o lead do formulário (sem duplicar) | 🟡 Média | NO AR — falta conferência do Stripe | OP-02 |
| [OS-011](os/OS-011.md) | Bloco "Avaliação de nivelamento" no construtor | 🟡 Média | NO AR — falta conferência do Everton | OP-01 |
| [OS-012](os/OS-012.md) | Avaliação de nivelamento no formulário do aluno | 🟡 Média | NO AR — falta conferência do Everton | OP-01 |
| [OS-013](os/OS-013.md) | Resultado da avaliação no perfil do lead | 🔵 Baixa | NO AR — falta conferência do Everton | OP-01 |
| [OS-023](os/OS-023.md) | Atalho de teclado do formulário marca resposta sem querer | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-005](os/OS-005.md) | Checkout do formulário usa o lead do servidor | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-007](os/OS-007.md) | Cupom do depósito bancário pela RPC | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-009](os/OS-009.md) | Remover `FormRunner` e telas mortas de `bridge_leads` | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-015](os/OS-015.md) | Fundação visual: tokens, fontes e logo | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-016](os/OS-016.md) | Biblioteca de componentes do design system | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-017](os/OS-017.md) | Casca do sistema: menu lateral, layouts e login | 🟠 Alta | NO AR — falta conferência do Everton | OP-01 |
| [OS-018](os/OS-018.md) | Telas: Hoje, Alunos e ficha do aluno | 🟡 Média | ABERTA (depende da OS-017) | — |
| [OS-019](os/OS-019.md) | Telas: Matrículas e Turmas | 🟡 Média | ABERTA (depende da OS-017) | — |
| [OS-020](os/OS-020.md) | Telas: área Comercial | 🟡 Média | ABERTA (depende da OS-017 e da OS-013) | — |
| [OS-021](os/OS-021.md) | Telas: Financeiro, Cursos, Acessos, Cupons, Configurações | 🟡 Média | ABERTA (depende da OS-017) | — |
| [OS-022](os/OS-022.md) | Telas: portal do professor e construtor de formulário | 🟡 Média | ABERTA (depende da OS-017 e das OS-011/012/013) | — |

## Backlog (ainda sem OS)

| Item da auditoria | Prioridade | Lado provável |
|---|---|---|
| Vitest + testes do fluxo de dinheiro (Médio 8) — sem o `pricingEngine` (sai na OS-009): cobrir checkout, webhook e RPCs | 🟡 | back + front |
| Avisos de hooks e código morto (Baixo 9) | 🔵 | front |
| Code-splitting do chunk inicial (Baixo 10) | 🔵 | front |
| Token de fonte monoespaçada no design system (IBM Plex Mono hoje fica fora dele) | 🔵 | design |
| Remover `.gradient-text` (efeito proibido pelo design system) | 🔵 | front |

> **Migração visual** (design system em `docs/design-system/`, aprovado em 10/11): OS-015 → OS-016 → OS-017, todas do OP-01 e em sequência. Depois, OS-018 a OS-021 em qualquer ordem; OS-022 por último. A OS-012 e a OS-013, se começarem depois da OS-016, já usam os componentes novos.
> Avaliação de nivelamento (spec em `specs/avaliacao-nivelamento.md`): OS-010 (back) e OS-011 (front) podem correr juntas; OS-012 só depois das OS-011, OS-005 **e** OS-007; OS-013 depois da OS-012. A migration da OS-010 é a 034.
> **Deploy 10/11:** ① webhook (OS-003/008) ② checkout (OS-004) ③ migration 032 (OS-006) no ar; o front `83ac13d` (OS-005/007/009) **não** foi publicado em 10/11 (push foi para o remote `lovable`). Deploy real do front: `git push origin main` (11/11). Única pendência: com o cliente, painel do Stripe + compra de teste (fecha OS-003 e OS-008).
> Alto 3 virou OS-003/004/005; Médio 6 entrou na OS-003; Alto 4 virou OS-006/007. Alto 5 virou OS-008/009 (decisão: desligar e arquivar; `bridge_leads` tem 1 registro, de 16/05/2026).

## Concluídas

| OS | Título | Concluída em |
|---|---|---|
| [OS-010](os/OS-010.md) | Nível JLPT seguro na ficha e recálculo da avaliação no servidor | 11/11/2026 |
| [OS-001](os/OS-001.md) | Fechar escalada para admin (`set_admin_role`) | 09/11/2026 |
| [OS-002](os/OS-002.md) | Exigir admin no `sync-stripe-product` | 09/11/2026 |
| [OS-006](os/OS-006.md) | Cupons fora da vista pública (RPC `validate_coupon`) | 10/11/2026 |
| [OS-004](os/OS-004.md) | Lead de checkout nasce no servidor; navegador sem acesso a pagamento | 10/11/2026 |
