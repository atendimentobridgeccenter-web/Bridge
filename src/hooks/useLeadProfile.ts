import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FormNode } from '@/components/form-builder/FormBuilder'

// ── Types ─────────────────────────────────────────────────────

export interface LeadInteraction {
  id:           string
  product_id:   string | null
  product_name: string | null
  product_nodes: FormNode[]
  email:        string | null
  phone:        string | null
  name:         string | null
  qualified:    boolean
  created_at:   string
  answers:      Record<string, string>
  utm_source?:   string | null
  utm_medium?:   string | null
  utm_campaign?: string | null
  utm_term?:     string | null
  utm_content?:  string | null
  referrer?:     string | null
}

export interface LeadPurchase {
  product_id:        string
  product_name:      string
  purchased_at:      string
  stripe_session_id: string | null
}

export interface LeadProfile {
  primary:      LeadInteraction
  interactions: LeadInteraction[]   // todas com mesmo email ou telefone
  purchases:    LeadPurchase[]
}

// ── Row from Supabase ─────────────────────────────────────────

interface LeadRow {
  id:           string
  product_id:   string | null
  email:        string | null
  phone:        string | null
  name:         string | null
  qualified:    boolean
  created_at:   string
  answers:      Record<string, string>
  utm_source?:   string | null
  utm_medium?:   string | null
  utm_campaign?: string | null
  utm_term?:     string | null
  utm_content?:  string | null
  referrer?:     string | null
  products: { name: string; form_logic_config: unknown } | null
}

function mapRow(r: LeadRow): LeadInteraction {
  const cfg   = (r.products?.form_logic_config ?? {}) as Record<string, unknown>
  const nodes = Array.isArray(cfg?.nodes) ? (cfg.nodes as FormNode[]) : []
  return {
    id:           r.id,
    product_id:   r.product_id,
    product_name: r.products?.name ?? null,
    product_nodes: nodes,
    email:        r.email,
    phone:        r.phone,
    name:         r.name,
    qualified:    r.qualified,
    created_at:   r.created_at,
    answers:      r.answers ?? {},
    utm_source:   r.utm_source,
    utm_medium:   r.utm_medium,
    utm_campaign: r.utm_campaign,
    utm_term:     r.utm_term,
    utm_content:  r.utm_content,
    referrer:     r.referrer,
  }
}

const SELECT = `
  id, product_id, email, phone, name, qualified, created_at, answers,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer,
  products ( name, form_logic_config )
`

// ── Hook ──────────────────────────────────────────────────────

export function useLeadProfile(leadId: string | undefined) {
  return useQuery<LeadProfile>({
    queryKey: ['lead-profile', leadId],
    enabled:  !!leadId,
    staleTime: 30_000,
    queryFn:  async () => {
      // 1. Primary lead
      const { data: primary, error: e1 } = await supabase
        .from('leads')
        .select(SELECT)
        .eq('id', leadId!)
        .single()
      if (e1 || !primary) throw new Error('Lead não encontrado.')

      const primaryRow = mapRow(primary as unknown as LeadRow)

      // 2. All interactions by same email OR phone
      const orParts: string[] = []
      if (primaryRow.email) orParts.push(`email.eq.${primaryRow.email}`)
      if (primaryRow.phone) orParts.push(`phone.eq.${primaryRow.phone}`)

      let interactions: LeadInteraction[] = [primaryRow]

      if (orParts.length > 0) {
        const { data: related } = await supabase
          .from('leads')
          .select(SELECT)
          .or(orParts.join(','))
          .order('created_at', { ascending: false })

        if (related) {
          interactions = (related as unknown as LeadRow[]).map(mapRow)
        }
      }

      // 3. Purchases by email (via SECURITY DEFINER function)
      let purchases: LeadPurchase[] = []
      if (primaryRow.email) {
        const { data: purData } = await supabase
          .rpc('get_purchases_by_email', { p_email: primaryRow.email })
        if (purData) purchases = purData as LeadPurchase[]
      }

      return { primary: primaryRow, interactions, purchases }
    },
  })
}
