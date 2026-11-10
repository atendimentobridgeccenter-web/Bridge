---
task: setupCICD()
responsavel: "@gene-kim"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: project_context
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: pipelineConfig
    tipo: string
    destino: Console
    persistido: false
---

# Task: Setup CI/CD

**Task ID:** DEV-004
**Version:** 1.0.0
**Command:** `*setup-cicd`
**Agent:** Gene Kim + Kelsey Hightower
**Purpose:** Projetar e implementar pipeline de CI/CD completo — do commit ao deploy em produção.

---

## Execution Phases

### Phase 1: Current State Assessment (Gene Kim)
1. Medir DORA metrics atuais (baseline)
2. Mapear fluxo atual de deploy
3. Identificar gargalos e pontos de falha
4. Definir metas de melhoria

### Phase 2: Pipeline Design (Gene Kim)
1. Definir stages do pipeline
2. Definir estratégia de testes automáticos
3. Definir estratégia de deploy (blue-green/canary/rolling)
4. Definir critérios de rollback

### Phase 3: Infrastructure (Kelsey Hightower)
1. Configurar cluster/infraestrutura de deploy
2. Configurar registro de containers (se aplicável)
3. Configurar secrets e variáveis de ambiente
4. Configurar health checks e probes

### Phase 4: Implementation
1. Escrever configuração do pipeline (YAML)
2. Configurar ambientes (staging, production)
3. Configurar notificações de falha
4. Documentar runbook de deploy e rollback

---

## Output

```yaml
# Pipeline configuration (GitHub Actions / GitLab CI)
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ... stages configurados
```

---

## Completion Criteria

- [ ] Pipeline configurado com todos os stages
- [ ] Testes automáticos integrados
- [ ] Deploy automático para staging
- [ ] Deploy para produção (manual trigger ou automático)
- [ ] Health checks e rollback configurados
- [ ] DORA metrics baseline e metas definidas
