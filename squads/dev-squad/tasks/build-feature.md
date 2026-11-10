---
task: buildFeature()
responsavel: "@dev-chief"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: feature_description
    tipo: string
    origem: User Input
    obrigatorio: true
  - campo: tech_stack
    tipo: string
    origem: User Input
    obrigatorio: false

Saida:
  - campo: featureSpec
    tipo: string
    destino: Console
    persistido: false

Checklist:
  - "[ ] Requisitos funcionais definidos"
  - "[ ] Arquitetura da feature especificada"
  - "[ ] Componentes/módulos identificados"
  - "[ ] Estratégia de testes definida"
  - "[ ] Código implementado"
---

# Task: Build Feature

**Task ID:** DEV-001
**Version:** 1.0.0
**Command:** `*build-feature`
**Agent:** Dev Chief (dev-chief) → routing para especialistas
**Purpose:** Projetar e implementar uma feature completa, do requisito ao código pronto para review.

---

## Inputs

| Field | Type | Source | Required | Description |
|-------|------|--------|----------|-------------|
| feature_description | string | User prompt | Yes | Descrição da feature a construir |
| tech_stack | string | User prompt | No | Stack tecnológica (React, Android, etc.) |
| acceptance_criteria | string | User prompt | No | Critérios de aceitação |
| constraints | string | User prompt | No | Restrições técnicas ou de negócio |

---

## Execution Phases

### Phase 1: Requirements Analysis (Dev Chief)
1. Entender o problema de negócio por trás da feature
2. Identificar o stack relevante
3. Mapear os especialistas necessários
4. Identificar dependências e integrações

### Phase 2: Architecture Design
1. Projetar a estrutura de dados
2. Definir interfaces e contratos
3. Mapear os componentes/módulos
4. Identificar padrões a aplicar

### Phase 3: Implementation
1. Implementar seguindo as especificações
2. Aplicar clean code e boas práticas
3. Tratar casos de erro
4. Garantir que é testável

### Phase 4: Test Strategy (Kent C. Dodds)
1. Definir casos de teste
2. Escrever testes de integração
3. Cobrir casos de erro
4. Verificar acessibilidade se aplicável

---

## Veto Conditions

- NUNCA implementar sem entender o requisito
- NUNCA ignorar tratamento de erros
- NUNCA entregar código sem estratégia de testes
- NUNCA ignorar edge cases obvios

---

## Completion Criteria

- [ ] Feature implementada e funcional
- [ ] Código seguindo clean code e padrões do stack
- [ ] Testes escritos cobrindo casos principais
- [ ] Casos de erro tratados
- [ ] Pronto para code review
