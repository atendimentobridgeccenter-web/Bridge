# Dev Squad — Output Quality Checklist

**Score mínimo para entrega: 7.0/10**

---

## Dimensões de Qualidade

### 1. Correção Funcional (peso: 30%)
- [ ] Requisito implementado corretamente
- [ ] Casos de erro tratados
- [ ] Edge cases considerados
- [ ] Nenhum bug óbvio introduzido

### 2. Qualidade de Código (peso: 25%)
- [ ] Nomenclatura revela intenção
- [ ] Funções com responsabilidade única
- [ ] Sem código duplicado
- [ ] Código autoexplicativo (comentários apenas quando necessário)

### 3. Arquitetura (peso: 20%)
- [ ] Separação de responsabilidades clara
- [ ] Baixo acoplamento, alta coesão
- [ ] Dependências apontam na direção correta
- [ ] Design é testável

### 4. Testes (peso: 15%)
- [ ] Casos principais cobertos
- [ ] Casos de erro cobertos
- [ ] Testes de comportamento, não implementação
- [ ] Testes passando

### 5. Performance & Segurança (peso: 10%)
- [ ] Sem N+1 queries ou operações desnecessariamente custosas
- [ ] Inputs validados
- [ ] Dados sensíveis protegidos
- [ ] Sem vazamento de memória óbvio

---

## Score Guide

| Score | Significado | Ação |
|-------|-------------|------|
| 9-10 | Excelente — código exemplar | Entregar |
| 7-8 | Bom — cumpre padrões | Entregar com observações |
| 5-6 | Aceitável com ressalvas | Revisar pontos críticos antes de entregar |
| 3-4 | Abaixo do padrão | Não entregar — refatorar |
| 1-2 | Reprovado | Não entregar — reescrever |

---

## Veto Conditions (reprovação imediata)

- Código sem tratamento de erros em operações críticas
- Violação de SRP em classe/componente central
- Deploy sem testes automatizados
- Credenciais ou dados sensíveis hardcoded
- Race condition não tratada em código concorrente
