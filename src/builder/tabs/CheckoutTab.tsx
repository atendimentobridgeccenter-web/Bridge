import type { Product } from '@/lib/types'

interface Props {
  product: Product
  onChange: (patch: Partial<Product>) => void
}

export default function CheckoutTab({ product, onChange }: Props) {
  const cc = (product.checkout_config as { price_id?: string; currency?: string; trial_days?: number }) ?? {}

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-5">
          Identidade do Produto
        </h3>
        <div className="space-y-4">
          <Field label="Nome do produto">
            <input
              value={product.name}
              onChange={e => onChange({ name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition-colors"
            />
          </Field>
          <Field label="Slug (URL)">
            <div className="flex items-center gap-0 rounded-xl border border-zinc-700 overflow-hidden focus-within:border-violet-500 transition-colors">
              <span className="px-3 py-2.5 bg-zinc-800/80 text-zinc-500 text-sm border-r border-zinc-700">/product/</span>
              <input
                value={product.slug}
                onChange={e => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                className="flex-1 bg-zinc-800 px-3 py-2.5 text-white outline-none text-sm"
              />
            </div>
          </Field>
          <Field label="Descrição curta">
            <textarea
              value={product.description}
              onChange={e => onChange({ description: e.target.value })}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition-colors resize-none text-sm"
            />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-5">
          Configuração Stripe
        </h3>
        <div className="space-y-4">
          <Field label="Price ID do Stripe" hint="Exemplo: price_1OaXXXXX">
            <input
              value={product.price_id_stripe ?? ''}
              onChange={e => onChange({ price_id_stripe: e.target.value })}
              placeholder="price_..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 font-mono text-sm transition-colors placeholder:text-zinc-600"
            />
          </Field>
          <Field label="Price ID (checkout_config)" hint="Pode ser igual ao acima ou um price diferente">
            <input
              value={cc.price_id ?? ''}
              onChange={e => onChange({ checkout_config: { ...cc, price_id: e.target.value } })}
              placeholder="price_..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 font-mono text-sm transition-colors placeholder:text-zinc-600"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Moeda">
              <select
                value={cc.currency ?? 'brl'}
                onChange={e => onChange({ checkout_config: { ...cc, currency: e.target.value } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition-colors"
              >
                <option value="brl">BRL — Real</option>
                <option value="usd">USD — Dólar</option>
                <option value="eur">EUR — Euro</option>
              </select>
            </Field>
            <Field label="Dias de trial">
              <input
                type="number"
                min={0}
                value={cc.trial_days ?? 0}
                onChange={e => onChange({ checkout_config: { ...cc, trial_days: Number(e.target.value) } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition-colors"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-zinc-400">
        <p className="text-violet-300 font-medium mb-1">Como configurar o webhook</p>
        Configure no Stripe Dashboard → Webhooks → <code className="text-violet-400">checkout.session.completed</code><br />
        URL: <code className="text-violet-400">https://[projeto].supabase.co/functions/v1/stripe-webhook-handler</code>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-zinc-600 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
