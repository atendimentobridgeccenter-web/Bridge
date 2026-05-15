import QuizzRunner from '@/components/form-builder/QuizzRunner'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── Mock data ─────────────────────────────────────────────────
//
// Demonstrates:
//   • Logic jumps (Q3 Iniciante/Básico skips Q4)
//   • Early termination (Q5 "Viagem e imersão" → __end__)
//   • Dynamic pricing (Q6 carries optionPrices → unlocks CheckoutSummary)
//
// Flow:
//   Q1 (name) → Q2 (email) → Q3 (nível)
//   Q3 Iniciante/Básico  ──jump──► Q5 (objetivo)
//   Q3 Intermediário/Avançado → Q4 (JLPT) → Q5 (objetivo)
//   Q5 "Viagem e imersão" ──jump──► __end__ (generic done)
//   Q5 outros → Q6 (plano + pricing) → CheckoutSummary

const MOCK_NODES: FormNode[] = [
  {
    id: 'n1',
    title: 'Qual é o seu nome completo?',
    type: 'text',
    options: [],
    logicJumps: [],
  },
  {
    id: 'n2',
    title: 'Qual é o seu melhor e-mail?',
    type: 'email',
    options: [],
    logicJumps: [],
  },
  {
    id: 'n3',
    title: 'Qual é o seu nível de japonês atual?',
    type: 'radio',
    options: [
      'Iniciante — nunca estudei',
      'Básico — conheço hiragana e katakana',
      'Intermediário — N4 ou N3',
      'Avançado — N2 ou N1',
    ],
    logicJumps: [
      { id: 'lj1', ifOption: 'Iniciante — nunca estudei',           jumpToNodeId: 'n5' },
      { id: 'lj2', ifOption: 'Básico — conheço hiragana e katakana', jumpToNodeId: 'n5' },
    ],
  },
  {
    id: 'n4',
    title: 'Você já prestou algum exame JLPT?',
    type: 'radio',
    options: [
      'Sim, fui aprovado',
      'Sim, mas não passei',
      'Ainda não prestei',
    ],
    logicJumps: [],
  },
  {
    id: 'n5',
    title: 'Qual é o seu principal objetivo com o japonês?',
    type: 'radio',
    options: [
      'Trabalho ou visto de residência',
      'Faculdade no Japão (Koukousei)',
      'Viagem e imersão cultural',
      'Passar no JLPT N2 ou N1',
    ],
    logicJumps: [
      { id: 'lj3', ifOption: 'Viagem e imersão cultural', jumpToNodeId: '__end__' },
    ],
  },
  {
    id: 'n6',
    title: 'Escolha o plano ideal para você.',
    type: 'radio',
    options: [
      'Plano Mensal — ¥ 12.000',
      'Plano Trimestral — ¥ 32.000',
      'Mentoria 1:1 Intensiva — ¥ 38.000',
    ],
    logicJumps: [],
    // Each option maps to a real Stripe Price ID and display metadata.
    // In production, replace price_mock_* with actual price_... IDs from Stripe.
    optionPrices: {
      'Plano Mensal — ¥ 12.000': {
        priceId:  'price_mock_mensal',
        label:    'Plano Mensal',
        amount:   12000,
        currency: 'jpy',
      },
      'Plano Trimestral — ¥ 32.000': {
        priceId:  'price_mock_trimestral',
        label:    'Plano Trimestral',
        amount:   32000,
        currency: 'jpy',
      },
      'Mentoria 1:1 Intensiva — ¥ 38.000': {
        priceId:  'price_mock_mentoria',
        label:    'Mentoria 1:1 Intensiva',
        amount:   38000,
        currency: 'jpy',
      },
    },
  },
]

export default function PreviewQuizz() {
  function handleComplete(answers: Record<string, string>) {
    console.log('[QuizzRunner] respostas finais:', answers)
  }

  return (
    <QuizzRunner
      nodes={MOCK_NODES}
      // Swap for a real product UUID + price ID in production
      productId="00000000-0000-0000-0000-000000000001"
      productName="Reforço Escolar de Japonês"
      defaultPriceId="price_mock_mensal"
      onComplete={handleComplete}
    />
  )
}
