---
task: auditarOS()
responsavel: "@subgerente"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: os
    tipo: arquivo
    origem: "Cérebro"
    obrigatorio: true
    descricao: "docs/operacao/os/OS-NNN.md com as seções 1–3 preenchidas"

Saida:
  - campo: parecer
    tipo: markdown
    destino: "Seção 4 da própria OS"
    persistido: true
---

# Task: Auditar OS (Gate 1)

**Command:** `*auditar-os`
**Agente:** Subgerente

## Passos
1. Ler a OS inteira e o `squads/operacao/README.md`.
2. Confirmar o problema no código com `arquivo:linha`. Se não existe ou é diferente → `DEVOLVIDA AO CÉREBRO`.
3. Mapear arquivos-alvo e dependências (`grep` por usos, migrations posteriores, triggers, políticas, chamadas no front).
4. Listar riscos: o que pode quebrar, dados de produção afetados, ordem de deploy, ação necessária do Everton.
5. Escolher o operador: OP-01 (`src/`) ou OP-02 (`supabase/`). Se mexe nos dois → devolver pedindo divisão.
6. Indicar a lente do dev-squad.
7. Preencher a seção 4 e mudar o status para `LIBERADA (OP-0X)` ou `DEVOLVIDA AO CÉREBRO`; atualizar o `docs/operacao/QUADRO.md`.

## Regras
- Só leitura no código. Escreve apenas na OS e no quadro.
- Critério de aceite vago, escopo grande demais para uma sessão ou decisão de produto pendente = devolve.
