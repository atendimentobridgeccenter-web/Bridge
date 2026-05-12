import { motion } from 'framer-motion'
import { ShoppingCart, ArrowRight, Loader2, Shield } from 'lucide-react'
import { formatBRL, totalAmount } from '@/lib/pricingEngine'
import type { LineItem } from '@/lib/types'

interface Props {
  lineItems: LineItem[]
  onConfirm: () => void
  loading: boolean
}

export default function OrderSummary({ lineItems, onConfirm, loading }: Props) {
  const total = totalAmount(lineItems)

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, y: 48, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: -32 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-2xl bg-violet-500/15 text-violet-400">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Resumo do Pedido</h2>
          <p className="text-slate-500 text-sm">Confirme os itens antes de prosseguir</p>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800 mb-6">
        {lineItems.map(item => (
          <div key={item.price_id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-white">{item.label}</p>
              {item.source_rule_id !== 'default' && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  add-on
                </span>
              )}
            </div>
            <span className="font-semibold text-white tabular-nums">{formatBRL(item.amount)}</span>
          </div>
        ))}

        {/* Total row */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800/40">
          <span className="font-bold text-white">Total</span>
          <span className="text-2xl font-bold text-violet-400 tabular-nums">{formatBRL(total)}</span>
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-8">
        <Shield className="w-4 h-4 text-green-500" />
        Pagamento 100% seguro via Stripe. Seus dados estão protegidos.
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold text-lg shadow-2xl shadow-violet-900/50 transition-all"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Criando sessão segura...</>
        ) : (
          <>Ir para Pagamento <ArrowRight className="w-5 h-5" /></>
        )}
      </motion.button>
    </motion.div>
  )
}
