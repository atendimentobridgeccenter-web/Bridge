# Quadro da operação

> Mantido pelo Cérebro (abre e conclui) e pelo Subgerente (status de auditoria e revisão).
> Origem do backlog atual: `docs/auditorias/2026-11-09-auditoria-estrutura.md`.

## Em andamento

| OS | Título | Prioridade | Status | Operador |
|---|---|---|---|---|
| [OS-003](os/OS-003.md) | Um webhook só, e ele confirma o lead | 🟠 Alta | NO AR — falta conferência do Stripe | OP-02 |
| [OS-004](os/OS-004.md) | Lead de checkout nasce no servidor; navegador sem acesso a pagamento | 🟠 Alta | AGUARDANDO EVERTON | OP-02 |
| [OS-006](os/OS-006.md) | Cupons fora da vista pública (RPC `validate_coupon`) | 🟠 Alta | AGUARDANDO EVERTON (junto com OS-005/007) | OP-02 |
| [OS-008](os/OS-008.md) | Trancar a tabela legada `bridge_leads` | 🟠 Alta | NO AR — falta conferência do Stripe | OP-02 |
| [OS-005](os/OS-005.md) | Checkout do formulário usa o lead do servidor | 🟠 Alta | AGUARDANDO EVERTON | OP-01 |
| [OS-007](os/OS-007.md) | Cupom do depósito bancário pela RPC | 🟠 Alta | AGUARDANDO EVERTON | OP-01 |
| [OS-014](os/OS-014.md) | Checkout reaproveita o lead do formulário (sem duplicar) | 🟡 Média | LIBERADA (OP-02) | OP-02 |
| [OS-009](os/OS-009.md) | Remover `FormRunner` e telas mortas de `bridge_leads` | 🔵 Baixa | AGUARDANDO EVERTON | OP-01 |
| [OS-010](os/OS-010.md) | Nível JLPT seguro na ficha e recálculo da avaliação no servidor | 🟡 Média | LIBERADA (OP-02) | OP-02 |
| [OS-011](os/OS-011.md) | Bloco "Avaliação de nivelamento" no construtor | 🟡 Média | LIBERADA (OP-01) | OP-01 |
| [OS-012](os/OS-012.md) | Avaliação de nivelamento no formulário do aluno | 🟡 Média | LIBERADA (OP-01) — só depois das OS-011, OS-005 e OS-007 | OP-01 |
| [OS-013](os/OS-013.md) | Resultado da avaliação no perfil do lead | 🔵 Baixa | LIBERADA (OP-01) — só depois da OS-012 | OP-01 |

## Backlog (ainda sem OS)

| Item da auditoria | Prioridade | Lado provável |
|---|---|---|
| Vitest + testes do fluxo de dinheiro (Médio 8) — sem o `pricingEngine` (sai na OS-009): cobrir checkout, webhook e RPCs | 🟡 | back + front |
| Avisos de hooks e código morto (Baixo 9) | 🔵 | front |
| Code-splitting do chunk inicial (Baixo 10) | 🔵 | front |

> Avaliação de nivelamento (spec em `specs/avaliacao-nivelamento.md`): OS-010 (back) e OS-011 (front) podem correr juntas; OS-012 só depois das OS-011, OS-005 **e** OS-007; OS-013 depois da OS-012. A migration da OS-010 é a 034.
> **Plano de deploy (Everton):** ① ✅ OS-003 + OS-008 no ar em 10/11 (Stripe pendente com o cliente) (Stripe, migration 033, deploy `stripe-webhook-handler`) → ② OS-004 (migration 031, deploy `create-checkout-session`) → ③ front OS-005 + OS-007 + OS-009 e, logo em seguida, migration 032 (OS-006).
> Alto 3 virou OS-003/004/005; Médio 6 entrou na OS-003; Alto 4 virou OS-006/007. Alto 5 virou OS-008/009 (decisão: desligar e arquivar; `bridge_leads` tem 1 registro, de 16/05/2026).

## Concluídas

| OS | Título | Concluída em |
|---|---|---|
| [OS-001](os/OS-001.md) | Fechar escalada para admin (`set_admin_role`) | 09/11/2026 |
| [OS-002](os/OS-002.md) | Exigir admin no `sync-stripe-product` | 09/11/2026 |
