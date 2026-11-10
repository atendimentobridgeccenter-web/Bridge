---
task: apiDesign()
responsavel: "@sam-newman"
responsavel_type: Agent
atomic_layer: Task
elicit: true

Entrada:
  - campo: api_purpose
    tipo: string
    origem: User Input
    obrigatorio: true

Saida:
  - campo: apiSpec
    tipo: string
    destino: Console
    persistido: false
---

# Task: API Design

**Task ID:** DEV-005
**Version:** 1.0.0
**Command:** `*api-design`
**Agent:** Sam Newman + Uncle Bob
**Purpose:** Design de API REST com contratos, versionamento e backward compatibility.

---

## Execution Phases

### Phase 1: Domain Understanding
1. Identificar os recursos do domínio
2. Mapear as operações necessárias
3. Identificar relacionamentos entre recursos
4. Definir requisitos de autenticação/autorização

### Phase 2: API Design
1. Definir URIs (substantivos, hierarquia clara)
2. Mapear verbos HTTP corretos
3. Definir schemas de request/response
4. Definir códigos de status
5. Definir estratégia de versionamento

### Phase 3: Contract Definition
1. Escrever OpenAPI/Swagger spec
2. Definir exemplos de request/response
3. Documentar erros e códigos
4. Definir rate limiting e paginação

### Phase 4: Quality Review (Uncle Bob)
1. Verificar consistência de nomenclatura
2. Verificar separação de responsabilidades
3. Verificar que endpoints são coesos

---

## Output Format

```yaml
# OpenAPI 3.0
openapi: "3.0.0"
info:
  title: "{API Name}"
  version: "1.0.0"
paths:
  /{recurso}:
    get:
      summary: "Listar {recursos}"
      responses:
        "200":
          description: "Sucesso"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{Recurso}"
```

---

## Completion Criteria

- [ ] Todos os endpoints definidos com URIs e verbos
- [ ] Schemas de request/response completos
- [ ] Códigos de status documentados
- [ ] Estratégia de versionamento definida
- [ ] Exemplos de request/response
- [ ] Erros e casos de falha documentados
