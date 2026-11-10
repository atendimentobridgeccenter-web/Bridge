---
task: optimizePerformance()
responsavel: "@addy-osmani"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: context
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: performancePlan
    tipo: string
    destino: Console
    persistido: false
---

# Task: Optimize Performance

**Task ID:** DEV-007
**Version:** 1.0.0
**Command:** `*optimize-performance`
**Agent:** Addy Osmani (web) ou Chris Lattner (iOS) ou Dan Abramov (React runtime)
**Purpose:** Auditoria e plano de otimização de performance — web, mobile ou runtime.

---

## Routing

- **Web/browser:** `@dev-squad:addy-osmani`
- **React runtime:** `@dev-squad:dan-abramov`
- **iOS:** `@dev-squad:chris-lattner`
- **Android:** `@dev-squad:jake-wharton`

---

## Execution Phases

### Phase 1: Measure (Medir primeiro)
1. Coletar métricas atuais (Lighthouse, Profiler, Instruments)
2. Identificar os maiores problemas por impacto
3. Estabelecer baseline para medir melhoria

### Phase 2: Diagnose
1. Identificar causa raiz de cada problema
2. Estimar impacto da correção
3. Estimar esforço de implementação
4. Priorizar por ROI (impacto / esforço)

### Phase 3: Optimize
1. Implementar quick wins primeiro
2. Implementar otimizações estruturais
3. Validar melhoria com métricas

### Phase 4: Monitor
1. Configurar monitoring contínuo
2. Definir alertas para regressão de performance
3. Documentar práticas para o time

---

## Completion Criteria

- [ ] Métricas baseline coletadas
- [ ] Top problemas identificados com causa raiz
- [ ] Plano de otimização priorizado por ROI
- [ ] Quick wins implementados
- [ ] Melhoria validada com métricas
