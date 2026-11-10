---
task: codeReview()
responsavel: "@uncle-bob"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: code_or_pr
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: reviewReport
    tipo: string
    destino: Console
    persistido: false
---

# Task: Code Review

**Task ID:** DEV-002
**Version:** 1.0.0
**Command:** `*code-review`
**Agent:** Uncle Bob (uncle-bob) + Kent C. Dodds (kent-dodds)
**Purpose:** Revisão profunda de código com análise de clean code, SOLID, testes e qualidade geral.

---

## Review Dimensions

### 1. Clean Code (Uncle Bob)
- Nomenclatura revela intenção?
- Funções fazem uma coisa?
- Tamanho adequado de funções e classes?
- Comentários necessários ou código autoexplicativo?
- Código duplicado?

### 2. Arquitetura & SOLID (Uncle Bob)
- SRP — uma responsabilidade por classe?
- OCP — aberto para extensão?
- Acoplamento adequado?
- Dependências apontam para abstrações?

### 3. Testes (Kent C. Dodds)
- Testes existem?
- Testam comportamento ou implementação?
- Cobertura dos casos principais?
- Acessibilidade considerada?

### 4. Segurança & Performance
- Inputs validados?
- Nenhum dado sensível exposto?
- Performance adequada para o contexto?

---

## Output Format

```markdown
## Code Review: {arquivo/PR}

**Score:** {1-10}/10
**Status:** {Aprovado / Aprovado com ressalvas / Reprovado}

### Bloqueadores (impede merge)
- {problema}: {solução}

### Importantes (resolver antes do merge)
- {problema}: {sugestão}

### Sugestões (melhoria não bloqueante)
- {sugestão}

### Pontos Positivos
- {o que está bem}
```

---

## Completion Criteria

- [ ] Todas as dimensões de review cobertas
- [ ] Bloqueadores identificados e justificados
- [ ] Sugestões concretas e acionáveis
- [ ] Score justificado
