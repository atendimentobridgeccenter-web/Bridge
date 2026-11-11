// src/lib/assessment.ts
//
// Lógica pura (sem React) da Avaliação de Nivelamento — OS-012.
// Fonte de verdade do formato de dados: docs/operacao/specs/avaliacao-nivelamento.md
//
// Responsabilidades:
//  1. scoreAssessment  — soma pontos das respostas de cada pergunta da avaliação.
//  2. bandForScore     — resolve a faixa (JlptLevel) correspondente a uma pontuação.
//  3. formatScore      — formata "pontos/máximo" (ex.: "14/20"), o valor salvo em `{nodeId}.score`.
//  4. cleanupAssessmentAnswers — remove as chaves de um bloco de avaliação que NÃO
//     ficou no caminho final do formulário (ex.: usuário voltou e declarou o nível
//     manualmente em vez de fazer a avaliação). Aplicado nos 3 pontos definidos pelo
//     Gate 1 da OS-012: payload do checkout, payment-resume (localStorage) e salvamento final do lead.
//
// O recálculo definitivo do nível fica no servidor (OS-010, trigger
// create_student_draft_from_lead) — este módulo só serve para exibição no
// navegador e para popular as 3 chaves antes de enviar.

import type { AssessmentConfig, AssessmentBand, JlptLevel, FormNode } from '@/components/form-builder/FormBuilder'

export interface AssessmentScoreResult {
  /** Nível resolvido pela faixa, ou null se não houver faixa correspondente/configurada. */
  level: JlptLevel | null
  score: number
  maxScore: number
}

/**
 * Soma os pontos das opções escolhidas (questionId -> optionId) contra as
 * perguntas configuradas e resolve a faixa. maxScore soma o maior valor de
 * pontos disponível em cada pergunta (pontuação máxima possível).
 */
export function scoreAssessment(
  config: AssessmentConfig,
  questionAnswers: Record<string, string>,
): AssessmentScoreResult {
  let score = 0
  let maxScore = 0

  for (const question of config.questions) {
    const points = question.options
      .map(o => o.points)
      .filter((p): p is number => typeof p === 'number' && !Number.isNaN(p))
    if (points.length) maxScore += Math.max(...points)

    const chosenOptionId = questionAnswers[question.id]
    const chosen = question.options.find(o => o.id === chosenOptionId)
    if (chosen && typeof chosen.points === 'number' && !Number.isNaN(chosen.points)) {
      score += chosen.points
    }
  }

  return { level: bandForScore(config.bands, score), score, maxScore }
}

/**
 * Resolve a faixa cujo minScore é o maior valor <= score (faixas ordenadas
 * por minScore ascendente; cada faixa vale até o minScore da próxima).
 */
export function bandForScore(bands: AssessmentBand[], score: number): JlptLevel | null {
  if (!bands.length) return null
  const sorted = [...bands].sort((a, b) => a.minScore - b.minScore)
  let resolved: JlptLevel | null = null
  for (const band of sorted) {
    if (score >= band.minScore) resolved = band.level
  }
  return resolved
}

/** Formato salvo em `{nodeId}.score` — ex.: "14/20". */
export function formatScore(score: number, maxScore: number): string {
  return `${score}/${maxScore}`
}

/**
 * Remove de `answers` as chaves (`{nodeId}`, `{nodeId}.score`, `{nodeId}.q.*`)
 * de qualquer nó do tipo `assessment` que não esteja em `finalPath` (o
 * histórico de nós realmente visitados). Retorna um novo objeto; não muta
 * `answers`. Se nada precisar ser removido, retorna a própria referência
 * recebida (evita re-render/trabalho desnecessário).
 */
export function cleanupAssessmentAnswers(
  answers: Record<string, string>,
  nodes: FormNode[],
  finalPath: string[],
): Record<string, string> {
  const assessmentNodeIds = nodes.filter(n => n.type === 'assessment').map(n => n.id)
  const toRemove = assessmentNodeIds.filter(id => !finalPath.includes(id))
  if (!toRemove.length) return answers

  const next = { ...answers }
  for (const nodeId of toRemove) {
    delete next[nodeId]
    delete next[`${nodeId}.score`]
    const prefix = `${nodeId}.q.`
    for (const key of Object.keys(next)) {
      if (key.startsWith(prefix)) delete next[key]
    }
  }
  return next
}
