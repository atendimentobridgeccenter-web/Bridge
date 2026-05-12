import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Success() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[300px] h-[300px] rounded-full bg-violet-600/6 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-400">Bridge</span>
        </div>

        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full
                     bg-emerald-500/10 border border-emerald-500/20 mb-8"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Compra Confirmada!
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-10">
            Obrigado por escolher Bridge. Você receberá um e-mail com as instruções de acesso em instantes.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-col gap-3"
        >
          <Link
            to="/my-products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                       bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm
                       transition-colors shadow-lg shadow-violet-900/30 group"
          >
            Acessar meus produtos
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2"
          >
            Voltar para o início
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
