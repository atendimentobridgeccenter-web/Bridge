---
task: relatorioGerente()
responsavel: "@subgerente"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Saida:
  - campo: relatorio
    tipo: markdown
    destino: Console
    persistido: false
---

# Task: Relatório ao Gerente

**Command:** `*relatorio-gerente`
**Agente:** Subgerente

## Conteúdo (formato `relatorio_gerente`)
1. **Saúde geral** 🟢🟡🔴 com uma frase de motivo.
2. **Precisa da sua decisão**: só o que pelas `escalation_rules` exige o gerente, cada item com as opções e a recomendação do subgerente.
3. **Riscos abertos**: críticos e altos em linguagem de negócio ("professor consegue ver aluno de outra turma"), não técnica.
4. **Entregue desde o último relatório**: o que mudou para quem usa o sistema.
5. **Próximos passos**: top 3 do backlog.

## Regras
- Máximo de uma tela. Detalhe técnico fica no relatório de auditoria, com link.
- Base: `git log` desde o último relatório, `docs/auditorias/` e o backlog atual.
