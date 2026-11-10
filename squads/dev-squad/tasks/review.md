---
task: review()
responsavel: "@dev-chief"
responsavel_type: Agent
atomic_layer: Task
elicit: false

Entrada:
  - campo: artifact
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: reviewReport
    tipo: string
    destino: Console
    persistido: false
---

# Task: Review

**Task ID:** DEV-008
**Version:** 1.0.0
**Command:** `*review`
**Agent:** Dev Chief (dev-chief)
**Purpose:** Revisão geral de qualidade de qualquer entrega do Dev Squad — código, arquitetura, pipeline, feature.

---

## Review Checklist

### Qualidade de Código
- [ ] Nomenclatura clara e intencional
- [ ] Funções com responsabilidade única
- [ ] Sem código duplicado
- [ ] Tratamento de erros adequado

### Arquitetura
- [ ] Separação de responsabilidades clara
- [ ] Dependências apontam na direção correta
- [ ] Testabilidade considerada no design

### Testes
- [ ] Casos principais cobertos
- [ ] Testes testam comportamento, não implementação
- [ ] Casos de erro cobertos

### Segurança
- [ ] Inputs validados
- [ ] Dados sensíveis protegidos
- [ ] Autenticação/autorização implementada

---

## Output Format

```markdown
## Review Report: {artifact}

**Score Geral:** {1-10}/10
**Status:** {Aprovado / Aprovado com ressalvas / Reprovado}

### Resumo Executivo
{2-3 frases sobre o estado geral}

### Pontos Críticos
- {ponto}

### Melhorias Recomendadas
- {melhoria}

### Pontos Positivos
- {ponto}
```

---

## Completion Criteria

- [ ] Todas as dimensões avaliadas
- [ ] Score justificado
- [ ] Ações concretas para cada problema identificado
