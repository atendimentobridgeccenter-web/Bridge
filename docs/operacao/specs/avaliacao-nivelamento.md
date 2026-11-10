# Especificação — Avaliação de nivelamento no formulário

> Fonte única para a OS-010, a OS-011, a OS-012 e a OS-013. Decisões tomadas com o Everton em 09/11/2026.

## Decisões de produto
| # | Decisão |
|---|---|
| 1 | O aluno **vê o nível** no fim da avaliação (pode ser desligado por formulário). |
| 2 | Só **JLPT**: níveis N5, N4, N3, N2, N1 (coluna `students.jlpt_level`). |
| 3 | Se o aluno **declara o nível**, vale o que ele declarou. A avaliação só roda para quem responde "Não sei". |
| 4 | Ainda em aberto: avaliação adaptativa (que para mais cedo). **Versão 1 usa número fixo de questões.** O modelo não pode impedir a versão adaptativa depois. |

## Fluxo no formulário
1. Pergunta comum de múltipla escolha "Qual é o seu nível de japonês?" com as opções `N5`, `N4`, `N3`, `N2`, `N1` e `Não sei`, mapeada (`mapsTo`) para `jlpt_level`.
2. Salto de lógica: `Não sei` → bloco de avaliação. As outras opções → a pergunta seguinte ao bloco.
3. Bloco **Avaliação de nivelamento** (novo tipo de nó `assessment`), também mapeado para `jlpt_level`. A posição dele em relação à pergunta não muda o resultado (veja a regra do servidor), mas **os dois precisam vir antes de qualquer nó de pagamento** (`stripe-checkout`, `bank-deposit`, `receipt-upload`, `payment-done`). A ficha do aluno é criada com as respostas enviadas antes do pagamento, então o que for respondido depois não chega a ela.
4. O bloco mostra as questões uma por uma, soma os pontos, encontra a faixa, mostra o nível (se `showResult`) e segue o formulário.

## Modelo de dados (em `form_logic_config.nodes`)
```ts
type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

interface AssessmentOption   { id: string; label: string; points: number }   // points ≥ 0
interface AssessmentQuestion { id: string; title: string; options: AssessmentOption[] }
interface AssessmentBand     { minScore: number; level: JlptLevel }           // faixa vale de minScore até o próximo minScore - 1

interface AssessmentConfig {
  questions:  AssessmentQuestion[]   // ≥ 1
  bands:      AssessmentBand[]       // ≥ 1, ordenadas por minScore crescente, a primeira com minScore = 0
  showResult: boolean                // padrão true
  resultTitle?: string               // ex.: "Seu nível é"
}

// FormNode ganha:  type: 'assessment'  e  assessment?: AssessmentConfig
```

## Respostas gravadas no lead (`leads.answers`, chaves texto → texto)
| Chave | Valor | Exemplo |
|---|---|---|
| `{nodeId}` | nível calculado no navegador | `N4` |
| `{nodeId}.score` | pontos obtidos / pontos possíveis | `14/20` |
| `{nodeId}.q.{questionId}` | id da alternativa escolhida | `opt_3f9a` |

As chaves com `.` nunca colidem com IDs de nó. Telas que listam respostas precisam formatar essas chaves (OS-013).

## Regra do servidor: o nível que vai para a ficha
O nível calculado no navegador é só para exibição. O gatilho `create_student_draft_from_lead` define o `jlpt_level` com uma regra **própria e independente da ordem dos nós** (não usa o "último nó vence" dos outros campos):

1. **Nível declarado:** é o primeiro valor válido entre os nós que **não** são `assessment` e têm `mapsTo = 'jlpt_level'`. Para ser válido, o valor passa por `upper()` e precisa conter o padrão `N[1-5]`; vale o primeiro trecho encontrado ("n3" e "N3 — Intermediário" viram `N3`). Se existir, **ele vence**: decisão 3.
2. **Nível da avaliação:** só é usado quando não há nível declarado válido. O banco **recalcula** os pontos a partir de `{nodeId}.q.*` e das faixas do nó `assessment` na configuração do produto. O valor de `{nodeId}` enviado pelo navegador é ignorado.
3. **Avaliação incompleta** (falta resposta para alguma questão, ou a alternativa não existe mais na configuração): nenhum nível. A equipe define na revisão da ficha.
4. **Nada válido** ("Não sei" sem avaliação completa): `jlpt_level` fica nulo. **Só esse campo** é descartado; o resto do mapeamento continua.
5. O cálculo do nível tem **tratamento de exceção próprio** e confere os tipos (pontos que não são número, faixas mal formadas). Qualquer falha resulta em `jlpt_level` nulo e **nunca** derruba a confirmação do pagamento nem os outros campos.

**Reforço no navegador (OS-012):** se o bloco de avaliação não estiver no caminho final do aluno (por exemplo, ele voltou e declarou o nível), o runner apaga as chaves `{nodeId}`, `{nodeId}.score` e `{nodeId}.q.*` antes de salvar. Assim, o lead não fica com uma avaliação que não vale.

## Limite conhecido (versão 1)
O gabarito e os pontos ficam na configuração pública do formulário. Para um teste de nivelamento, o risco é baixo. Escondê-los exige servir as questões por uma Edge Function, o que fica para uma versão futura.
