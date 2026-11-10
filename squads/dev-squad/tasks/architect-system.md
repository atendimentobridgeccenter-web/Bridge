---
task: architectSystem()
responsavel: "@sam-newman"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: system_description
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: architectureDoc
    tipo: string
    destino: Console
    persistido: false
---

# Task: Architect System

**Task ID:** DEV-003
**Version:** 1.0.0
**Command:** `*architect-system`
**Agent:** Sam Newman + Uncle Bob
**Purpose:** Design de arquitetura de sistema — do monólito a microservices, com decisões documentadas e trade-offs explícitos.

---

## Execution Phases

### Phase 1: Context & Constraints
1. Entender o domínio de negócio
2. Identificar requisitos não-funcionais (escala, latência, disponibilidade)
3. Mapear time e capacidade operacional
4. Identificar restrições técnicas

### Phase 2: Architecture Decision
1. Monólito vs microservices vs híbrido
2. Justificar com trade-offs explícitos
3. Definir fronteiras de domínio (DDD)
4. Escolher padrões de comunicação

### Phase 3: Technical Specification
1. Definir cada serviço/módulo
2. Projetar APIs e contratos
3. Definir estratégia de dados
4. Definir estratégia de autenticação/autorização

### Phase 4: Quality Architecture (Uncle Bob)
1. Verificar que camadas têm responsabilidades claras
2. Garantir que dependências apontam para dentro
3. Identificar abstrações necessárias

---

## Completion Criteria

- [ ] Decisão de arquitetura justificada com trade-offs
- [ ] Diagrama de componentes/serviços
- [ ] Contratos de API principais definidos
- [ ] Estratégia de dados definida
- [ ] Riscos identificados com mitigações
