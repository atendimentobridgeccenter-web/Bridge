# Auditoria de organização — como os domínios se conectam

**Data:** 10/11/2026 · **Conduzida por:** Cérebro · **Escopo:** produtos, turmas e aulas, professores, alunos e financeiro
**Base:** migrations 001–033, rotas e telas em `src/`. Nada foi alterado.

> **Resumo em uma frase:** o Bridge tem as peças de uma escola, mas elas não estão ligadas por um eixo central. Falta a **matrícula** como entidade, falta o **financeiro** como registro, e a mesma pessoa aparece em cinco lugares diferentes. Por isso o sistema parece bagunçado.

---

## 1. O que existe hoje

```
 products ─┬─ landing / formulário / checkout (jsonb)
           ├─ product_structure (módulos e aulas GRAVADAS) ── user_access (área de membros)
           └─ classes.product_id (turma ligada a um produto, opcional)

 leads (formulário) ──► students.lead_id ──► students.class_id ──► classes ──► teachers
    │                                                                 └─ class_sessions (horários)
    └── contact_key (email ou telefone, em texto) ──► contact_stages / evaluations / follow_ups

 grades ──► students   ·   coupons   ·   stripe_events
```

| Tabela | Papel real | Onde aparece |
|---|---|---|
| `students` | Pessoa **+** matrícula **+** turma **+** financeiro, numa ficha só (mais de 30 colunas) | `useStudents`, Alunos, Matrículas, Financeiro, Pessoas |
| `classes` + `class_sessions` | Turma e horários | Turmas, portal do professor |
| `leads` | Resposta de formulário + 1º pagamento | Leads, Pipeline, Contatos, Pessoas, Financeiro |
| `contact_stages` / `evaluations` / `follow_ups` | Funil comercial, ligado por **texto** (`contact_key`) | Pipeline, painel do contato |
| `products` | Produto digital **e** curso presencial ao mesmo tempo | Biblioteca, checkout, turmas |

---

## 2. Os problemas, por ordem de impacto

### 🔴 P1 — Não existe matrícula
A matrícula é um **estado da ficha do aluno** (`students.status`, `students.class_id`, `students.monthly_fee`), não um registro próprio.
- Um aluno só pode estar em **uma turma**. Quem faz JLPT e inglês vira **duas fichas** da mesma pessoa.
- Trocar de turma **apaga o passado**: não fica registrado em que turma o aluno estava, de quando a quando, nem com que mensalidade.
- Trancamento e cancelamento são campos soltos (`lock_start`, `cancel_date`, `cancel_reason`), e não eventos com histórico.
- A tela **Matrículas** é só a lista de alunos filtrada por status. Não é uma matrícula de verdade.

### 🔴 P2 — O financeiro não existe como registro
- A tela **Financeiro** soma apenas o **primeiro pagamento feito pelo formulário** (`leads.payment_status`) e estima a receita mensal multiplicando `students.monthly_fee` pelo número de alunos ativos (`FinanceiroPage.tsx:158`).
- **Não há registro de mensalidade.** O sistema não sabe quem pagou outubro, quem está atrasado, nem quanto entrou por depósito ou em dinheiro.
- A moeda está fixa em **iene** na tela (`fmtJPY`, `FinanceiroPage.tsx:12`), enquanto o checkout e os cupons trabalham com a moeda do Stripe (o código tem 12 ocorrências de `'JPY'` ou `'BRL'` escolhidas tela a tela).

### 🟠 P3 — Dados duplicados entre aluno e turma
A ficha do aluno ainda guarda cópias em texto do que pertence à turma: `teacher`, `class_schedule`, `modality`, `unit`, `meet_link`, `classroom_link`, `subject`, `jlpt_level` e `school_year` (migration 014). A tela já "herda" esses dados da turma (`StudentsPage.tsx:469`, e o próprio `useStudents.ts:50` reconhece que os campos "ficaram para trás"), mas as colunas continuam lá e podem divergir. A turma também tem horário em dois lugares: `classes.weekday/time_start/time_end` e `class_sessions`.

### 🟠 P4 — "Produto" e "aula" têm dois significados
- **Produto** é ao mesmo tempo um **curso digital** (landing, formulário, checkout e área de membros com aulas gravadas em `product_structure`) e o **curso presencial ou online** que uma turma oferece (`classes.product_id`).
- **Aula** é ao mesmo tempo a **lição gravada** da área de membros e o **encontro da turma**. Do encontro, o sistema não registra nada: não sabe se a aula aconteceu, o que foi dado, nem quem estava presente.

### 🟠 P5 — A mesma pessoa aparece em cinco telas
**Central de Clientes**, **Leads CRM**, **Pipeline**, **Contatos** (que tem rota, mas não aparece no menu) e **Alunos**, além de **Matrículas**. O vínculo entre lead, contato, avaliação e aluno é um **texto** (`contact_key`, que é o email ou o telefone em minúsculas). Se a pessoa troca de email, perde o histórico. Não existe um perfil único que mostre a pessoa da primeira conversa até a turma atual.

### 🟡 P6 — Duas avaliações de nível
Já existe a **avaliação com especialista** (`evaluations`, com `recommended_level` e `recommended_class_id`, no painel do contato). A **avaliação de nivelamento online** (OS-010 a OS-013) grava o nível direto na ficha do aluno. Sem ligar as duas, haverá dois "níveis recomendados" que podem discordar.

### 🟡 P7 — O menu é organizado por tela, não pelo trabalho da escola
Os grupos misturam comercial com escola ("Pessoas" tem Leads, Pipeline, Alunos e Turmas), há seis selos "Novo" fixos e a palavra "Biblioteca" esconde os cursos.

---

## 3. Estrutura proposta

### O eixo: a jornada de uma pessoa
```
 Contato ──► Avaliação de nível ──► Matrícula ──► Aulas · presença · notas ──► Rematrícula / trancamento / saída
                                       │
                                       └──► Cobranças mensais ──► Recebimentos
```
Tudo pendura na **matrícula**: ela liga **quem** (aluno), **o quê** (curso), **onde e quando** (turma) e **quanto** (cobranças).

### Modelo de dados alvo
| Domínio | Tabela | O que guarda | Situação |
|---|---|---|---|
| Pessoas | `contacts` | Identidade única: nome, email, telefone, responsável. Substitui o `contact_key` em texto | **nova** |
| | `students` | Só o que é do aluno como pessoa (nascimento, documentos, observações) + `contact_id` | **enxugar** |
| | `teachers` | Como está | ok |
| Catálogo | `products` | Ganha `kind`: `curso` (presencial ou online, com turma) ou `digital` (área de membros) | **ajustar** |
| Escola | `classes` | Turma: curso, nível, professor, modalidade, capacidade. Horário **só** em `class_sessions` | **enxugar** |
| | `enrollments` | **Matrícula:** aluno × turma, início, fim, status, mensalidade, desconto, forma de pagamento. Histórico de trocas, trancamentos e saídas | **nova** |
| | `lessons` + `attendance` | Aula dada (turma, data, professor, conteúdo) e presença por matrícula | **nova, fase 3** |
| | `grades` | Passa a apontar para a matrícula | **ajustar** |
| | `evaluations` | Avaliação de nível, com especialista **ou** online, num só lugar | **ajustar** |
| Financeiro | `charges` | **Cobrança:** matrícula, mês de referência, valor, vencimento, status (aberta, paga, atrasada, cancelada), forma, comprovante. Stripe, depósito e dinheiro caem aqui | **nova** |

### Menu proposto
| Grupo | Telas |
|---|---|
| **Hoje** | O que precisa de ação: cobranças vencidas, avaliações do dia, matrículas para revisar, aulas sem chamada |
| **Comercial** | Contatos (lista e funil numa tela só, com perfil único) · Avaliações de nível |
| **Escola** | Alunos · Matrículas · Turmas · Professores · Aulas e presença |
| **Financeiro** | Cobranças · Recebimentos · Cupons |
| **Cursos** | Cursos e páginas de venda (landing, formulário, checkout) · Área de membros |
| **Configurações** | |

Somem do menu: Central de Clientes, Leads CRM e Pipeline (viram **Contatos**), Biblioteca (vira **Cursos**) e Acessos (vira **Área de membros**).

---

## 4. Plano em fases
| Fase | Entrega | Lado |
|---|---|---|
| **1 — Fundação** | `enrollments` com migração dos alunos atuais (uma matrícula por aluno, a partir de `class_id`, `status` e `monthly_fee`) · `charges` e geração das mensalidades do mês · `contacts` com migração do `contact_key` | back |
| **2 — Telas que organizam** | Perfil único da pessoa · Matrícula como tela central · Financeiro real (cobranças, atrasos, baixa manual de depósito e dinheiro) · Novo menu | front |
| **3 — Sala de aula** | Aulas e presença no portal do professor · Notas ligadas à matrícula | back + front |
| **4 — Limpeza** | Remover as colunas duplicadas da ficha do aluno e da turma, depois de um ciclo com tudo funcionando | back |

Cada fase vira um conjunto de OS. Nenhuma fase apaga dado: as colunas antigas só saem na fase 4.

### Impacto nas OS em andamento
- **OS-010 a OS-013 (avaliação de nivelamento):** continuam válidas. Com o modelo novo, o nível passa a morar na avaliação e na matrícula, e não só na ficha. A OS-010 precisa de um adendo: a avaliação online também cria um registro em `evaluations`.
- **OS-014:** sem impacto.

---

## 5. Design
A nova direção visual parte da identidade do Bridge (logo, site e materiais) e está no design system publicado em https://claude.ai/artifact/TbgRFtHiuJM7aPANFgcrue. Uma primeira proposta, a "Caderno", foi descartada em 10/11 por não parecer moderna. As telas de exemplo (Hoje e Ficha do aluno) já seguem o modelo desta auditoria. Diagnóstico do visual atual: 688 cores escritas direto no código, 22 tamanhos de fonte (a maioria de 10 a 13px) e só 2 componentes compartilhados (`DeleteButton`, `ThemeToggle`).

## 6. Decisões do Everton antes das OS
1. **Mensalidade:** como ela é cobrada hoje? Depósito mensal, dinheiro, Stripe recorrente? Qual é o dia de vencimento?
2. **Moeda:** o financeiro da escola é só em iene, ou também em real?
3. **Mais de uma turma:** um aluno pode fazer mais de uma matéria ou turma ao mesmo tempo?
4. **Presença:** o professor deve fazer chamada no portal dele?
5. **Área de membros:** os cursos digitais com aulas gravadas ainda são vendidos, ou podem sair do menu principal?
