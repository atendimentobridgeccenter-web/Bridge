import { motion } from 'framer-motion'
import { ArrowRight, Loader2, ShieldCheck, Lock } from 'lucide-react'
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
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: -24 }}
      className="w-full"
    >
      <p className="text-xs font-mono text-violet-400/60 mb-5 tracking-widest">RESUMO</p>
      <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Confirme seu pedido</h2>
      <p className="text-zinc-500 text-sm mb-10">Revise os itens antes de prosseguir para o pagamento.</p>

      {/* Line items */}
      <div className="rounded-2xl border border-white/6 bg-zinc-900/60 overflow-hidden mb-6">
        <div className="divide-y divide-white/6">
          {lineItems.map(item => (
            <div key={item.price_id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.source_rule_id !== 'default' && (
                  <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded
                                   bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    add-on
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-white tabular-nums">
                {formatBRL(item.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-800/40 border-t border-white/6">
          <span className="text-sm font-semibold text-zinc-300">Total</span>
          <span className="text-2xl font-bold text-white tabular-nums">{formatBRL(total)}</span>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2.5 text-xs text-zinc-600 mb-8">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pagamento seguro via Stripe</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>SSL 256-bit</span>
        </div>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl
                   bg-gradient-to-r from-violet-600 to-indigo-600
                   hover:from-violet-500 hover:to-indigo-500
                   disabled:opacity-60 text-white font-bold text-lg
                   shadow-2xl shadow-violet-900/40 transition-all"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Criando sessão segura…</>
        ) : (
          <>Ir para Pagamento <ArrowRight className="w-5 h-5" /></>
        )}
      </motion.button>
    </motion.div>
  )
}
