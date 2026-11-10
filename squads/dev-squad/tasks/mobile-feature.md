---
task: mobileFeature()
responsavel: "@jake-wharton"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: feature_description
    tipo: string
    origem: User Input
    obrigatorio: true
  - campo: platform
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: mobileSpec
    tipo: string
    destino: Console
    persistido: false
---

# Task: Mobile Feature

**Task ID:** DEV-006
**Version:** 1.0.0
**Command:** `*mobile-feature`
**Agent:** Jake Wharton (Android) ou Chris Lattner (iOS)
**Purpose:** Projetar e implementar feature mobile com arquitetura adequada, UI moderna e performance.

---

## Routing

- **Android (Kotlin/Compose):** `@dev-squad:jake-wharton`
- **iOS (Swift/SwiftUI):** `@dev-squad:chris-lattner`
- **Ambas:** Sequencial — Android primeiro, iOS segundo

---

## Execution Phases

### Phase 1: Requirements
1. Plataforma alvo (Android/iOS/ambas)
2. Requisitos de UI (componentes, navegação)
3. Requisitos de dados (local, remoto, offline)
4. Requisitos de performance

### Phase 2: Architecture Design
1. Definir arquitetura (MVVM + Clean)
2. Mapear camadas (UI, Domain, Data)
3. Definir gerenciamento de estado
4. Definir estratégia de navegação

### Phase 3: Implementation Spec
1. Definir Models/Entities
2. Definir ViewModel/StateHolder
3. Definir Repository e Data Sources
4. Escrever código das camadas principais

### Phase 4: Testing
1. Unit tests para ViewModel e UseCase
2. Integration tests para Repository
3. UI tests para fluxos críticos

---

## Completion Criteria

- [ ] Plataforma e arquitetura definidas
- [ ] Código das camadas principais implementado
- [ ] Gerenciamento de estado definido e implementado
- [ ] Estratégia de testes definida
- [ ] Casos de erro tratados (offline, loading, error states)
