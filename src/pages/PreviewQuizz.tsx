import QuizzRunner from '@/components/form-builder/QuizzRunner'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── Mock data — demonstrates logic jumps in action ────────────
//
// Flow:
//   Q1 (name)  → Q2 (email) → Q3 (nível)
//   Q3 Iniciante  ──jump──► Q5 (objetivo)
//   Q3 Intermediário/Avançado → Q4 (JLPT) → Q5 (objetivo)
//   Q5 "Viagem e cultura" ──jump──► __end__ (finish early)
//   Q5 outros → Q6 (horas/semana) → Q7 (mensagem) → fim

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
      { id: 'lj1', ifOption: 'Iniciante — nunca estudei', jumpToNodeId: 'n5' },
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
    title: 'Quantas horas por semana você pode dedicar aos estudos?',
    type: 'radio',
    options: [
      'Menos de 5 horas',
      'Entre 5 e 10 horas',
      'Entre 10 e 20 horas',
      'Mais de 20 horas',
    ],
    logicJumps: [],
  },
  {
    id: 'n7',
    title: 'Conte-nos sobre sua situação e o que espera conquistar.',
    type: 'textarea',
    options: [],
    logicJumps: [],
  },
]

export default function PreviewQuizz() {
  function handleComplete(answers: Record<string, string>) {
    console.log('[QuizzRunner] respostas finais:', answers)
  }

  return <QuizzRunner nodes={MOCK_NODES} onComplete={handleComplete} />
}
