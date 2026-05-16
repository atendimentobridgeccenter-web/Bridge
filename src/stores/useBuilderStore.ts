// ── Builder Store (Zustand) ────────────────────────────────────
//
// Guarda o estado RASCUNHO do produto sendo editado.
//
// Separação de responsabilidades:
//   - React Query  → estado do SERVIDOR (fonte da verdade persistida)
//   - Zustand      → estado de RASCUNHO na UI (edições em andamento)
//
// Fluxo de dados:
//   serverProduct (React Query cache)
//     → initFromServer() → store.product + store.formNodes (isDirty = false)
//     → usuário edita → patchProduct() / setFormNodes() → isDirty = true
//     → auto-save fires → mutation → markAsSaved() → isDirty = false, savedAt = now
//
// Nota sobre initFromServer:
//   É uma ação atômica que inicializa produto + formNodes sem marcar isDirty.
//   Usar setProduct() + setFormNodes() separados marcaria isDirty = true
//   porque setFormNodes sempre marca dirty (mudanças do usuário).

import { create } from 'zustand'
import type { Product } from '@/lib/types'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── State ─────────────────────────────────────────────────────

interface BuilderState {
  product:   Product | null
  formNodes: FormNode[]
  isDirty:   boolean
  savedAt:   Date | null
}

// ── Actions ───────────────────────────────────────────────────

interface BuilderActions {
  // Inicializa store a partir do servidor sem marcar dirty
  initFromServer: (product: Product) => void

  // Atualiza campo(s) do produto — marca dirty
  patchProduct: (fields: Partial<Product>) => void

  // Atualiza os nodes do formulário — marca dirty
  setFormNodes: (nodes: FormNode[]) => void

  // Chamado pela mutation após salvar com sucesso
  markAsSaved: () => void

  // Limpa o store ao sair da página
  reset: () => void
}

type BuilderStore = BuilderState & BuilderActions

// ── Initial state ─────────────────────────────────────────────

const INITIAL: BuilderState = {
  product:   null,
  formNodes: [],
  isDirty:   false,
  savedAt:   null,
}

// ── Store ─────────────────────────────────────────────────────

export const useBuilderStore = create<BuilderStore>((set) => ({
  ...INITIAL,

  initFromServer: (product) => {
    const cfg   = product.form_logic_config as Record<string, unknown>
    const nodes = Array.isArray(cfg?.nodes) ? (cfg.nodes as FormNode[]) : []
    set({ product, formNodes: nodes, isDirty: false, savedAt: null })
  },

  patchProduct: (fields) =>
    set((s) => ({
      product: s.product ? { ...s.product, ...fields } : null,
      isDirty: true,
    })),

  setFormNodes: (formNodes) => set({ formNodes, isDirty: true }),

  markAsSaved: () => set({ isDirty: false, savedAt: new Date() }),

  reset: () => set(INITIAL),
}))
