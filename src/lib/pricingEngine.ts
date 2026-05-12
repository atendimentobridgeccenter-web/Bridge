import type { FormSchema, LineItem, PricingCondition } from './types'

// ── Condition evaluator ───────────────────────────────────────

function evalCondition(
  condition: PricingCondition,
  answers: Record<string, string | string[]>,
): boolean {
  const raw = answers[condition.step_id]
  if (raw === undefined || raw === null) return false

  switch (condition.operator) {
    case 'eq':
      return String(raw) === condition.value
    case 'neq':
      return String(raw) !== condition.value
    case 'includes':
      // works for both string and string[]
      return Array.isArray(raw)
        ? raw.includes(condition.value)
        : String(raw).includes(condition.value)
    case 'gt':
      return Number(raw) > Number(condition.value)
    case 'lt':
      return Number(raw) < Number(condition.value)
    default:
      return false
  }
}

// ── Main engine ───────────────────────────────────────────────
//
// Logic:
//   1. Start with the default line item (main product).
//   2. Walk every pricing_rule in definition order.
//   3. If condition matches:
//      - "replace" → swap index-0 (the main product). Later "replace"
//        rules win (last match wins), so put higher-tier rules last.
//      - "add"     → push an additional line item, deduplicating by price_id.
//   4. Return the final LineItem[].

export function computeLineItems(
  answers: Record<string, string | string[]>,
  schema: FormSchema,
): LineItem[] {
  const base: LineItem = {
    price_id: schema.default_price_id,
    label:    schema.default_label,
    amount:   schema.default_amount,
    source_rule_id: 'default',
  }

  const items: LineItem[] = [base]

  for (const rule of schema.pricing_rules) {
    if (!evalCondition(rule.condition, answers)) continue

    if (rule.action.type === 'replace') {
      items[0] = {
        price_id:       rule.action.price_id,
        label:          rule.action.label,
        amount:         rule.action.amount,
        source_rule_id: rule.id,
      }
    } else {
      const alreadyAdded = items.some(i => i.price_id === rule.action.price_id)
      if (!alreadyAdded) {
        items.push({
          price_id:       rule.action.price_id,
          label:          rule.action.label,
          amount:         rule.action.amount,
          source_rule_id: rule.id,
        })
      }
    }
  }

  return items
}

// ── Helpers ───────────────────────────────────────────────────

export function totalAmount(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.amount, 0)
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}
