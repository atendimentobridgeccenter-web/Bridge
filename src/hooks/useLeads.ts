import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

// ── Row shape returned by Supabase join ───────────────────────

interface LeadRow {
  id:         string
  product_id: string | null
  email:      string | null
  phone:      string | null
  name:       string | null
  cpf:        string | null
  city:       string | null
  state:      string | null
  answers:    Record<string, string>
  qualified:  boolean
  created_at: string
  products:   { name: string; form_logic_config: unknown } | null
}

function mapRow(r: LeadRow): Lead {
  const cfg   = (r.products?.form_logic_config ?? {}) as Record<string, unknown>
  const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
  return {
    ...r,
    product_name:       r.products?.name ?? null,
    product_form_nodes: nodes,
  }
}

// ── useLeads ──────────────────────────────────────────────────

export function useLeads(productId?: string | null) {
  return useQuery<Lead[]>({
    queryKey: ['leads', productId ?? 'all'],
    queryFn:  async () => {
      let q = supabase
        .from('leads')
        .select(`
          id, product_id, email, phone, name, cpf, city, state,
          answers, qualified, created_at,
          products ( name, form_logic_config )
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (productId) q = q.eq('product_id', productId)

      const { data, error } = await q
      if (error) throw error
      return (data as unknown as LeadRow[]).map(mapRow)
    },
    staleTime: 30_000,
  })
}

// ── useProductsForFilter ──────────────────────────────────────

export interface ProductOption { id: string; name: string }

export function useProductsForFilter() {
  return useQuery<ProductOption[]>({
    queryKey: ['products-filter'],
    queryFn:  async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .order('name')
      return (data ?? []) as ProductOption[]
    },
    staleTime: 60_000,
  })
}
