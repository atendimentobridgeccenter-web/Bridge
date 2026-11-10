---
task: priorizar()
responsavel: "@subgerente"
responsavel_type: Agent
atomic_layer: Task
elicit: true
---

# Task: Priorizar Backlog

**Command:** `*priorizar`
**Agente:** Subgerente → entrega ao Cérebro, que transforma em OS

## Ordem de prioridade
1. Críticos (dados de aluno, dinheiro, acesso indevido, operação parada)
2. Pedidos do gerente com prazo
3. Altos (regra inegociável violada, bug com usuário real)
4. Médios (vão para `*tech-debt-sprint`)
5. Baixos (registrar)

## Saída para o Cérebro
| # | Sev. | Item | Onde | Operador provável | Critério de pronto |
|---|---|---|---|---|---|

O Cérebro abre as OS; o subgerente audita (Gate 1), libera para o operador e reverifica ao fechar (Gate 2).
