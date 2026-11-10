---
task: auditarSistema()
responsavel: "@subgerente"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: escopo
    tipo: string
    origem: User Input
    obrigatorio: false
    descricao: "Sistema inteiro (padrão) ou um módulo: financeiro, matrículas, portal do professor, checkout…"

Saida:
  - campo: relatorioAuditoria
    tipo: markdown
    destino: "docs/auditorias/AAAA-MM-DD-{escopo}.md"
    persistido: true
---

# Task: Auditar o Sistema

**Command:** `*auditar-sistema`
**Agente:** Subgerente (consulta uncle-bob, sam-newman, kent-dodds quando precisar de profundidade)

## Passos
1. Ler `squads/contexto-bridge.md`, `CLAUDE.md` e `checklists/auditoria-bridge.md`.
2. Rodar e registrar: `npm run typecheck`, `npm run lint`, `npm run build`.
3. Varrer segredos: `git grep -nE "sk_(live|test)_|whsec_|service_role|eyJhbGci"`.
4. Ler todas as migrations do escopo e montar a tabela: tabela · RLS ligada · políticas · risco.
5. Ler as Edge Functions do escopo (checkout, webhooks, provisionamento).
6. Passar pelo checklist item a item. Cada falha vira achado com severidade, `arquivo:linha` e correção sugerida.
7. Salvar o relatório em `docs/auditorias/` e montar o backlog priorizado.
8. Entregar ao gerente o resumo (formato `relatorio_gerente`) e ao Cérebro o backlog (`*priorizar`), que vira OS.

## Regras
- Só leitura. A auditoria não altera código, banco nem produção.
- Achado sem evidência não entra no relatório.
- Achado crítico vai no topo e é avisado ao gerente na hora.
