# Operação Bridge — estrutura do time

> Como o trabalho anda neste repositório: quem pensa, quem audita, quem executa.

```
                 Everton (dono do produto)
                          │
                    ┌─────▼─────┐
                    │  CÉREBRO  │  sessão principal do Claude
                    └─────┬─────┘  analisa · decide · cria as OS · entrega
                          │ OS
                    ┌─────▼──────┐
                    │ SUBGERENTE │  audita antes (Gate 1) e depois (Gate 2)
                    └──┬──────┬──┘  não escreve código
              OS liberada    OS liberada
               ┌───▼───┐    ┌───▼───┐
               │ OP-01 │    │ OP-02 │
               │ front │    │ back  │
               └───────┘    └───────┘
```

## Papéis

| Papel | Quem é | Faz | Não faz |
|---|---|---|---|
| **Cérebro** | Sessão principal do Claude | Entende o pedido, analisa o código, decide arquitetura e escopo, quebra o trabalho em Ordens de Serviço (OS) com critérios de aceite, despacha, consolida e entrega ao Everton | Não pula o subgerente; não entrega nada que não passou no Gate 2 |
| **Subgerente** | `squads/dev-squad/agents/subgerente.md` (`@dev-squad:subgerente`) | **Gate 1:** confirma o problema no código, mapeia arquivos e riscos, escolhe o operador, devolve OS mal definida. **Gate 2:** revisa o diff, roda typecheck/lint/build, confere critérios e regras, aprova ou devolve | Não escreve código; não decide escopo |
| **Operador 01** | `squads/operacao/agents/operador-01.md` | Front-end: `src/` (páginas, componentes, hooks, stores, estilos) | Banco, Edge Functions, deploy |
| **Operador 02** | `squads/operacao/agents/operador-02.md` | Back-end e dados: `supabase/migrations`, `supabase/functions`, RLS, Stripe, integrações | Telas, deploy, aplicar migration em produção |

O **dev-squad** (`squads/dev-squad/`) é a consultoria técnica: o subgerente e os operadores usam a lente do especialista certo (Uncle Bob para schema, Sam Newman para funções, Dan Abramov para React, Kent C. Dodds para testes, Addy Osmani para performance, Gene Kim para entrega).

## Fluxo de uma OS

```
ABERTA → EM AUDITORIA → LIBERADA (OP-01|OP-02) → EM EXECUÇÃO → EM REVISÃO → APROVADA → AGUARDANDO EVERTON → CONCLUÍDA
              │                                                    │
              └─ DEVOLVIDA AO CÉREBRO (OS mal definida)             └─ DEVOLVIDA AO OPERADOR (máx. 2 voltas, depois escala ao cérebro)
```

1. **Cérebro** cria `docs/operacao/os/OS-NNN.md` a partir do template e registra no `docs/operacao/QUADRO.md`.
2. **Subgerente — Gate 1** (`*auditar-os`) preenche o parecer de auditoria e libera para um operador.
3. **Operador** executa somente o escopo, roda as checagens e preenche o relatório de entrega.
4. **Subgerente — Gate 2** (`*auditar-entrega`) revisa e dá o veredito.
5. **Cérebro** consolida e apresenta ao Everton o que mudou e o que depende dele (deploy, migration em produção, segredo, painel do Stripe).

OS que mexe em front **e** back vira duas OS encadeadas (o back primeiro). Uma OS deve caber em uma sessão de trabalho; se não couber, o cérebro quebra.

## Conversas separadas: subgerente e operadores

O **subgerente** e cada **operador** são **conversas separadas do Claude** abertas neste repositório. O Cérebro só cria e corrige OS: não audita e não executa. O subgerente só audita: não executa. A comunicação entre as conversas acontece pelos arquivos: a OS em `docs/operacao/os/` e o `docs/operacao/QUADRO.md`.

1. O Cérebro cria a OS com o status `ABERTA`. Na conversa do subgerente, o Everton manda **"Subgerente, audita as OS abertas"**. O subgerente faz o Gate 1 e libera como `LIBERADA (OP-01)` ou `LIBERADA (OP-02)`, ou devolve ao Cérebro.
2. Na conversa do operador, o Everton manda: **"Operador 0X, pega a próxima OS"**.
3. O operador lê o `QUADRO.md` e pega a primeira OS com o status `LIBERADA (OP-0X)` correspondente a ele, por ordem de prioridade. Antes de mexer em qualquer arquivo, muda o status para `EM EXECUÇÃO (OP-0X)` na OS e no quadro. **Uma OS em execução por outro operador nunca é tocada.**
4. Ao terminar, preenche as seções 5 e 7, muda o status para `EM REVISÃO` e avisa o Everton.
5. Na conversa do subgerente, o Everton manda **"Subgerente, revisa as OS em revisão"**. Ele faz o Gate 2 e muda a OS para `AGUARDANDO EVERTON` ou `DEVOLVIDA AO OPERADOR (OP-0X)`, e nesse caso o mesmo operador corrige.
6. A OS volta para o Cérebro só quando é devolvida por problema de especificação (`DEVOLVIDA AO CÉREBRO`).

Prompt para abrir a conversa do subgerente:
> Você é o Subgerente da operação do Bridge. Leia `squads/dev-squad/agents/subgerente.md`, `squads/operacao/README.md` e `CLAUDE.md`. Depois faça o Gate 1 das OS `ABERTA` e o Gate 2 das OS `EM REVISÃO` no `docs/operacao/QUADRO.md`.

Prompt para abrir a conversa de um operador:
> Você é o Operador 0X da operação do Bridge. Leia `squads/operacao/agents/operador-0X.md`, `squads/operacao/README.md` e `CLAUDE.md`. Depois pegue a próxima OS liberada para você no `docs/operacao/QUADRO.md`.

> Exceções registradas, de antes desta regra: a OS-001 e a OS-002 foram executadas e auditadas a partir da conversa do Cérebro. O Gate 1 das OS-010 a OS-013 também foi feito por um subgerente aberto pelo Cérebro. Essas OS não precisam ser refeitas nem reauditadas.

## Regras invioláveis (valem para todos)

1. **Ninguém faz deploy, push, `supabase db push` ou mexe em produção.** Isso é sempre do Everton, listado no campo "Ação do Everton".
2. Nenhum segredo em código, OS, relatório ou comando.
3. Toda tabela com RLS; migrations novas e numeradas, nunca editar as aplicadas.
4. Escopo é o da OS. Achou outra coisa? Registra em "Achados fora de escopo"; o cérebro decide se vira OS.
5. Entrega só conta com `npm run typecheck`, `npm run lint` (0 erros) e `npm run build` limpos.
6. Textos de interface em português (BR). Contexto do sistema: `squads/contexto-bridge.md`.
