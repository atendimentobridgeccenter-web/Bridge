---
task: auditarEntrega()
responsavel: "@subgerente"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: entrega
    tipo: string
    origem: "operador-01, operador-02 ou Cérebro"
    obrigatorio: true
    descricao: "Branch, PR, diff ou lista de arquivos alterados + o que a entrega deveria resolver"

Saida:
  - campo: veredito
    tipo: markdown
    destino: Console
    persistido: false
---

# Task: Auditar Entrega (portão de qualidade)

**Command:** `*auditar-entrega`
**Agente:** Subgerente
**Quando:** Última etapa de `*feature-development` e de `*tech-debt-sprint`, antes de qualquer deploy ou de entregar ao gerente.

## Passos
1. Confirmar o requisito original: a entrega resolve o que foi pedido?
2. Ler o diff completo (`git diff main...HEAD`).
3. Rodar `npm run typecheck`, `npm run lint`, `npm run build`.
4. Se tocou banco: migration nova e numerada? RLS e políticas na tabela nova/alterada?
5. Se tocou dinheiro (checkout, webhook, cupom, financeiro): preço no servidor, idempotência, assinatura.
6. Varrer segredos no diff.
7. Aplicar `checklists/auditoria-bridge.md` + `checklists/output-quality.md` e calcular o score.
8. Dar o veredito no formato `veredito_entrega`.

## Vereditos
- **APROVADO**: score ≥ 7.0 e nenhum achado crítico ou alto.
- **APROVADO COM RESSALVAS**: score ≥ 7.0, sem crítico; altos/médios viram itens do backlog com prazo.
- **BARRADO**: qualquer veto ou score < 7.0. Volta ao operador com a lista do que corrigir (seção 6 da OS); nova auditoria depois. Terceira volta escala ao Cérebro.
